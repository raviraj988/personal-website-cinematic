/**
 * The one path sign-in is allowed to return to.
 *
 * ## Why this exists
 *
 * `signInAction` redirects to `/admin` unconditionally, which is right for
 * everything except the OAuth consent screen. A connector sends an administrator
 * to `/oauth/authorize?...`; if they are not signed in they get the login form,
 * and landing on `/admin` afterwards loses the authorization request entirely.
 * The flow does not error — it just silently drops what the client asked for, and
 * the administrator has no way to get back to it except by restarting from
 * inside ChatGPT.
 *
 * ## Why it is this narrow
 *
 * A "return to where you came from" parameter is an open-redirect primitive: any
 * attacker-supplied value that reaches `redirect()` sends a freshly
 * authenticated user wherever they choose. The mitigations people reach for —
 * checking the value starts with `/`, or that it is not `http`-prefixed — are
 * both bypassable (`//evil.example` is a protocol-relative URL, and `\/\/` is
 * normalised by some clients).
 *
 * So this does not implement a general return-to. It accepts exactly one route,
 * `/oauth/authorize`, and rebuilds the URL from a parsed query string rather than
 * passing the caller's text through. Anything else returns null, and the caller
 * falls back to `/admin`. Widening this means re-reading the paragraph above.
 *
 * Pure and dependency-free so both the login page and the sign-in action can
 * validate identically — two callers agreeing by construction rather than by
 * having copied the same regex.
 */

const ALLOWED_PATH = "/oauth/authorize";

/**
 * Returns a safe same-origin path, or null.
 *
 * The value is parsed against a throwaway base so that anything absolute,
 * protocol-relative, or otherwise not a plain path is rejected by comparing the
 * resolved origin — not by pattern-matching the input.
 */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;

  // Backslashes are normalised to forward slashes by some user agents, so
  // `/\evil.example` can escape a naive check. Refuse them outright.
  if (value.includes("\\")) return null;

  const base = "https://return-to.invalid";
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return null;
  }

  // Catches absolute URLs and protocol-relative `//host` alike: both resolve to
  // an origin that is not the throwaway base.
  if (url.origin !== base) return null;
  if (url.pathname !== ALLOWED_PATH) return null;

  // Rebuilt from the parsed parts. The caller's string is never echoed.
  return `${url.pathname}${url.search}`;
}
