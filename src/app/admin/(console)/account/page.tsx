import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { requireAdmin, viewerName } from "@/lib/blog/auth";
import { formatShortDate } from "@/lib/blog/format";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const viewer = await requireAdmin();

  /**
   * Whether this account has a password at all.
   *
   * A Google-only account has an `oauth` identity and no `email` one, so there is
   * no current password to ask for — demanding one would make the form
   * impossible to complete. Read from the identity list rather than assumed.
   */
  const identities = viewer.user.identities ?? [];
  const hasPassword = identities.some((identity) => identity.provider === "email");
  const providers = identities.map((identity) => identity.provider);

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <p className="section-label">Account</p>
          <h1>{viewerName(viewer)}</h1>
          <p className="admin-page__lede">{viewer.user.email}</p>
        </div>
      </header>

      <section className="admin-section" aria-labelledby="details-heading">
        <h2 id="details-heading" className="admin-section__heading">
          Details
        </h2>
        <dl className="admin-list__meta admin-account__meta">
          <div>
            <dt>Role</dt>
            <dd>{viewer.profile.role}</dd>
          </div>
          <div>
            <dt>Sign-in</dt>
            <dd>{providers.length > 0 ? providers.join(", ") : "email"}</dd>
          </div>
          <div>
            <dt>Access granted</dt>
            <dd>{formatShortDate(viewer.profile.created_at) ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-section" aria-labelledby="password-heading">
        <h2 id="password-heading" className="admin-section__heading">
          {hasPassword ? "Change password" : "Add a password"}
        </h2>
        <ChangePasswordForm hasPassword={hasPassword} />
      </section>
    </div>
  );
}
