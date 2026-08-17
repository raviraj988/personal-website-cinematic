import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

/**
 * Service-role client. Bypasses Row Level Security completely.
 *
 * `import "server-only"` makes importing this from a Client Component a build
 * error rather than a leaked key. The key also has no `NEXT_PUBLIC_` prefix, so
 * even if a client module reached the env read, Next would have replaced it with
 * `undefined`. Two independent guards, because one mistake here is
 * unrecoverable.
 *
 * Use it *only* where the publishable key genuinely cannot reach:
 *
 *   - listing `auth.users` (the Admin API; no RLS-visible table exposes it)
 *   - creating accounts
 *
 * Everything about posts goes through the request-scoped client in `server.ts`
 * so that RLS stays in the path. If you find yourself reaching for this to make
 * a post query work, the policy is wrong — fix the policy.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
