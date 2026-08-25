import {
  MCP_SCOPES,
  SUPPORTED_MCP_SCOPES,
  isMcpScope,
  type McpScope,
} from "../../../mcp/scopes";
import { requireOrigin } from "./origin";

/**
 * OAuth 2.1 configuration for the remote MCP endpoint.
 *
 * The authorization server and the resource server are the same deployment, so
 * the issuer and the resource share an origin. That is what makes opaque tokens
 * the right choice over JWTs: there is no second party that would need to verify
 * a signature, and a database lookup revokes instantly.
 *
 * ## Everything here is a function, not a constant
 *
 * The origin can be unresolvable — see `origin.ts`. A top-level
 * `export const ISSUER = requireOrigin()` would throw while this *module* is
 * evaluated, which happens before any route handler runs, so Next would answer
 * with its own HTML error page and no handler could turn the failure into
 * something a client or an operator could read. Deferring the read into a call
 * keeps every such failure inside a request.
 *
 * Scope definitions are re-exported from `mcp/scopes.ts` rather than restated, so
 * the consent screen cannot offer a scope the tool layer does not enforce.
 */

export { MCP_SCOPES as SCOPES, isMcpScope as isSupportedScope };
export type Scope = McpScope;
export const SUPPORTED_SCOPES: readonly Scope[] = SUPPORTED_MCP_SCOPES;

/** RFC 8414 issuer identifier. No trailing slash, no path. */
export function issuer(): string {
  return requireOrigin();
}

/** The MCP resource being protected. Must match RFC 8707 `resource` exactly. */
export function mcpResource(): string {
  return `${requireOrigin()}/api/mcp`;
}

export function authorizationEndpoint(): string {
  return `${requireOrigin()}/oauth/authorize`;
}

export function tokenEndpoint(): string {
  return `${requireOrigin()}/oauth/token`;
}

export function registrationEndpoint(): string {
  return `${requireOrigin()}/oauth/register`;
}

export function revocationEndpoint(): string {
  return `${requireOrigin()}/oauth/revoke`;
}

/**
 * RFC 9728 metadata URL for the MCP resource.
 *
 * The resource has a path (`/api/mcp`), so that path is appended *after* the
 * well-known segment — not inserted before it. This exact string goes into the
 * `WWW-Authenticate` header on a 401 and is the only thing bootstrapping the
 * client's discovery. Get it wrong and the connector fails with no useful error,
 * which is why it and the route that serves it are both derived from here.
 */
export function protectedResourceMetadataUrl(): string {
  return `${requireOrigin()}/.well-known/oauth-protected-resource/api/mcp`;
}

/**
 * Recorded when a client registers without asking for anything specific.
 *
 * Both scopes, not just read. A client is told its registered scope in the
 * registration response and then requests exactly that on every authorization —
 * so advertising read-only here would make every client permanently read-only
 * with no way to ask for more. Registration grants nothing on its own; an
 * administrator still has to approve on the consent screen, which is where the
 * real decision is made.
 */
export const DEFAULT_SCOPES: readonly Scope[] = [MCP_SCOPES.read, MCP_SCOPES.draft];

export const SCOPE_DESCRIPTIONS: Record<Scope, string> = {
  [MCP_SCOPES.read]:
    "Read existing posts, slugs, service pages, and the writing guide. Changes nothing.",
  [MCP_SCOPES.draft]:
    "Create drafts and generate cover images. Cannot publish, edit, or delete anything.",
};

/**
 * Parses a space-delimited scope string, dropping anything unrecognised.
 *
 * Unknown scopes are ignored rather than rejected: RFC 6749 §3.3 lets a server
 * issue a narrower set than requested, and failing an entire authorization
 * because a client asked for one extra scope is worse than granting the subset
 * this server understands.
 */
export function parseScopes(raw: string | null | undefined): Scope[] {
  if (!raw) return [];
  return [...new Set(raw.split(/\s+/).filter(isMcpScope))];
}

/**
 * What the consent screen offers, and what it pre-ticks.
 *
 * Every supported scope is offerable and the human decides. Treating the
 * requested scope as a hard ceiling creates a dead end: a client is told its
 * scope at registration, requests exactly that thereafter, and a consent screen
 * that can only confirm what was asked can never widen it — so a connector that
 * registered read-only would stay read-only forever with nothing able to change
 * it.
 *
 * RFC 6749 §3.3 permits this. A server may issue a scope set different from the
 * request; the only requirement is that the token response state what was
 * actually granted, which `/oauth/token` does via its `scope` field.
 *
 * What the client asked for stays pre-ticked, so the common path is one click and
 * nothing is silently widened without a human seeing it.
 *
 * Pure, and free of `server-only`, so this decision is testable on its own.
 */
export function scopeChoices(requestedScope: string | null | undefined): {
  selectable: Scope[];
  preselected: Scope[];
} {
  const explicit = parseScopes(requestedScope);
  return {
    selectable: [...SUPPORTED_SCOPES],
    preselected: explicit.length > 0 ? explicit : [...SUPPORTED_SCOPES],
  };
}

/**
 * Lifetimes.
 *
 * Access tokens are deliberately short: the client refreshes silently, so a
 * leaked access token stops working within the hour. The refresh token is the
 * long-lived credential, and it rotates on every use.
 */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const AUTHORIZATION_CODE_TTL_SECONDS = 60; // RFC 6749 says <= 10 min; 1 is ample

/**
 * Whether the MCP OAuth surface is switched on.
 *
 * Off by default, and every endpoint 404s until it is set. Deploying this code
 * therefore does not by itself open a write path into the database — a merge
 * cannot expose the endpoint, only a deliberate environment change can.
 */
export function isMcpOAuthEnabled(): boolean {
  return process.env.MCP_OAUTH_ENABLED === "true";
}
