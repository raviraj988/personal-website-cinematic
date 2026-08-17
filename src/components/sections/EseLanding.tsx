import Image from "next/image";
import Link from "next/link";
import { AmbientLayer } from "@/components/motion/AmbientLayer";
import { Arrow } from "@/components/ui/Arrow";
import { Reveal } from "@/components/motion/Reveal";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import { ScrollWords } from "@/components/motion/ScrollWords";
import { NewsTeaser } from "@/components/news/NewsTeaser";
import { PersonCard } from "@/components/people/PersonCard";
import {
  contact,
  ese,
  people,
  hero,
  navigation,
  newsTeaser,
  site,
} from "@/lib/data/ese-content";

/**
 * The landing page.
 *
 * ESE's story runs the whole page, in ESE's plural voice. Laura McKelvey appears
 * once, as founder, inside the "Who we are" section — the driving force behind
 * the business, not the subject the site is about.
 *
 * The hero and the contact footer carry a full-bleed photographic background;
 * everything between them keeps its photograph contained in a `photo-frame`.
 *
 * Which pool each photograph comes from is not a free choice — see the rule in
 * the `wideImage` note in `lib/data/ese-content.ts`. In short: every frame with a
 * person in it is a real ESE photograph, and the high-resolution set carried over
 * from `main` supplies only landscapes, places, and objects.
 *
 * Photographs render in their own colour. See the note on `photo-frame` in
 * `globals.css` for the treatment that used to be here and why it is gone.
 */
