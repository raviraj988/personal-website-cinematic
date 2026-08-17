import type { Metadata } from "next";
import { PostCard } from "@/components/blog/PostCard";
import { NewsletterCard } from "@/components/news/NewsletterCard";
import { NewsletterSignup } from "@/components/news/NewsletterSignup";
import { getPublishedPosts } from "@/lib/blog/queries";
import { getPublishedNewsletters } from "@/lib/news/queries";
import { NEWS_INDEX_LIMIT, NEWS_PATH } from "@/lib/news/config";
import { FALLBACK_OG_IMAGE, absoluteUrl } from "@/lib/blog/config";

const TITLE = "News & Updates";
const DESCRIPTION =
  "Newsletters, announcements, and notes from ESE's ongoing work with Native Nations and community partners.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: NEWS_PATH },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: NEWS_PATH,
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
 * Same hourly floor as the blog index, and for the same reason: a news item
 * scheduled with a future `published_at` becomes visible because the clock
 * moved, and no mutation happens at that moment to revalidate anything.
 *
 * Newsletter issues have no embargo — they publish on a status flip, which the
 * admin action revalidates on demand — so the floor is there for the posts.
 */
export const revalidate = 3600;

export default async function NewsIndexPage() {
  const [posts, issues] = await Promise.all([
    getPublishedPosts(NEWS_INDEX_LIMIT, "news"),
    getPublishedNewsletters(),
  ]);

  const empty = posts.length === 0 && issues.length === 0;

  return (
    <div className="blog-index news-index section-shell">
      <header className="blog-index__header">
        <p className="section-label">News &amp; Updates</p>
        <h1 className="blog-index__title">{TITLE}</h1>
        <p className="blog-index__lede">{DESCRIPTION}</p>
      </header>

      <NewsletterSignup />

      {empty ? (
        <p className="blog-index__empty">
          Nothing published yet. Newsletters and announcements will appear here.
        </p>
      ) : null}

      {issues.length > 0 ? (
        <section className="news-index__section" aria-labelledby="issues-title">
          <h2 className="news-index__section-title" id="issues-title">
            Newsletter issues
          </h2>
          <div className="newsletter-grid">
            {issues.map((issue) => (
              <NewsletterCard
                key={issue.id}
                issue={issue}
                sizes="(min-width: 1024px) 31vw, (min-width: 680px) 48vw, 100vw"
              />
            ))}
          </div>
        </section>
      ) : null}

      {posts.length > 0 ? (
        <section className="news-index__section" aria-labelledby="announcements-title">
          <h2 className="news-index__section-title" id="announcements-title">
            Announcements
          </h2>
          <div className="selected-work-grid blog-index__grid">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                basePath={NEWS_PATH}
                actionLabel="Read the update"
                sizes="(min-width: 1024px) 31vw, (min-width: 680px) 48vw, 100vw"
              />
            ))}
          </div>
        </section>
      ) : null}

      {posts.length >= NEWS_INDEX_LIMIT ? (
        <p className="blog-index__note">
          Showing the {NEWS_INDEX_LIMIT} most recent updates.
        </p>
      ) : null}
    </div>
  );
}
