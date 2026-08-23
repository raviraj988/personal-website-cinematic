import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import {
  RECOVERY_COOKIE,
  RECOVERY_COOKIE_MAX_AGE,
  safeNextPath,
} from "@/lib/blog/auth-config";

/**
 * Where OAuth and email links come back to.
 *
 * Handles three arrivals:
 *
 *   - `?code=…`        an OAuth (PKCE) round trip, exchanged for a session
 *   - `?token_hash=…`  an email link — recovery, confirmation, or invite
 *   - `?error=…`       the provider or Supabase refused
 *
 * Route handlers are uncached by default, so nothing here needs a cache
 * directive. It must stay dynamic regardless: it reads query parameters and
 * writes cookies on every request.
 *
 * ## The fragment problem
 *
 * Supabase's *default* recovery template links to its own `/auth/v1/verify`,
 * which redirects with the tokens in a URL **fragment** (`#access_token=…`). A
 * fragment is never transmitted to the server, so this handler would receive an
 * empty query string and could only report failure — for a link that is
 * perfectly valid.
 *
 * The fix is a dashboard change, not a code change. The recovery template must
 * point here directly:
 *
 *     {{ .SiteURL }}/admin/auth/callback?token_hash={{ .TokenHash }}&type=recovery
 *
 * `token_hash` is a query parameter, so it arrives, and `verifyOtp` accepts it.
 * See README.md.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  /**
   * A route handler does not render through `app/admin/layout.tsx`, so it never
   * sees that layout's "not connected yet" panel. Without this guard an
   * unconfigured deployment answers the callback with a raw 500 — during setup,
   * which is exactly when someone is most likely to be clicking one of these
   * links and least able to tell a missing variable from a broken link.
   */
  if (!supabaseConfigured()) {
    return NextResponse.redirect(
      `${origin}/admin/login?error=${encodeURIComponent(
        "This deployment has no Supabase credentials yet, so sign-in links cannot be completed.",
      )}`,
    );
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  // `next` is attacker-supplied. `safeNextPath` refuses anything that is not a
  // same-origin relative path, or this handler becomes an open redirector
  // wearing our domain.
  const next = safeNextPath(searchParams.get("next"));

  if (providerError) {
    return NextResponse.redirect(
      `${origin}/admin/login?error=${encodeURIComponent(providerError)}`,
    );
  }

  const supabase = await createClient();
  const isRecovery = type === "recovery";

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/admin/login?error=${encodeURIComponent(error.message)}`,
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery" | "email" | "invite" | "magiclink" | "signup",
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(
        `${origin}/admin/login?error=${encodeURIComponent(
          "That link has expired or has already been used. Request a new one.",
        )}`,
      );
    }
  } else {
    /**
     * No code and no token_hash. Almost always the fragment problem above: the
     * link worked, the tokens went to the browser, and none of it reached us.
     * Say so, rather than "invalid link", which sends people to re-request a
     * link that will fail the same way.
     */
    return NextResponse.redirect(
      `${origin}/admin/login?error=${encodeURIComponent(
        "That sign-in link did not carry a token. If this was a password reset, the email template needs updating — see README.",
      )}`,
    );
  }

  /**
   * A verified recovery exchange, and only that, is allowed to set a new password
   * without producing the current one.
   *
   * The marker is a server-set httpOnly cookie rather than a query parameter or
   * anything else the client controls, because a client-assertable "I am
   * recovering" is a password-reset bypass for anyone holding a session cookie.
   */
  const response = isRecovery
    ? NextResponse.redirect(`${origin}/admin/reset-password`)
    : NextResponse.redirect(`${origin}${next}`);

  if (isRecovery) {
    response.cookies.set(RECOVERY_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: RECOVERY_COOKIE_MAX_AGE,
    });
  }

  return response;
}
