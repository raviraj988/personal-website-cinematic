/**
 * Every boundary this server talks across, as a type.
 *
 * Nothing here imports the MCP SDK, `openai`, or `@supabase/supabase-js`. That is
 * the point: `cover-source.ts` holds the cover priority matrix and must be
 * testable without a network, a database, or a paid API key, so it depends on
 * these shapes rather than on the modules that implement them.
 *
 * ## The one shape that is a security control
 *
 * `BlogStore` has no publish, unpublish, update, or delete member. Not "we don't
 * call one" — the interface does not declare one and
 * `mcp/adapters/supabase.ts` does not export one. This server holds the
 * service-role key, so it bypasses Row Level Security entirely; the only thing
 * standing between a prompt-injected tool call and a published post is the
 * absence of a function to reach. `scripts/test-mcp-adapter.mjs` asserts that
 * absence rather than trusting review to notice it.
 */
import type {
  PostCategory,
  PostRow,
  PostStatus,
} from "../src/lib/supabase/database.types";
import type { CoverMime } from "../src/lib/blog/image";

/**
 * What `create_draft` is allowed to write.
 *
 * Note what is absent: `status`, `source`, and `author_id`. All three are decided
 * by the adapter — the first two as literals, the third by resolving the oldest
 * owner — so no caller can express a preference about them. `DraftInput` having
 * no `status` field is what makes "reject any input carrying a status" a type
 * error rather than a runtime convention.
 */
export type DraftInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  /**
   * `''` is illegal, not merely untidy: `posts_focus_keyword_length` is
   * `null or char_length between 1 and 120`, so an empty string is rejected by
   * the database. Run `emptyToNull` before building this object.
   */
  focusKeyword: string | null;
  category: PostCategory;
};

/** What `list_posts` returns. Enough to avoid a duplicate topic, no more. */
export type PostListItem = Pick<
  PostRow,
  "id" | "title" | "slug" | "status" | "category" | "published_at" | "updated_at"
>;

/** A published post another post can link to. */
export type LinkablePost = {
  slug: string;
  title: string;
  excerpt: string;
  category: PostCategory;
};

export interface BlogStore {
  /**
   * The oldest `profiles` row with `role = 'owner'`.
   *
   * `posts.author_id` is NOT NULL and references `auth.users`, and README.md
   * documents this rule as part of the wire contract. Throws when there is no
   * owner — there is no sensible fallback, and inventing one would attribute
   * writing to whoever happened to be first in an unordered result.
   */
  resolveAuthorId(): Promise<string>;

  listPosts(query?: {
    category?: PostCategory;
    status?: PostStatus;
    limit?: number;
  }): Promise<PostListItem[]>;

  /**
   * Advisory only. `src/lib/blog/queries.ts` deliberately ships no
   * `isSlugAvailable` helper because check-then-insert races; the unique index on
   * `posts.slug` is the authority. This exists so the common case fails with a
   * sentence instead of a `23505`, not so the insert can skip its own check.
   */
  slugExists(slug: string): Promise<boolean>;

  linkableContent(): Promise<LinkablePost[]>;

  createDraft(input: DraftInput): Promise<{ id: string; slug: string }>;

  uploadCover(
    bytes: Uint8Array,
    slug: string,
    meta: { ext: "jpg" | "png" | "webp"; contentType: CoverMime },
  ): Promise<{ url: string; path: string }>;
}

/* --------------------------------------------------------------- image ports */

/**
 * Why an image failure is a value and not an exception.
 *
 * Every one of these must fall back to the next cover source rather than fail
 * the tool, and a draft with no cover at all is still valid — `cover_image_url`
 * is nullable. Modelling failure as a return type means the six mandated
 * fallback cases are six rows in one table-driven test instead of six catch
 * blocks that a later edit can quietly stop reaching.
 */
export type ImageFailure =
  | { kind: "no-key" }
  | { kind: "timeout" }
  | { kind: "provider-error"; detail: string }
  | { kind: "empty" }
  | { kind: "decode" };

export type ImageResult =
  | { ok: true; bytes: Uint8Array }
  | ({ ok: false } & ImageFailure);

export type ImageRequest = {
  prompt: string;
  model: string;
  quality: string;
  size: string;
  timeoutMs: number;
};

export interface ImageProvider {
  /** `"openai"`, `"absent-key"`, or a fake. Echoed in diagnostics, never a secret. */
  readonly id: string;
  /** Must not throw. A provider that throws is a bug, not a fallback path. */
  generate(request: ImageRequest): Promise<ImageResult>;
}

/**
 * The `imageUrl` import path, including the SSRF guard.
 *
 * Behind an interface for the same reason as the provider: the priority matrix
 * needs a "the supplied URL was unusable" case, and producing one for real would
 * mean reaching the network from a test.
 */
export interface ImageFetcher {
  fetch(
    url: string,
  ): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; reason: string }>;
}

/**
 * Reading a file the client named, from the filesystem this process can see.
 *
 * ## This port is a capability, not a setting
 *
 * It exists so `upload_cover_image` can accept a path instead of forcing every
 * client to base64-encode an image it already has on disk. On stdio that is
 * safe and obvious: the client *spawned* this process, shares its user, and could
 * read the same file itself.
 *
 * Over HTTP it is arbitrary file disclosure. An authenticated remote caller
 * naming `/etc/passwd`, or `.env.local`, would have the bytes returned to it
 * through a public storage bucket. So the capability is modelled as a dependency
 * that is simply **absent** on that transport rather than as a boolean somebody
 * has to remember to set — see `RegisterOptions.localFiles` in `tools.ts`. A
 * missing capability cannot be left switched on by accident.
 *
 * Behind an interface for the usual reason: the path branch needs a
 * "that file was unreadable" case, and producing one for real would mean a test
 * depending on the filesystem.
 */
export type LocalFileResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: string };

export interface LocalFileReader {
  /** Must not throw. An unreadable path is a value, like every other image failure. */
  read(path: string): Promise<LocalFileResult>;
}

/**
 * What the client-supplied cover path needs.
 *
 * No `provider`: this pipeline never generates. That is the whole distinction
 * between it and `resolveCover` — the caller supplied artwork, so silently
 * substituting a title card would be the tool overruling them. Fallback is the
 * client's decision, made by calling `generate_cover_image` instead, and the
 * writing guide says so.
 */
export type UploadDeps = {
  fetcher: ImageFetcher;
  /** Absent means local paths are refused. See `LocalFileReader`. */
  files?: LocalFileReader;
  store: Pick<BlogStore, "uploadCover">;
};

export type CoverDeps = {
  provider: ImageProvider;
  fetcher: ImageFetcher;
  /**
   * Narrowed to the one method the cover path needs. Handing `cover-source.ts`
   * a whole `BlogStore` would give the image pipeline the ability to insert a
   * row, which it has no business doing.
   */
  store: Pick<BlogStore, "uploadCover">;
  /** Seedable so a test can assert an exact storage path. */
  randomSuffix?: () => string;
};
