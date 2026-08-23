/**
 * Password rules, shared by the browser and the Server Action.
 *
 * No `server-only` import and no Supabase import, deliberately: this has to stay
 * runnable from a plain `node` process so `scripts/test-password.mjs` can assert
 * the rules without a database or a React render. Same arrangement, and the same
 * reason, as `lib/blog/validation.ts`.
 *
 * Supabase enforces a minimum length of its own (6 by default). That is the floor
 * that cannot be bypassed; everything here is stricter and is what the console
 * actually applies.
 */

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72;

/**
 * bcrypt — which is what Supabase hashes with — silently truncates at 72 *bytes*.
 * A password longer than that has its tail ignored, so two different passwords
 * can authenticate the same account. Refusing it outright is better than
 * accepting one that does not mean what the person typed.
 */
export function passwordByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export type PasswordProblem = string | null;

/**
 * Returns the first reason this password is unacceptable, or null.
 *
 * Length-first rather than a composition matrix. Character-class rules push
 * people toward `Password1!` — long and memorable beats short and decorated, and
 * NIST has recommended against composition rules since 2017.
 */
export function checkPassword(value: string): PasswordProblem {
  if (!value) return "Enter a password.";

  if (value.length < PASSWORD_MIN) {
    return `Use at least ${PASSWORD_MIN} characters (currently ${value.length}).`;
  }

  const bytes = passwordByteLength(value);
  if (bytes > PASSWORD_MAX) {
    return `That password is too long — ${PASSWORD_MAX} bytes maximum (currently ${bytes}).`;
  }

  // A password of one repeated character clears a length check and nothing else.
  if (new Set(value).size < 4) {
    return "Use a longer mix of characters — this is too repetitive.";
  }

  if (/^\s|\s$/.test(value)) {
    return "Remove the leading or trailing space — it is easy to lose and hard to notice.";
  }

  return null;
}

/** Both boxes must agree before anything is submitted. */
export function checkConfirmation(
  password: string,
  confirmation: string,
): PasswordProblem {
  if (!confirmation) return "Type the password a second time to confirm it.";
  if (password !== confirmation) return "The two passwords do not match.";
  return null;
}

/**
 * A new password that equals the old one is a no-op the person will read as a
 * successful rotation — worth refusing rather than silently accepting.
 */
export function checkIsDifferent(
  currentPassword: string,
  nextPassword: string,
): PasswordProblem {
  if (currentPassword && currentPassword === nextPassword) {
    return "The new password is the same as the current one.";
  }
  return null;
}

/** Cheap sanity check before hitting the network. Not validation of deliverability. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
