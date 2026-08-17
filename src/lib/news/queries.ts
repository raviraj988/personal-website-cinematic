import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { NewsletterRow } from "@/lib/supabase/database.types";
import { NEWSLETTER_INDEX_LIMIT } from "./config";

/**
 * Newsletter issue queries.
 *
 * News *items* are posts and are read through `lib/blog/queries.ts` with
 * `category: "news"` — they share the editor, the covers, and the reading-time
 * machinery, so duplicating those queries here would buy nothing.
 *
 * As in the blog queries, `status = 'published'` is repeated in every public
 * query even though RLS enforces it. An admin is also `authenticated` and reads
 * through `newsletters_admin_all`, so without the filter a signed-in admin would
 * be the one person unable to tell a draft issue was not live.
 *
 * Unlike posts there is no `published_at <= now()` clause: an issue has an
 * `issue_date`, which is the date printed on it, not an embargo. Publishing is
 * the `status` flip alone.
 */

const INDEX_COLUMNS =
  "id, title, slug, description, external_url, cover_image_url, cover_image_alt, issue_date" as const;

export type NewsletterSummary = Pick<
  NewsletterRow,
  | "id"
  | "title"
  | "slug"
  | "description"
  | "external_url"
  | "cover_image_url"
  | "cover_image_alt"
  | "issue_date"
>;

/** Published newsletter issues, most recent issue first. */
export const getPublishedNewsletters = cache(
  async (limit: number = NEWSLETTER_INDEX_LIMIT): Promise<NewsletterSummary[]> => {
    // No credentials means the site has not been connected to a database yet,
    // not that something broke. The index renders its empty state.
    if (!supabaseConfigured()) return [];

    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from("newsletters")
      .select(INDEX_COLUMNS)
      .eq("status", "published")
      .order("issue_date", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Could not load newsletter issues: ${error.message}`);
    }

    return data ?? [];
  },
);

/** Every issue, for the admin list. RLS restricts this to admins. */
export async function getAllNewslettersForAdmin(): Promise<NewsletterRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("newsletters")
    .select("*")
    .order("issue_date", { ascending: false });

  if (error) throw new Error(`Could not load newsletter issues: ${error.message}`);

  return data ?? [];
}

/** One issue by id, whatever its status. RLS restricts this to admins. */
export async function getNewsletterForAdmin(
  id: string,
): Promise<NewsletterRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("newsletters")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load the issue: ${error.message}`);

  return data ?? null;
}
