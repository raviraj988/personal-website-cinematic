/**
 * Where a client-generated cover actually arrives.
 *
 * ## Why this endpoint exists at all
 *
 * MCP defines no file-input type for tool arguments and no way for a server to
 * pull a file from a client — the only requests a server may send are
 * `sampling/createMessage`, `roots/list`, and `elicitation/create`. So the only
 * in-band option is base64 inside a tool argument, and for a client whose *model*
 * has to produce that argument it is not merely wasteful but impossible: a 1.5 MB
 * cover is roughly 2 MB of base64, about 600,000 output tokens to type. It works
 * from Claude Code, whose runtime substitutes file bytes programmatically. It
 * cannot work from ChatGPT.
 *
 * This takes the bytes out of the conversation. `create_cover_upload` mints a
 * ticket; the image is POSTed here as a plain request body by whatever can reach
 * the URL — the client, curl, or the browser drop page next door; and
 * `upload_cover_image` reads the result back. The model only ever handles a short
 * ticket and a finished URL.
 *
 * ## Why the ticket is the only credential
 *
 * It cannot require the OAuth bearer token, because the thing uploading may be a
 * browser that has no token. So the ticket authorises the upload, in the manner of
 * any signed upload URL: 256 bits of entropy, stored only as a hash, single use,
 * fifteen minutes, and — the part that matters most — **the storage path was fixed
 * when the ticket was minted**. Whoever holds it decides whether an object lands,
 * never where. And a ticket can only be minted by a `blog:draft` tool call, which
 * descends from an administrator's consent.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// An upload plus a sharp decode and re-encode. The default would cut a slow one
// off mid-flight and leave the ticket claimed with nothing recorded.
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" } as const;

function fail(status: number, error: string, hint?: string): NextResponse {
  return NextResponse.json({ ok: false, error, ...(hint ? { hint } : {}) }, {
    status,
    headers: NO_STORE,
  });
}

/**
 * Loaded inside the handler, not at module scope.
 *
 * Same reason as `/api/mcp`: a static import puts the whole `mcp/` graph on this
 * module's load path, so a configuration failure happens before the route is
 * registered and the platform answers with its own HTML error page instead of
 * anything this file could shape.
 */
