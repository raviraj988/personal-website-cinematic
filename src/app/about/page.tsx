import type { CSSProperties } from "react";
import Link from "next/link";
import { SkipLink } from "@/components/layout/SkipLink";
import { CinematicHeader } from "@/components/navigation/CinematicHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { PageHero } from "@/components/layout/PageHero";
import { GlowCards } from "@/components/motion/GlowCards";
import { Reveal } from "@/components/motion/Reveal";
import { Arrow } from "@/components/ui/Arrow";
import { brand, ese } from "@/lib/data/ese-content";
import { pageMetadata } from "@/lib/page-meta";
import "@/styles/blog.css";

export const metadata = pageMetadata({
  title: "About",
  description: ese.intro.paragraphs[0] ?? "",
  path: "/about",
});

/**
 * What ESE is.
 *
 * Everything here is content the landing page already carries — `ese.intro`, the
 * mission, and the tagline. That is deliberate: this page exists because
 * "About" is in the navigation and pointed at an anchor, and a navigation item
 * should land somewhere, not scroll somewhere. It is the same material given
 * room rather than new material invented to justify a route.
 */
export default function AboutPage() {
  return (
    <>
      <SkipLink />
      <CinematicHeader solid />
      <div className="page-grain" aria-hidden="true" />

      <main id="main-content">
        <PageHero
          eyebrow={ese.intro.eyebrow}
          heading={ese.intro.heading}
          lede={ese.intro.paragraphs[0]}
        />

        <div className="page-body">
          <div className="page-body__inner">
            <Reveal className="page-section">
              <h2 className="page-section__heading">What we do</h2>
              <GlowCards className="statement-cards">
                <ol>
                  {ese.intro.paragraphs.map((paragraph, index) => (
                    <li
                      key={paragraph}
                      style={{ "--i": index } as CSSProperties}
                      data-band={index % 4}
                      data-glow-card
                    >
                      <span className="statement-card__band" aria-hidden="true" />
                      <span className="statement-card__num" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="statement-card__line">
                        {ese.intro.cardHeadings[index] ?? ""}
                      </p>
                      <span className="glow-card__desc">
                        <span>{paragraph}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </GlowCards>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.mission.eyebrow}</h2>
              <p className="page-lede">{ese.mission.statement}</p>
              <p className="page-prose">{ese.mission.supporting}</p>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">What we are here to do</h2>
              <GlowCards className="statement-cards">
                <ol>
                  {brand.tagline.map((line, index) => (
                    <li
                      key={line}
                      style={{ "--i": index } as CSSProperties}
                      data-band={index % 4}
                      data-glow-card
                    >
                      <span className="statement-card__band" aria-hidden="true" />
                      <span className="statement-card__num" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="statement-card__line">{line}</p>
                    </li>
                  ))}
                </ol>
              </GlowCards>
            </Reveal>

            <Reveal className="page-section">
              <Link className="button" href="/services">
                What ESE does <Arrow />
              </Link>
            </Reveal>
          </div>
        </div>
      </main>

      <BlogFooter />
    </>
  );
}
