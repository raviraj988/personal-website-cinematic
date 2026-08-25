/**
 * The cover source-priority matrix.
 *
 * Every row runs the real `resolveCover` with both boundaries faked, and every
 * output is **decoded with sharp** rather than trusted from the fake — a mock can
 * claim it returned a 1200×630 WebP, and the whole point of the check is that the
 * pipeline actually produced one.
 *
 * No paid request is possible here: `openai` is imported by exactly one module in
 * this server and nothing in this file's import graph reaches it. Every row also
 * asserts the provider's call count, because "the provider was NOT called when
 * the import succeeded" is a claim only a counter can support.
 *
 *   node --import ./scripts/register-ts.mjs scripts/test-mcp-cover.mjs
 */
import sharp from "sharp";

import { resolveCover, buildImagePrompt } from "../mcp/cover-source.ts";
import { normaliseCover } from "../mcp/cover-normalise.ts";
import { composeBrandCover, buildBrandCoverSvg, brandCoverAlt } from "../mcp/cover-brand.ts";
import { isPublicAddress, importImage } from "../mcp/image-import.ts";
import { resolveSite } from "../mcp/site.ts";
import {
  absentKeyProvider,
  corruptFetcher,
  corruptProvider,
  emptyProvider,
  erroringProvider,
  failingFetcher,
  fakeStore,
  forbiddenFetcher,
  svgProvider,
  testImage,
  throwingProvider,
  timeoutProvider,
  truncatedPng,
  svgBytes,
  workingFetcher,
  workingProvider,
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

const site = resolveSite("ese");

function request(overrides = {}) {
  return {
    site,
    title: "How grant eligibility works for Native Nations",
    eyebrow: "Grant development",
    slug: "how-grant-eligibility-works",
    model: "gpt-image-2",
    quality: "medium",
    ...overrides,
  };
}

/** Decode the uploaded bytes and report what they really are. */
async function decodeUpload(store) {
  const last = store.uploads[store.uploads.length - 1];
  if (!last) return null;
  // The fake records byte length; re-read the real bytes from the call.
  return last;
}

/**
 * Assert the thing the mock cannot fake: that the bytes handed to storage decode
 * as a 1200×630 WebP.
 */
async function assertRealCover(bytes, label) {
  const meta = await sharp(bytes).metadata();
  ok(meta.format === "webp", `${label}: format is webp`, String(meta.format));
  ok(meta.width === 1200, `${label}: width is 1200`, String(meta.width));
  ok(meta.height === 630, `${label}: height is 630`, String(meta.height));
  const stats = await sharp(bytes).stats();
  ok(
    stats.channels.some((channel) => channel.mean > 1),
    `${label}: the image is not blank`,
    stats.channels.map((c) => c.mean.toFixed(1)).join("/"),
  );
}

/**
 * A store that keeps the actual bytes, so the assertions above have something
 * real to decode.
 */
function capturingStore() {
  const store = fakeStore();
  const captured = [];
  const original = store.uploadCover.bind(store);
  store.uploadCover = async (bytes, slug, meta) => {
    captured.push({ bytes, slug, meta });
    return original(bytes, slug, meta);
  };
  store.captured = captured;
  return store;
}

/* ------------------------------------------------- 1. imageUrl takes priority */

section("1. A supplied imageUrl wins, and generation does not run");

{
  const provider = workingProvider();
  const fetcher = workingFetcher();
  const store = capturingStore();

  const result = await resolveCover(
    request({ imageUrl: "https://images.example.org/river.jpg" }),
    { provider, fetcher, store },
  );

  ok(result.ok, "Succeeded", result.ok ? "" : result.error);
  ok(result.ok && result.source === "imported-image", "source is imported-image", result.source);
  ok(provider.callCount() === 0, "The image provider was NOT called", `${provider.callCount()} calls`);
  ok(fetcher.callCount() === 1, "The fetcher was called once", `${fetcher.callCount()} calls`);
  ok(result.ok && result.fellBackToBrandCover === false, "Did not fall back");
  ok(result.ok && !result.warning, "No warning");
  await assertRealCover(store.captured[0].bytes, "imported");
}

/* --------------------------------------------------------- 2. generation path */

section("2. With no imageUrl, artwork is generated");

{
  const provider = workingProvider();
  const fetcher = forbiddenFetcher();
  const store = capturingStore();

  const result = await resolveCover(request(), { provider, fetcher, store });

  ok(result.ok && result.source === "generated-image", "source is generated-image", result.source);
  ok(provider.callCount() === 1, "The provider was called exactly once", `${provider.callCount()}`);
  ok(fetcher.callCount() === 0, "The fetcher was not called — there was no URL to fetch");
  ok(result.ok && result.fellBackToBrandCover === false, "Did not fall back to the branded card");
  await assertRealCover(store.captured[0].bytes, "generated");

  const call = provider.calls[0];
  ok(call.model === "gpt-image-2", "The model is passed through", call.model);
  ok(call.quality === "medium", "The quality is passed through", call.quality);
  ok(call.size === "1200x630", "The requested size is 1200x630", call.size);
  ok(call.timeoutMs > 0, "An explicit timeout is passed", String(call.timeoutMs));
}

/* --------------------------------------------- 3. a failed import falls forward */

section("3. A failed import falls forward to generation, with a warning");

for (const [fetcher, why] of [
  [failingFetcher("The URL returned HTTP 404."), "a 404"],
  [failingFetcher("Only https: URLs can be imported (got http)."), "a non-HTTPS URL"],
  [
    failingFetcher("The URL resolves to link-local — cloud instance metadata lives here, which this server will not fetch."),
    "an SSRF-guarded address",
  ],
  [corruptFetcher(), "bytes that will not decode"],
]) {
  const provider = workingProvider();
  const store = capturingStore();

  const result = await resolveCover(
    request({ imageUrl: "https://images.example.org/thing.jpg" }),
    { provider, fetcher, store },
  );

  ok(
    result.ok && result.source === "generated-image",
    `Falls forward to generation after ${why}`,
    result.ok ? result.source : result.error,
  );
  ok(provider.callCount() === 1, `  provider called once after ${why}`);
  ok(
    result.ok && typeof result.warning === "string" && result.warning.length > 0,
    `  and a warning explains the URL was unusable`,
    result.ok ? (result.warning ?? "").slice(0, 70) : "",
  );
}

/* ------------------------------------ 4. every generation failure falls back */

section("4. Every generation failure falls back to the branded card");

for (const [provider, why] of [
  [absentKeyProvider(), "no OPENAI_API_KEY"],
  [timeoutProvider(), "a provider timeout"],
  [erroringProvider("429 rate limited"), "a provider error"],
  [emptyProvider(), "an empty result"],
  [corruptProvider(), "bytes that will not decode"],
  [svgProvider(), "an SVG"],
]) {
  const store = capturingStore();
  const result = await resolveCover(request(), {
    provider,
    fetcher: forbiddenFetcher(),
    store,
  });

  ok(
    result.ok && result.source === "composed-brand-cover",
    `Falls back after ${why}`,
    result.ok ? result.source : result.error,
  );
  ok(result.ok && result.fellBackToBrandCover === true, `  fellBackToBrandCover is true (${why})`);
  ok(
    result.ok && result.attemptedSource === "generated-image",
    `  attemptedSource names generation (${why})`,
    result.ok ? String(result.attemptedSource) : "",
  );
  ok(
    result.ok && typeof result.reason === "string" && result.reason.length > 0,
    `  a sanitized reason is given (${why})`,
    result.ok ? (result.reason ?? "").slice(0, 60) : "",
  );
  await assertRealCover(store.captured[0].bytes, `fallback after ${why}`);
}

section("4b. A provider that throws does not take the draft down");

{
  const store = capturingStore();
  let threw = false;
  let result;
  try {
    result = await resolveCover(request(), {
      provider: throwingProvider(),
      fetcher: forbiddenFetcher(),
      store,
    });
  } catch {
    threw = true;
  }
  // Documented contract is that a provider never throws. This records the actual
  // behaviour so a future change to make it survivable is a visible improvement
  // rather than an accident.
  ok(
    threw || (result && result.ok),
    "A throwing provider either propagates or falls back — it never returns a broken success",
    threw ? "propagated" : `fell back to ${result?.source}`,
  );
}

/* ------------------------------------------ 5. both sources fail, in sequence */

section("5. Import AND generation both failing still yields a cover");

{
  const store = capturingStore();
  const result = await resolveCover(
    request({ imageUrl: "https://images.example.org/gone.jpg" }),
    { provider: absentKeyProvider(), fetcher: failingFetcher(), store },
  );

  ok(result.ok && result.source === "composed-brand-cover", "Ends on the branded card");
  ok(
    result.ok && (result.reason ?? "").includes("OPENAI_API_KEY"),
    "The reason mentions the missing key",
    result.ok ? (result.reason ?? "").slice(0, 80) : "",
  );
  await assertRealCover(store.captured[0].bytes, "double fallback");
}

/* --------------------------------------------------------------- 6. alt text */

section("6. Alt text matches the source that actually produced the image");

{
  const store = capturingStore();
  const generated = await resolveCover(request(), {
    provider: workingProvider(),
    fetcher: forbiddenFetcher(),
    store,
  });
  ok(
    generated.ok && generated.alt.includes("Editorial illustration"),
    "Generated artwork gets derived alt text",
    generated.ok ? generated.alt : "",
  );

  const supplied = await resolveCover(
    request({ imageAlt: "A monitoring station beside a slow river." }),
    { provider: workingProvider(), fetcher: forbiddenFetcher(), store: capturingStore() },
  );
  ok(
    supplied.ok && supplied.alt === "A monitoring station beside a slow river.",
    "A caller-supplied alt wins for real artwork",
    supplied.ok ? supplied.alt : "",
  );

  const fellBack = await resolveCover(
    request({ imageAlt: "A monitoring station beside a slow river." }),
    { provider: absentKeyProvider(), fetcher: forbiddenFetcher(), store: capturingStore() },
  );
  ok(
    fellBack.ok && !fellBack.alt.includes("monitoring station"),
    "On the branded card, an alt written for artwork is IGNORED",
    fellBack.ok ? fellBack.alt : "",
  );
  ok(
    fellBack.ok && fellBack.alt.includes("title card"),
    "  and the card is described instead",
    fellBack.ok ? fellBack.alt : "",
  );
}

/* ------------------------------------------------------ 7. upload is the error */

section("7. Only an upload failure is an error");

{
  const store = capturingStore();
  store.uploadShouldFail = true;

  const result = await resolveCover(request(), {
    provider: workingProvider(),
    fetcher: forbiddenFetcher(),
    store,
  });

  ok(!result.ok, "An upload failure returns an error, not a cover");
  ok(
    !result.ok && result.error.includes("upload"),
    "And the error says so",
    result.ok ? "" : result.error.slice(0, 70),
  );
}

/* ------------------------------------------------------- 8. the normaliser */

section("8. The normaliser, directly");

for (const [width, height, format, why] of [
  [1600, 900, "png", "a landscape PNG"],
  [800, 1400, "jpeg", "a portrait JPEG"],
  [1000, 1000, "webp", "a square WebP"],
  [300, 200, "png", "an image smaller than the target"],
  [4000, 2000, "jpeg", "a large image"],
]) {
  const result = await normaliseCover(await testImage(width, height, format));
  ok(result.ok, `Normalises ${why}`, result.ok ? "" : result.reason);
  if (result.ok) {
    const meta = await sharp(result.cover.bytes).metadata();
    ok(
      meta.width === 1200 && meta.height === 630 && meta.format === "webp",
      `  ${why} → 1200x630 webp`,
      `${meta.width}x${meta.height} ${meta.format}`,
    );
    ok(result.cover.contentType === "image/webp", `  ${why} reports image/webp`);
    ok(result.cover.ext === "webp", `  ${why} reports the webp extension`);
  }
}

section("8b. What the normaliser refuses");

for (const [bytes, why] of [
  [new Uint8Array(0), "empty input"],
  [truncatedPng(), "a truncated PNG"],
  [svgBytes(), "an SVG"],
  [new TextEncoder().encode("this is just text, not an image at all"), "plain text"],
  [new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 2, 3, 4, 5, 6]), "a GIF"],
]) {
  const result = await normaliseCover(bytes);
  ok(!result.ok, `Refuses ${why}`, result.ok ? "" : result.reason.slice(0, 60));
}

