"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createAccountAction,
  grantAccessAction,
  revokeAccessAction,
  type PeopleFormState,
} from "@/app/admin/actions";
import type { ProfileRole } from "@/lib/supabase/database.types";

const INITIAL: PeopleFormState = { ok: false };

export type Account = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  role: ProfileRole | null;
  displayName: string | null;
};

function Submit({
  label,
  pendingLabel,
  variant = "primary",
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "quiet" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`admin-button admin-button--${variant}`}
      type="submit"
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function Notice({ state }: { state: PeopleFormState }) {
  if (!state.message) return null;

  return (
    <p
      className={`admin-notice ${
        state.ok ? "admin-notice--success" : "admin-notice--error"
      }`}
      role="status"
    >
      {state.message}
    </p>
  );
}

function GrantForm({ account }: { account: Account }) {
  const [state, action] = useActionState(grantAccessAction, INITIAL);

  return (
    <form className="admin-people__form" action={action}>
      <input type="hidden" name="userId" value={account.id} />

      <label className="visually-hidden" htmlFor={`name-${account.id}`}>
        Display name for {account.email ?? account.id}
      </label>
      <input
        id={`name-${account.id}`}
        name="displayName"
        type="text"
        placeholder="Display name"
        defaultValue={account.displayName ?? ""}
        maxLength={120}
      />

      <label className="visually-hidden" htmlFor={`role-${account.id}`}>
        Role for {account.email ?? account.id}
      </label>
      <select
        id={`role-${account.id}`}
        name="role"
        defaultValue={account.role ?? "admin"}
      >
        <option value="admin">admin</option>
        <option value="owner">owner</option>
      </select>

      <Submit
        label={account.role ? "Update" : "Grant access"}
        pendingLabel="Saving…"
        variant={account.role ? "quiet" : "primary"}
      />
      <Notice state={state} />
    </form>
  );
}

function RevokeForm({ account }: { account: Account }) {
  const [state, action] = useActionState(revokeAccessAction, INITIAL);

  return (
    <form action={action}>
      <input type="hidden" name="userId" value={account.id} />
      <Submit label="Revoke" pendingLabel="Revoking…" variant="danger" />
      <Notice state={state} />
    </form>
  );
}

function CreateAccountForm() {
  const [state, action] = useActionState(createAccountAction, INITIAL);

  return (
    <form className="admin-form admin-form--narrow" action={action}>
      <Notice state={state} />

      <div className="admin-field">
        <label htmlFor="new-email">Email address</label>
        <input id="new-email" name="email" type="email" autoComplete="off" required />
      </div>

      <div className="admin-field">
        <label htmlFor="new-password">Initial password</label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        <p className="admin-hint">
          At least 12 characters. Send it to them over something other than email.
          {/* Said plainly because the alternative is somebody hunting the console
              for a settings page that does not exist. There is no self-service
              password change here: it needs a current-password re-check to stop a
              stolen session cookie being enough to take over an account, and that
              flow has not been built. */}{" "}
          There is no password-change screen in this console yet — rotate a
          password from the Supabase dashboard under Authentication → Users.
        </p>
      </div>

      <Submit label="Create account" pendingLabel="Creating…" />
    </form>
  );
}

/**
 * Owner-only access management.
 *
 * Creating an account and granting access are deliberately two steps. An account
 * with no `profiles` row can sign in and gets the "awaiting approval" page — which
 * means a mistyped invitation cannot accidentally hand somebody the publish
 * button.
 */
export function PeopleManager({
  accounts,
  currentUserId,
}: {
  accounts: Account[];
  currentUserId: string;
}) {
  const owners = accounts.filter((account) => account.role === "owner").length;

  return (
    <>
      <ul className="admin-people">
        {accounts.map((account) => (
          <li key={account.id} className="admin-people__row">
            <div className="admin-people__who">
              <p className="admin-people__email">
                {account.email ?? <em>no email on record</em>}
                {account.id === currentUserId ? (
                  <span className="admin-chip admin-chip--role">you</span>
                ) : null}
              </p>
              <p className="admin-hint">
                {account.role ? (
                  <>
                    Access: <strong>{account.role}</strong>
                  </>
                ) : (
                  "No access — signing in shows the awaiting-approval page."
                )}
              </p>
            </div>

            <div className="admin-people__controls">
              <GrantForm account={account} />
              {account.role && account.id !== currentUserId ? (
                <RevokeForm account={account} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {owners <= 1 ? (
        <p className="admin-notice" role="status">
          There is one owner. The external drafting tool attributes every draft it
          creates to the oldest owner and fails without one, so that row cannot be
          removed until another owner exists.
        </p>
      ) : null}

      <section className="admin-section" aria-labelledby="create-account-heading">
        <h2 id="create-account-heading" className="admin-section__heading">
          Create a sign-in account
        </h2>
        <p className="admin-hint">
          There is no public sign-up. This is the only way an account comes into
          existence, and it does not grant access on its own.
        </p>
        <CreateAccountForm />
      </section>
    </>
  );
}
