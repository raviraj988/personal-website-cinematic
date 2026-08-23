import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ResetPasswordForm } from "@/components/admin/ResetPasswordForm";
import { getViewer } from "@/lib/blog/auth";
import { RECOVERY_COOKIE } from "@/lib/blog/auth-config";

export const metadata: Metadata = { title: "Set a new password" };

/**
 * Where a verified recovery link lands.
 *
 * Two things must both be true to show the form: a session exists, and the
 * httpOnly recovery cookie from the callback is present. This page's check is
 * only about what to render — the action re-checks the same cookie before it
 * writes anything, because a page render is not a security boundary.
 */
export default async function ResetPasswordPage() {
  const [viewer, cookieStore] = await Promise.all([getViewer(), cookies()]);
  const viaRecovery = cookieStore.get(RECOVERY_COOKIE)?.value === "1";

  if (!viewer || !viaRecovery) {
    return (
      <main id="main-content" className="admin-gate">
        <div className="admin-gate__panel">
          <p className="section-label">Account</p>
          <h1>This link is no longer valid</h1>
          <p className="admin-gate__lede">
            Reset links can be used once and expire after an hour. Request a new
            one and use the most recent email.
          </p>
          <div className="admin-actions">
            <Link className="admin-button admin-button--primary" href="/admin/forgot-password">
              Request a new link
            </Link>
            <Link className="admin-button admin-button--quiet" href="/admin/login">
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="admin-gate">
      <div className="admin-gate__panel">
        <p className="section-label">Account</p>
        <h1>Set a new password</h1>
        <p className="admin-gate__lede">
          Signed in as <strong>{viewer.user.email}</strong>. Choose a new password
          to finish.
        </p>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
