/**
 * The pure, security-critical halves of the OAuth authorization server.
 *
 * PKCE verification, scope parsing, redirect construction, origin resolution, and
 * the sign-in return-to guard. Every one of these is a place where a bug is a
 * vulnerability rather than a malfunction, and every one of them is a pure
 * function — so they can be checked here with no database, no network, and no
 * session.
 *
 * Deliberately imports only the modules free of `import "server-only"`. `store.ts`
 * and `bearer.ts` throw on import outside a Next runtime, which is the same reason
 * `mcp/tools.ts` reuses `validation.ts` but not `queries.ts`. What they do is
 * covered by the live checks in the README instead.
 *
 *   node --import ./scripts/register-ts.mjs scripts/test-mcp-oauth.mjs
 */
import { verifyPkceS256, hashToken, safeEqual } from "../src/lib/mcp-auth/crypto.ts";
import { buildRedirect, readAuthorizeParams } from "../src/lib/mcp-auth/params.ts";
import { safeReturnTo } from "../src/lib/mcp-auth/return-to.ts";
import { parseScopes, scopeChoices } from "../src/lib/mcp-auth/config.ts";
import { SITE_ORIGIN } from "../src/lib/blog/config.ts";
import { resolveOrigin } from "../src/lib/mcp-auth/origin.ts";
import { createHash, randomBytes } from "node:crypto";

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

/* ------------------------------------------------------------------- 1. PKCE */

section("1. PKCE S256");

const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");

ok(verifyPkceS256(verifier, challenge), "A correct verifier passes");
ok(!verifyPkceS256(verifier, "wrong-challenge"), "A wrong challenge fails");
ok(
  !verifyPkceS256(randomBytes(32).toString("base64url"), challenge),
  "A different verifier for the same challenge fails",
);

// RFC 7636 §4.1 length bounds. A short verifier is brute-forceable, so accepting
// one would quietly undo the protection PKCE exists to provide.
ok(!verifyPkceS256("tooshort", createHash("sha256").update("tooshort").digest("base64url")),
  "A verifier under 43 characters is refused even when it hashes correctly");
const long = "a".repeat(129);
ok(
  !verifyPkceS256(long, createHash("sha256").update(long).digest("base64url")),
  "A verifier over 128 characters is refused even when it hashes correctly",
);

// The unreserved set. A verifier containing anything else is malformed, and
// tolerating it would mean accepting input the spec says cannot occur.
ok(
  !verifyPkceS256(`${"a".repeat(42)}+`, createHash("sha256").update(`${"a".repeat(42)}+`).digest("base64url")),
  "A verifier with a non-unreserved character is refused",
);

ok(hashToken("abc") === createHash("sha256").update("abc").digest("hex"), "hashToken is SHA-256 hex");
ok(hashToken("abc") !== "abc", "hashToken does not return its input");
ok(safeEqual("abc", "abc") && !safeEqual("abc", "abd"), "safeEqual compares correctly");
ok(!safeEqual("abc", "abcd"), "safeEqual handles differing lengths without throwing");

/* ----------------------------------------------------------------- 2. scopes */

section("2. Scope parsing");

ok(parseScopes("blog:read").length === 1, "One scope parses");
ok(parseScopes("blog:read blog:draft").length === 2, "Two scopes parse");
ok(parseScopes("blog:read   blog:draft").length === 2, "Extra whitespace is tolerated");
ok(parseScopes("blog:read blog:read").length === 1, "Duplicates collapse");
ok(parseScopes("blog:admin").length === 0, "An unknown scope is dropped");
ok(parseScopes("blog:admin blog:read").length === 1, "A mixed list keeps only what is supported");
ok(parseScopes(null).length === 0, "null parses to nothing");
ok(parseScopes("").length === 0, "An empty string parses to nothing");

// RFC 6749 §3.3 lets the server issue a different set than requested, which is
// what makes a read-only-registered client recoverable by a human ticking a box.
ok(scopeChoices("blog:read").selectable.length === 2, "Every scope is offerable regardless of the request");
ok(
  scopeChoices("blog:read").preselected.join() === "blog:read",
  "What the client asked for is what is pre-ticked",
);
ok(scopeChoices(null).preselected.length === 2, "No requested scope pre-ticks everything");

/* -------------------------------------------------------------- 3. redirects */

section("3. Redirect construction");

const redirect = buildRedirect("https://chatgpt.com/cb", { code: "abc", state: "xyz" });
ok(redirect.startsWith("https://chatgpt.com/cb?"), "The registered URI is preserved");
ok(redirect.includes("code=abc") && redirect.includes("state=xyz"), "Values are appended");

ok(
  !buildRedirect("https://x.example/cb", { code: "abc", state: null }).includes("state"),
  "A null state is omitted rather than sent as the string 'null'",
);

// A client may legitimately register a redirect URI that already carries its own
// query, and dropping it would break that client.
ok(
  buildRedirect("https://x.example/cb?keep=1", { code: "abc" }).includes("keep=1"),
  "Existing query parameters on the registered URI survive",
);

