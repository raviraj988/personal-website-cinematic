"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInAction, type SignInState } from "@/app/admin/actions";

const INITIAL: SignInState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="admin-button admin-button--primary" type="submit" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, INITIAL);

  return (
    <form className="admin-form admin-form--narrow" action={formAction} noValidate>
      {state.message ? (
        <p className="admin-notice admin-notice--error" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="admin-field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
        />
      </div>

      <div className="admin-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="admin-actions">
        <SubmitButton />
      </div>

      <p className="admin-hint">
        There is no sign-up. Accounts are created by the site owner, and access is
        granted separately from having an account.
      </p>
    </form>
  );
}
