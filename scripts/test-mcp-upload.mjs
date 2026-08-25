/**
 * `upload_cover_image`: the client-generated cover path.
 *
 * Offline. No database, no network, no paid image request — the store, the
 * fetcher, and the file reader are all fakes, and this file does not import the
 * module that imports `openai`, so it could not reach a paid endpoint even by
 * accident.
 *
 * The two assertions that matter most, and are easy to lose in the noise:
 *
 *   1. **No image-generation key is needed.** The whole point of this path is that
 *      a client which can draw does not need the server to. So the provider here
 *      is `absentKeyProvider`, and its call count must stay at zero.
 *
 *   2. **`imagePath` is refused when no reader was injected.** That is the
 *      security boundary between the two transports, and it is a property of the
 *      *absence* of a dependency rather than of a flag, so it is asserted by
 *      calling with `files` undefined.
 *
 *   node --import ./scripts/register-ts.mjs scripts/test-mcp-upload.mjs
 */
import { uploadClientCover, resolveAlt, altForClientCover, UPLOAD_MAX_BYTES } from "../mcp/cover-upload.ts";
import { resolveCover } from "../mcp/cover-source.ts";
import { TOOL_NAMES, registerTools } from "../mcp/tools.ts";
import { TOOL_SCOPE, toolsForScopes } from "../mcp/scopes.ts";
import { resolveSite } from "../mcp/site.ts";
import { FIELD_LIMITS } from "../src/lib/blog/validation.ts";
import {
  testImage,
  truncatedPng,
  svgBytes,
  fakeStore,
  fakeFileReader,
  refusingFileReader,
  absentKeyProvider,
  workingProvider,
  workingFetcher,
  failingFetcher,
} from "../mcp/testing/fakes.ts";

let passed = 0;
let failed = 0;

function ok(condition, label, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

const SITE = resolveSite("ese");
const TITLE = "Culvert replacement on tribal trust land";
const SLUG = "culvert-replacement-on-tribal-trust-land";

const b64 = (bytes) => Buffer.from(bytes).toString("base64");

/** Deps with no image provider reachable at all. */
function deps(extra = {}) {
  return {
    fetcher: failingFetcher(),
    store: fakeStore(),
    ...extra,
  };
}

/* ------------------------------------------------------- 1. a valid PNG */

section("1. A valid PNG uploads");

{
  const store = fakeStore();
  const png = await testImage(1600, 900, "png");
  const out = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(png) },
    deps({ store }),
  );

  ok(out.ok === true, "A PNG is accepted", out.ok ? "" : out.error);
  ok(out.ok && out.source === "client-generated", "source is client-generated", out.ok ? out.source : "");
  ok(out.ok && out.via === "base64", "via records the input mode");
  ok(store.uploads.length === 1, "Exactly one object was stored", String(store.uploads.length));
}

/* ------------------------------------------------------ 2. a valid JPEG */

section("2. A valid JPEG uploads");

{
  const store = fakeStore();
  const jpeg = await testImage(1200, 1200, "jpeg");
  const out = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(jpeg) },
    deps({ store }),
  );
  ok(out.ok === true, "A JPEG is accepted", out.ok ? "" : out.error);
  // A square input proves the resize is a crop to 1.91:1 rather than a pass-through.
  ok(out.ok && out.width === 1200 && out.height === 630, "A square JPEG is cropped to 1200x630",
    out.ok ? `${out.width}x${out.height}` : "");
}

section("2b. WebP in, WebP out");

{
  const webp = await testImage(1600, 900, "webp");
  const out = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(webp) },
    deps(),
  );
  ok(out.ok === true, "A WebP is accepted", out.ok ? "" : out.error);
}

/* ------------------------------------------- 3. conversion to cover format */

section("3. Output is always 1200x630 WebP");

for (const [w, h, fmt] of [[800, 400, "png"], [3000, 3000, "jpeg"], [640, 480, "png"]]) {
  const bytes = await testImage(w, h, fmt);
  const out = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(bytes) },
    deps(),
  );
  ok(
    out.ok && out.width === 1200 && out.height === 630 && out.format === "webp" &&
      out.contentType === "image/webp",
    `${w}x${h} ${fmt} normalises to 1200x630 webp`,
    out.ok ? `${out.width}x${out.height} ${out.contentType}` : out.error,
  );
}

