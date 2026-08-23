"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signUpAction, type AuthState } from "@/app/admin/auth-actions";
import { GoogleButton } from "./GoogleButton";
import { PASSWORD_MIN, checkConfirmation, checkPassword } from "@/lib/blog/password";

const INITIAL: AuthState = { ok: false };

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="admin-button admin-button--primary"
      type="submit"
      disabled={disabled || pending}
    >
      {pending ? "Creating account…" : "Request access"}
    </button>
  );
}

/**
 * Create an account.
 *
 * Framed as "request access" rather than "sign up" because that is what it does:
 * it creates credentials, not admission. The distinction is stated on the form so
 * nobody creates an account and then waits at a screen they do not understand.
 *
 * The live checks below are convenience. The Server Action re-runs every one of
 * them, and Supabase enforces a length floor underneath that.
 */
export function SignupForm() {
  const [state, formAction] = useActionState(signUpAction, INITIAL);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const passwordProblem = password ? checkPassword(password) : null;
  const matchProblem = confirmation ? checkConfirmation(password, confirmation) : null;

  return (
    <>
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

        <div className="admin-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <div className="admin-field__foot">
            <p className="admin-hint">
              At least {PASSWORD_MIN} characters. Length beats punctuation — a
              phrase you can remember is stronger than a short word with symbols in it.
            </p>
          </div>
          {passwordProblem ? (
            <p className="admin-field__error" role="alert">
              {passwordProblem}
            </p>
          ) : null}
        </div>

        <div className="admin-field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
          />
          {matchProblem ? (
            <p className="admin-field__error" role="alert">
              {matchProblem}
            </p>
          ) : null}
        </div>

        <div className="admin-actions">
          <Submit disabled={Boolean(passwordProblem || matchProblem)} />
        </div>
      </form>

      <div className="admin-divider"><span>or</span></div>
      <GoogleButton />

      <p className="admin-hint admin-gate__foot">
        Creating an account does not grant access to the console. An owner
        approves each account separately.{" "}
        <Link href="/admin/login">Already have an account?</Link>
      </p>
    </>
  );
}
