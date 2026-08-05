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
      <CinematicHeader />
      {/* Page-wide film grain. Decorative, non-interactive, pinned. */}
      <div className="page-grain" aria-hidden="true" />
      <main id="main-content">{children}</main>
    </>
  );
}
