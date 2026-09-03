import type { CSSProperties } from "react";
import Link from "next/link";
import { SkipLink } from "@/components/layout/SkipLink";
import { CinematicHeader } from "@/components/navigation/CinematicHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { PageHero } from "@/components/layout/PageHero";
import { GlowCards } from "@/components/motion/GlowCards";
import { Reveal } from "@/components/motion/Reveal";
import { Arrow } from "@/components/ui/Arrow";
import { CardIcon, type IconName } from "@/components/ui/CardIcon";
import { ese, people } from "@/lib/data/ese-content";
import { pageMetadata } from "@/lib/page-meta";
import "@/styles/blog.css";

export const metadata = pageMetadata({
  title: "About",
  description: ese.intro.paragraphs[0] ?? "",
  path: "/about",
});

/**
 * About ESE — who ESE is, and how it works.
 *
 * THIS PAGE HAS BEEN WRONG TWICE, in opposite directions.
 *
 * First it was a reprint of the landing page: the mission, "a network not a
 * firm", the people grid and the tagline, in the same order, thirteen of
 * eighteen fields shared.
 *
 * Then, fixing that, it became a catalogue — the five services, the six
 * audiences, the case study, the scholarship, the tools. Every one of those has
 * its own home (/services, the landing page, /contact), so that traded one
 * duplication for another and made the page an index of things described better
 * elsewhere.
 *
 * An about page answers "who are you", not "what do you sell". So this one
 * carries identity and nothing else:
 *
 *   - what ESE is, both paragraphs, where the landing page shows the first;
 *   - how it is structured — a network rather than a firm, which is the
 *     substance of the route /who-we-are redirects into;
 *   - what it wants to be known for, its own ten-item list, which appears
 *     nowhere else on the site;
 *   - the mission in full;
 *   - who does the work, as a pointer to /people rather than a second grid.
 *
 * No services, no case study, no scholarship, no tools. Those are offerings and
 * they have pages.
 */
export default function AboutPage() {
  const whoIcons = ese.whoWeAre.cardIcons as readonly IconName[];

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
              <h2 className="page-section__heading">What ESE is</h2>
              {/* The SECOND paragraph. The landing page shows only the first;
                  this one has never been rendered anywhere. */}
              <p className="page-prose">{ese.intro.paragraphs[1]}</p>
            </Reveal>

            <Reveal className="page-section">
              {/* `/who-we-are` redirects here, and this section is the reason —
                  it is the substance that route used to carry. */}
              <h2 className="page-section__heading" id="who-we-are">
                {ese.whoWeAre.heading}
              </h2>
              <p className="page-lede">{ese.whoWeAre.lede}</p>
              <GlowCards className="statement-cards">
                <ol>
                  {ese.whoWeAre.cardHeadings.slice(0, ese.whoWeAre.body.length).map((heading, index) => (
                    <li
                      key={heading}
                      style={{ "--i": index } as CSSProperties}
                      data-band={index % 4}
                      data-glow-card
                    >
                      <span className="statement-card__tile" aria-hidden="true">
                        <CardIcon name={whoIcons[index] ?? "network"} />
                      </span>
                      <p className="statement-card__line">{heading}</p>
                      <p className="detail-card__body">{ese.whoWeAre.body[index]}</p>
                    </li>
                  ))}
                </ol>
              </GlowCards>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">What we want to be known for</h2>
              <p className="page-lede">
                ESE&apos;s own list, in ESE&apos;s own order. The first three are the tagline;
                the rest are what it rests on.
              </p>
              <ul className="known-for">
                {ese.knownFor.map((value, index) => (
                  <li key={value} style={{ "--i": index } as CSSProperties}>
                    <span className="known-for__index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="known-for__value">{value}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.mission.eyebrow}</h2>
              <p className="page-lede">{ese.mission.statement}</p>
              <p className="page-prose">{ese.mission.supporting}</p>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">Who does the work</h2>
              <p className="page-prose">{people.lede}</p>
              <Link className="button" href="/people">
                {people.cta.label} <Arrow />
              </Link>
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
