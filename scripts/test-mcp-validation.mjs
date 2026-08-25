/**
 * Slug handling, path guards, the site registry, and module-scope purity.
 *
 * Same shape as `test-validation.mjs`: `node:assert`-style checks against the
 * real modules, no framework, run through the TypeScript resolve hook. Needs no
 * database, no network, and no API key — everything asserted here is a pure
 * function, which is why it can be the first checkpoint.
 *
 *   node --import ./scripts/register-ts.mjs scripts/test-mcp-validation.mjs
 */
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { checkSlugShape, coverObjectPath, randomSuffix } from "../mcp/paths.ts";
import { resolveSite, siteKeys } from "../mcp/site.ts";
import { renderWritingGuide } from "../mcp/writing-guide.ts";
import { sanitizeProviderMessage, readEnvOr } from "../mcp/lib.ts";
import { slugify } from "../src/lib/blog/validation.ts";

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

function throws(fn, label) {
  try {
    fn();
    ok(false, label, "did not throw");
  } catch (error) {
    ok(true, label, error.message.slice(0, 60));
  }
}

/* ------------------------------------------------------------- 1. slug shape */

section("1. Slug shape");

ok(checkSlugShape("a-valid-slug").ok, "A well-formed slug is accepted");
ok(checkSlugShape("  padded-slug  ").ok, "Surrounding whitespace is trimmed, not rejected");
ok(checkSlugShape("digits-123").ok, "Digits are allowed");

for (const [input, why] of [
  ["", "empty"],
  ["   ", "whitespace only"],
  ["Upper-Case", "uppercase"],
  ["-leading", "leading hyphen"],
  ["trailing-", "trailing hyphen"],
  ["double--hyphen", "doubled hyphen"],
  ["under_score", "underscore"],
  ["has space", "a space"],
]) {
  ok(!checkSlugShape(input).ok, `Refused: ${why}`);
}

section("1b. The characters that would become a path");

for (const [input, why] of [
  ["a/b", "forward slash"],
  ["a\\b", "backslash"],
  ["../escape", "parent traversal"],
  [".hidden", "leading dot"],
  ["nul\u0000byte", "an embedded null byte"],
]) {
  ok(!checkSlugShape(input).ok, `Refused: ${why}`);
}

section("1c. A rejection carries a usable suggestion");

const badCase = checkSlugShape("PFAS in Tribal Water Systems");
ok(!badCase.ok, "A prose title is not a valid slug");
ok(
  badCase.suggestion === slugify("PFAS in Tribal Water Systems"),
  "The suggestion comes from the app's own slugify",
  badCase.suggestion,
);
ok(
  checkSlugShape(badCase.suggestion).ok,
  "And the suggestion itself validates",
  badCase.suggestion,
);

const tooLong = checkSlugShape("a".repeat(200));
ok(!tooLong.ok, "A 200-character slug is refused");
ok(
  tooLong.suggestion !== null && tooLong.suggestion.length <= 160,
  "Its suggestion is within the 160-character limit",
  String(tooLong.suggestion?.length),
);

/* ----------------------------------------------------------- 2. cover paths */

section("2. Cover storage paths");

const suffix = randomSuffix();
ok(/^[a-z0-9]{4,12}$/.test(suffix), "randomSuffix is path-safe", suffix);

const path = coverObjectPath("pfas-in-tribal-water", "webp", "abc123");
ok(
  path === "covers/pfas-in-tribal-water-abc123.webp",
  "The path is derived from the validated slug",
  path,
);
ok(path.startsWith("covers/"), "Covers land under the covers/ prefix");

throws(
  () => coverObjectPath("../../etc/passwd", "webp", "abc123"),
  "A traversal slug cannot produce a path",
);
throws(
  () => coverObjectPath("valid-slug", "webp", "../bad"),
  "An unsafe suffix cannot produce a path",
);
throws(() => coverObjectPath("valid-slug", "webp", "x"), "A too-short suffix is refused");

/* -------------------------------------------------------- 3. site resolution */

section("3. Site resolution");

ok(
  siteKeys().length === 1 && siteKeys()[0] === "ese",
  "Exactly one site is registered",
  siteKeys().join(","),
);

const site = resolveSite("ese");
ok(site.key === "ese", "The exact key resolves");
ok(resolveSite("ESE").key === "ese", "Resolution is case-folded");
ok(resolveSite("  ese  ").key === "ese", "Resolution trims whitespace");

throws(() => resolveSite("denalix"), "An unknown key is refused");
throws(() => resolveSite("es"), "A prefix does NOT fuzzy-match");
throws(() => resolveSite("ese-staging"), "A superstring does NOT fuzzy-match");
throws(() => resolveSite(""), "An empty key is refused");
throws(() => resolveSite(undefined), "A missing key is refused");
throws(() => resolveSite(null), "A null key is refused");
throws(() => resolveSite(42), "A non-string key is refused");

let listsValidKeys = false;
try {
  resolveSite("nope");
} catch (error) {
  listsValidKeys = error.message.includes("ese");
}
ok(listsValidKeys, "The rejection names the valid keys");

/* ------------------------------------------------------- 4. registry content */