async function load() {
  const [store, upload, paths] = await Promise.all([
    import("../../../../../mcp/adapters/supabase"),
    import("../../../../../mcp/cover-upload"),
    import("../../../../../mcp/paths"),
  ]);
  return {
    store: store.supabaseStore,
    uploadClientCover: upload.uploadClientCover,
    UPLOAD_MAX_BYTES: upload.UPLOAD_MAX_BYTES,
    checkSlugShape: paths.checkSlugShape,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ ticket: string }> },
): Promise<NextResponse> {
  const { ticket } = await context.params;

  if (!ticket || ticket.length < 20 || ticket.length > 128) {
    return fail(404, "Unknown or expired upload ticket.");
  }

  let mod: Awaited<ReturnType<typeof load>>;
  try {
    mod = await load();
  } catch (error) {
    console.error("[cover-upload] could not load the pipeline", {
      message: error instanceof Error ? error.message : String(error),
    });
    return fail(500, "The upload pipeline is unavailable.");
  }

  // Length first, from the header, so an oversized body is refused before it is
  // read into memory. The body length is checked again below, because a header is
  // a claim.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > mod.UPLOAD_MAX_BYTES) {
    return fail(
      413,
      `That image is ${(declared / 1024 / 1024).toFixed(1)} MB, over the ${(mod.UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
    );
  }

  // Claimed before the body is read. The claim is a conditional update, so two
  // concurrent uploads cannot both proceed — and doing it first means a slow
  // upload cannot be raced by a second one behind it.
  let claim;
  try {
    claim = await mod.store.claimCoverTicket(ticket);
  } catch (error) {
    console.error("[cover-upload] claim failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return fail(500, "Could not claim the upload ticket.");
  }

  // Unknown, expired, and already-used are deliberately indistinguishable: telling
  // them apart would let someone probe for live tickets.
  if (!claim) {
    return fail(
      404,
      "Unknown, expired, or already-used upload ticket.",
      "Ask the assistant to call create_cover_upload again.",
    );
  }

  const release = async (reason: string) => {
    try {
      await mod.store.recordCoverFailure(ticket, reason);
    } catch (error) {
      console.error("[cover-upload] could not record the failure", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  /* ------------------------------------------------------------- read bytes */

  let bytes: Uint8Array;
  try {
    // Accepts either a raw body (`--data-binary`, or fetch with a Blob) or a
    // multipart form, which is what the browser drop page sends. Both end up as
    // the same bytes; neither is trusted for its declared type.
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof Blob)) {
        await release("The form had no file field.");
        return fail(400, "Send the image as a field named \"file\".");
      }
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      bytes = new Uint8Array(await request.arrayBuffer());
    }
  } catch {
    await release("The request body could not be read.");
    return fail(400, "The request body could not be read.");
  }

  if (bytes.byteLength === 0) {
    await release("The request body was empty.");
    return fail(400, "The request body was empty. Send the image file as the body.");
  }

  if (bytes.byteLength > mod.UPLOAD_MAX_BYTES) {
    await release("The image was over the size limit.");
    return fail(
      413,
      `That image is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB, over the ${(mod.UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
    );
  }

  /* ------------------------------------------------- validate, store, record */

  // The slug was validated when the ticket was minted, but `coverObjectPath`
  // throws rather than sanitising, so it is re-checked here rather than trusted
  // across a table round trip.
  const shape = mod.checkSlugShape(claim.slug);
  if (!shape.ok) {
    await release("The ticket carried an invalid slug.");
    return fail(500, "The ticket carried an invalid slug.");
  }

  let outcome;
  try {
    outcome = await mod.uploadClientCover(
      {
        title: claim.title,
        slug: shape.slug,
        imageBytes: bytes,
        // From the ticket, not the request: the tool call that minted it is the
        // authenticated side of this exchange, and the uploader is not.
        imageAlt: claim.imageAlt ?? undefined,
      },
      {
        store: { uploadCover: mod.store.uploadCover },
        // No fetcher and no file reader are needed: the bytes are already here,
        // and handing this path either would widen it for no reason.
        fetcher: { async fetch() { return { ok: false, reason: "not used" }; } },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "The upload failed.";
    await release(message);
    console.error("[cover-upload] pipeline threw", { message });
    return fail(500, "The image could not be processed.");
  }

  if (!outcome.ok) {
    // A rejected image releases the ticket, so the person can try a different
    // file without going back to the model for a new one.
    await release(outcome.error);
    return fail(
      415,
      outcome.error,
      "The ticket is still valid — upload a PNG, JPEG, or WebP to the same URL.",
    );
  }

  try {
    await mod.store.recordCoverResult(ticket, {
      url: outcome.url,
      path: outcome.path,
      alt: outcome.alt,
      width: outcome.width,
      height: outcome.height,
      contentType: outcome.contentType,
    });
  } catch (error) {
    // The object is stored and reachable, so the upload did succeed; what failed
    // is the record the MCP side reads back. Say so rather than implying the
    // image is lost.
    console.error("[cover-upload] could not record the result", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: true,
        url: outcome.url,
        alt: outcome.alt,
        warning:
          "The image was stored but the ticket could not be updated. Pass this url and alt to create_draft directly.",
      },
      { status: 200, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      source: "client-generated",
      url: outcome.url,
      alt: outcome.alt,
      width: outcome.width,
      height: outcome.height,
      contentType: outcome.contentType,
      next: "Call upload_cover_image with the same ticket to read this back.",
    },
    { status: 200, headers: NO_STORE },
  );
}

/**
 * A HEAD probe, so a client can check a ticket is live before sending bytes.
 *
 * Deliberately says nothing: 204 whether or not the ticket exists. Answering
 * truthfully would make this an oracle for live tickets, and a client that wants
 * to know should just upload.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: NO_STORE });
}
