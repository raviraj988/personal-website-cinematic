import "@/styles/people.css";
import { SkipLink } from "@/components/layout/SkipLink";
import { CinematicHeader } from "@/components/navigation/CinematicHeader";
import { PageIntro } from "@/components/motion/PageIntro";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { ScrollTheme } from "@/components/motion/ScrollTheme";

/** Global page structure — spec §6. */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SkipLink />
      <PageIntro />
      <ScrollTheme />
      <ScrollProgress />
      {/*
        Transparent until scrolled, which is what the full-viewport photographic
        hero wants: the photograph reaches the top of the window rather than
        stopping under a cream bar, and white type has the image and its scrim to
        sit on. The header turns solid once the hero is most of the way past.

        This was briefly `solid` while the hero was a light contained spread —
        necessary then, because white-on-cream made the wordmark and navigation
        vanish. It is only safe to be transparent here while the hero behind it
        stays dark; `/blog` and `/news` still pass `solid` for that reason.
      */}
      <CinematicHeader />
      {/* Page-wide film grain. Decorative, non-interactive, pinned. */}
      <div className="page-grain" aria-hidden="true" />
      <main id="main-content">{children}</main>
    </>
  );
}
