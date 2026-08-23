"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { changePasswordAction, type AuthState } from "@/app/admin/auth-actions";
import { PasswordFields, passwordPairBlocked } from "./PasswordFields";

const INITIAL: AuthState = { ok: false };

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="admin-button admin-button--primary"
      type="submit"
      disabled={disabled || pending}
    >
      {pending ? "Updating…" : "Update password"}
    </button>
  );
}

/**
 * Change your own password while signed in.
 *
 * The current-password field is not a formality. `updateUser({ password })` does
 * not ask for it, so without this a stolen session cookie would be enough to take
 * the account. The action verifies it server-side before anything is written.
 */
export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction] = useActionState(changePasswordAction, INITIAL);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const blocked = passwordPairBlocked(password, confirmation) || (hasPassword && !current);

  return (
    <form className="admin-form admin-form--narrow" action={formAction} noValidate>
      {state.message ? (
        <p
          className={`admin-notice admin-notice--${state.ok ? "success" : "error"}`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      {hasPassword ? (
        <div className="admin-field">
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            required
          />
          <div className="admin-field__foot">
            <p className="admin-hint">
              Confirms it is you and not just this browser.
            </p>
          </div>
        </div>
      ) : (
        <p className="admin-notice" role="status">
          This account signs in with Google and has no password yet. Setting one
          adds email sign-in — the Google option keeps working either way.
        </p>
      )}

      <PasswordFields
        password={password}
        confirmation={confirmation}
        onPassword={setPassword}
        onConfirmation={setConfirmation}
        idPrefix="new-"
      />

      <div className="admin-actions">
        <Submit disabled={blocked} />
      </div>
    </form>
  );
}