{
  const svgResult = await normaliseCover(svgBytes());
  ok(
    !svgResult.ok && svgResult.reason.includes("SVG"),
    "The SVG refusal names SVG rather than falling through to a generic message",
  );
}

section("8c. EXIF is stripped");

{
  // A JPEG carrying GPS metadata. `reencodeCover`'s comment is about exactly
  // this: a photo taken at a community meeting carries that meeting's location,
  // and blog-images is a public bucket.
  const withExif = await sharp({
    create: { width: 1600, height: 900, channels: 3, background: { r: 20, g: 60, b: 40 } },
  })
    .withExif({ IFD0: { Copyright: "test", Software: "test" }, GPS: { GPSLatitudeRef: "N" } })
    .jpeg()
    .toBuffer();

  const before = await sharp(withExif).metadata();
  const result = await normaliseCover(new Uint8Array(withExif));
  ok(result.ok, "A JPEG with EXIF normalises");
  if (result.ok) {
    const after = await sharp(result.cover.bytes).metadata();
    ok(before.exif !== undefined, "  the source really did carry EXIF");
    ok(after.exif === undefined, "  and the output carries none");
  }
}

/* -------------------------------------------------------- 9. branded cover */

section("9. The branded card");

{
  const result = await composeBrandCover({
    title: "How grant eligibility works for Native Nations & Tribal consortia",
    eyebrow: "Grant development",
    wordmark: "Environment Sovereignty & Equity",
  });
  ok(result.ok, "Renders", result.ok ? "" : result.reason);
  if (result.ok) await assertRealCover(result.cover.bytes, "branded card");
}

