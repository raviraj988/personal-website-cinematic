/**
 * Constants for the auth flows.
 *
 * A sibling module rather than part of `auth-actions.ts` because that file is
 * `"use server"`, and a `"use server"` module may export **only async
 * functions**. Exporting a constant from it makes the whole module unresolvable
 * from the client, and the error blames the import site — "The export X was not
 * found in module …" — while the actions themselves appear to vanish.
 */

/**
 * Marks a session that arrived through a verified password-recovery link.
 *
 * This cookie is the *entire* reason the change-password action can safely skip
 * the current-password check. Without it, "recovery" would be a claim any client
 * could make, and a stolen session cookie would be enough to set a new password
 * — which is exactly the takeover the current-password check exists to stop.
 *
 * httpOnly so no script can read or forge it, and short-lived so a link cannot be
 * replayed hours later. The action deletes it the moment it is used.
 */
export const RECOVERY_COOKIE = "ese_pw_recovery";
export const RECOVERY_COOKIE_MAX_AGE = 60 * 15;

/** Where OAuth and recovery links come back to. */
export const AUTH_CALLBACK_PATH = "/admin/auth/callback";

/**
 * Is this a safe place to send someone after sign-in?
 *
 * The callback accepts a `next` parameter so a deep link survives the round
 * trip. Unvalidated, that turns our own callback into an open redirector: a
 * crafted `?next=https://evil.example` link would carry our domain in the
 * address bar right up until the moment it did not.
 *
 * Only same-origin relative paths pass. `//evil.example` is rejected explicitly —
 * it is protocol-relative, so browsers treat it as absolute even though it starts
 * with a slash, and a naive `startsWith("/")` check waves it straight through.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return "/admin";
  if (!value.startsWith("/")) return "/admin";
  if (value.startsWith("//")) return "/admin";
  if (value.includes("\\")) return "/admin";
  return value;
}
