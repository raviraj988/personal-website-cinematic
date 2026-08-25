import type { OAuthProtectedResourceMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";

import {
  SUPPORTED_SCOPES,
  isMcpOAuthEnabled,
  issuer,
  mcpResource,
} from "@/lib/mcp-auth/config";

/**
 * RFC 9728 protected resource metadata — the first document a client fetches,
 * because the 401 from `/api/mcp` points straight at it.
 *
 * The path mirrors the resource it describes: the resource is
 * `<origin>/api/mcp`, so its metadata lives at
 * `<origin>/.well-known/oauth-protected-resource/api/mcp`. That exact URL is what
 * the `WWW-Authenticate` header carries, and the two must agree or discovery
 * dead-ends with nothing useful in the client's error. Both are derived from
 * `config.ts` so they cannot drift.
 *
 * No `jwks_uri`: tokens are opaque and validated by database lookup, so there are
 * no public keys to publish.
 */

export const runtime = "nodejs";
// Dynamic for the same reason as the authorization-server document: `force-static`
// would freeze the MCP_OAUTH_ENABLED check into the build and let a CDN cache the
// resulting 404 for a year. Caching comes from the header below instead.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!isMcpOAuthEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const metadata: OAuthProtectedResourceMetadata = {
      resource: mcpResource(),
      authorization_servers: [issuer()],
      scopes_supported: [...SUPPORTED_SCOPES],
      bearer_methods_supported: ["header"],
      resource_name: "ESE blog drafting (MCP)",
    };

    return Response.json(metadata, {
      headers: { "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mcp-oauth] protected resource metadata unavailable", { message });
    return Response.json(
      { error: "server_error", error_description: message },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
