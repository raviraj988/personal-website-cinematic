"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordResetAction, type AuthState } from "@/app/admin/auth-actions";

const INITIAL: AuthState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="admin-button admin-button--primary" type="submit" disabled={pending}>
      {pending ? "Sending…" : "Send reset link"}
    </button>
  );
}

/**
 * Request a password reset.
 *
 * The response is the same whether or not the address has an account. A form
 * that says "no such account" is a way to find out who has one.
 */
export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, INITIAL);

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

      <div className="admin-field">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>

      <div className="admin-actions">
        <Submit />
        <Link className="admin-button admin-button--quiet" href="/admin/login">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
