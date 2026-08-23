"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      {pending ? "Saving…" : "Set new password"}
    </button>
  );
}

/**
 * Set a password after following a recovery link.
 *
 * No current-password field: there is no current password to give, which is the
 * whole point of a reset. What authorises that is the httpOnly recovery cookie
 * the callback route set after verifying the token — not this form, and not
 * anything the browser could assert.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(changePasswordAction, INITIAL);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  /**
   * On success the recovery cookie is spent, so this page can no longer do
   * anything. Move on rather than leaving a dead form on screen.
   */
  useEffect(() => {
    if (!state.ok) return;
    const timer = window.setTimeout(() => router.replace("/admin"), 1200);
    return () => window.clearTimeout(timer);
  }, [state.ok, router]);

  return (
    <form className="admin-form admin-form--narrow" action={formAction} noValidate>
      {state.message ? (
        <p
          className={`admin-notice admin-notice--${state.ok ? "success" : "error"}`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
          {state.ok ? " Taking you to the console…" : null}
        </p>
      ) : null}

      <PasswordFields
        password={password}
        confirmation={confirmation}
        onPassword={setPassword}
        onConfirmation={setConfirmation}
      />

      <div className="admin-actions">
        <Submit disabled={passwordPairBlocked(password, confirmation)} />
      </div>
    </form>
  );
}
