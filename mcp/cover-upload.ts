/**
 * Host a cover the *client* produced.
 *
 * `generate_cover_image` exists because the server could make artwork and the
 * client could not. That has stopped being true: ChatGPT and Claude both draw,
 * and the picture they make with the article in front of them beats one this
 * server prompts for blind. So this is the preferred path, and
 * `generate_cover_image` becomes the fallback for clients that cannot draw — or
 * for a deployment with no `OPENAI_API_KEY`, which no longer blocks anything.
 *
 * ## Why this is not another branch inside `resolveCover`
 *
 * `resolveCover` is a *fallback matrix*: try the URL, else generate, else the
 * branded card. Its whole shape is "keep going until something works".
 *
 * This path must not do that. The caller supplied a specific image; if it is
 * broken, unsupported, or oversized, the right answer is to say so and let the
 * caller decide — not to quietly hand back an ESE title card that the client will
 * then describe to a human as the artwork it generated. The failure-behaviour
 * rule matters more than the code sharing: *never silently claim custom artwork
 * was attached when only the branded fallback was used.* Two functions with two
 * different attitudes to failure is what keeps that honest.
 *
 * Everything downstream of "here are the bytes" is shared, though.
 * `normaliseCover` does the validating, decoding, resizing, EXIF stripping and
 * WebP encoding, and `store.uploadCover` does the storing under the one
 * `covers/<slug>-<suffix>.<ext>` convention. This module adds no second storage
 * path and no second validator.
 */
import { normaliseCover } from "./cover-normalise";
import { FIELD_LIMITS } from "../src/lib/blog/validation";
import { COVER_MAX_BYTES } from "../src/lib/blog/image";
import type { UploadDeps } from "./ports";

/**
 * Ceiling on what a client may hand over, before anything decodes it.
 *
 * The same 5 MB the bucket accepts, checked here so an oversized upload is
 * refused on a length check rather than after sharp has decoded it. Note this is
 * the *input* limit; `normaliseCover` re-checks the encoded output, which is
 * almost always far smaller.
 *
 * Base64 inflates by 4/3, so the encoded string is allowed to be that much
 * longer — the limit is on image bytes, which is the thing that costs memory.
 */
export const UPLOAD_MAX_BYTES = COVER_MAX_BYTES;

/** Roughly the 5 MB ceiling once base64 has inflated it, plus slack for padding. */
const MAX_BASE64_CHARS = Math.ceil((UPLOAD_MAX_BYTES * 4) / 3) + 1024;

export type ClientCoverRequest = {
  title: string;
  /** Already validated by `checkSlugShape` — this module does not re-derive it. */
  slug: string;
  /**
   * Raw bytes, already in hand.
   *
   * Used by the out-of-band upload endpoint, where the image arrived over plain
   * HTTP and never passed through a tool argument at all. Highest priority
   * because there is nothing to decode or fetch — the bytes are simply here.
   */
  imageBytes?: Uint8Array;
  /** Base64 image bytes. The in-band mode every MCP client can express. */
  imageBase64?: string;
  /** An absolute local path. Refused unless `deps.files` is present. */
  imagePath?: string;
  /** An HTTPS URL, fetched through the existing SSRF-guarded fetcher. */
  imageUrl?: string;
  imageAlt?: string;
};

export type ClientCoverOutcome =
  | {
      ok: true;
      source: "client-generated";
      url: string;
      path: string;
      alt: string;
      width: number;
      height: number;
      format: "webp";
      contentType: "image/webp";
      /** Which input mode supplied the bytes. */
      via: "bytes" | "base64" | "path" | "url";
      /** Set when the caller's alt text was used rather than a derived one. */
      altFromCaller: boolean;
    }
  | { ok: false; error: string };

/* --------------------------------------------------------------------- alt */

/**
 * Alt text when the caller supplied none.
 *
 * Derived from the title and nothing else, deliberately. This function cannot
 * see the image, so anything more specific than the article's own subject would
 * be invention — and the inventions that matter here are the ones ESE's content
 * rules already forbid: a Tribe or Nation named as a client, an affiliation, a
 * project outcome, a person's identity. A sentence that only restates the title
 * cannot make any of those claims.
 *
 * A caller-supplied alt always wins, because the client looked at the picture
 * and this function did not.
 */
