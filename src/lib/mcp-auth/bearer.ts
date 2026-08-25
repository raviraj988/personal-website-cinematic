import "server-only";

import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import { mcpResource, protectedResourceMetadataUrl, type Scope } from "./config";
import { validateAccessToken } from "./store";

/**
 * Bearer-token validation for the MCP resource server.
 *
 * Produces the SDK's `AuthInfo`, which `transport.handleRequest` forwards to tool
 * handlers as `extra.authInfo` — so a tool can see which admin's grant it is
 * acting under.
 */

export type BearerResult =
  | { ok: true; authInfo: AuthInfo; scopes: Scope[]; userId: string }
  | { ok: false; status: 401 | 403; code: string; description: string };

/**
 * Extracts a bearer token from an Authorization header.
 *
 * Header-only, deliberately. RFC 6750 also describes a form-encoded body
 * parameter and an `access_token` query parameter; the query form leaks the
 * credential into access logs, proxy logs, and `Referer` headers, and MCP has no
 * reason to support either.
 */
function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer[ ]+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * The `WWW-Authenticate` challenge for a 401.
 *
 * `resource_metadata` is the load-bearing part: it is how a client discovers
 * where to authenticate (RFC 9728). Omit it and ChatGPT cannot start the flow and
 * reports no useful error.
 *
 * Quotes are stripped from the description because the header is a quoted-string
 * grammar with no escaping — an embedded `"` would truncate the parameter and
 * take the rest of the header with it.
 */
export function challengeHeader(code?: string, description?: string): string {
  const parts = [`Bearer resource_metadata="${protectedResourceMetadataUrl()}"`];
  if (code) parts.push(`error="${code}"`);
  if (description) parts.push(`error_description="${description.replace(/"/g, "")}"`);
  return parts.join(", ");
}

/**
 * Validates the request's bearer token.
 *
 * The audience check is the security-critical step. A token records the
 * `resource` it was issued for, and it is accepted here only when that matches
 * this server's own resource identifier (RFC 8707). Without it, a token minted
 * for any other resource by this same authorization server would be replayable
 * against the MCP endpoint — the classic confused-deputy failure.
 *
 * A token with no recorded resource is accepted: clients are not required to send
 * `resource`, and this authorization server protects exactly one resource, so
 * there is no other audience it could have been meant for. **If a second resource
 * is ever added here, this must become a hard requirement.**
 */
export async function resolveBearer(request: Request): Promise<BearerResult> {
  const token = extractBearer(request.headers.get("authorization"));

  if (!token) {
    return {
      ok: false,
      status: 401,
      code: "invalid_request",
      description: "An OAuth 2.1 bearer token is required.",
    };
  }

  const validated = await validateAccessToken(token);

  if (!validated) {
    return {
      ok: false,
      status: 401,
      code: "invalid_token",
      description: "The access token is invalid, expired, or revoked.",
    };
  }

  const resource = mcpResource();

  if (validated.resource && validated.resource !== resource) {
    return {
      ok: false,
      status: 403,
      code: "invalid_token",
      description: "The access token was issued for a different resource.",
    };
  }

  return {
    ok: true,
    userId: validated.userId,
    scopes: validated.scopes,
    authInfo: {
      token,
      clientId: validated.clientId,
      scopes: validated.scopes,
      expiresAt: Math.floor(validated.expiresAt.getTime() / 1000),
      resource: new URL(resource),
      extra: { userId: validated.userId },
    },
  };
}
