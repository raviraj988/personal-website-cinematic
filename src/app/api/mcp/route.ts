import { challengeHeader, resolveBearer } from "@/lib/mcp-auth/bearer";
import { isMcpOAuthEnabled } from "@/lib/mcp-auth/config";

// The SDK and the `mcp/` tool surface are imported inside the handler, not here.
// See `loadToolSurface` below for why.

/**
 * The remote MCP endpoint, protected by OAuth 2.1 — so a client that cannot spawn
 * a local process (ChatGPT) can still reach the drafting tools.
 *
 * `mcp/server.ts` serves the same eight tools over stdio. This is a second
 * transport over the same `mcp/tools.ts`, not a second implementation of them, and
 * neither transport can publish: `create_draft` hard-codes `status: 'draft'` and
 * `mcp/adapters/supabase.ts` exports no publish, update, or delete function.
 * Drafts land in `/admin/posts` for a human.
 *
 * ## Reconciling this with the warning in mcp/server.ts
 *
 * That file's header says the server must never be deployed or bound to a port,
 * because the process holds the service-role key. It is worth being precise about
 * why this does not contradict it.
 *
 * The warning is about *that process*: a stdio server whose only caller is
 * whoever spawned it, where binding a port would add an unauthenticated network
 * listener to a process holding an RLS-bypassing key. Here the key sits inside a
 * Next.js runtime that already holds it for `/admin`, and the port it answers on
 * is not unauthenticated — every request past the check below carries a token an
 * administrator approved by hand on the consent screen.
 *
 * What has not changed is the ceiling on damage. A stolen token creates drafts.
 * It cannot publish them, edit anything, or delete anything, because no function
 * exists to do so. That is what makes exposing this surface defensible; if a
 * publish path is ever added to the adapter, this endpoint has to be
 * reconsidered, not just re-reviewed.
 *
 * ## Scopes gate the tool surface
 *
 * A `blog:read` token never sees `create_draft` in `tools/list`, because
 * unauthorised tools are not registered at all — see `RegisterOptions` in
 * `mcp/tools.ts`. There is no code path that could invoke one.
 *
 * Stateless by necessity: serverless invocations share no memory, so a
 * session-bearing transport would lose its state between requests.
 */

export const runtime = "nodejs";
// Cover generation makes a paid image request and an upload; the default would cut
// a slow one off mid-flight and leave the client with no answer.
export const maxDuration = 60;

/**
 * 401/403 with the RFC 9728 pointer.
 *
 * That header is the whole basis of the client's discovery — without it ChatGPT
 * cannot find the authorization server and reports no useful error.
 */
function unauthorized(status: 401 | 403, code: string, description: string): Response {
  return Response.json(
    { error: code, error_description: description },
    {
      status,
      headers: {
        "WWW-Authenticate": challengeHeader(code, description),
        "cache-control": "no-store",
      },
    },
  );
}

/**
 * A JSON-RPC internal error, so a failure reaches the client as protocol rather
 * than as Next's HTML error page.
 *
 * An MCP client handed `<!DOCTYPE html>` reports a parse failure, or dumps the
 * whole document into a log, and either way the actual cause is invisible. The
 * `digest` is Next's own correlation id where one is available — quoting it in a
 * bug report is what ties the response to a line in the platform logs.
 */
function internalError(
  error: unknown,
  requestId: unknown = null,
  /**
   * Include the thrown message in the response body. Only set where the caller is
   * already past the bearer check — these messages name modules and environment
   * variables, which is exactly what an operator needs and exactly what an
   * anonymous caller should not get.
   */
  exposeMessage = false,
): Response {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest?: unknown }).digest)
      : undefined;

  console.error("[mcp] unhandled error", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    digest,
  });

  return Response.json(
    {
      jsonrpc: "2.0",
      id: requestId ?? null,
      error: {
        code: -32603,
        message: "Internal error",
        ...(digest || exposeMessage
          ? {
              data: {
                ...(digest ? { digest } : {}),
                ...(exposeMessage
                  ? { reason: error instanceof Error ? error.message : String(error) }
                  : {}),
              },
            }
          : {}),
      },
    },
    { status: 500, headers: { "cache-control": "no-store" } },
  );
}

