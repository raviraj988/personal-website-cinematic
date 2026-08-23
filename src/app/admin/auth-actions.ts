"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { getViewer } from "@/lib/blog/auth";
import {
  checkConfirmation,
  checkIsDifferent,
  checkPassword,
  looksLikeEmail,
} from "@/lib/blog/password";
import {
  AUTH_CALLBACK_PATH,
  RECOVERY_COOKIE,
  safeNextPath,
} from "@/lib/blog/auth-config";

/**
 * Sign-up, password reset, password change, and OAuth start.
 *
 * Every export here is an async function. `"use server"` requires it — see the
 * note in `lib/blog/auth-config.ts` for what happens otherwise.
 *
 * Read the security notes on each action before changing one. Three of the four
 * have a failure mode that is invisible in testing and total in production.
 */

export type AuthState = { ok: boolean; message?: string };

/**
 * The origin this request arrived on, for building absolute redirect URLs.
 *
 * Taken from the request headers rather than an environment variable, because
 * this has to be correct on localhost, on previews, and in production without
 * three different values being kept in sync. `x-forwarded-host` first: behind a
 * proxy, `host` is the internal address, and an OAuth redirect built from it
 * sends the browser somewhere it cannot reach.
 */
async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${protocol}://${host}`;
}

/* -------------------------------------------------------------------- sign up */

/**
 * Create an account. Creates **no** access.
 *
 * A new account has no `profiles` row, so it lands on `/admin/no-access` and can
 * read nothing — RLS decides that, not this function. An owner grants access from
 * `/admin/people`. That separation is the whole reason opening sign-up does not
 * open the console: authentication is public, authorization is not.
 */
export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  if (!looksLikeEmail(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const passwordProblem = checkPassword(password) ?? checkConfirmation(password, confirmation);
  if (passwordProblem) return { ok: false, message: passwordProblem };

  const supabase = await createClient();
  const origin = await requestOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}${AUTH_CALLBACK_PATH}` },
  });

  if (error) {
    return { ok: false, message: `Could not create the account: ${error.message}` };
  }

  /**
   * Supabase returns a user with an empty `identities` array when the address is
   * already registered — it does this deliberately, so the endpoint cannot be
   * used to enumerate who has an account. Mirroring that here means telling the
   * same story for both cases rather than confirming the address exists.
   */
  const alreadyRegistered = data.user && data.user.identities?.length === 0;

  if (!data.session || alreadyRegistered) {
    return {
      ok: true,
      message:
        "Check your email to confirm the address. Once confirmed, an owner still has to grant console access before you can sign in.",
    };
  }

  // Email confirmation is off, so the account is live immediately. Where it can
  // actually go is decided by whether it has a profile.
  redirect("/admin");
}

/* ------------------------------------------------------------ forgot password */

/**
 * Send a reset link.
 *
 * **This does nothing useful until custom SMTP is configured.** Supabase's
 * built-in mailer allows 2 emails per hour project-wide and, on current projects,
 * only delivers to members of your Supabase organisation — so a reset for anyone
 * else is accepted, reports success, and reaches nobody.
 *
 * The recovery email template must also be changed to pass `token_hash` as a
 * query parameter; the default sends the token in a URL *fragment*, which never
 * reaches the server. Both are documented in README.md.
 *
 * Always reports success. A different answer for "no such account" turns this
 * form into a way to test whether an address is registered.
 */
export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();

  const sent: AuthState = {
    ok: true,
    message:
      "If that address has an account, a reset link is on its way. The link expires in one hour.",
  };

  if (!looksLikeEmail(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const origin = await requestOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}${AUTH_CALLBACK_PATH}?type=recovery`,
  });

  // Logged, not surfaced: the caller gets the same answer either way.
  if (error) console.error("[auth] reset request failed:", error.message);

  return sent;
}

/* ------------------------------------------------------------ change password */

/**
 * Set a new password.
 *
 * Two paths in, and the difference between them is the security property:
 *
 *   1. **Signed in normally.** The current password must be supplied and is
 *      verified first. `updateUser({ password })` does not ask for it, so
 *      without this check a stolen session cookie is a complete account
 *      takeover.
 *
 *   2. **Arrived via a recovery link.** There is no current password to give.
 *      This is authorised *only* by the httpOnly `RECOVERY_COOKIE` that the
 *      callback route sets after verifying the token — never by the client
 *      saying so. The cookie is deleted on use, so the window cannot be replayed.
 */
export async function changePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Your session has expired. Sign in again." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  const problem =
    checkPassword(password) ??
    checkConfirmation(password, confirmation) ??
    checkIsDifferent(currentPassword, password);
  if (problem) return { ok: false, message: problem };

  const cookieStore = await cookies();
  const viaRecovery = cookieStore.get(RECOVERY_COOKIE)?.value === "1";

  if (!viaRecovery) {
    if (!currentPassword) {
      return { ok: false, message: "Enter your current password." };
    }

    /**
     * Verified on a throwaway client with `persistSession: false`.
     *
     * A normal sign-in here would issue a fresh token and write new auth cookies
     * over the live session — so a *correct* password check would rotate the
     * session mid-request and the update that follows could execute as a
     * half-replaced identity. This client holds nothing and writes nothing.
     */
    const probe = createServerClient(supabaseUrl(), supabasePublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
      cookies: { getAll: () => [], setAll: () => {} },
    });

    const { error: probeError } = await probe.auth.signInWithPassword({
      email: viewer.user.email ?? "",
      password: currentPassword,
    });

    if (probeError) {
      return { ok: false, message: "That is not your current password." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, message: `Could not update the password: ${error.message}` };
  }

  // Spent immediately, whether or not it was the thing that authorised this.
  if (viaRecovery) cookieStore.delete(RECOVERY_COOKIE);

  return { ok: true, message: "Password updated." };
}

/* --------------------------------------------------------------------- OAuth */

/**
 * Start the Google flow.
 *
 * Returns a URL for the browser to follow rather than redirecting from inside a
 * `try` — `redirect()` throws a control-flow signal that a surrounding catch
 * would swallow, turning a working redirect into a silent no-op.
 *
 * Requires the Google provider to be enabled in the Supabase dashboard with
 * `<origin>/admin/auth/callback` registered as a redirect URL. Without that the
 * provider returns an error page rather than failing here.
 */
export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  const origin = await requestOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    redirect(`/admin/login?error=${encodeURIComponent(error?.message ?? "Google sign-in is unavailable.")}`);
  }

  redirect(data.url);
}
