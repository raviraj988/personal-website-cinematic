import type { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";

import {
  SUPPORTED_SCOPES,
  authorizationEndpoint,
  isMcpOAuthEnabled,
  issuer,
  registrationEndpoint,
  revocationEndpoint,
  tokenEndpoint,
} from "@/lib/mcp-auth/config";

/**
 * RFC 8414 authorization server metadata — the document a client fetches after
 * following `authorization_servers` out of the protected-resource metadata.
 *
 * The shape is the SDK's own `OAuthMetadata` type, so drift between what this
 * advertises and what MCP clients parse is a compile error rather than a runtime
 * connector failure.
 */

export const runtime = "nodejs";

/**
 * Must be dynamic, despite advertising only static configuration.
 *
 * With `force-static` the `isMcpOAuthEnabled()` branch is evaluated at build
 * time, so a build made before the flag was set bakes in a 404 — and Next stamps
 * it `s-maxage=31536000`, meaning a CDN would serve that 404 for a year after the
 * flag was turned on. The `cache-control` header below gives this the caching it
 * needs without freezing an environment variable into the build.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!isMcpOAuthEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  // Every endpoint below is derived from the deployment's origin, which can be
  // unresolvable — see `origin.ts`. Caught here so the failure is a readable
  // message rather than Next's HTML error page, which an MCP client reports as an
  // unparseable response.
  try {
    const metadata: OAuthMetadata = {
      issuer: issuer(),
      authorization_endpoint: authorizationEndpoint(),
      token_endpoint: tokenEndpoint(),
      registration_endpoint: registrationEndpoint(),
      revocation_endpoint: revocationEndpoint(),
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      // Public clients only; PKCE replaces a client secret.
      token_endpoint_auth_methods_supported: ["none"],
      revocation_endpoint_auth_methods_supported: ["none"],
      // S256 only. OAuth 2.1 forbids `plain`, so advertising it would be wrong
      // even though some clients would happily use it.
      code_challenge_methods_supported: ["S256"],
      scopes_supported: [...SUPPORTED_SCOPES],
    };

    return Response.json(metadata, {
      headers: {
        // Discovery documents are stable and fetched on every fresh connection.
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mcp-oauth] authorization server metadata unavailable", { message });
    return Response.json(
      { error: "server_error", error_description: message },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
