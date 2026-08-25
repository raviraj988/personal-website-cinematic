/**
 * The stdio entry point.
 *
 * ## stdout belongs to the protocol
 *
 * On a stdio transport, stdout *is* the JSON-RPC channel. A single
 * `console.log` anywhere in this server's import graph — including anywhere under
 * `src/lib/**` that it reaches — corrupts every frame after it, and the symptom a
 * client reports is malformed protocol rather than a stray log line. So all
 * diagnostics go through `note()`, which writes to stderr, and
 * `scripts/test-mcp-handshake.mjs` asserts that stdout carries nothing but framed
 * JSON-RPC.
 *
 * Node's own `MODULE_TYPELESS_PACKAGE_JSON` warning already goes to stderr and is
 * harmless. Do not "fix" it by adding `"type": "module"` to `package.json` —
 * that field changes how every `.js` file in the repository is interpreted, to
 * silence a warning on the one channel where warnings are safe.
 *
 * ## This process holds the service-role key
 *
 * It must never be deployed, bound to a port, or exposed beyond the local client
 * that spawns it. The key bypasses Row Level Security entirely; what keeps that
 * survivable is that the adapter exports no function which could publish, update,
 * or delete anything. See the header of `mcp/adapters/supabase.ts`.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { getDeps } from "./deps";
import { nodeFileReader } from "./local-files";
import { registerTools, TOOL_NAMES } from "./tools";
import { note } from "./lib";
import { siteKeys } from "./site";

async function main(): Promise<void> {
  const server = new Server(
    { name: "ese-blog-drafting", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  // Inside `main`, not at module scope: a configuration failure here has to be
  // reportable, and a throw during module evaluation is not.
  //
  // `localFiles` is supplied here and only here. It lets `upload_cover_image`
  // take an `imagePath`, so a client that has just written a generated image to
  // disk can name it instead of base64-encoding it. That is safe on this
  // transport specifically: the client started this process and runs as the same
  // user, so it can already read anything this could. The HTTP transport in
  // `src/app/api/mcp/route.ts` passes nothing, because there the caller is remote
  // and the same feature would be arbitrary file disclosure. See the header of
  // `mcp/local-files.ts`.
  registerTools(server, getDeps(), { localFiles: nodeFileReader });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  note(
    `ready — ${TOOL_NAMES.length} tools, sites: ${siteKeys().join(", ")}. Drafts only; publishing is a human action in /admin.`,
  );
}

main().catch((error) => {
  // stderr, then a non-zero exit. Writing this to stdout would be the one thing
  // guaranteed to make the failure harder to read.
  process.stderr.write(
    `[ese-mcp] failed to start: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