export function EseLanding() {
  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      {/* The photograph is the ground here, not an illustration beside the copy:
          it fills the section and the headline sits on it. `intensity="full"`
          rather than `soft` because this source has the pixels for it — see
          `wideImage` in lib/data/ese-content.ts.

          No `AmbientLayer`: its blooms and botanical marks are drawn to lift a
          flat colour field, and over a photograph they read as smudges. */}
      <section id="top" className="lede-hero" aria-labelledby="hero-title" data-scroll-theme="cream">
        <ParallaxImage
          className="lede-hero__media"
          src={hero.image.src}
          alt={hero.image.alt}
          sizes="100vw"
          zoom="out"
          priority
        />
        <div className="lede-hero__scrim" aria-hidden="true" />

        <div className="lede-hero__grid">
          <div className="lede-hero__copy">
            <p className="section-label">{hero.eyebrow}</p>
            <h1 id="hero-title">{hero.heading}</h1>
            <p className="lede-hero__lede">{hero.lede}</p>
            <div className="link-row">
              <a className="button button--light" href={hero.primaryCta.href}>
                {hero.primaryCta.label} <Arrow direction="down" />
              </a>
              <a className="button button--ghost-light" href={hero.secondaryCta.href}>
                {hero.secondaryCta.label} <Arrow />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- what is ESE */}
      <section id="about" className="org-intro section-shell" aria-labelledby="about-title" data-scroll-theme="paper">
        <AmbientLayer blooms={1} marks />
        <div className="org-intro__grid">
          <Reveal className="org-intro__copy">
            <p className="section-label">01 — {ese.intro.eyebrow}</p>
            <ScrollWords as="h2" id="about-title" text={ese.intro.heading} />
            {ese.intro.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Reveal>

          {/* A real photograph of a real ESE session. People are visible, so it
              cannot come from the generated pool — see `wideImage`. */}
          <Reveal className="org-intro__media" delay={140}>
            <figure className="photo-frame">
              <ParallaxImage
                src={ese.intro.image.src}
                alt={ese.intro.image.alt}
                sizes="(min-width: 960px) 44vw, 92vw"
                intensity="soft"
                zoom="in"
              />
            </figure>
          </Reveal>
        </div>

        <Reveal className="mission-panel" delay={120}>
          <p className="section-label">{ese.mission.eyebrow}</p>
          <blockquote>{ese.mission.statement}</blockquote>
          <p className="mission-panel__supporting">{ese.mission.supporting}</p>
        </Reveal>
      </section>

      {/* ------------------------------------------------- who we are */}
      <section id="who-we-are" className="network-band" aria-labelledby="network-title" data-scroll-theme="umber">
        <AmbientLayer blooms={1} vignette tone="dark" />
        <div className="network-band__inner">
          <Reveal className="network-band__copy">
            <p className="section-label section-label--light">02 — {ese.whoWeAre.eyebrow}</p>
            <ScrollWords as="h2" id="network-title" text={ese.whoWeAre.heading} />
            {ese.whoWeAre.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Reveal>

          {/* Another real photograph — an ESE session, people visible. */}
          <Reveal className="network-band__media" delay={140}>
            <figure className="photo-frame">
              <ParallaxImage
                src={ese.whoWeAre.image.src}
                alt={ese.whoWeAre.image.alt}
                sizes="(min-width: 960px) 42vw, 92vw"
                intensity="soft"
                zoom="in"
              />
            </figure>
          </Reveal>
        </div>

        {/*
          The people.

          Two cards rather than one founder block: ESE is a network, and the
          document says so. Biographies are deliberately absent — see the note on
          `people` in lib/data/ese-content.ts — so each card carries name, role,
          and a link to the fuller page rather than invented copy.
        */}
        <Reveal className="people-group" delay={80}>
          <div className="people-group__head">
            <p className="section-label section-label--light">{people.eyebrow}</p>
            <h3 className="people-group__title">{people.heading}</h3>
            <p className="people-group__lede">{people.lede}</p>
          </div>

          <div className="people-group__grid">
            {people.members.map((person) => (
              <PersonCard key={person.slug} person={person} />
            ))}
          </div>

          <Link className="button button--light" href={people.cta.href}>
            {people.cta.label} <Arrow />
          </Link>
        </Reveal>
      </section>

      {/* --------------------------------------------------- who we serve */}
      <section id="who-we-serve" className="serve-band section-shell" aria-labelledby="serve-title" data-scroll-theme="sage">
        <AmbientLayer blooms={1} />
        <Reveal className="serve-band__heading" variant="rule">
          <p className="section-label">03 — {ese.whoWeServe.eyebrow}</p>
          <ScrollWords as="h2" id="serve-title" text={ese.whoWeServe.heading} />
        </Reveal>
        <div className="serve-band__body">
          <ul className="serve-band__list">
            {ese.whoWeServe.audiences.map((audience, index) => (
              <Reveal as="li" key={audience} delay={index * 60}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                {audience}
              </Reveal>
            ))}
          </ul>
          <Reveal className="serve-band__media" delay={120}>
            <figure className="photo-frame">
              <ParallaxImage
                src={ese.whoWeServe.image.src}
                alt={ese.whoWeServe.image.alt}
                sizes="(min-width: 960px) 38vw, 92vw"
                zoom="in"
              />
            </figure>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- services */}
      <section id="services" className="service-index section-shell" aria-labelledby="services-title" data-scroll-theme="moss">
        <AmbientLayer blooms={2} marks />
        <Reveal className="section-heading-row" variant="rule">
          <p className="section-label">04 — {ese.services.eyebrow}</p>
          <ScrollWords as="h2" id="services-title" text={ese.services.heading} />
        </Reveal>

        <ol className="service-card-grid">
          {ese.services.items.map((service, index) => (
            <Reveal as="li" className="service-card" key={service.slug} delay={index * 80}>
              <article>
                <div className="service-card__media photo-frame">
                  <ParallaxImage
                    src={service.image.src}
                    alt={service.image.alt}
                    sizes="(min-width: 1024px) 30vw, (min-width: 680px) 46vw, 92vw"
                    intensity="soft"
                    zoom={index % 2 ? "in" : "out"}
                  />
                  <span className="service-card__number">0{index + 1}</span>
                </div>
                <div className="service-card__body">
                  <h3>
                    <span className="mask-rise">
                      <span className="mask-rise__inner">{service.title}</span>
                    </span>
                  </h3>
                  <p>{service.description}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------ case study */}
      <section className="case-study" aria-labelledby="case-title" data-scroll-theme="forest">
        <AmbientLayer blooms={1} vignette tone="dark" />
        <div className="case-study__inner">
          <Reveal className="case-study__media" variant="fade">
            <figure className="photo-frame">
              <ParallaxImage
                src={ese.caseStudy.image.src}
                alt={ese.caseStudy.image.alt}
                sizes="(min-width: 960px) 46vw, 92vw"
                intensity="soft"
              />
            </figure>
          </Reveal>
          <Reveal className="case-study__copy" delay={140}>
            <p className="section-label section-label--light">
              05 — {ese.caseStudy.eyebrow}: {ese.caseStudy.label}
            </p>
            <ScrollWords as="h2" id="case-title" text={ese.caseStudy.heading} />
            <p>{ese.caseStudy.body}</p>
            <p className="case-study__status">
              <span aria-hidden="true" />
              {ese.caseStudy.status}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------- scholarship */}
      <section className="scholarship-band section-shell" aria-labelledby="scholarship-title" data-scroll-theme="clay">
        <AmbientLayer blooms={1} marks />
        <div className="scholarship-band__grid">
          <Reveal className="scholarship-band__inner">
            <p className="section-label">06 — {ese.scholarship.eyebrow}</p>
            <ScrollWords as="h2" id="scholarship-title" text={ese.scholarship.heading} />
            <p>{ese.scholarship.body}</p>
            <a className="button" href={ese.scholarship.cta.href}>
              {ese.scholarship.cta.label} <Arrow />
            </a>
          </Reveal>

          <Reveal className="scholarship-band__media" delay={140}>
            <figure className="photo-frame">
              <ParallaxImage
                src={ese.scholarship.image.src}
                alt={ese.scholarship.image.alt}
                sizes="(min-width: 960px) 38vw, 92vw"
                intensity="soft"
                zoom="in"
              />
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------- become a partner */}
      {/*
        Lifted out of "Who we are". It was nested inside that section's copy
        column, which did two things wrong: it put a recruitment ask at position
        02, before a reader knows what ESE does, and it made the copy column
        1227px tall — so the photograph beside it had to stretch to match and
        cropped down to a band of ceiling tiles.
      */}
      <section className="scholarship-band section-shell" aria-labelledby="partner-title" data-scroll-theme="sage">
        <AmbientLayer blooms={1} marks />
        <div className="scholarship-band__grid scholarship-band__grid--reverse">
          <Reveal className="scholarship-band__inner">
            <p className="section-label">07 — {ese.becomePartner.eyebrow}</p>
            <ScrollWords as="h2" id="partner-title" text={ese.becomePartner.heading} />
            <p>{ese.becomePartner.body}</p>
            <a className="button" href={ese.becomePartner.cta.href}>
              {ese.becomePartner.cta.label} <Arrow />
            </a>
          </Reveal>

          <Reveal className="scholarship-band__media" delay={140}>
            <figure className="photo-frame">
              <ParallaxImage
                src={ese.becomePartner.image.src}
                alt={ese.becomePartner.image.alt}
                sizes="(min-width: 960px) 38vw, 92vw"
                intensity="soft"
                zoom="in"
              />
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ news */}
      <NewsTeaser />

      {/* ----------------------------------------------------------- tools */}
      <section className="tools-index section-shell" aria-labelledby="tools-title" data-scroll-theme="sand">
        <AmbientLayer blooms={1} marks />
        <Reveal className="section-heading-row" variant="rule">
          <p className="section-label">09 — {ese.tools.eyebrow}</p>
          <ScrollWords as="h2" id="tools-title" text={ese.tools.heading} />
        </Reveal>

        {/*
          Deliberately not links and deliberately not cards with a call to
          action. Neither tool exists yet, and a tile that looks clickable but
          is not costs more trust than an honest "in development" state.
        */}
        <ol className="tools-list">
          {ese.tools.items.map((tool, index) => (
            <Reveal as="li" key={tool.title} delay={index * 90}>
              <p className="tools-list__status">In development</p>
              <h3>{tool.title}</h3>
              <p>{tool.description}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------------------- contact */}
      {/* The photograph covers the whole footer rather than sitting in a band
          above it, so "Let's connect" reads as an invitation set in a landscape.
          A dark scrim carries it: every measurement for the copy below is taken
          against the photograph plus that scrim, not against a flat colour.

          The vignette is kept — it darkens the edges, which helps the corners of
          a photographic ground — but the blooms and marks are dropped for the
          same reason as the hero. */}
      {/* Composition restored to `main`: a contained panoramic image carrying one
          overlaid line, then a centred call to action. */}
      <footer id="contact" className="cinematic-footer" data-scroll-theme="forest">
        <AmbientLayer blooms={2} marks vignette tone="dark" />

        <div className="cinematic-footer__visual">
          <ParallaxImage
            src={contact.image.src}
            alt={contact.image.alt}
            sizes="100vw"
            zoom="out"
          />
        </div>

        <div className="cinematic-footer__cta">
          <p className="section-label section-label--light">10 — {contact.eyebrow}</p>
          <h2>{contact.heading}</h2>
          <p>{contact.copy}</p>
          <a className="footer-button" href={`mailto:${contact.email}`}>
            Start a conversation <Arrow />
          </a>
          {/* TODO(ese): replace with the real contact address before launch. */}
          <small>Placeholder address — replace with ESE&apos;s approved contact method.</small>
        </div>

        <div className="cinematic-footer__bottom">
          <div>
            <p className="cinematic-footer__name">{ese.abbreviation}</p>
            <p>{ese.name}</p>
            <p className="cinematic-footer__org">{site.footerDescription}</p>
          </div>
          <nav aria-label="Footer navigation">
            {navigation.map((item) =>
              item.href.startsWith("/#") ? (
                <a key={item.href} href={item.href}>{item.label}</a>
              ) : (
                <Link key={item.href} href={item.href}>{item.label}</Link>
              ),
            )}
          </nav>
          <div className="cinematic-footer__legal">
            <a href="#top">Back to top <Arrow direction="up" /></a>
          </div>
        </div>
      </footer>
    </>
  );
}
