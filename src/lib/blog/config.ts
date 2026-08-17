import { site } from "@/lib/data/ese-content";

/**
 * Absolute production origin, hardcoded on purpose.
 *
 * Reading this from an environment variable is the classic way to ship a site
 * with an empty sitemap and no canonical tags: the variable goes missing in one
 * environment, every absolute URL silently becomes a relative one, and nothing
 * fails loudly enough to notice. A constant cannot go missing.
 *
 * Sourced from `site.canonicalBase`, which is already a hardcoded constant, so
 * the blog and the rest of the site can never disagree about their own address.
 *
 * NOTE: `site.canonicalBase` is still the placeholder `https://example.com`.
 * Set it to the real domain before launch — canonicals, JSON-LD, and the
 * sitemap all resolve against it.
 */
export const SITE_ORIGIN = site.canonicalBase;

/** Blog index path. */
export const BLOG_PATH = "/blog";

/** Admin console root. Kept in one place so robots and middleware agree. */
export const ADMIN_PATH = "/admin";

/**
 * Whether the site is open to crawlers yet.
 *
 * The site ships `noindex, nofollow` while the photography and copy are
 * provisional placeholders — see the publication warning in README.md. All the
 * SEO machinery is built and wired regardless; flipping this one boolean turns
 * it on. The admin path stays disallowed either way.
 */
export const SEARCH_ENGINE_INDEXING = false;

/**
 * Site-wide Open Graph fallback, used when a post has no cover image.
 * Relative to the origin; resolved absolutely where it is consumed.
 */
export const FALLBACK_OG_IMAGE = "/images/cinematic-river-valley.jpg";

/**
 * How many posts the index shows.
 *
 * A cap rather than pagination: this is a personal practice journal, not a
 * publication with an archive to page through, and a cap has no crawl-depth or
 * duplicate-content cost. Revisit if the archive outgrows it — the query
 * already orders by `published_at desc`, so the change is a `.range()` call.
 */
export const BLOG_INDEX_LIMIT = 24;

/** Words per minute used for reading-time estimates. */
export const READING_WORDS_PER_MINUTE = 200;

/*
 * `COVER_MAX_BYTES` deliberately lives in `lib/blog/image.ts`, not here. Keeping it
 * there lets that module stay import-free and therefore runnable by a plain
 * `node` process, which is what makes the magic-byte checks testable.
 */

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}

/** Canonical URL for a post. One shape, one place. */
export function postUrl(slug: string): string {
  return absoluteUrl(`${BLOG_PATH}/${slug}`);
}