export function altForClientCover(title: string): string {
  const clean = title.trim().replace(/\s+/g, " ");
  return `Cover illustration for the article “${clean}”.`;
}

/**
 * Validate and keep a caller's alt text, or fall back to a derived one.
 *
 * Only shape is checked — emptiness and length against the same
 * `coverImageAlt` limit the database enforces. Whether the sentence honestly
 * describes the image is not decidable here; what *is* decidable is that a
 * 4000-character alt attribute would be rejected by Postgres after the upload had
 * already happened, which is a worse place to find out.
 */
export function resolveAlt(
  title: string,
  supplied: string | undefined,
): { alt: string; fromCaller: boolean } {
  const trimmed = supplied?.trim() ?? "";
  if (!trimmed) return { alt: altForClientCover(title), fromCaller: false };

  if (trimmed.length > FIELD_LIMITS.coverImageAlt.max) {
    // Truncating silently would ship a sentence ending mid-word to a screen
    // reader, so the derived one is better than a mangled version of theirs.
    return { alt: altForClientCover(title), fromCaller: false };
  }

  return { alt: trimmed, fromCaller: true };
}

/* ------------------------------------------------------------------- bytes */

type BytesOutcome =
  | { ok: true; bytes: Uint8Array; via: "bytes" | "base64" | "path" | "url" }
  | { ok: false; error: string };

/**
 * Decode base64, strictly.
 *
 * `Buffer.from(s, "base64")` is famously lenient: it skips characters it does not
 * recognise and returns whatever it managed to decode, so a text file arrives as
 * a short run of plausible bytes rather than an error. That would turn "you sent
 * something that is not an image" into "your image could not be decoded", which
 * points the client at the wrong problem. So the input is checked against the
 * alphabet first.
 */
