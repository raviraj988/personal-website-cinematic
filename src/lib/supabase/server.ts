import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Request-scoped Supabase client for Server Components, Server Actions, and
 * route handlers.
 *
 * A new client per render — never a module-level singleton. A shared client
 * would carry one request's session into another's render.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies in Next 15 — the store is
          // read-only outside Server Actions and route handlers. Swallowing this
          // is correct rather than lazy: middleware already refreshed the
          // session for this request and wrote the new cookies to the response,
          // so there is nothing here that is not already persisted.
        }
      },
    },
  });
}
