/**
 * Spawn the real server over stdio and speak JSON-RPC to it.
 *
 * Two things are checked here that nothing else can check:
 *
 *   1. **Exactly the tools in `TOOL_NAMES` are advertised**, with usable schemas. A tool
 *      that fails to register is invisible to every other suite, because they all
 *      import the modules directly rather than going through the protocol.
 *
 *   2. **stdout carries nothing but framed JSON-RPC.** One stray `console.log`
 *      anywhere in the import graph — including in anything this reaches under
 *      `src/lib/**` — corrupts the channel, and the failure a user sees is
 *      "malformed protocol" with no hint as to which module printed. This is the
 *      cheapest place to catch it, so it is caught here.
 *
 * Runs with an empty `OPENAI_API_KEY` and `MCP_NO_PAID_CALLS=1`, so no paid call
 * is possible even though this is the one suite that loads the real provider.
 *
 *   node --import ./scripts/register-ts.mjs scripts/test-mcp-handshake.mjs
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TOOL_NAMES } from "../mcp/tools.ts";

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

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const child = spawn(
  process.execPath,
  ["--import", "./scripts/register-ts.mjs", "mcp/server.ts"],
  {
    cwd: repoRoot,
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      // Belt and braces: this suite imports the real provider, so both the key
      // and the kill switch are set to make a paid call impossible.
      OPENAI_API_KEY: "",
      MCP_NO_PAID_CALLS: "1",
    },
  },
);

let stdout = "";
let stderr = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  stdout += chunk;
});
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

/** Wait for a response with the given id, or time out. */
function waitFor(id, timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = setInterval(() => {
      for (const line of stdout.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === id) {
            clearInterval(poll);
            resolve(parsed);
            return;
          }
        } catch {
          // A partial line. Keep waiting.
        }
      }
      if (Date.now() > deadline) {
        clearInterval(poll);
        reject(new Error(`timed out waiting for id ${id}. stderr: ${stderr.slice(0, 400)}`));
      }
    }, 60);
  });
}

let exitCode = 0;

