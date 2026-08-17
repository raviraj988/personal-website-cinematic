import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { ProfileRow } from "@/lib/supabase/database.types";

export type Viewer = {
  user: User;
  profile: ProfileRow | null;
};

/**
 * Who is making this request, if anyone.
 *
 * `getUser()`, never `getSession()`. `getSession()` decodes the session out of a
 * cookie the browser sent us and hands it back without asking anyone — on the
 * server that cookie is attacker-controlled input. `getUser()` validates the
 * token against the Auth server, so the identity it returns is one we have
 * actually verified.
 *
 * A `null` profile is a real and expected state: an Auth account exists but has
 * not been granted access. It is not the same as "not signed in", and the two
 * lead to different pages.
 */
export async function getViewer(): Promise<Viewer | null> {
  /**
   * No credentials means nobody can be signed in, so this is `null` rather than
   * an error.
   *
   * The setup panel in `app/admin/layout.tsx` already handles what the *reader*
   * sees, but a layout and its page render in parallel in the App Router — the
   * page body still executes even when the layout declines to render `children`.
   * Without this guard every admin request logged a "Missing
   * NEXT_PUBLIC_SUPABASE_URL" stack trace while quietly serving the correct
   * screen, and a log full of harmless scary errors is how a real one goes
   * unnoticed.
   */
  if (!supabaseConfigured()) return null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Readable under the `profiles_self_read` policy — no service role needed to
  // find out who you are.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile ?? null };
}

/**
 * Gate for every admin surface.
 *
 * Called at the top of each admin page **and** at the top of each Server Action,
 * not once in a layout. A layout runs when a page is rendered; it does not run
 * when a Server Action is invoked, and a Server Action is a public HTTP endpoint
 * that anyone can POST to with a hand-written request. Checking in the layout
 * only would leave every mutation wide open.
 */
export async function requireAdmin(): Promise<Viewer & { profile: ProfileRow }> {
  const viewer = await getViewer();

  if (!viewer) redirect("/admin/login");
  if (!viewer.profile) redirect("/admin/no-access");

  return { user: viewer.user, profile: viewer.profile };
}

/**
 * Stricter gate for the surfaces that grant access to other people. Admins can
 * write posts; only an owner can decide who else gets in.
 */
export async function requireOwner(): Promise<Viewer & { profile: ProfileRow }> {
  const viewer = await requireAdmin();

  if (viewer.profile.role !== "owner") redirect("/admin?denied=owner-only");

  return viewer;
}

/** Display name for the signed-in admin, falling back to their email. */
export function viewerName(viewer: Viewer): string {
  return viewer.profile?.display_name?.trim() || viewer.user.email || "Signed in";
}
