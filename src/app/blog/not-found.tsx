import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/ui/Arrow";
import { BLOG_PATH } from "@/lib/blog/config";

export const metadata: Metadata = {
  title: "Post not found",
  robots: { index: false, follow: false },
};

/**
 * 404 for the journal.
 *
 * This is the page an unpublished slug lands on, so it has to be honest without
 * being informative: it must not distinguish "no such post" from "that post is a
 * draft". The copy therefore covers both without saying which.
 */
export default function BlogNotFound() {
  return (
    <div className="blog-index section-shell">
      <header className="blog-index__header">
        <p className="section-label">Error 404</p>
        <h1 className="blog-index__title">That post could not be found</h1>
        <p className="blog-index__lede">
          The address may have changed, or the post may not be published. Nothing
          has gone wrong on your end.
        </p>
      </header>

      <nav className="post__return" aria-label="Blog navigation">
        <Link className="text-link" href={BLOG_PATH}>
          <span>All blog posts</span>
          <Arrow direction="left" />
        </Link>
        <Link className="text-link" href="/">
          <span>Go to the homepage</span>
          <Arrow direction="right" />
        </Link>
      </nav>
    </div>
  );
}
