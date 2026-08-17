/**
 * Supabase configuration, read once and validated loudly.
 *
 * Credentials genuinely have to come from the environment — unlike the
 * canonical origin, they differ per project and must not be committed. The
 * trade-off is handled by failing fast with a message that names the missing
 * variable, rather than letting a client be constructed against `undefined` and
 * surfacing as an opaque fetch error later.
 */

function publishableKeyValue(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Whether this deployment has Supabase credentials at all.
 *
 * This is a question about the *deployment*, not about whether a query worked, and
 * the two get different treatment. An absent URL means the journal has not been
 * connected yet — the landing page is still a complete, deployable site, and the
 * public blog routes fail soft so that `next build` succeeds without a database.
 * A query that fails against credentials that *are* present is a fault, and throws.
 *
 * Without this split, a missing variable takes the whole build down at
 * `/sitemap.xml`, which makes the marketing site undeployable because a blog it
 * does not have yet is unconfigured.
 */
export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && publishableKeyValue());
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local — see README.md, "Blog and admin console".`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/**
 * The publishable (anon) key. Safe in the browser: it carries no privileges of
 * its own, and every row it can reach is decided by RLS.
 *
 * Accepts either name. Supabase renamed `anon` to `publishable`; projects
 * created before the rename still hand out the old one.
 */
export function supabasePublishableKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKeyValue());
}

/**
 * The service-role key. Bypasses RLS entirely.
 *
 * Deliberately has no `NEXT_PUBLIC_` prefix, so Next cannot inline it into a
 * client bundle even by accident.
 */
export function supabaseServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}
