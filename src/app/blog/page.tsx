import type { Metadata } from "next";
import { PostCard } from "@/components/blog/PostCard";
import { getPublishedPosts } from "@/lib/blog/queries";
import {
  BLOG_INDEX_LIMIT,
  BLOG_PATH,
  FALLBACK_OG_IMAGE,
  absoluteUrl,
} from "@/lib/blog/config";

const TITLE = "Blog";
const DESCRIPTION =
  "Field notes and working reflections from ESE on environmental justice, sovereignty, and public-interest practice.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: BLOG_PATH },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: BLOG_PATH,
    images: [{ url: FALLBACK_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [absoluteUrl(FALLBACK_OG_IMAGE)],
  },
};

/**
 * Rebuild hourly on top of the on-demand revalidation the admin actions trigger.
 *
 * On-demand covers every edit. The time-based floor exists for the one case
 * on-demand cannot see: a post scheduled with a future `published_at` becomes
 * visible because the clock moved, and no mutation happens at that moment to
 * revalidate anything. An hour is the worst-case lag before a scheduled post
 * appears.
 */
export const revalidate = 3600;

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="blog-index section-shell">
      <header className="blog-index__header">
        <p className="section-label">Blog</p>
        <h1 className="blog-index__title">Field notes and working reflections</h1>
        <p className="blog-index__lede">{DESCRIPTION}</p>
      </header>

      {posts.length === 0 ? (
        <p className="blog-index__empty">
          No posts yet. The first entries will appear here once they are
          published.
        </p>
      ) : (
        <div className="selected-work-grid blog-index__grid">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              sizes="(min-width: 1024px) 31vw, (min-width: 680px) 48vw, 100vw"
            />
          ))}
        </div>
      )}

      {posts.length >= BLOG_INDEX_LIMIT ? (
        <p className="blog-index__note">
          Showing the {BLOG_INDEX_LIMIT} most recent posts.
        </p>
      ) : null}
    </div>
  );
}
