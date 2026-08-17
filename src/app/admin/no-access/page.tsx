import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { getViewer } from "@/lib/blog/auth";

export const metadata: Metadata = { title: "Awaiting approval" };

/**
 * Where a signed-in account with no `profiles` row lands.
 *
 * This state is worth its own page rather than a redirect back to sign-in. The
 * person's credentials were correct — bouncing them to the login form would read
 * as "wrong password" and they would keep retrying it. Having an account and being
 * admitted are two separate things here, and the page says so.
 */
export default async function NoAccessPage() {
  const viewer = await getViewer();

  // Not signed in at all, or admitted since this page was requested.
  if (!viewer) redirect("/admin/login");
  if (viewer.profile) redirect("/admin");

  return (
    <main id="main-content" className="admin-gate">
      <div className="admin-gate__panel">
        <p className="section-label">Access</p>
        <h1>Awaiting approval</h1>
        <p className="admin-gate__lede">
          You are signed in as <strong>{viewer.user.email}</strong>, but this
          account has not been granted access to the blog console.
        </p>
        <p className="admin-hint">
          Access is granted deliberately by the site owner and is never created by
          signing in. If you are expecting access, ask the owner to add you.
        </p>

        <div className="admin-actions">
          <SignOutButton />
          <Link className="admin-button admin-button--quiet" href="/">
            Back to the site
          </Link>
        </div>
      </div>
    </main>
  );
}