const params = readAuthorizeParams(
  new URLSearchParams("client_id=a&redirect_uri=b&code_challenge=c&code_challenge_method=S256&state=d&scope=blog%3Aread&resource=e&response_type=code"),
);
ok(params.clientId === "a" && params.responseType === "code", "Authorize params are read");
ok(params.scope === "blog:read", "An encoded scope is decoded");
ok(readAuthorizeParams(new URLSearchParams("")).state === null, "A missing state is null, not empty string");

/* ------------------------------------------------------- 4. the return-to guard */

section("4. safeReturnTo — the open-redirect guard");

ok(
  safeReturnTo("/oauth/authorize?client_id=x") === "/oauth/authorize?client_id=x",
  "The one permitted path is returned",
);
ok(safeReturnTo(null) === null, "null is refused");
ok(safeReturnTo("") === null, "An empty string is refused");
ok(safeReturnTo("/admin") === null, "Another same-origin path is refused");
ok(safeReturnTo("/oauth/authorize/error") === null, "A sub-path is refused");

// Each of these is a real open-redirect bypass that a naive "starts with /" check
// would let through.
for (const hostile of [
  "https://evil.example/steal",
  "//evil.example/steal",
  "\\\\evil.example/steal",
  "/\\evil.example",
  "javascript:alert(1)",
  "http://localhost:3111/oauth/authorize?x=1",
]) {
  ok(safeReturnTo(hostile) === null, `Refused: ${hostile}`);
}

// Rebuilt from parsed parts, so a traversal that resolves elsewhere cannot slip
// through on the strength of its prefix.
ok(safeReturnTo("/oauth/authorize/../../admin") === null, "A traversal that escapes the path is refused");

/* --------------------------------------------------------------- 5. origin */

section("5. Origin resolution");

const savedOrigin = process.env.MCP_OAUTH_ORIGIN;
const savedVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
delete process.env.MCP_OAUTH_ORIGIN;
delete process.env.VERCEL_PROJECT_PRODUCTION_URL;

// STEP 2 IS LIVE NOW. `site.canonicalBase` is the real domain, so `SITE_ORIGIN`
// is usable and `resolveOrigin` falls through to it — which is exactly what
// `origin.ts` says should happen once the placeholder is gone.
//
// That changes what "refused" looks like. It used to mean `null`, because there
// was nothing behind step 1 to fall through TO. It now means "does not become
// the origin", and every rejection below is asserted that way, so the security
// property each one covers is still covered: a bad `MCP_OAUTH_ORIGIN` must
// never be published as this server's identity.
ok(resolveOrigin() === SITE_ORIGIN, "Nothing configured falls through to the site's canonical origin");

process.env.MCP_OAUTH_ORIGIN = "https://real.example";
ok(resolveOrigin() === "https://real.example", "An explicit origin is used");

process.env.MCP_OAUTH_ORIGIN = "https://real.example/";
ok(resolveOrigin() === "https://real.example", "A trailing slash is stripped — an issuer carries none");

process.env.MCP_OAUTH_ORIGIN = "https://real.example/some/path";
ok(resolveOrigin() === SITE_ORIGIN, "An origin with a path is refused — it does not become the issuer");

process.env.MCP_OAUTH_ORIGIN = "http://insecure.example";
ok(resolveOrigin() === SITE_ORIGIN, "Plain http is refused for a non-loopback host");

process.env.MCP_OAUTH_ORIGIN = "http://localhost:3000";
ok(resolveOrigin() === "http://localhost:3000", "http is allowed on loopback, for local development");

process.env.MCP_OAUTH_ORIGIN = "https://example.com";
ok(resolveOrigin() === SITE_ORIGIN, "The placeholder is refused even when set explicitly");

process.env.MCP_OAUTH_ORIGIN = "not-a-url";
ok(resolveOrigin() === SITE_ORIGIN, "A malformed origin is refused");

// And none of those refusals leaked the bad value through, which is the property
// that actually matters — assert it directly rather than inferring it.
for (const bad of ["https://real.example/some/path", "http://insecure.example", "https://example.com", "not-a-url"]) {
  process.env.MCP_OAUTH_ORIGIN = bad;
  ok(resolveOrigin() !== bad, `A refused origin never becomes the issuer — ${bad}`);
}

delete process.env.MCP_OAUTH_ORIGIN;
process.env.VERCEL_PROJECT_PRODUCTION_URL = "my-project.vercel.app";
ok(
  resolveOrigin() === SITE_ORIGIN,
  "The canonical origin outranks Vercel's domain — the last resort is only reached when it is unset",
);

if (savedOrigin === undefined) delete process.env.MCP_OAUTH_ORIGIN;
else process.env.MCP_OAUTH_ORIGIN = savedOrigin;
if (savedVercel === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
else process.env.VERCEL_PROJECT_PRODUCTION_URL = savedVercel;

/* ------------------------------------------------------------------ summary */

console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed > 0) {
  console.log(`${failed} FAILED — see above.`);
  process.exit(1);
}
