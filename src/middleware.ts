import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Session refresh only.
 *
 * This file is `middleware.ts` because the project is on Next 15.5. Next 16
 * renames the convention to `proxy.ts`; on this version that filename is
 * ignored entirely, which would silently disable session refresh. Rename it
 * when the project moves to 16.
 *
 * There is deliberately **no authorization here.** Middleware does not run for
 * every way a page can be reached, and a redirect is not a security boundary —
 * so the only job it has is calling `getUser()` early enough that a refreshed
 * token can still be written to the response. Every actual access decision is
 * made in the Server Component or Server Action that touches the data, and
 * ultimately by RLS.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without credentials there is no session to refresh. The public site still
  // renders, so failing open here is correct — the admin pages fail closed on
  // their own, where the missing variable produces a readable error.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !publishableKey) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // The library hands us the no-store headers that must accompany a
          // Set-Cookie carrying auth tokens. Without them a CDN in front of this
          // app can cache the response and serve one visitor's session to
          // another.
          for (const [key, headerValue] of Object.entries(headers)) {
            response.headers.set(key, headerValue);
          }
        },
      },
    },
  );

  // Must be awaited before the response is returned, or a refresh that lands
  // after the response is committed is lost and every request refreshes again.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  /**
   * Admin routes only.
   *
   * The public site has no session to refresh — `/blog` reads through an
   * anonymous, cookie-less client so it can stay in the route cache. Running this
   * there would add a round trip to every article view and, on a refresh, attach
   * `Set-Cookie` and `no-store` to a response that is meant to be cached for
   * everybody.
   */
  matcher: ["/admin/:path*"],
};
