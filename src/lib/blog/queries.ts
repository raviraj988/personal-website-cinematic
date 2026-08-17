import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { PostCategory, PostRow } from "@/lib/supabase/database.types";
import { BLOG_INDEX_LIMIT } from "./config";

/**
 * Columns the index needs.
 *
 * `content` is in here, which looks wasteful for a list view — it is the price of
 * computing reading time at render instead of storing a value that goes stale. At
 * the index's 24-post cap that is a few hundred kilobytes over a pooled
 * connection, once an hour, on a page that is then served from the route cache.
 * If the archive ever outgrows the cap, this is the first thing to revisit.
 */
const INDEX_COLUMNS =
  "id, title, slug, excerpt, cover_image_url, cover_image_alt, published_at, updated_at, content" as const;

export type PostSummary = Pick<
  PostRow,
  | "id"
  | "title"
  | "slug"
  | "excerpt"
  | "cover_image_url"
  | "cover_image_alt"
  | "published_at"
  | "updated_at"
  | "content"
>;

/**
 * Every public query below repeats `status = 'published'` and
 * `published_at <= now()`.
 *
 * Against RLS that looks redundant — it is not. An **admin** is also
 * `authenticated`, and the `posts_admin_all` policy lets them read everything.
 * Without these filters a signed-in admin would get a 200 on a draft's public
 * URL and would be the one person on earth unable to tell the page is not live.
 * Authorization lives in RLS; visibility lives in the query; both are needed.
 */

/** Published, non-future posts, newest first. */
export async function getPublishedPosts(
  limit: number = BLOG_INDEX_LIMIT,
  category: PostCategory = "blog",
): Promise<PostSummary[]> {
  // No credentials means the journal has not been connected to a database yet, not
  // that something broke. The index renders its empty state and the build passes.
  if (!supabaseConfigured()) return [];

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("posts")
    .select(INDEX_COLUMNS)
    .eq("status", "published")
    .eq("category", category)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Could not load the ${category} index: ${error.message}`);

  return data ?? [];
}

/**
 * One published post by slug, or `null`.
 *
 * `null` covers three cases the caller must treat identically: the slug does not
 * exist, the post is a draft, and the post is scheduled for the future. All three
 * are a genuine 404 — a draft that says "not authorized" tells a stranger that a
 * post by that name exists.
 *
 * Wrapped in React's `cache` because `generateMetadata` and the page component
 * both need the row. Next only de-duplicates calls that go through its patched
 * `fetch`, and supabase-js does not, so without this every article view would run
 * the same query twice.
 */
export const getPublishedPost = cache(
  async (slug: string, category: PostCategory = "blog"): Promise<PostRow | null> => {
    // Unconfigured: there are no posts, so every slug is a 404. See `env.ts`.
    if (!supabaseConfigured()) return null;

    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      // Slugs are unique across the whole table, so a news item and a blog post
      // can never collide — but they do live at different URLs. Without this
      // filter a news item would also resolve under /blog/, giving one piece of
      // writing two canonical addresses.
      .eq("category", category)
      .lte("published_at", new Date().toISOString())
      .maybeSingle();

    if (error) throw new Error(`Could not load the post: ${error.message}`);

    return data ?? null;
  },
);

/** Slugs and timestamps for the sitemap. */
export async function getSitemapPosts(): Promise<
  Pick<PostRow, "slug" | "published_at" | "updated_at" | "category">[]
> {
  if (!supabaseConfigured()) return [];

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("posts")
    .select("slug, published_at, updated_at, category")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  // A sitemap that throws takes the whole route down. A sitemap missing its
  // posts is a smaller failure than a 500 at /sitemap.xml, so this one degrades.
  if (error) return [];

  return data ?? [];
}

/** Every post, for the admin list. RLS restricts this to admins. */
export async function getAllPostsForAdmin(): Promise<PostRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Could not load posts: ${error.message}`);

  return data ?? [];
}

/** One post by id, whatever its status. RLS restricts this to admins. */
export async function getPostForAdmin(id: string): Promise<PostRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load the post: ${error.message}`);

  return data ?? null;
}

/*
 * There is deliberately no `isSlugAvailable` helper here.
 *
 * A check-then-insert pair races: two saves a moment apart both see the slug as
 * free and the second still fails. The `slug text not null unique` constraint is
 * the only thing that actually decides, so the actions let the insert fail and
 * translate the unique violation back onto the slug field — see `describeDbError`
 * in `app/admin/actions.ts`.
 */