{
  // EXIF stripping is what re-encoding buys, and the re-encode is observable:
  // the stored bytes are not the bytes that were sent.
  const store = fakeStore();
  const png = await testImage(1600, 900, "png");
  await uploadClientCover({ title: TITLE, slug: SLUG, imageBase64: b64(png) }, deps({ store }));
  ok(store.uploads[0].bytes !== png.byteLength,
    "The stored bytes are re-encoded, not passed through",
    `sent ${png.byteLength}, stored ${store.uploads[0].bytes}`);
  ok(store.uploads[0].contentType === "image/webp", "Stored with the webp content type");
}

/* --------------------------------------------------- 4. the storage URL */

section("4. The returned URL is the stored object");

{
  const store = fakeStore();
  const png = await testImage(1600, 900, "png");
  const out = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(png) },
    deps({ store }),
  );
  ok(out.ok && out.path.startsWith(`covers/${SLUG}-`), "Stored under the covers/<slug>- convention",
    out.ok ? out.path : "");
  ok(out.ok && out.path.endsWith(".webp"), "With a .webp extension");
  ok(out.ok && out.url.endsWith(out.path), "The URL points at that exact path", out.ok ? out.url : "");
  ok(store.uploads[0].slug === SLUG, "The store was handed the validated slug");
}

/* ------------------------------------------------------------ 5. alt text */

section("5. Alt text");

{
  const png = await testImage(1600, 900, "png");

  const supplied = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(png), imageAlt: "A concrete culvert under a gravel road." },
    deps(),
  );
  ok(supplied.ok && supplied.alt === "A concrete culvert under a gravel road.",
    "A supplied alt is preserved verbatim", supplied.ok ? supplied.alt : "");
  ok(supplied.ok && supplied.altFromCaller === true, "and flagged as the caller's");

  const derived = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(png) },
    deps(),
  );
  ok(derived.ok && derived.alt.includes(TITLE), "An absent alt is derived from the title",
    derived.ok ? derived.alt : "");
  ok(derived.ok && derived.altFromCaller === false, "and flagged as derived");

  // The derived line must not invent anything. It restates the title, so the only
  // way it could name a Nation is if the title did.
  ok(!/Tribe|Nation|Chairman|awarded|partnership/i.test(altForClientCover("A study of river flow")),
    "The derived alt invents no affiliation, award, or partnership",
    altForClientCover("A study of river flow"));

  const tooLong = "x".repeat(FIELD_LIMITS.coverImageAlt.max + 1);
  const over = resolveAlt(TITLE, tooLong);
  ok(over.fromCaller === false && over.alt.length <= FIELD_LIMITS.coverImageAlt.max,
    "An over-length alt is replaced, not truncated mid-word", `${over.alt.length} chars`);

  ok(resolveAlt(TITLE, "   ").fromCaller === false, "Whitespace-only alt falls back");
}

/* --------------------------------------------- 6. unsupported file types */

section("6. Unsupported formats are refused");

{
  const svg = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(svgBytes()) },
    deps(),
  );
  ok(svg.ok === false, "An SVG is refused");
  ok(!svg.ok && /svg/i.test(svg.error), "and refused by name, not by failing to decode", svg.ok ? "" : svg.error.slice(0, 70));

  const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00]);
  const g = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(gif) },
    deps(),
  );
  ok(g.ok === false, "A GIF is refused — PNG, JPEG, WebP only");
  ok(!g.ok && /PNG, JPEG, and WebP/.test(g.error), "and the refusal names what IS supported");
}

/* ------------------------------------------------------- 7. oversized files */

section("7. Oversized input is refused");

{
  const store = fakeStore();
  // Incompressible noise, so the encoded size really is over the limit.
  const huge = Buffer.alloc(UPLOAD_MAX_BYTES + 1024);
  for (let i = 0; i < huge.length; i += 1) huge[i] = i % 251;
  // Give it a PNG magic prefix so the size check is what rejects it, not sniffing.
  huge.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

  const out = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: huge.toString("base64") },
    deps({ store }),
  );
  ok(out.ok === false, "An oversized image is refused");
  ok(!out.ok && /limit/i.test(out.error), "and the reason names the limit", out.ok ? "" : out.error.slice(0, 70));
  ok(store.uploads.length === 0, "Nothing was stored");
}

/* --------------------------------------------------- 8. non-image content */

section("8. Non-image content is refused");

