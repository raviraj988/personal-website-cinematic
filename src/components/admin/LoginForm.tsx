"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signInAction, type SignInState } from "@/app/admin/actions";
import { GoogleButton } from "./GoogleButton";

const INITIAL: SignInState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="admin-button admin-button--primary" type="submit" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

/**
 * `error` carries a message from the auth callback — an expired reset link, a
 * refused Google sign-in — which arrives as a query parameter on a fresh page
 * load rather than as action state, so it has to be passed in.
 *
 * `next` is where to land after signing in, already validated by the page via
 * `safeReturnTo`. Present only when an OAuth consent request sent the person
 * here; absent normally, and the action then falls back to `/admin`. It is
 * re-validated in the action too — this hidden field is a form input like any
 * other, so a crafted POST could carry anything.
 */
export function LoginForm({ error, next }: { error?: string; next?: string | null }) {
  const [state, formAction] = useActionState(signInAction, INITIAL);
  const message = state.message ?? error;

  return (
    <>
    <form className="admin-form admin-form--narrow" action={formAction} noValidate>
      {message ? (
        <p className="admin-notice admin-notice--error" role="alert">
          {message}
        </p>
      ) : null}

      {next ? <input type="hidden" name="next" value={next} /> : null}

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
        <Link className="admin-button admin-button--quiet" href="/admin/forgot-password">
          Forgot password?
        </Link>
      </div>
    </form>

    <div className="admin-divider"><span>or</span></div>
    <GoogleButton />

    <p className="admin-hint admin-gate__foot">
      Having an account and being admitted are separate. A new account can see
      nothing until an owner grants it access.{" "}
      <Link href="/admin/signup">Request access</Link>
    </p>
    </>
  );
}
