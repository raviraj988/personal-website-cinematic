import type { Metadata } from "next";
import { PeopleManager, type Account } from "@/components/admin/PeopleManager";
import { requireOwner } from "@/lib/blog/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "People" };

/**
 * Owner-only. Who has an account, and who has been let in.
 *
 * This page is the reason the service-role key exists in this project: `auth.users`
 * is not exposed through PostgREST at all, so there is no RLS-visible table the
 * publishable key could read to answer "which accounts exist". The profile rows
 * beside it are read with the ordinary request-scoped client, because an owner is
 * already permitted to read those.
 */
export default async function PeoplePage() {
  const { user } = await requireOwner();

  const admin = createServiceClient();
  const supabase = await createClient();

  const [{ data: authData, error: authError }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    supabase.from("profiles").select("id, display_name, role, created_at, updated_at"),
  ]);

  const roleById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const accounts: Account[] = (authData?.users ?? [])
    .map((authUser) => {
      const profile = roleById.get(authUser.id);
      return {
        id: authUser.id,
        email: authUser.email ?? null,
        createdAt: authUser.created_at,
        lastSignInAt: authUser.last_sign_in_at ?? null,
        role: profile?.role ?? null,
        displayName: profile?.display_name ?? null,
      };
    })
    // Admitted accounts first, then by sign-up order, so the people who matter are
    // at the top of a list that will mostly be one or two rows.
    .sort((a, b) => {
      if (Boolean(a.role) !== Boolean(b.role)) return a.role ? -1 : 1;
      return a.createdAt.localeCompare(b.createdAt);
    });

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <p className="section-label">Blog</p>
          <h1>People</h1>
          <p className="admin-page__lede">
            A row in <code>profiles</code> is what grants access to this console.
            Having a sign-in account is not the same thing.
          </p>
        </div>
      </header>

      {authError ? (
        <p className="admin-notice admin-notice--error" role="alert">
          Could not list accounts: {authError.message}
        </p>
      ) : null}

      <PeopleManager accounts={accounts} currentUserId={user.id} />
    </div>
  );
}
