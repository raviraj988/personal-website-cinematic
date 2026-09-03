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
import { ese } from "@/lib/data/ese-content";
import { pageMetadata } from "@/lib/page-meta";
import "@/styles/blog.css";

export const metadata = pageMetadata({
  title: "About",
  description: ese.intro.paragraphs[0] ?? "",
  path: "/about",
});

/**
 * About ESE — what the work actually consists of.
 *
 * THIS PAGE USED TO BE A REPRINT. Thirteen of its eighteen content fields were
 * the landing page's, in the same order: the mission, "a network not a firm",
 * the people, the tagline. Its own doc comment said so — "every section is
 * content the landing page already carries" — which is a fair description of a
 * page with no reason to exist.
 *
 * It now carries the detail the landing page has room only to summarise, and
 * every word of it is transcribed rather than written:
 *
 *   - the five service areas with their full descriptions, which the landing
 *     page has room only to summarise in one line each (the 29 `covers`
 *     capabilities belong to /services, which is the page for choosing one);
 *   - the six audiences with the description written for each;
 *   - the PFAS case study;
 *   - the scholarship, which is how access is meant to work;
 *   - the two tools in development.
 *
 * What it deliberately does NOT repeat: the mission statement, the "network,
 * not a firm" cards, and the people grid. Those are on the landing page and
 * have their own route at /people; this page links to them instead of
 * reprinting them.
 *
 * It absorbed `/who-we-are`, which redirects here permanently — see
 * `next.config.ts` — so the anchor below keeps those links landing somewhere.
 */

/** A service area: what it is, then the concrete list of what it covers. */
function ServiceCard({
  index,
  title,
  description,
  icon,
}: {
  index: number;
  title: string;
  description: string;
  icon: IconName;
}) {
  return (
    <li style={{ "--i": index } as CSSProperties} data-band={index % 4} data-glow-card>
      <span className="statement-card__tile" aria-hidden="true">
        <CardIcon name={icon} />
      </span>
      <p className="statement-card__line">{title}</p>
      <p className="detail-card__body">{description}</p>
    </li>
  );
}

export default function AboutPage() {
  const serviceIcons: readonly IconName[] = ["seal", "target", "flask", "layers", "ask"];

  return (
    <>
      <SkipLink />
      <CinematicHeader solid />
      <div className="page-grain" aria-hidden="true" />

      <main id="main-content">
        <PageHero
          eyebrow={ese.intro.eyebrow}
          heading={ese.intro.heading}
          /* The SECOND paragraph. The first is the landing page's opening and
             the page's own meta description; this one has never been rendered. */
          lede={ese.intro.paragraphs[1] ?? ese.intro.paragraphs[0]}
        />

        <div className="page-body">
          <div className="page-body__inner">
            <Reveal className="page-section">
              {/* `/who-we-are` redirects here, so the anchor has to survive. */}
              <h2 className="page-section__heading" id="who-we-are">
                {ese.services.heading}
              </h2>
              <p className="page-lede">{ese.services.lede}</p>
              <GlowCards className="statement-cards detail-cards">
                <ol>
                  {ese.services.items.map((service, index) => (
                    <ServiceCard
                      key={service.slug}
                      index={index}
                      title={service.title}
                      description={service.description}
                      icon={serviceIcons[index] ?? "layers"}
                    />
                  ))}
                </ol>
              </GlowCards>
              <Link className="button" href="/services">
                Every service in detail <Arrow />
              </Link>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.whoWeServe.heading}</h2>
              <p className="page-lede">{ese.whoWeServe.intro}</p>
              <GlowCards className="statement-cards">
                <ol>
                  {ese.whoWeServe.audiences.map((audience, index) => (
                    <li
                      key={audience.name}
                      style={{ "--i": index } as CSSProperties}
                      data-band={(index + 1) % 4}
                      data-glow-card
                    >
                      <span className="statement-card__tile" aria-hidden="true">
                        <CardIcon name={(["network", "bridge", "seal", "layers", "target", "return"] as const)[index] ?? "network"} />
                      </span>
                      <p className="statement-card__line">{audience.name}</p>
                      <p className="detail-card__body">{audience.description}</p>
                    </li>
                  ))}
                </ol>
              </GlowCards>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.caseStudy.label}</h2>
              <p className="page-lede">{ese.caseStudy.heading}</p>
              <p className="page-prose">{ese.caseStudy.body}</p>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.scholarship.eyebrow}</h2>
              <p className="page-lede">{ese.scholarship.heading}</p>
              <p className="page-prose">{ese.scholarship.body}</p>
              <Link className="button" href={ese.scholarship.cta.href}>
                {ese.scholarship.cta.label} <Arrow />
              </Link>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.tools.eyebrow}</h2>
              <p className="page-lede">{ese.tools.lede}</p>
              <GlowCards className="statement-cards">
                <ol>
                  {ese.tools.items.map((tool, index) => (
                    <li
                      key={tool.title}
                      style={{ "--i": index } as CSSProperties}
                      data-band={(index + 2) % 4}
                      data-glow-card
                    >
                      <span className="statement-card__tile" aria-hidden="true">
                        <CardIcon name={index === 0 ? "seal" : "network"} />
                      </span>
                      <p className="statement-card__line">{tool.title}</p>
                      <p className="detail-card__body">{tool.description}</p>
                    </li>
                  ))}
                </ol>
              </GlowCards>
            </Reveal>

            {/* The mission, the "network not a firm" cards and the people grid
                all live elsewhere. Linking beats reprinting. */}
            <Reveal className="page-section">
              <h2 className="page-section__heading">Who does the work</h2>
              <p className="page-prose">{ese.whoWeAre.lede}</p>
              <Link className="button" href="/people">
                Meet the people <Arrow />
              </Link>
            </Reveal>
          </div>
        </div>
      </main>

      <BlogFooter />
    </>
  );
}
