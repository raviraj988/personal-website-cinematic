import { SITE_ORIGIN } from "@/lib/blog/config";

/**
 * The absolute origin this authorization server publishes as its own identity.
 *
 * Every discovery document, the `resource` every token is bound to, and the
 * `resource_metadata` pointer in the 401 challenge are all built from this one
 * value. If it is wrong, a connector fails at the first fetch with nothing
 * useful in the error, so this module would rather throw a message naming the
 * variable than serve a document pointing somewhere else.
 *
 * ## Why not just use SITE_ORIGIN
 *
 * `src/lib/blog/config.ts` makes the case for a hardcoded origin, and it is a
 * good one: an env var that goes missing turns every absolute URL relative and
 * nothing fails loudly. That reasoning still stands for canonicals and the
 * sitemap.
 *
 * It cannot be followed here yet, because `site.canonicalBase` is still the
 * placeholder `https://example.com` — its own comment says so. Publishing
 * `https://example.com/api/mcp` as the protected resource would not be a
 * degraded sitemap, it would be an authorization server advertising someone
 * else's domain. So this resolves in a defined order and refuses to guess.
 *
 * Once `site.canonicalBase` is set to the real domain, step 2 takes over and the
 * env var stops being necessary.
 *
 * ## Why the request's Host header is not consulted
 *
 * Deriving the origin from the incoming request is the obvious way to make this
 * "just work" on every preview URL, and it is exactly the wrong thing. `Host` is
 * attacker-controlled. A request carrying `Host: evil.example` would make this
 * server publish discovery documents pointing at `evil.example`, and mint tokens
 * whose recorded audience is `evil.example/api/mcp` — which then pass the
 * audience check on a resource server that is not this one. A fixed origin is
 * what makes the RFC 8707 audience binding in `bearer.ts` mean anything.
 */

const PLACEHOLDER_ORIGINS = ["https://example.com", "http://example.com"];

/** Strips a trailing slash: RFC 8414 issuers carry no path and no trailing `/`. */
function normalise(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

function isUsableOrigin(value: string): boolean {
  const candidate = normalise(value);
  if (!candidate) return false;
  if (PLACEHOLDER_ORIGINS.includes(candidate)) return false;

  try {
    const url = new URL(candidate);
    // http is tolerated only for local development. Anything else must be https:
    // OAuth 2.1 requires it, and a token sent over plaintext is a leaked token.
    const isLoopback =
      url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) return false;
    // An issuer is an origin, not a path.
    return url.pathname === "/" || url.pathname === "";
  } catch {
    return false;
  }
}

/**
 * Resolves the origin, or `null` when nothing usable is configured.
 *
 * Returns null rather than throwing so a caller can answer 404/500 as its
 * context requires — a discovery route and a tool call want different failures
 * for the same misconfiguration.
 */
export function resolveOrigin(): string | null {
  // 1. Explicit override. The only thing that works today, and the one to set on
  //    Vercel: `vercel env add MCP_OAUTH_ORIGIN`.
  const explicit = process.env.MCP_OAUTH_ORIGIN;
  if (explicit && isUsableOrigin(explicit)) return normalise(explicit);

  // 2. The site's own canonical origin, once it is no longer the placeholder.
  //    Preferred over the env var's absence for the reason config.ts documents.
  if (isUsableOrigin(SITE_ORIGIN)) return normalise(SITE_ORIGIN);

  // 3. Vercel's production domain for this project. A last resort, and only the
  //    *production* variable: VERCEL_URL is per-deployment, so using it would
  //    give every preview a different issuer and invalidate tokens on each
  //    deploy.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel && isUsableOrigin(`https://${vercel}`)) return `https://${normalise(vercel)}`;

  return null;
}

/**
 * The origin, or a thrown error naming what to set.
 *
 * Used by the modules that cannot proceed without it. The message is written for
 * whoever reads it in a Vercel log at 2am.
 */
export function requireOrigin(): string {
  const origin = resolveOrigin();
  if (origin) return origin;

  throw new Error(
    "Cannot determine this deployment's origin, which every OAuth discovery " +
      "document depends on. Set MCP_OAUTH_ORIGIN to the site's absolute https " +
      "origin (no trailing slash, no path), or set site.canonicalBase in " +
      "src/lib/data/ese-content.ts to the real domain — it is still the " +
      "placeholder https://example.com.",
  );
}
