import type { Metadata } from "next";
import Link from "next/link";
import { SkipLink } from "@/components/layout/SkipLink";
import { CinematicHeader } from "@/components/navigation/CinematicHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { Arrow } from "@/components/ui/Arrow";
import { navigation } from "@/lib/data/ese-content";
import "@/styles/blog.css";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * Custom 404.
 *
 * Uses the same chrome as the blog and news routes — `solid` header, no
 * `PageIntro` overture — because this page opens on type, with no photographic
 * hero for white-on-transparent text to sit against.
 */
export default function NotFound() {
  return (
    <>
      <SkipLink />
      <CinematicHeader solid />
      <div className="page-grain" aria-hidden="true" />
      <main id="main-content" className="blog-main">
        <div className="blog-index section-shell">
          <header className="blog-index__header">
            <p className="section-label">Error 404</p>
            <h1 className="blog-index__title">That page could not be found</h1>
            <p className="blog-index__lede">
              The address may have changed, or the page may never have existed.
              Nothing has gone wrong on your end.
            </p>
            <Link className="text-link" href="/">
              Go to the homepage <Arrow />
            </Link>
          </header>

          <nav className="not-found__links" aria-label="Site navigation">
            <ul>
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
      <BlogFooter />
    </>
  );
}
