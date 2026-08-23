import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/admin/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset your password" };

/**
 * Deliberately reachable while signed in. Somebody who suspects their session is
 * not theirs should be able to start a reset without signing out first.
 */
export default function ForgotPasswordPage() {
  return (
    <main id="main-content" className="admin-gate">
      <div className="admin-gate__panel">
        <p className="section-label">Account</p>
        <h1>Reset your password</h1>
        <p className="admin-gate__lede">
          Enter the address on the account and we will send a link to set a new
          password.
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
