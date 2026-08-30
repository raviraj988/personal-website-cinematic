import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { ScrollWords } from "@/components/motion/ScrollWords";

type PageHeroProps = {
  eyebrow: string;
  heading: string;
  lede?: string;
  children?: ReactNode;
};

/**
 * The head of every standalone page.
 *
 * One component rather than four near-identical headers, because these pages are
 * siblings in the navigation and the fastest way to make a site feel assembled
 * from parts is to let each page invent its own opening.
 *
 * It is a Server Component. `Reveal` and `ScrollWords` are the only client parts
 * and they are already islands, so a page using this ships no extra JS for the
 * header itself.
 *
 * `h1` comes from `ScrollWords`, which scrubs the heading in on scroll — the same
 * treatment the landing page's section headings get, so a page opening does not
 * read as a different site.
 */
export function PageHero({ eyebrow, heading, lede, children }: PageHeroProps) {
  return (
    <header className="page-hero" data-scroll-theme="dusk">
      <Reveal className="page-hero__inner" variant="rule">
        <p className="section-label section-label--light">{eyebrow}</p>
        <ScrollWords as="h1" id="page-title" text={heading} />
        {lede ? <p className="page-hero__lede">{lede}</p> : null}
        {children}
      </Reveal>
    </header>
  );
}
