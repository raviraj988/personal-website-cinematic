import { SkipLink } from "@/components/layout/SkipLink";
import { CinematicHeader } from "@/components/navigation/CinematicHeader";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { BlogFooter } from "@/components/blog/BlogFooter";
import "@/styles/blog.css";
import "@/styles/news.css";

/**
 * Chrome for News & Updates.
 *
 * Same reasoning as the blog layout, and the same pieces deliberately left out:
 * no `PageIntro` overture for someone arriving from a link, and no `ScrollTheme`
 * because there is no section sequence to crossfade through. The header is
 * forced `solid` — there is no photographic hero for white type to sit on.
 *
 * `blog.css` is imported alongside `news.css` because news items reuse the
 * article and card styles wholesale; `news.css` only adds what is specific to
 * newsletter issues and the signup block.
 */
export default function NewsLayout({ children }: { children: React.ReactNode }) {
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