/**
 * Loads the SDK transport and the `mcp/` tool surface on first use.
 *
 * These are deliberately not static imports. A static import would put the entire
 * `mcp/` dependency graph — the Supabase adapter, the OpenAI provider, the site
 * registry — on this module's load path. Anything that throws while that graph
 * evaluates (a missing environment variable, a bad site key) happens *before* the
 * route is registered, so the platform answers with its own static 500 page,
 * nothing in this file ever runs, and the failure reaches the client as an
 * unparseable HTML document and the operator as nothing at all.
 *
 * Importing here moves those failures inside a request, where they are caught and
 * returned as a JSON-RPC error carrying the real message. Node caches the modules
 * after the first successful load, so warm invocations pay nothing.
 *
 * Called only after the bearer check, so error detail never reaches an
 * unauthenticated caller.
 */
async function loadToolSurface() {
  const [sdk, transport, tools, deps, scopes] = await Promise.all([
    import("@modelcontextprotocol/sdk/server/index.js"),
    import("@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"),
    import("../../../../mcp/tools"),
    import("../../../../mcp/deps"),
    import("../../../../mcp/scopes"),
  ]);

  return {
    Server: sdk.Server,
    WebStandardStreamableHTTPServerTransport:
      transport.WebStandardStreamableHTTPServerTransport,
    registerTools: tools.registerTools,
    getDeps: deps.getDeps,
    toolsForScopes: scopes.toolsForScopes,
  };
}

async function handle(request: Request): Promise<Response> {
  // Nothing is exposed until OAuth is deliberately switched on, so deploying this
  // code does not by itself open a write path into the database.
  if (!isMcpOAuthEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  let auth;
  try {
    auth = await resolveBearer(request);
  } catch (error) {
    // A thrown validation is a database or configuration fault, not a bad token,
    // and must not be reported as one — `invalid_token` would send a client into a
    // pointless re-authorization loop against a server that is simply broken.
    console.error("[mcp] bearer validation failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "server_error", error_description: "Token validation failed." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  if (!auth.ok) {
    return unauthorized(auth.status, auth.code, auth.description);
  }

  // A token with no usable scope gets no tools, so fail here with something
  // actionable rather than serving an empty tool list that looks like a working
  // connection with nothing in it.
  if (auth.scopes.length === 0) {
    return unauthorized(
      403,
      "insufficient_scope",
      "This token carries no usable scope. Re-authorize with blog:read or blog:draft.",
    );
  }

  let surface: Awaited<ReturnType<typeof loadToolSurface>>;
  try {
    surface = await loadToolSurface();
  } catch (error) {
    // Reported rather than swallowed: this is the failure that would otherwise be
    // invisible, and the message names the module that could not load.
    return internalError(error, await requestIdOf(request.clone()), true);
  }

  const {
    Server,
    WebStandardStreamableHTTPServerTransport,
    registerTools,
    getDeps,
    toolsForScopes,
  } = surface;

  let server;
  try {
    server = new Server(
      { name: "ese-blog-drafting", version: "0.1.0" },
      { capabilities: { tools: {} } },
    );
    // `getDeps()` resolves the Supabase adapter and the image provider, and throws
    // a message naming the missing variable when one is absent. Inside the try for
    // that reason.
    registerTools(server, getDeps(), { allowedTools: toolsForScopes(auth.scopes) });
  } catch (error) {
    return internalError(error, await requestIdOf(request.clone()), true);
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    // Stateless: no session id. See the header.
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  // `authInfo` reaches tool handlers as `extra.authInfo`, so a handler can see
  // which administrator's grant it is acting under.
  return transport.handleRequest(request, { authInfo: auth.authInfo });
}

/**
 * Best-effort recovery of the JSON-RPC id from a clone of the request.
 *
 * A client waiting on id 7 will not match an error carrying null, and sits there
 * until it times out instead of surfacing the failure. The clone is taken before
 * the original is consumed, so reading it here costs nothing the handler needed.
 */
async function requestIdOf(request: Request): Promise<unknown> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && "id" in body
      ? (body as { id: unknown }).id
      : null;
  } catch {
    return null;
  }
}

/** JSON-RPC requests. */
export async function POST(request: Request): Promise<Response> {
  const echo = request.clone();
  try {
    return await handle(request);
  } catch (error) {
    return internalError(error, await requestIdOf(echo));
  }
}

/** The server-to-client SSE stream. */
export async function GET(request: Request): Promise<Response> {
  try {
    return await handle(request);
  } catch (error) {
    return internalError(error);
  }
}

/** Session teardown. A no-op in stateless mode, but clients may still send it. */
export async function DELETE(request: Request): Promise<Response> {
  try {
    return await handle(request);
  } catch (error) {
    return internalError(error);
  }
}
