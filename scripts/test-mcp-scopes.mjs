/**
 * The scope-to-tool mapping, and that registration actually honours it.
 *
 * Same shape as the other offline suites: `node:assert`-style checks against the
 * real modules through the TypeScript resolve hook. No database, no network, no
 * API key — a fake `ServerDeps` is enough, because nothing here calls a tool, it
 * only inspects which tools got registered.
 *
 * The reason this suite exists: the consent screen promises a scope, and the tool
 * layer is what has to enforce it. Those are two files, and a mapping that drifts
 * between them is a silent privilege escalation — a `blog:read` grant that can
 * still reach `create_draft`. So both directions are asserted, plus the actual
 * registration behaviour rather than just the lookup table.
 *
 *   node --import ./scripts/register-ts.mjs scripts/test-mcp-scopes.mjs
 */
import {
  MCP_SCOPES,
  SUPPORTED_MCP_SCOPES,
  TOOL_SCOPE,
  isMcpScope,
  toolsForScopes,
} from "../mcp/scopes.ts";
import { TOOL_NAMES, registerTools } from "../mcp/tools.ts";

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

/**
 * A stand-in for the SDK `Server`, capturing what gets registered.
 *
 * `registerTools` only calls `setRequestHandler`, so this is the whole surface it
 * needs. Invoking the captured `tools/list` handler is what makes the assertions
 * about the *registered* set rather than about `TOOL_SCOPE` restated.
 */
function fakeServer() {
  const handlers = new Map();
  return {
    setRequestHandler(schema, handler) {
      // The two schemas are distinguished by which one arrives first: the list
      // handler is registered before the call handler in `registerTools`.
      handlers.set(handlers.size === 0 ? "list" : "call", handler);
    },
    async listed() {
      const result = await handlers.get("list")();
      return result.tools.map((tool) => tool.name);
    },
    async call(name) {
      return handlers.get("call")({ params: { name, arguments: {} } });
    },
  };
}

/** Never reached: no assertion here calls a tool handler. */
const fakeDeps = {
  store: {},
  provider: {},
  fetcher: {},
  model: "test-model",
  quality: "low",
};

async function registeredWith(options) {
  const server = fakeServer();
  registerTools(server, fakeDeps, options);
  return { names: await server.listed(), server };
}

/* --------------------------------------------- 1. the mapping is total */

section("1. Every tool has a scope, and every scope entry is a tool");

for (const name of TOOL_NAMES) {
  ok(
    Object.prototype.hasOwnProperty.call(TOOL_SCOPE, name),
    `${name} has a scope`,
    TOOL_SCOPE[name],
  );
}

for (const name of Object.keys(TOOL_SCOPE)) {
  ok(TOOL_NAMES.includes(name), `TOOL_SCOPE key "${name}" is a real tool`);
}

ok(
  Object.keys(TOOL_SCOPE).length === TOOL_NAMES.length,
  "The mapping and the tool list are the same size",
  `${Object.keys(TOOL_SCOPE).length} vs ${TOOL_NAMES.length}`,
);

for (const scope of Object.values(TOOL_SCOPE)) {
  ok(isMcpScope(scope), `"${scope}" is a supported scope`);
}

/* ------------------------------------------------- 2. toolsForScopes */

section("2. toolsForScopes");

const readOnly = toolsForScopes([MCP_SCOPES.read]);
const draftOnly = toolsForScopes([MCP_SCOPES.draft]);
const both = toolsForScopes([...SUPPORTED_MCP_SCOPES]);

ok(!readOnly.has("create_draft"), "blog:read cannot reach create_draft");
ok(!readOnly.has("generate_cover_image"), "blog:read cannot reach generate_cover_image");
ok(readOnly.has("get_writing_guide"), "blog:read reaches the writing guide");
ok(readOnly.size === 6, "blog:read grants exactly the six read tools", `${readOnly.size}`);

// The asymmetry that matters: draft implies read, read never implies draft.
ok(draftOnly.has("create_draft"), "blog:draft reaches create_draft");
ok(
  draftOnly.has("get_writing_guide"),
  "blog:draft implies blog:read — drafting needs the read tools",
);
ok(draftOnly.size === TOOL_NAMES.length, "blog:draft alone reaches every tool");

ok(both.size === TOOL_NAMES.length, "Both scopes reach every tool");

ok(toolsForScopes([]).size === 0, "No scopes grants no tools");
ok(toolsForScopes(["blog:admin"]).size === 0, "An invented scope grants nothing");
ok(
  toolsForScopes(["blog:admin", MCP_SCOPES.read]).size === 6,
  "An unknown scope alongside a real one is ignored, not fatal",
);

/* --------------------------------------- 3. registration honours the set */

section("3. registerTools honours allowedTools");

const all = await registeredWith({});
ok(
  all.names.length === TOOL_NAMES.length,
  "No options registers every tool — the stdio path is unchanged",
  `${all.names.length}`,
);

const readRegistered = await registeredWith({ allowedTools: readOnly });
ok(
  readRegistered.names.length === 6,
  "A read-only allowlist registers six tools",
  readRegistered.names.length.toString(),
);
ok(
  !readRegistered.names.includes("create_draft"),
  "create_draft is absent from tools/list under blog:read",
);

// The point of filtering at registration rather than at call time: there is no
// handler to invoke, so an out-of-scope name is indistinguishable from a
// misspelling and cannot be reached by any code path.
const refused = await readRegistered.server.call("create_draft");
ok(refused.isError === true, "Calling create_draft under blog:read is an error");
ok(
  !JSON.stringify(refused).includes("create_draft("),
  "The refusal does not describe the tool it withheld",
);

const empty = await registeredWith({ allowedTools: new Set() });
ok(empty.names.length === 0, "An empty allowlist registers nothing");

/* ------------------------------------------------------------------ summary */

console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed > 0) {
  console.log(`${failed} FAILED — see above.`);
  process.exit(1);
}