try {
  /* ------------------------------------------------------------ 1. initialize */

  section("1. Handshake");

  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-mcp-handshake", version: "0" },
    },
  });

  const init = await waitFor(1);
  ok(init.result !== undefined, "initialize returns a result", init.error ? JSON.stringify(init.error) : "");
  ok(
    init.result?.serverInfo?.name === "ese-blog-drafting",
    "The server identifies itself",
    init.result?.serverInfo?.name,
  );
  ok(
    init.result?.capabilities?.tools !== undefined,
    "It advertises the tools capability",
  );

  send({ jsonrpc: "2.0", method: "notifications/initialized" });

  /* ------------------------------------------------------------ 2. tools/list */

  section("2. tools/list");

  send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const list = await waitFor(2);

  const advertised = (list.result?.tools ?? []).map((tool) => tool.name).sort();
  const expected = [...TOOL_NAMES].sort();

  // Derived from TOOL_NAMES rather than a literal. A hardcoded count means every
  // tool added has to remember to come back and edit this line, and the failure it
  // produces points at the assertion instead of at anything real.
  ok(
    advertised.length === expected.length,
    `All ${expected.length} tools advertised`,
    `${advertised.length}: ${advertised.join(", ")}`,
  );
  ok(
    advertised.join(",") === expected.join(","),
    "Exactly the expected set",
    advertised.join(", "),
  );

  for (const tool of list.result?.tools ?? []) {
    ok(
      typeof tool.description === "string" && tool.description.length > 20,
      `${tool.name} has a real description`,
    );
    ok(
      tool.inputSchema?.type === "object" && typeof tool.inputSchema.properties === "object",
      `${tool.name} has an object input schema`,
    );
  }

  section("2b. The two mutating tools require a site");

  for (const name of ["generate_cover_image", "create_draft"]) {
    const tool = (list.result?.tools ?? []).find((t) => t.name === name);
    ok(
      Array.isArray(tool?.inputSchema?.required) && tool.inputSchema.required.includes("site"),
      `${name} requires site`,
      JSON.stringify(tool?.inputSchema?.required),
    );
  }

  section("2c. No tool is publish-shaped");

  const publishy = advertised.filter((name) => /publish|delete|update|unpublish|remove/i.test(name));
  ok(publishy.length === 0, "No publish, update, or delete tool exists", publishy.join(", ") || "none");

  /* ------------------------------------------------------------ 3. tools/call */

  section("3. get_writing_guide over the wire");

  send({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "get_writing_guide", arguments: { site: "ese" } },
  });
  const guide = await waitFor(3);

  const guideText = guide.result?.content?.[0]?.text ?? "";
  ok(guideText.length > 3000, "The guide comes back", `${guideText.length} chars`);
  ok(guideText.includes("noindex"), "It states the site is not indexed yet");
  // The guide used to warn that the canonical domain was a placeholder. It is a
  // real domain now, so the paragraph is gone — and its absence is what to
  // assert: a guide still saying "example.com" would be telling a writer their
  // canonicals are fictional when they are not.
  ok(!guideText.includes("example.com"), "It no longer calls the domain a placeholder");
  ok(guideText.includes("rehype-raw"), "It warns that raw HTML is dropped");
  ok(guideText.includes("list_posts"), "It tells the client to check for duplicates");
  ok(
    guideText.includes("policy-support-and-sovereignty") ||
      guideText.includes("Policy Support"),
    "It carries the real service areas",
  );

  section("3b. An unknown site is refused, not defaulted");

  send({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "create_draft", arguments: { site: "denalix", title: "x", slug: "x", excerpt: "x", content: "x" } },
  });
  const wrongSite = await waitFor(4);
  ok(wrongSite.result?.isError === true, "create_draft refuses an unknown site");
  ok(
    (wrongSite.result?.content?.[0]?.text ?? "").includes("ese"),
    "And names the valid keys",
    (wrongSite.result?.content?.[0]?.text ?? "").slice(0, 70),
  );

  section("3c. A status argument is refused outright");

  send({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "create_draft",
      arguments: {
        site: "ese",
        title: "Trying to publish",
        slug: "zz-mcp-handshake-should-not-exist",
        excerpt: "This must never be written.",
        content: "Body.",
        status: "published",
      },
    },
  });
  const withStatus = await waitFor(5);
  ok(withStatus.result?.isError === true, "create_draft refuses a status argument");
  ok(
    (withStatus.result?.content?.[0]?.text ?? "").includes("cannot set"),
    "And says why",
    (withStatus.result?.content?.[0]?.text ?? "").slice(0, 80),
  );

  section("3d. An unknown tool is an error, not a crash");

  send({
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: { name: "publish_post", arguments: {} },
  });
  const unknown = await waitFor(6);
  ok(unknown.result?.isError === true || unknown.error !== undefined, "An invented tool name fails");

  /* -------------------------------------------------------- 4. stdout purity */

  section("4. stdout carries nothing but framed JSON-RPC");

  const lines = stdout.split("\n").filter((line) => line.trim().length > 0);
  ok(lines.length > 0, `${lines.length} lines on stdout`);

  const notJson = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.jsonrpc !== "2.0") notJson.push(line.slice(0, 80));
    } catch {
      notJson.push(line.slice(0, 80));
    }
  }
  ok(
    notJson.length === 0,
    "Every stdout line is a JSON-RPC frame",
    notJson.length ? `stray: ${notJson.join(" | ")}` : "no stray output",
  );

  section("4b. Diagnostics went to stderr instead");

  ok(stderr.includes("[ese-mcp]"), "The server logged its readiness to stderr");
  ok(
    stderr.includes("Drafts only") || stderr.includes("ready"),
    "And said what it is",
    (stderr.match(/\[ese-mcp\][^\n]*/) ?? [""])[0].slice(0, 90),
  );
  ok(
    !stderr.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || " never"),
    "The service-role key does not appear in stderr",
  );
} catch (error) {
  ok(false, "The handshake completed", error.message.slice(0, 200));
  exitCode = 1;
} finally {
  child.stdin.end();
  child.kill("SIGTERM");
}

console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed > 0 || exitCode !== 0) {
  console.log(`${failed} FAILED — see above.`);
  process.exit(1);
}