{
  const store = fakeStore();
  const text = new TextEncoder().encode("This is a blog post, not an image.");
  const out = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(text) },
    deps({ store }),
  );
  ok(out.ok === false, "A text file is refused");
  ok(store.uploads.length === 0, "Nothing was stored");

  // Not valid base64 at all — must be reported as such rather than as a decode
  // failure, because Buffer.from would otherwise silently return partial bytes.
  const notB64 = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: "/Users/me/cover.png" },
    deps(),
  );
  ok(notB64.ok === false, "A filename sent as imageBase64 is refused");
  ok(!notB64.ok && /not valid base64/i.test(notB64.error),
    "and named as a base64 problem, not a decode problem", notB64.ok ? "" : notB64.error.slice(0, 60));

  const truncated = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(truncatedPng()) },
    deps(),
  );
  ok(truncated.ok === false, "Bytes that sniff as PNG but cannot decode are refused");

  const empty = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: "" },
    deps(),
  );
  ok(empty.ok === false, "An empty imageBase64 is refused");
  ok(!empty.ok && /No image was supplied|empty/i.test(empty.error), "with an actionable message");
}

/* ------------------------------------------- 8b. no image supplied at all */

section("8b. No image at all");

{
  const out = await uploadClientCover({ title: TITLE, slug: SLUG }, deps());
  ok(out.ok === false, "Supplying no image is refused");
  ok(!out.ok && /imageBase64/.test(out.error), "and the message names the modes available");
}

/* ---------------------------------------- 8c. the imagePath transport gate */

section("8c. imagePath is a capability, not a flag");

{
  const png = await testImage(1600, 900, "png");
  const path = "/tmp/generated-cover.png";

  // No reader injected: this is the HTTP transport, and the refusal must happen
  // before anything touches a filesystem.
  const refused = await uploadClientCover(
    { title: TITLE, slug: SLUG, imagePath: path },
    deps(),
  );
  ok(refused.ok === false, "With no reader injected, imagePath is refused");
  ok(!refused.ok && /not available on this transport/i.test(refused.error),
    "and the reason says why", refused.ok ? "" : refused.error.slice(0, 70));

  // Reader injected: this is stdio.
  const reader = fakeFileReader({ [path]: png });
  const accepted = await uploadClientCover(
    { title: TITLE, slug: SLUG, imagePath: path },
    deps({ files: reader }),
  );
  ok(accepted.ok === true, "With a reader injected, imagePath works", accepted.ok ? "" : accepted.error);
  ok(accepted.ok && accepted.via === "path", "via records the path mode");
  ok(reader.calls.length === 1 && reader.calls[0] === path,
    "The path was passed through untouched", reader.calls[0]);

  const denied = await uploadClientCover(
    { title: TITLE, slug: SLUG, imagePath: path },
    deps({ files: refusingFileReader() }),
  );
  ok(denied.ok === false, "A reader that refuses is reported, not swallowed");
}

/* ------------------------------------------------------- 8d. the url mode */

section("8d. imageUrl reuses the guarded fetcher");

{
  const out = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageUrl: "https://example.test/cover.png" },
    deps({ fetcher: workingFetcher(1800, 1000) }),
  );
  ok(out.ok === true, "A fetchable URL works", out.ok ? "" : out.error);
  ok(out.ok && out.via === "url", "via records the url mode");

  const blocked = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageUrl: "http://169.254.169.254/latest/meta-data/" },
    deps({ fetcher: failingFetcher("Refused: link-local address.") }),
  );
  ok(blocked.ok === false, "A fetcher refusal propagates", blocked.ok ? "" : blocked.error.slice(0, 50));
}

/* ------------------------------- 9. generate_cover_image still works */

section("9. generate_cover_image is untouched");

{
  const store = fakeStore();
  const provider = workingProvider();
  const outcome = await resolveCover(
    { site: SITE, title: TITLE, eyebrow: "Project implementation", slug: SLUG, model: "m", quality: "low" },
    { provider, fetcher: failingFetcher(), store: { uploadCover: store.uploadCover } },
  );
  ok(outcome.ok === true, "The generate path still produces a cover", outcome.ok ? "" : outcome.error);
  ok(outcome.ok && outcome.source === "generated-image", "and still reports generated-image",
    outcome.ok ? outcome.source : "");
  ok(provider.calls.length === 1, "The provider was called exactly once");
}

/* -------------------------- 12. no image-generation key is required */

section("12. No OPENAI_API_KEY is needed for a client-supplied file");

