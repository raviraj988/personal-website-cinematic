import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Anonymous, cookie-less client for the public blog.
 *
 * Two reasons this is not the request-scoped client from `server.ts`:
 *
 * 1. **Cacheability.** Reading `cookies()` opts a route into dynamic rendering
 *    for every request. `/blog` and `/blog/[slug]` are the same bytes for
 *    everybody, so they should sit in the full route cache and be rebuilt when a
 *    post changes — which is what makes the `revalidatePath` calls in the admin
 *    actions worth anything. A cookie read would quietly turn every mutation's
 *    revalidation into a no-op.
 *
 * 2. **Honesty.** The public pages should render what an anonymous reader sees.
 *    With this client, RLS gives us exactly the published, non-future rows and
 *    nothing else, so a signed-in admin cannot accidentally be shown a draft on a
 *    public URL and conclude it is live.
 *
 * `persistSession: false` because there is no session here and nothing to store.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