function decodeBase64(input: string): { ok: true; bytes: Uint8Array } | { ok: false; error: string } {
  // Tolerate whitespace and a data: URL prefix, both of which clients add.
  const stripped = input.replace(/^data:[^;,]*;base64,/i, "").replace(/\s+/g, "");

  if (stripped.length === 0) return { ok: false, error: "imageBase64 was empty." };

  if (stripped.length > MAX_BASE64_CHARS) {
    return {
      ok: false,
      error: `The image is larger than the ${(UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
    };
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(stripped)) {
    return {
      ok: false,
      error:
        "imageBase64 is not valid base64. Send the raw base64 of the image file, " +
        "optionally with a data: URL prefix — not a filename, a URL, or JSON.",
    };
  }

  const bytes = new Uint8Array(Buffer.from(stripped, "base64"));
  if (bytes.byteLength === 0) return { ok: false, error: "imageBase64 decoded to nothing." };

  return { ok: true, bytes };
}

/**
 * Resolve the bytes from whichever mode the caller used.
 *
 * Order is fixed rather than caller-controlled: base64 is the mode every client
 * has, so it wins when more than one is supplied, and the caller is told rather
 * than left guessing which one took effect.
 */
async function resolveBytes(
  request: ClientCoverRequest,
  deps: UploadDeps,
): Promise<BytesOutcome> {
  const modes = [
    request.imageBytes && request.imageBytes.byteLength > 0 ? "bytes" : null,
    request.imageBase64?.trim() ? "base64" : null,
    request.imagePath?.trim() ? "path" : null,
    request.imageUrl?.trim() ? "url" : null,
  ].filter(Boolean);

  if (modes.length === 0) {
    return {
      ok: false,
      error:
        "No image was supplied. Send exactly one of imageBase64 (the base64 of " +
        "the generated file), imagePath (an absolute path, local clients only), " +
        "or imageUrl (an https URL).",
    };
  }

  if (request.imageBytes && request.imageBytes.byteLength > 0) {
    if (request.imageBytes.byteLength > UPLOAD_MAX_BYTES) {
      return {
        ok: false,
        error: `The image is ${(request.imageBytes.byteLength / 1024 / 1024).toFixed(1)} MB, over the ${(UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
      };
    }
    return { ok: true, bytes: request.imageBytes, via: "bytes" };
  }

  if (request.imageBase64?.trim()) {
    const decoded = decodeBase64(request.imageBase64);
    if (!decoded.ok) return { ok: false, error: decoded.error };
    if (decoded.bytes.byteLength > UPLOAD_MAX_BYTES) {
      return {
        ok: false,
        error: `The image is ${(decoded.bytes.byteLength / 1024 / 1024).toFixed(1)} MB, over the ${(UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
      };
    }
    return { ok: true, bytes: decoded.bytes, via: "base64" };
  }

  if (request.imagePath?.trim()) {
    if (!deps.files) {
      return {
        ok: false,
        error:
          "imagePath is not available on this transport, because reading a named " +
          "file would disclose this server's filesystem to a remote caller. Send " +
          "imageBase64 instead.",
      };
    }
    const read = await deps.files.read(request.imagePath.trim());
    if (!read.ok) return { ok: false, error: read.reason };
    if (read.bytes.byteLength > UPLOAD_MAX_BYTES) {
      return {
        ok: false,
        error: `That file is ${(read.bytes.byteLength / 1024 / 1024).toFixed(1)} MB, over the ${(UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
      };
    }
    return { ok: true, bytes: read.bytes, via: "path" };
  }

  // The existing importer, which already resolves DNS and refuses loopback,
  // RFC1918, link-local, CGNAT and multicast before fetching, follows no
  // redirects, and sniffs the type from bytes.
  const fetched = await deps.fetcher.fetch(request.imageUrl!.trim());
  if (!fetched.ok) return { ok: false, error: fetched.reason };
  if (fetched.bytes.byteLength > UPLOAD_MAX_BYTES) {
    return {
      ok: false,
      error: `That image is ${(fetched.bytes.byteLength / 1024 / 1024).toFixed(1)} MB, over the ${(UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
    };
  }
  return { ok: true, bytes: fetched.bytes, via: "url" };
}

/* ------------------------------------------------------------------ the path */

/**
 * Take a client-supplied image and return a hosted ESE cover URL.
 *
 * The slug must already have passed `checkSlugShape` — `coverObjectPath` throws
 * rather than sanitising if it has not, which is the right response to a caller
 * inside this repository skipping validation. Path traversal, and any attempt to
 * choose a bucket or object key, are refused there: the key is *derived* from the
 * validated slug plus a random suffix, never taken from input.
 */
export async function uploadClientCover(
  request: ClientCoverRequest,
  deps: UploadDeps,
): Promise<ClientCoverOutcome> {
  const bytes = await resolveBytes(request, deps);
  if (!bytes.ok) return { ok: false, error: bytes.error };

  // Magic-byte sniffing, decode, 1200x630, EXIF stripped, WebP. The filename and
  // any Content-Type the client mentioned are never consulted — both are supplied
  // by whoever supplied the image. SVG is refused by name here, which matters
  // because these objects are served publicly and an SVG can carry script.
  const normalised = await normaliseCover(bytes.bytes);
  if (!normalised.ok) {
    return {
      ok: false,
      error:
        `${normalised.reason} Supported formats are PNG, JPEG, and WebP. ` +
        `If your client cannot supply one, call generate_cover_image instead.`,
    };
  }

  const { alt, fromCaller } = resolveAlt(request.title, request.imageAlt);
  const cover = normalised.cover;

  try {
    const { url, path } = await deps.store.uploadCover(cover.bytes, request.slug, {
      ext: cover.ext,
      contentType: cover.contentType,
    });

    return {
      ok: true,
      source: "client-generated",
      url,
      path,
      alt,
      width: cover.width,
      height: cover.height,
      format: cover.format,
      contentType: cover.contentType,
      via: bytes.via,
      altFromCaller: fromCaller,
    };
  } catch (error) {
    // Storage is the one failure worth reporting as an error: without a URL there
    // is nothing to attach to the draft. It still does not block `create_draft` —
    // `cover_image_url` is nullable and a coverless post is valid.
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The cover could not be stored.",
    };
  }
}