{
  const provider = absentKeyProvider();
  const store = fakeStore();
  const png = await testImage(1600, 900, "png");

  const out = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(png) },
    // The provider is deliberately in scope but NOT in the deps: `UploadDeps` has
    // no `provider` member, so this path cannot reach one even if it wanted to.
    deps({ store }),
  );
  ok(out.ok === true, "The upload succeeds with no key configured", out.ok ? "" : out.error);
  ok(provider.calls.length === 0, "and no image provider was called at all",
    String(provider.calls.length));
  ok(!("provider" in deps({ store })), "UploadDeps carries no provider to call");
}

/* ------------------------------- 13. failed upload does not block a draft */

section("13. A failed cover never blocks the article");

{
  // Storage down: the upload fails, and the failure is a value the caller can act
  // on rather than an exception that would abort the tool call.
  const store = fakeStore();
  store.uploadShouldFail = true;
  const png = await testImage(1600, 900, "png");

  const out = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(png) },
    deps({ store }),
  );
  ok(out.ok === false, "An upload failure is returned, not thrown");

  // And the documented fallback still works afterwards, with a fresh store.
  const good = fakeStore();
  const fellBack = await resolveCover(
    { site: SITE, title: TITLE, eyebrow: "ESE", slug: SLUG, model: "m", quality: "low" },
    { provider: absentKeyProvider(), fetcher: failingFetcher(), store: { uploadCover: good.uploadCover } },
  );
  ok(fellBack.ok === true, "generate_cover_image still runs after an upload failure");
  ok(fellBack.ok && fellBack.source === "composed-brand-cover",
    "and with no key it lands on the branded card", fellBack.ok ? fellBack.source : "");
  ok(fellBack.ok && fellBack.fellBackToBrandCover === true,
    "flagged so the client cannot claim it generated artwork");

  // A draft with no cover at all is valid — that is the last fallback.
  const draftStore = fakeStore();
  const created = await draftStore.createDraft({
    title: TITLE, slug: SLUG, excerpt: "x", content: "y",
    seoTitle: null, seoDescription: null,
    coverImageUrl: null, coverImageAlt: null,
    focusKeyword: null, category: "blog",
  });
  ok(Boolean(created.id), "A coverless draft can still be created");
}

/* --------------- 10 & 11. create_draft round-trips the uploaded cover */

section("10 & 11. create_draft stores the exact uploaded url and alt");

{
  const store = fakeStore();
  const png = await testImage(1600, 900, "png");
  const alt = "A gravel road crossing a culvert at dusk.";

  const cover = await uploadClientCover(
    { title: TITLE, slug: SLUG, imageBase64: b64(png), imageAlt: alt },
    deps({ store }),
  );
  ok(cover.ok === true, "The cover uploads", cover.ok ? "" : cover.error);

  const created = await store.createDraft({
    title: TITLE,
    slug: SLUG,
    excerpt: "A short summary.",
    content: "Body text.",
    seoTitle: null,
    seoDescription: null,
    coverImageUrl: cover.ok ? cover.url : null,
    coverImageAlt: cover.ok ? cover.alt : null,
    focusKeyword: null,
    category: "blog",
  });

  ok(Boolean(created.id), "create_draft accepts the uploaded cover");

  const row = store.drafts[store.drafts.length - 1];
  ok(row.coverImageUrl === (cover.ok ? cover.url : null),
    "The draft stores the EXACT url returned by upload_cover_image", row.coverImageUrl);
  ok(row.coverImageAlt === alt, "and the EXACT alt", row.coverImageAlt);
  ok(row.coverImageUrl.includes(`covers/${SLUG}-`), "which is the hosted ESE object, not a client URL");
}

/* ------------------------------ the registered tool, through its handler */

section("The registered tool, called the way a client calls it");