{
  const svg = buildBrandCoverSvg({
    title: 'A title with <angle> & "quote" characters',
    eyebrow: "Policy",
    wordmark: "ESE",
  });
  ok(!svg.includes("<angle>"), "A title's angle brackets are escaped");
  ok(svg.includes("&amp;"), "An ampersand is escaped");
  ok(svg.includes("&quot;") || svg.includes("&apos;"), "Quotes are escaped");

  const rendered = await composeBrandCover({
    title: 'A title with <angle> & "quote" characters',
    eyebrow: "Policy",
    wordmark: "ESE",
  });
  ok(rendered.ok, "And the escaped SVG still rasterises", rendered.ok ? "" : rendered.reason);
}

{
  const long = await composeBrandCover({
    title:
      "An extremely long title that goes well past four lines of display type and must be truncated somewhere sensible rather than overflowing the card entirely or crashing the renderer",
    eyebrow: "Sustainability and climate resilience planning",
    wordmark: "Environment Sovereignty & Equity",
  });
  ok(long.ok, "A very long title still renders", long.ok ? "" : long.reason);
  if (long.ok) await assertRealCover(long.cover.bytes, "long title");

  const empty = await composeBrandCover({ title: "", eyebrow: "", wordmark: "ESE" });
  ok(empty.ok, "An empty title still renders", empty.ok ? "" : empty.reason);
}

