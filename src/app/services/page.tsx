import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { SkipLink } from "@/components/layout/SkipLink";
import { CinematicHeader } from "@/components/navigation/CinematicHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { PageHero } from "@/components/layout/PageHero";
import { GlowCards } from "@/components/motion/GlowCards";
import { Reveal } from "@/components/motion/Reveal";
import { Arrow } from "@/components/ui/Arrow";
import { ese } from "@/lib/data/ese-content";
import { pageMetadata } from "@/lib/page-meta";
import "@/styles/blog.css";

export const metadata = pageMetadata({
  title: "Services",
  description: ese.services.lede,
  path: "/services",
});

/**
 * The services index.
 *
 * "Services" was the only navigation item pointing at a set of pages that had no
 * front door: `/services/[slug]` existed for all five, reachable only from a card
 * on the landing page. This is that front door.
 *
 * Each card is one link stretched over the whole card — see the note on
 * `.service-card__cta--stretched` for why it is a pseudo-element rather than an
 * anchor wrapping the card.
 */
export default function ServicesPage() {
  return (
    <>
      <SkipLink />
      <CinematicHeader solid />
      <div className="page-grain" aria-hidden="true" />

      <main id="main-content">
        <PageHero
          eyebrow={ese.services.eyebrow}
          heading={ese.services.heading}
          lede={ese.services.lede}
        />

        <div className="page-body">
          <div className="page-body__inner">
            <Reveal>
              <GlowCards>
                <ol className="index-cards">
                  {ese.services.items.map((service, index) => (
                    <li
                      className="index-card"
                      key={service.slug}
                      style={{ "--i": index } as CSSProperties}
                      data-glow-card
                    >
                      <div className="index-card__media">
                        <Image
                          src={service.image.src}
                          alt={service.image.alt}
                          width={service.image.width}
                          height={service.image.height}
                          sizes="(min-width: 60rem) 30vw, 92vw"
                        />
                      </div>
                      <div className="index-card__body">
                        <span className="index-card__num" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h2 className="index-card__title">
                          <Link className="index-card__link" href={`/services/${service.slug}`}>
                            {service.title}
                          </Link>
                        </h2>
                        <p className="index-card__summary">{service.summary}</p>
                        <span className="index-card__cta">
                          Learn more <Arrow />
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </GlowCards>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.scholarship.eyebrow}</h2>
              <p className="page-prose">{ese.scholarship.body}</p>
              <Link className="button" href="/contact">
                {ese.scholarship.cta.label} <Arrow />
              </Link>
            </Reveal>
          </div>
        </div>
      </main>

      <BlogFooter />
    </>
  );
}
