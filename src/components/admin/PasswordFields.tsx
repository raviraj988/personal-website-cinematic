"use client";

import { PASSWORD_MIN, checkConfirmation, checkPassword } from "@/lib/blog/password";

/**
 * The new-password pair, shared by the reset and change-password forms.
 *
 * Controlled from the parent so the parent can disable its own submit button on
 * the same state this renders errors from — two components deriving that
 * separately is how a form ends up submittable while showing an error.
 */
export function PasswordFields({
  password,
  confirmation,
  onPassword,
  onConfirmation,
  idPrefix = "",
}: {
  password: string;
  confirmation: string;
  onPassword: (value: string) => void;
  onConfirmation: (value: string) => void;
  idPrefix?: string;
}) {
  const passwordProblem = password ? checkPassword(password) : null;
  const matchProblem = confirmation ? checkConfirmation(password, confirmation) : null;

  const passwordId = `${idPrefix}password`;
  const confirmId = `${idPrefix}confirmPassword`;

  return (
    <>
      <div className="admin-field">
        <label htmlFor={passwordId}>New password</label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          required
        />
        <div className="admin-field__foot">
          <p className="admin-hint">At least {PASSWORD_MIN} characters.</p>
        </div>
        {passwordProblem ? (
          <p className="admin-field__error" role="alert">
            {passwordProblem}
          </p>
        ) : null}
      </div>

      <div className="admin-field">
        <label htmlFor={confirmId}>Confirm new password</label>
        <input
          id={confirmId}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => onConfirmation(event.target.value)}
          required
        />
        {matchProblem ? (
          <p className="admin-field__error" role="alert">
            {matchProblem}
          </p>
        ) : null}
      </div>
    </>
  );
}

/** Whether the pair is currently submittable. */
export function passwordPairBlocked(password: string, confirmation: string): boolean {
  return Boolean(
    !password ||
      !confirmation ||
      checkPassword(password) ||
      checkConfirmation(password, confirmation),
  );
}
