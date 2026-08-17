import type { MetadataRoute } from "next";
import { site } from "@/lib/data/ese-content";
import { BLOG_PATH, SITE_ORIGIN, absoluteUrl, postUrl } from "@/lib/blog/config";
import { NEWS_PATH } from "@/lib/news/config";
import { ese } from "@/lib/data/ese-content";
import { getSitemapPosts } from "@/lib/blog/queries";
import { getPublishedNewsletters } from "@/lib/news/queries";

/**
 * Spec §23, extended with the journal and News & Updates.
 *
 * Only published, non-future posts appear — `getSitemapPosts` filters on both,
 * and RLS refuses to hand an anonymous client anything else regardless. Admin
 * routes, the preview route, and drafts are absent by construction rather than by
 * exclusion list: nothing here enumerates them in the first place.
 *
 * Newsletter issues are **not** listed. Each one is a link to a document hosted
 * on another origin, so there is no URL here for a crawler to index — the issue
 * itself is not a page on this site.
 *
 * Every URL is absolute against the hardcoded origin. That is the whole reason
 * the origin is a constant — an env var that went missing here would produce a
 * sitemap full of relative paths, which is silently useless.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, issues] = await Promise.all([
    getSitemapPosts(),
    getPublishedNewsletters(),
  ]);

  const blogPosts = posts.filter((post) => post.category === "blog");
  const newsPosts = posts.filter((post) => post.category === "news");

  /**
   * The news index is as fresh as the newest thing on it, and that can be an
   * issue rather than a post — an issue-only month would otherwise report a
   * `lastModified` months stale.
   */
  const newsUpdatedAt = [newsPosts[0]?.updated_at, issues[0]?.issue_date]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${site.canonicalBase}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_ORIGIN}${BLOG_PATH}`,
      changeFrequency: "weekly",
      priority: 0.8,
      // The index is as fresh as its newest post.
      ...(blogPosts[0]?.updated_at
        ? { lastModified: new Date(blogPosts[0].updated_at) }
        : {}),
    },
    {
      url: `${SITE_ORIGIN}${NEWS_PATH}`,
      changeFrequency: "weekly",
      priority: 0.8,
      ...(newsUpdatedAt ? { lastModified: new Date(newsUpdatedAt) } : {}),
    },
  ];

  /**
   * The five service pages. Static, known at build time, and each is a real
   * landing target for a search like "Tribal cumulative impacts assessment" —
   * which is the whole reason they exist, so they belong in the sitemap.
   */
  const serviceRoutes: MetadataRoute.Sitemap = ese.services.items.map((service) => ({
    url: absoluteUrl(`/services/${service.slug}`),
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: postUrl(post.slug),
    lastModified: new Date(post.updated_at),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const newsRoutes: MetadataRoute.Sitemap = newsPosts.map((post) => ({
    url: absoluteUrl(`${NEWS_PATH}/${post.slug}`),
    lastModified: new Date(post.updated_at),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...serviceRoutes, ...blogRoutes, ...newsRoutes];
}
