/**
 * The only module in this server that touches the database.
 *
 * ## Read this before adding a function
 *
 * This module exports **no publish, unpublish, update, or delete function**, and
 * that absence is the primary security control of the whole server. Not a policy,
 * not a code-review rule — there is no callable thing.
 *
 * The reason is the key. `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security
 * completely, on `posts` and on `storage.objects` alike. Everything else in this
 * process is downstream of a language model reading text it did not write: a tool
 * argument, a web page fetched for a cover, a topic brief pasted from somewhere.
 * If a publish function existed here, "publish this post" would be one
 * successfully-injected instruction away from being true. The database cannot
 * stop it, because the service-role key is exactly the credential RLS defers to.
 *
 * So: `status: 'draft'` and `source: 'ai-assisted'` are literals in the insert
 * object below, `DraftInput` has no field that could carry a different value, and
 * `scripts/test-mcp-adapter.mjs` asserts by enumeration that no export of this
 * module matches `/publish|unpublish|update|delete|remove/i`. If you need to
 * change a post's status, that is what `/admin/posts/<id>` is for, signed in, as
 * a person.
 *
 * ## Why this does not reuse `src/lib/blog/queries.ts`
 *
 * It cannot. That module imports React's `cache` and, through
 * `@/lib/supabase/server`, `next/headers` — both of which need a Next request
 * context that does not exist in a stdio process. `src/lib/supabase/service.ts`
 * is out too: it opens with `import "server-only"`, which throws in plain Node.
 * What *is* reused is `src/lib/supabase/database.types.ts`, which is
 * dependency-free, so the row and insert shapes here are the app's own types
 * rather than a second description of the same table.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  PostCategory,
  PostStatus,
} from "../../src/lib/supabase/database.types";
import type {
  BlogStore,
  DraftInput,
  LinkablePost,
  PostListItem,
} from "../ports";
import type { CoverMime } from "../../src/lib/blog/image";
import { coverObjectPath, checkSlugShape, randomSuffix } from "../paths";
import { requireEnv } from "../lib";

const BUCKET = "blog-images";
const LIST_COLUMNS = "id, title, slug, status, category, published_at, updated_at";

let client: SupabaseClient<Database> | null = null;

/**
 * The service-role client, built lazily and memoised.
 *
 * Lazily because a missing variable must be reportable as a tool error rather
 * than as a module-evaluation throw — see the note at the top of `mcp/lib.ts`.
 * `persistSession` and `autoRefreshToken` are off for the same reason
 * `src/lib/supabase/service.ts` turns them off: there is no user session here to
 * persist, and a background refresh timer in a short-lived process is a handle
 * that never gets cleaned up.
 */
function serviceClient(): SupabaseClient<Database> {
  if (client) return client;

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (/\/rest\/v1\/?$/.test(url)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be the bare origin with no path — a trailing /rest/v1/ makes every request fail in a way that looks like anything but a bad variable.",
    );
  }

  client = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

/**
 * Turn a PostgREST error into a sentence.
 *
 * Mirrors `describeDbError` in `src/app/admin/actions.ts`, and for the same
 * reason: the constraint names are the real contract, and mapping them here means
 * the tool says "that slug is taken" instead of surfacing `23505` and a
 * constraint identifier to something that will try to reason about it.
 */
function describe(error: { message: string; code?: string }): string {
  const code = error.code ?? "";
  const message = error.message ?? "";

  if (code === "23505" || /duplicate key/i.test(message)) {
    return "That slug is already taken. Call check_slug for an available one.";
  }
  if (code === "23514" || /violates check constraint/i.test(message)) {
    if (message.includes("posts_cover_alt_required")) {
      return "A cover image needs alt text. Either supply coverImageAlt or drop coverImageUrl.";
    }
    if (message.includes("posts_focus_keyword_length")) {
      return "The focus keyword must be 1–120 characters, or absent entirely. An empty string is refused.";
    }
    if (message.includes("posts_slug_format")) {
      return "That slug is not in the required format. Call check_slug.";
    }
    if (message.includes("posts_status_check") || message.includes("posts_source_check")) {
      return "The database refused the status or source. This server only ever writes draft / ai-assisted, so this indicates a bug rather than bad input.";
    }
    return "A field failed a database constraint. Run check_seo and validate the field lengths.";
  }
  if (code === "23503") {
    return "The author could not be linked. The owner profile may have been removed.";
  }
  if (code === "42501") {
    return "The database refused the write. Check that SUPABASE_SERVICE_ROLE_KEY is the service-role key and not the publishable key.";
  }

  // Deliberately generic. A raw PostgREST body can carry the whole failing row.
  return "The database rejected the request.";
}

/* ------------------------------------------------------------------- author */

let cachedAuthorId: string | null = null;

