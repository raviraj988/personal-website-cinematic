/**
 * Environment loading and response helpers.
 *
 * ## Nothing in `mcp/` may throw at module scope
 *
 * This file is the main reason that rule exists and the main place it is easy to
 * break. A throw during module evaluation cannot be reported by anything that
 * imports the module: the MCP client sees the child process exit, with no tool
 * call to attach an error to and no way to tell a missing environment variable
 * from a syntax error. So every value below is resolved lazily inside a function
 * and memoised — never in a module-scope constant and never in an IIFE.
 *
 * ## Why `.env.local` is read relative to this file
 *
 * An MCP client chooses the working directory of the process it spawns, and it is
 * usually not the repository root. `process.cwd()` would therefore find the file
 * on some clients and not others, which is the worst of both. Resolving against
 * `import.meta.url` cannot be wrong. Same approach, and the same parse rules, as
 * `scripts/verify-contract.mjs`.
 *
 * ## Why the path is assembled rather than written as a literal
 *
 * `mcp/tools.ts` is now imported by `src/app/api/mcp/route.ts` as well as by the
 * stdio server, so this module goes through the Next build. Webpack treats
 * `new URL("<string literal>", import.meta.url)` as an *asset reference* and
 * copies the target into the build output — which put the entire `.env.local`,
 * service-role key included, at
 * `.next/server/chunks/static/media/.env.<hash>.local`. It was uploaded with the
 * deployment and stored in the build cache.
 *
 * So the read below goes through `path.join` on a directory derived at runtime.
 * Webpack has no special handling for `readFileSync` with a computed path, so
 * nothing is emitted. Do not "simplify" this back into a literal `new URL(...)`.
 *
 * Inside a Next runtime the read is skipped entirely: Next loads `.env.local`
 * into `process.env` itself in development, and on Vercel the variables come from
 * the platform. There is no file to find there and no reason to look.
 *
 * ## Nothing may write to stdout
 *
 * On a stdio transport, stdout *is* the JSON-RPC channel. One `console.log`
 * anywhere in this server's import graph corrupts every frame after it, and the
 * symptom is a client that reports malformed protocol rather than a stray log
 * line. Diagnostics go to `stderr`, which is why `note()` exists.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let fileEnv: Record<string, string> | null = null;

/**
 * `.env.local`, parsed once.
 *
 * A missing file is not an error here — a client may well pass the variables in
 * the process environment instead. Whether anything is actually *set* is decided
 * by `requireEnv`, which can name the one variable that is missing.
 */
function envFile(): Record<string, string> {
  if (fileEnv) return fileEnv;

  const parsed: Record<string, string> = {};

  // Inside Next, `process.env` is already populated and there is no `.env.local`
  // beside the bundled module to find. Skipping the read keeps a cold start from
  // doing a pointless failing stat, and makes the intent explicit rather than
  // relying on the catch below to absorb it.
  if (process.env.NEXT_RUNTIME) {
    fileEnv = parsed;
    return fileEnv;
  }

  try {
    // Assembled, not a literal. See the header — a literal here copies
    // `.env.local` into the Next build output.
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = readFileSync(join(here, "..", ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      parsed[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // No file. The process environment may still carry everything needed.
  }

  fileEnv = parsed;
  return fileEnv;
}

/** The process environment wins, so a client can override the file. */
export function readEnv(name: string): string | undefined {
  const fromProcess = process.env[name];
  if (fromProcess && fromProcess.trim().length > 0) return fromProcess.trim();

  const fromFile = envFile()[name];
  return fromFile && fromFile.length > 0 ? fromFile : undefined;
}

export function readEnvOr(name: string, fallback: string): string {
  return readEnv(name) ?? fallback;
}

/**
 * A required variable, or an error that names it.
 *
 * "Missing SUPABASE_SERVICE_ROLE_KEY" is actionable. The alternative — a
 * PostgREST 401 surfaced three calls later — is not.
 */
export function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env.local (see .env.local.example) or pass it in the MCP client's environment.`,
    );
  }
  return value;
}

/* ------------------------------------------------------------------ results */

/** An MCP tool result carrying one text block. */
export function textResult(body: string) {
  return { content: [{ type: "text" as const, text: body }] };
}

/** A structured payload, rendered as pretty JSON so a transcript stays readable. */
export function jsonResult(payload: unknown) {
  return textResult(JSON.stringify(payload, null, 2));
}

/**
 * A tool-level error.
 *
 * `isError` rather than a thrown exception: the client should see which tool
 * failed and why, and be able to fix the argument and call again. A throw
 * becomes a protocol error and loses that.
 */
export function errorResult(message: string) {
  return { ...textResult(message), isError: true as const };
}

/* ------------------------------------------------- sanitising what we return */

const MAX_PROVIDER_MESSAGE = 300;

/**
 * Flatten and truncate a third-party error before it is surfaced.
 *
 * Provider errors are not safe to pass through verbatim. They can carry the
 * request that produced them — which for an image call means the whole prompt —
 * they can run to thousands of characters, and they can embed newlines that
 * break a one-line diagnostic into something that looks like several. This
 * collapses all of it and keeps enough to identify the failure.
 *
 * Never called on a Postgres error: those get mapped to a field-specific
 * sentence instead, the way `describeDbError` does in `src/app/admin/actions.ts`.
 */
export function sanitizeProviderMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "an unknown error";

  const flat = raw.replace(/\s+/g, " ").trim();
  return flat.length > MAX_PROVIDER_MESSAGE
    ? `${flat.slice(0, MAX_PROVIDER_MESSAGE)}…`
    : flat;
}

/** Diagnostics, on stderr. See the stdout warning at the top of this file. */
export function note(message: string): void {
  process.stderr.write(`[ese-mcp] ${message}\n`);
}
