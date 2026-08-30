import type { CSSProperties } from "react";
import Link from "next/link";
import { SkipLink } from "@/components/layout/SkipLink";
import { CinematicHeader } from "@/components/navigation/CinematicHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { PageHero } from "@/components/layout/PageHero";
import { GlowCards } from "@/components/motion/GlowCards";
import { PersonCard } from "@/components/people/PersonCard";
import { Reveal } from "@/components/motion/Reveal";
import { Arrow } from "@/components/ui/Arrow";
import { ese, people } from "@/lib/data/ese-content";
import { pageMetadata } from "@/lib/page-meta";
import "@/styles/blog.css";
import "@/styles/people.css";

export const metadata = pageMetadata({
  title: "Who we are",
  description: ese.whoWeAre.lede,
  path: "/who-we-are",
});

/**
 * The network, and the people in it.
 *
 * `/people` already exists and carries the biographies. This page is the
 * navigation item — what the network IS — and links onward to that rather than
 * duplicating it. Two routes covering the same ground is how a site starts
 * contradicting itself.
 */
export default function WhoWeArePage() {
  return (
    <>
      <SkipLink />
      <CinematicHeader solid />
      <div className="page-grain" aria-hidden="true" />

      <main id="main-content">
        <PageHero
          eyebrow={ese.whoWeAre.eyebrow}
          heading={ese.whoWeAre.heading}
          lede={ese.whoWeAre.lede}
        />

        <div className="page-body">
          <div className="page-body__inner">
            <Reveal className="page-section">
              <GlowCards className="statement-cards">
                <ol>
                  {ese.whoWeAre.body.map((paragraph, index) => (
                    <li
                      key={paragraph}
                      style={{ "--i": index } as CSSProperties}
                      data-band={(index + 1) % 4}
                      data-glow-card
                    >
                      <span className="statement-card__band" aria-hidden="true" />
                      <span className="statement-card__num" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="statement-card__line">
                        {ese.whoWeAre.cardHeadings[index] ?? ""}
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
              <h2 className="page-section__heading">{people.eyebrow}</h2>
              <p className="page-prose">{people.lede}</p>
              <GlowCards>
                <div className="people-group__grid">
                  {people.members.map((person, index) => (
                    <PersonCard key={person.slug} person={person} index={index} headingLevel={3} />
                  ))}
                </div>
              </GlowCards>
              <Link className="button" href="/people">
                {people.cta.label} <Arrow />
              </Link>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.becomePartner.eyebrow}</h2>
              <p className="page-prose">{ese.becomePartner.body}</p>
              <Link className="button" href="/contact">
                {ese.becomePartner.cta.label} <Arrow />
              </Link>
            </Reveal>
          </div>
        </div>
      </main>

      <BlogFooter />
    </>
  );
}