async function resolveAuthorId(): Promise<string> {
  if (cachedAuthorId) return cachedAuthorId;

  const { data, error } = await serviceClient()
    .from("profiles")
    .select("id, display_name, created_at")
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw new Error(`Could not read profiles: ${describe(error)}`);

  const owner = data?.[0];
  if (!owner) {
    throw new Error(
      "No profiles row with role = 'owner' exists. posts.author_id is NOT NULL, so every draft needs one — see the owner-seeding note at the bottom of supabase/migrations/0001_blog_and_admin.sql.",
    );
  }

  cachedAuthorId = owner.id;
  return cachedAuthorId;
}

/* -------------------------------------------------------------------- reads */

async function listPosts(
  query: { category?: PostCategory; status?: PostStatus; limit?: number } = {},
): Promise<PostListItem[]> {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);

  let request = serviceClient()
    .from("posts")
    .select(LIST_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (query.category) request = request.eq("category", query.category);
  if (query.status) request = request.eq("status", query.status);

  const { data, error } = await request;
  if (error) throw new Error(`Could not list posts: ${describe(error)}`);

  return (data ?? []) as PostListItem[];
}

async function slugExists(slug: string): Promise<boolean> {
  const check = checkSlugShape(slug);
  if (!check.ok) return false;

  const { data, error } = await serviceClient()
    .from("posts")
    .select("id")
    .eq("slug", check.slug)
    .limit(1);

  if (error) throw new Error(`Could not check the slug: ${describe(error)}`);
  return (data?.length ?? 0) > 0;
}

/**
 * Published posts a draft may link to.
 *
 * `published_at <= now()` as well as `status = 'published'`, matching what every
 * public query in `src/lib/blog/queries.ts` does: a future-dated row is
 * `published` in the table and invisible on the site, so linking to one would
 * produce a 404 for readers and pass a naive check.
 */
async function linkableContent(): Promise<LinkablePost[]> {
  const { data, error } = await serviceClient()
    .from("posts")
    .select("slug, title, excerpt, category")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`Could not read linkable posts: ${describe(error)}`);
  return (data ?? []) as LinkablePost[];
}

/* ------------------------------------------------------------------- writes */

async function createDraft(input: DraftInput): Promise<{ id: string; slug: string }> {
  // Belt and braces against a caller that hands us a wider object than the type
  // admits — a JSON-Schema tool argument is `unknown` at runtime however it is
  // declared. `status` is the field that matters; refusing it outright is
  // clearer than silently dropping it.
  for (const forbidden of ["status", "source", "author_id", "published_at", "id"]) {
    if (Object.prototype.hasOwnProperty.call(input, forbidden)) {
      throw new Error(
        `This server cannot set "${forbidden}". Every row it writes is a draft attributed to the site owner; publishing is a human action in /admin.`,
      );
    }
  }

  const check = checkSlugShape(input.slug);
  if (!check.ok) throw new Error(check.error);

  // Re-checked here rather than trusting the caller to have run check_slug: a
  // skipped step should produce this sentence, not a 23505 from the insert.
  if (await slugExists(check.slug)) {
    throw new Error(`The slug "${check.slug}" is already taken. Call check_slug for another.`);
  }

  const authorId = await resolveAuthorId();

  const { data, error } = await serviceClient()
    .from("posts")
    .insert({
      title: input.title,
      slug: check.slug,
      excerpt: input.excerpt,
      content: input.content,
      cover_image_url: input.coverImageUrl,
      cover_image_alt: input.coverImageAlt,
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      focus_keyword: input.focusKeyword,
      category: input.category,
      author_id: authorId,
      // Literals. See the header of this file — these two are the whole reason
      // this server is safe to point at a production database.
      status: "draft",
      source: "ai-assisted",
      published_at: null,
    })
    .select("id, slug")
    .single();

  if (error) throw new Error(describe(error));
  if (!data) throw new Error("The insert returned no row.");

  return { id: data.id, slug: data.slug };
}

async function uploadCover(
  bytes: Uint8Array,
  slug: string,
  meta: { ext: "jpg" | "png" | "webp"; contentType: CoverMime },
): Promise<{ url: string; path: string }> {
  const path = coverObjectPath(slug, meta.ext, randomSuffix());

  const { error } = await serviceClient()
    .storage.from(BUCKET)
    .upload(path, bytes, {
      contentType: meta.contentType,
      // Never overwrite. A regenerated cover gets its own object rather than
      // replacing one a human may already have reviewed.
      upsert: false,
    });

  if (error) {
    throw new Error(
      `Could not upload the cover: ${error.message.replace(/\s+/g, " ").slice(0, 200)}`,
    );
  }

  const { data } = serviceClient().storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("The upload succeeded but produced no public URL.");

  return { url: data.publicUrl, path };
}

/**
 * The store, as one object.
 *
 * Exported as a single value rather than as loose functions so that the
 * "no publish-shaped export" assertion has one surface to enumerate, and so
 * adding a publish function would mean visibly widening `BlogStore`.
 */
export const supabaseStore: BlogStore = {
  resolveAuthorId,
  listPosts,
  slugExists,
  linkableContent,
  createDraft,
  uploadCover,
};

/** Test-only: forget the memoised client and author between fixtures. */
export function resetStoreCaches(): void {
  client = null;
  cachedAuthorId = null;
}