section("4. The registry is derived from ese-content, not retyped");

const EXPECTED_SERVICES = [
  "policy-support-and-sovereignty",
  "grant-development",
  "project-implementation",
  "sustainability-and-climate-resilience",
  "communications-support",
];

ok(
  site.services.map((s) => s.slug).join(",") === EXPECTED_SERVICES.join(","),
  "All five service slugs, in the content layer's order",
);
ok(
  site.services.every((s) => s.title.length > 0 && s.description.length > 40),
  "Each service carries its real title and description",
);
ok(
  site.services.every((s) => s.path === `/services/${s.slug}`),
  "Each service path is /services/<slug>",
);
ok(site.audience.length === 6, "Six audiences", String(site.audience.length));
ok(site.shortName === "ESE", "Short name comes from the content layer", site.shortName);
ok(site.mission.includes("sovereignty-respecting"), "Mission is the real statement");
ok(site.origin.startsWith("http"), "Origin is an absolute URL", site.origin);

section("4b. Link targets are only routes that exist");

const paths = site.linkTargets.map((t) => t.path);
for (const expected of [
  "/blog",
  "/news",
  "/people",
  "/#about",
  "/#services",
  "/#who-we-are",
  "/#contact",
  "/#who-we-serve",
]) {
  ok(paths.includes(expected), `Link target present: ${expected}`);
}
ok(
  !paths.includes("/services"),
  "/services is NOT a link target — there is no index route above the five pages",
);
ok(site.knownMissingPaths.includes("/services"), "/services is on the known-404 list");
ok(paths.every((p) => p.startsWith("/")), "Every link target is site-relative");
ok(
  EXPECTED_SERVICES.every((s) => paths.includes(`/services/${s}`)),
  "Every service page is a link target",
);

section("4c. Calls to action are usable from inside a post body");

ok(site.callsToAction.length > 0, "There is at least one CTA");
ok(
  site.callsToAction.every((cta) => !cta.href.startsWith("#")),
  "No bare-fragment CTA — a bare #contact scrolls to nothing from a post",
  site.callsToAction.map((c) => c.href).join(" "),
);
ok(
  site.callsToAction.every((cta) => !cta.href.includes("mailto:")),
  "No mailto CTA — ESE's public address is still a placeholder",
);
ok(
  site.callsToAction.every((cta) => cta.label.trim().length > 0),
  "Every CTA has a label",
);

/* --------------------------------------------------------- 5. writing guide */

section("5. The writing guide says what it must");

const guide = renderWritingGuide(site);

for (const [needle, why] of [
  ["list_posts", "tells the client to check for duplicates first"],
  ["generate_cover_image", "tells the client to make a cover before drafting"],
  ["rehype-raw", "warns that raw HTML is silently dropped"],
  ["300 words minimum", "states the body floor"],
  ["/services/<slug>", "warns that /services itself does not exist"],
  ["mailto:", "forbids the placeholder address"],
  ["noindex", "states the site is not indexed yet"],
  ["example.com", "states the canonical domain is a placeholder"],
  ["only ever create **drafts**", "states it cannot publish"],
  ["Native Nations", "uses ESE's own terminology"],
  ["deficit framing", "forbids deficit framing"],
  ["no columns for tags", "says related keywords and links are not persisted"],
]) {
  ok(guide.includes(needle), `Guide ${why}`);
}

ok(guide.length > 3000, "The guide is substantial", `${guide.length} chars`);
ok(!guide.includes("undefined"), "The guide interpolates no undefined values");
ok(!guide.includes("TODO(ese)"), "The guide does not leak a TODO marker into the brief");

/* ------------------------------------------------------- 6. no module throw */

section("6. Nothing in mcp/ throws at module scope");

function tsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) out.push(...tsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

const mcpDir = fileURLToPath(new URL("../mcp", import.meta.url));
const modules = tsFiles(mcpDir).sort();
ok(modules.length > 0, `Found ${modules.length} modules under mcp/`);

for (const file of modules) {
  const name = file.slice(mcpDir.length + 1);
  try {
    // Imported twice: a module that memoises configuration must stay
    // re-enterable, and the second call must not be carried purely by the
    // import cache masking a first-call side effect.
    await import(file);
    await import(file);
    ok(true, `Imports cleanly, twice: ${name}`);
  } catch (error) {
    ok(false, `Imports cleanly, twice: ${name}`, error.message.slice(0, 90));
  }
}

/* ------------------------------------------------------------ 7. small stuff */

section("7. Helpers");

ok(
  sanitizeProviderMessage(new Error("a\nb\n   c")) === "a b c",
  "Provider messages are flattened to one line",
);
ok(
  sanitizeProviderMessage(new Error("x".repeat(500))).length <= 301,
  "Provider messages are truncated",
);
ok(
  sanitizeProviderMessage("a plain string") === "a plain string",
  "A non-Error is handled",
);
ok(readEnvOr("DEFINITELY_NOT_SET_XYZ", "fallback") === "fallback", "readEnvOr falls back");

/* ------------------------------------------------------------------ summary */

console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed > 0) {
  console.log(`${failed} FAILED — see above.`);
  process.exit(1);
}
