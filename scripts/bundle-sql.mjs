/**
 * Concatenates the numbered migrations into one file you can paste into the
 * Supabase SQL Editor in a single go.
 *
 *   npm run sql:bundle
 *
 * The numbered files remain the source of truth — this output is generated and
 * gitignored. It exists because applying three files in the right order by hand
 * is a step people get wrong, and `0002`/`0003` fail confusingly against a
 * database where `0001` has not run.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = path.resolve(import.meta.dirname, "..", "supabase", "migrations");
const OUT = path.join(DIR, "APPLY_ALL.generated.sql");
const rule = "-- " + "─".repeat(73);

const files = readdirSync(DIR)
  .filter((f) => /^\d+_.*\.sql$/.test(f))
  .sort();

const parts = [
  "-- " + "=".repeat(73),
  "-- ESE — all migrations, concatenated for a single paste.",
  "--",
  "-- GENERATED FILE. Do not edit; edit the numbered migrations and re-run:",
  "--   npm run sql:bundle",
  "--",
  "-- Paste the whole thing into the Supabase SQL Editor and run once.",
  "-- Every statement is idempotent, so re-running is safe.",
  "-- " + "=".repeat(73),
  "",
];

for (const file of files) {
  parts.push("", rule, `-- ${file}`, rule, "", readFileSync(path.join(DIR, file), "utf8"));
}

parts.push(
  "",
  rule,
  "-- Tell PostgREST about the new tables.",
  "--",
  "-- Supabase usually does this automatically, but a schema change applied in one",
  "-- go can land before the reload fires — which surfaces as exactly the error",
  "-- this bundle exists to fix: \"Could not find the table 'public.posts' in the",
  "-- schema cache\", reported for tables that demonstrably exist.",
  rule,
  "notify pgrst, 'reload schema';",
  "",
);

writeFileSync(OUT, parts.join("\n"));
console.log(`${files.length} migrations -> ${path.relative(process.cwd(), OUT)}`);
for (const f of files) console.log(`  ${f}`);
