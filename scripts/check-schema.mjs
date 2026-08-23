/**
 * Asks the live database which tables PostgREST can see.
 *
 *   npm run check:schema
 *
 * Reads `.env.local` directly rather than through `lib/supabase/env.ts`, because
 * that module is `server-only` and cannot be imported by a plain node process.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const env = Object.fromEntries(
  readFileSync(path.resolve(import.meta.dirname, "..", ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or a key in .env.local");
  process.exit(1);
}

const EXPECTED = ["profiles", "posts", "newsletters"];
let missing = 0;

for (const table of EXPECTED) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const ok = res.ok;
  if (!ok) missing += 1;
  console.log(`  ${table.padEnd(12)} ${ok ? "present" : `MISSING (${res.status})`}`);
}

if (missing) {
  console.log(
    `\n${missing} table(s) missing. Run \`npm run sql:bundle\`, then paste` +
      "\nsupabase/migrations/APPLY_ALL.generated.sql into the Supabase SQL Editor.",
  );
  process.exit(1);
}

console.log("\nSchema is present. Restart the dev server if it is running.");