{
  // The suites above exercise the module and the handshake proves the schema is
  // advertised, but neither goes through the handler — which is where a mistyped
  // argument name would sit undetected, silently making every upload a
  // "no image was supplied" error.
  const store = fakeStore();
  const png = await testImage(1600, 900, "png");
  const handlers = new Map();
  const fakeServer = {
    setRequestHandler(_schema, handler) {
      handlers.set(handlers.size === 0 ? "list" : "call", handler);
    },
  };

  registerTools(
    fakeServer,
    {
      store,
      provider: absentKeyProvider(),
      fetcher: failingFetcher(),
      model: "m",
      quality: "low",
    },
    { localFiles: fakeFileReader({ "/tmp/c.png": png }) },
  );

  const call = (name, args) => handlers.get("call")({ params: { name, arguments: args } });

  const res = await call("upload_cover_image", {
    site: "ese",
    title: TITLE,
    slug: SLUG,
    imageBase64: b64(png),
    imageAlt: "A culvert under a gravel road.",
  });
  const text = res.content?.[0]?.text ?? "";

  ok(!res.isError, "The tool call succeeds", res.isError ? text.slice(0, 90) : "");
  ok(/^source: client-generated$/m.test(text), "It reports source: client-generated");
  ok(/^url: https:\/\/fake\.storage\.test\/covers\//m.test(text), "It reports the hosted url");
  ok(/^alt: A culvert under a gravel road\.$/m.test(text), "It reports the caller's alt verbatim");
  ok(/^width: 1200$/m.test(text) && /^height: 630$/m.test(text), "It reports 1200x630");
  ok(/^contentType: image\/webp$/m.test(text), "It reports the content type");
  ok(/^altFromCaller: true$/m.test(text), "It says whose alt text was used");
  ok(store.uploads.length === 1, "One object stored via the handler");

  // The path mode, through the handler, with the capability injected.
  const viaPath = await call("upload_cover_image", {
    site: "ese", title: TITLE, slug: SLUG, imagePath: "/tmp/c.png",
  });
  ok(!viaPath.isError, "imagePath works through the handler when localFiles is present");
  ok(/^via: path$/m.test(viaPath.content?.[0]?.text ?? ""), "and reports via: path");

  // An unknown site must not be defaulted — this tool writes to storage.
  const badSite = await call("upload_cover_image", {
    site: "denalix", title: TITLE, slug: SLUG, imageBase64: b64(png),
  });
  ok(badSite.isError === true, "An unknown site is refused, not defaulted");

  // A bad slug must be refused before anything is stored, because the slug is
  // what the storage path is derived from.
  const before = store.uploads.length;
  const badSlug = await call("upload_cover_image", {
    site: "ese", title: TITLE, slug: "Not A Slug", imageBase64: b64(png),
  });
  ok(badSlug.isError === true, "An invalid slug is refused");
  ok(store.uploads.length === before, "and nothing was stored for it");

  const noImage = await call("upload_cover_image", { site: "ese", title: TITLE, slug: SLUG });
  ok(noImage.isError === true, "Calling it with no image is an error");
  ok(/generate_cover_image/.test(noImage.content?.[0]?.text ?? ""),
    "and the error names the fallback tool");
}

section("The same handler, with no localFiles — the HTTP transport");

{
  const handlers = new Map();
  const fakeServer = {
    setRequestHandler(_schema, handler) {
      handlers.set(handlers.size === 0 ? "list" : "call", handler);
    },
  };
  registerTools(
    fakeServer,
    { store: fakeStore(), provider: absentKeyProvider(), fetcher: failingFetcher(), model: "m", quality: "low" },
    {}, // no localFiles — this is src/app/api/mcp/route.ts
  );

  const res = await handlers.get("call")({
    params: { name: "upload_cover_image", arguments: { site: "ese", title: TITLE, slug: SLUG, imagePath: "/etc/passwd" } },
  });
  ok(res.isError === true, "imagePath is refused when no reader was injected");
  ok(/not available on this transport/i.test(res.content?.[0]?.text ?? ""),
    "and the refusal explains the transport boundary");
}


/* ------------------------------------------- the out-of-band ticket flow */

section("Ticket flow — the bridge for clients that cannot carry bytes");

{
  const store = fakeStore();
  const png = await testImage(1600, 900, "png");

  const issued = await store.createCoverTicket({
    site: "ese", slug: SLUG, title: TITLE,
    imageAlt: "A culvert under a gravel road.",
    userId: "00000000-0000-4000-8000-000000000001",
    ttlSeconds: 900,
  });
  ok(Boolean(issued.ticket), "A ticket is issued", issued.ticket);
  ok(Boolean(issued.expiresAt), "with an expiry");

  const pending = await store.readCoverTicket(issued.ticket);
  ok(pending?.result === null, "Before any upload there is no result");
  ok(pending?.consumed === false, "and it is unconsumed");

  // The upload endpoint's sequence: claim, then run the same pipeline.
  const claim = await store.claimCoverTicket(issued.ticket);
  ok(claim?.slug === SLUG, "Claiming returns the slug fixed at issue time", claim?.slug);
  ok(claim?.imageAlt === "A culvert under a gravel road.",
    "and the alt recorded at issue time — not supplied by the uploader");

  ok((await store.claimCoverTicket(issued.ticket)) === null,
    "A second claim is refused — single use");

  const out = await uploadClientCover(
    { title: claim.title, slug: claim.slug, imageBytes: png, imageAlt: claim.imageAlt },
    deps({ store }),
  );
  ok(out.ok === true, "The bytes mode uploads without any base64", out.ok ? "" : out.error);
  ok(out.ok && out.via === "bytes", "and records via: bytes");

  await store.recordCoverResult(issued.ticket, {
    url: out.url, path: out.path, alt: out.alt,
    width: out.width, height: out.height, contentType: out.contentType,
  });

  const done = await store.readCoverTicket(issued.ticket);
  ok(done?.result?.url === out.url, "The result reads back on the ticket", done?.result?.url);
  ok(done?.result?.alt === "A culvert under a gravel road.", "with the alt intact");
  ok(done?.result?.width === 1200 && done?.result?.height === 630, "at 1200x630");
}

section("Ticket flow — refusals");

{
  const store = fakeStore();

  ok((await store.readCoverTicket("nope")) === null, "An unknown ticket reads as null");
  ok((await store.claimCoverTicket("nope")) === null, "and cannot be claimed");

  const expired = await store.createCoverTicket({
    site: "ese", slug: SLUG, title: TITLE, imageAlt: null,
    userId: "00000000-0000-4000-8000-000000000001",
    ttlSeconds: -1,
  });
  ok((await store.claimCoverTicket(expired.ticket)) === null, "An expired ticket cannot be claimed");
  ok((await store.readCoverTicket(expired.ticket))?.expired === true, "and reads as expired");

  // A rejected image releases the claim, so the person can try another file
  // without going back to the model for a new ticket.
  const retry = await store.createCoverTicket({
    site: "ese", slug: SLUG, title: TITLE, imageAlt: null,
    userId: "00000000-0000-4000-8000-000000000001",
    ttlSeconds: 900,
  });
  await store.claimCoverTicket(retry.ticket);
  await store.recordCoverFailure(retry.ticket, "SVG files are not accepted.");
  const after = await store.readCoverTicket(retry.ticket);
  ok(after?.failure === "SVG files are not accepted.", "A failure is recorded", after?.failure);
  ok(after?.consumed === false, "and the claim is released so the ticket can be retried");
  ok((await store.claimCoverTicket(retry.ticket)) !== null, "so a second upload may be attempted");

  // But a ticket that produced a result stays spent.
  const spent = await store.createCoverTicket({
    site: "ese", slug: SLUG, title: TITLE, imageAlt: null,
    userId: "00000000-0000-4000-8000-000000000001",
    ttlSeconds: 900,
  });
  await store.claimCoverTicket(spent.ticket);
  await store.recordCoverResult(spent.ticket, {
    url: "https://x.test/a.webp", path: "covers/a.webp", alt: "a",
    width: 1200, height: 630, contentType: "image/webp",
  });
  await store.recordCoverFailure(spent.ticket, "should not release");
  ok((await store.readCoverTicket(spent.ticket))?.consumed === true,
    "A ticket that produced a result is never released again");
}

/* ------------------------------------------- the tool surface itself */


section("Tool surface");

ok(TOOL_NAMES.includes("upload_cover_image"), "upload_cover_image is in TOOL_NAMES");
ok(TOOL_NAMES.includes("generate_cover_image"), "generate_cover_image was NOT removed");
// Derived, not a literal — the same lesson the handshake and e2e suites
// learned: a hardcoded count makes every new tool fail an assertion about
// itself rather than about anything real.
ok(
  TOOL_NAMES.length === Object.keys(TOOL_SCOPE).length,
  "Every tool has a scope and the counts agree",
  `${TOOL_NAMES.length} tools`,
);
ok(TOOL_NAMES.includes("create_cover_upload"), "create_cover_upload is in TOOL_NAMES");
ok(TOOL_SCOPE.upload_cover_image === "blog:draft", "It requires the write scope",
  TOOL_SCOPE.upload_cover_image);
ok(!toolsForScopes(["blog:read"]).has("upload_cover_image"),
  "A read-only token cannot reach it");
ok(toolsForScopes(["blog:draft"]).has("upload_cover_image"),
  "A draft token can");

/* ------------------------------------------------------------------ summary */

console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed > 0) {
  console.log(`${failed} FAILED — see above.`);
  process.exit(1);
}
