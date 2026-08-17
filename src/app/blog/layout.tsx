import { SkipLink } from "@/components/layout/SkipLink";
import { CinematicHeader } from "@/components/navigation/CinematicHeader";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { BlogFooter } from "@/components/blog/BlogFooter";
import "@/styles/blog.css";

/**
 * Chrome for the blog.
 *
 * Deliberately not the `(site)` layout. Two of that layout's pieces belong to the
 * landing page specifically:
 *
 *   - `PageIntro`, the curtain-and-wordmark opening. A reader arriving on an
 *     article from a search result wants the article, not an overture.
 *   - `ScrollTheme`, which crossfades the page tone between the landing page's
 *     sections. A blog post has no section sequence to follow, so the page keeps
 *     one steady cream ground.
 *
 * The header is forced `solid` because there is no photographic hero here for
 * white-on-transparent type to sit against.
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <ScrollProgress />
      <CinematicHeader solid />
      {/* Page-wide film grain. Decorative, non-interactive, pinned. */}
      <div className="page-grain" aria-hidden="true" />
      <main id="main-content" className="blog-main">
        {children}
      </main>
      <BlogFooter />
    </>
  );
}
