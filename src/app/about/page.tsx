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
import { CardIcon, type IconName } from "@/components/ui/CardIcon";
import { brand, ese, people } from "@/lib/data/ese-content";
import { pageMetadata } from "@/lib/page-meta";
import "@/styles/blog.css";
import "@/styles/people.css";

export const metadata = pageMetadata({
  title: "About",
  description: ese.intro.paragraphs[0] ?? "",
  path: "/about",
});

/**
 * About ESE — what it is, and who it is.
 *
 * This absorbed `/who-we-are`, which was a separate route until the two proved
 * to be one subject: "what ESE does" and "who does it" are the halves of a
 * single answer, and splitting them meant two navigation items that each told
 * you to read the other. `/who-we-are` now redirects here permanently — see
 * `next.config.ts` — so anything already linking to it keeps working.
 *
 * Every section is content the landing page already carries. Nothing here was
 * written to fill a page.
 */
function Cards({
  headings,
  bodies,
  icons,
  offset = 0,
}: {
  headings: readonly string[];
  bodies: readonly string[];
  icons: readonly IconName[];
  offset?: number;
}) {
  return (
    <GlowCards className="statement-cards">
      <ol>
        {headings.slice(0, bodies.length).map((heading, index) => (
          <li
            key={heading}
            style={{ "--i": index } as CSSProperties}
            data-band={(index + offset) % 4}
            data-glow-card
          >
            <span className="statement-card__tile" aria-hidden="true">
              <CardIcon name={icons[index] as IconName} />
            </span>
            <p className="statement-card__line">{heading}</p>
            <span className="glow-card__desc">
              <span>{bodies[index]}</span>
            </span>
          </li>
        ))}
      </ol>
    </GlowCards>
  );
}

export default function AboutPage() {
  const introBodies = (ese.intro.paragraphs[1] ?? "").split(/(?<=\.)\s+/).filter(Boolean);

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
              <Cards headings={ese.intro.cardHeadings} bodies={introBodies} icons={ese.intro.cardIcons} />
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.mission.eyebrow}</h2>
              <p className="page-lede">{ese.mission.statement}</p>
              <p className="page-prose">{ese.mission.supporting}</p>
            </Reveal>

            {/* Formerly the whole of /who-we-are. */}
            <Reveal className="page-section">
              <h2 className="page-section__heading" id="who-we-are">
                {ese.whoWeAre.eyebrow}
              </h2>
              <p className="page-prose">{ese.whoWeAre.lede}</p>
              <Cards
                headings={ese.whoWeAre.cardHeadings}
                bodies={ese.whoWeAre.body}
                icons={ese.whoWeAre.cardIcons}
                offset={1}
              />
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
                      <span className="statement-card__tile" aria-hidden="true">
                        <CardIcon name={(["target", "network", "bridge"] as const)[index] ?? "target"} />
                      </span>
                      <p className="statement-card__line">{line}</p>
                    </li>
                  ))}
                </ol>
              </GlowCards>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.becomePartner.eyebrow}</h2>
              <p className="page-prose">{ese.becomePartner.body}</p>
              <Link className="button" href="/contact">
                {ese.becomePartner.cta.label} <Arrow />
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
