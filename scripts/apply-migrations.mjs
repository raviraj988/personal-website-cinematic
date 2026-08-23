/**
 * Applies the numbered migrations to the database over a direct Postgres
 * connection.
 *
 *   npm run db:migrate            apply every migration, in order
 *   npm run db:migrate -- --file supabase/migrations/RUN_ME.generated.sql
 *
 * Requires `SUPABASE_DB_URL` in `.env.local` — the URI from
 * Supabase → Settings → Database → Connection string.
 *
 * **This variable is for migrations only.** The application never opens a
 * Postgres connection: it speaks HTTPS to PostgREST using the API keys alongside
 * it. Nothing in `src/` reads this, and nothing should — the separation is why a
 * leaked publishable key cannot drop a table.
 *
 * The password is passed to psql through the environment rather than in the
 * connection string, because an argument is visible in the process list to
 * anyone who can run `ps` while the migration is in flight.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");

/* ------------------------------------------------------------------- env */

function readEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!existsSync(file)) fail("No .env.local. Copy .env.local.example and fill it in.");

  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    out[trimmed.slice(0, i).trim()] = trimmed
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return out;
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------- psql */

/**
 * Splits the URI into the PG* variables psql reads from the environment.
 *
 * `decodeURIComponent` on the password is not optional: Supabase passwords
 * routinely contain characters that are percent-encoded in a URI, and passing
 * the encoded form straight through authenticates with the wrong string and
 * reports it as a bad password.
 */
function pgEnvFromUri(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    fail("SUPABASE_DB_URL is not a valid URI. Copy it from Settings → Database → Connection string → URI.");
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    fail(`SUPABASE_DB_URL should start with postgresql:// (got ${parsed.protocol}//…).`);
  }

  return {
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || "5432",
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: parsed.pathname.replace(/^\//, "") || "postgres",
    // Supabase requires TLS; without this psql may negotiate plaintext and fail.
    PGSSLMODE: "require",
  };
}

function runSql(file, pgEnv) {
  const name = path.basename(file);
  process.stdout.write(`  ${name.padEnd(38)}`);

  const result = spawnSync(
    "psql",
    ["--quiet", "--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--file", file],
    { env: { ...process.env, ...pgEnv }, encoding: "utf8" },
  );

  if (result.error) fail(`Could not run psql: ${result.error.message}`);

  if (result.status !== 0) {
    console.log("FAILED");
    // stderr can echo a failing statement, never the connection string.
    console.error(`\n${(result.stderr || "").trim()}\n`);
    process.exit(1);
  }

  console.log("ok");
  const notices = (result.stderr || "").trim();
  if (notices) console.log(notices.split("\n").map((l) => `      ${l}`).join("\n"));
}

/* ------------------------------------------------------------------- main */

const env = readEnvLocal();
const uri = env.SUPABASE_DB_URL;

if (!uri) {
  fail(
    "SUPABASE_DB_URL is not set in .env.local.\n\n" +
      "  Supabase → Settings → Database → Connection string → URI\n" +
      "  Use the Session pooler string if offered; it works on IPv4.\n\n" +
      "  SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres",
  );
}

const pgEnv = pgEnvFromUri(uri);

const flagIndex = process.argv.indexOf("--file");
const files =
  flagIndex !== -1 && process.argv[flagIndex + 1]
    ? [path.resolve(ROOT, process.argv[flagIndex + 1])]
    : readdirSync(MIGRATIONS)
        .filter((f) => /^\d+_.*\.sql$/.test(f))
        .sort()
        .map((f) => path.join(MIGRATIONS, f));

for (const f of files) if (!existsSync(f)) fail(`No such file: ${f}`);

console.log(`\nApplying to ${pgEnv.PGHOST} as ${pgEnv.PGUSER}\n`);
for (const file of files) runSql(file, pgEnv);

/**
 * PostgREST caches the schema. A fresh set of tables can otherwise 404 as
 * "Could not find the table 'public.posts' in the schema cache" for minutes
 * after they demonstrably exist.
 */
process.stdout.write(`  ${"reload PostgREST schema cache".padEnd(38)}`);
const reload = spawnSync("psql", ["--quiet", "--no-psqlrc", "-c", "notify pgrst, 'reload schema';"], {
  env: { ...process.env, ...pgEnv },
  encoding: "utf8",
});
console.log(reload.status === 0 ? "ok" : "skipped");

console.log("\nDone. Verify with: npm run check:schema\n");