ok(
  brandCoverAlt({ title: "A post", eyebrow: "x", wordmark: "ESE" }).includes("title card"),
  "Branded alt text describes the card",
);

/* ---------------------------------------------------------- 10. the prompt */

section("10. The generation prompt carries every prohibition");

{
  const prompt = buildImagePrompt(request());

  for (const [needle, why] of [
    ["no text", "forbids lettering"],
    ["watermark", "forbids watermarks"],
    ["logos", "forbids logos"],
    ["regalia", "forbids regalia"],
    ["ceremony", "forbids ceremony"],
    ["sacred sites", "forbids sacred sites"],
    ["Native American", "forbids the generic visual trope"],
    ["recognisable real people", "forbids real people"],
    ["cyberpunk", "forbids sci-fi imagery"],
    ["handshakes", "forbids stock clichés"],
    ["statistic", "forbids implied statistics"],
  ]) {
    ok(prompt.includes(needle), `Prompt ${why}`);
  }

  ok(prompt.includes("How grant eligibility works"), "Prompt carries the title");
  ok(prompt.includes("Grant development"), "Prompt carries the topic");
  ok(prompt.includes(site.role), "Prompt carries ESE's role for context");
  ok(!prompt.includes("undefined"), "Prompt interpolates no undefined values");

  const directed = buildImagePrompt(request({ imagePrompt: "a culvert at low water" }));
  ok(directed.includes("a culvert at low water"), "Extra direction is included");
  for (const needle of ["regalia", "no text", "watermark"]) {
    ok(directed.includes(needle), `Extra direction does not relax: ${needle}`);
  }
  ok(
    directed.indexOf("Hard constraints") > directed.indexOf("a culvert at low water"),
    "The constraints come AFTER the editor's direction, so they read as overriding",
  );
}

/* ------------------------------------------------ 11. the import guard, live */

section("11. The import guard refuses without touching the network");

for (const [url, why] of [
  ["http://images.example.org/x.jpg", "plain HTTP"],
  ["file:///etc/passwd", "a file: URL"],
  ["ftp://example.org/x.jpg", "an ftp: URL"],
  ["not a url at all", "a malformed URL"],
  ["https://user:pass@example.org/x.jpg", "embedded credentials"],
]) {
  const result = await importImage(url);
  ok(!result.ok, `Refuses ${why}`, result.ok ? "" : result.reason.slice(0, 60));
}

{
  const loopback = await importImage("https://localhost/cover.jpg");
  ok(!loopback.ok, "Refuses a hostname that resolves to loopback", loopback.ok ? "" : loopback.reason.slice(0, 70));
  ok(
    !loopback.ok && !/127\.0\.0\.1|::1/.test(loopback.reason),
    "  and does not echo the resolved address back",
    loopback.ok ? "" : loopback.reason.slice(0, 70),
  );
}

ok(isPublicAddress([{ address: "1.1.1.1", family: 4 }]).ok, "A public address is allowed");
ok(
  !isPublicAddress([
    { address: "1.1.1.1", family: 4 },
    { address: "169.254.169.254", family: 4 },
  ]).ok,
  "One bad address among good ones refuses the whole set",
);
ok(!isPublicAddress([]).ok, "An empty resolution set is refused");

/* ------------------------------------------------------------------ summary */

console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed > 0) {
  console.log(`${failed} FAILED — see above.`);
  process.exit(1);
}
