import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { AmbientLayer } from "@/components/motion/AmbientLayer";
import { EseLogo } from "@/components/brand/EseMark";
import { Arrow } from "@/components/ui/Arrow";
import { Reveal } from "@/components/motion/Reveal";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import { ScrollWords } from "@/components/motion/ScrollWords";
import { NewsTeaser } from "@/components/news/NewsTeaser";
import { PersonCard } from "@/components/people/PersonCard";
import {
  brand,
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
      <section
        id="top"
        className="lede-hero"
        aria-labelledby="hero-title"
        data-scroll-theme="cream"
        /* The copy sits on a full-bleed photograph, not on the cream page tone,
           so this section sets its own light ink. See the note in globals.css. */
        data-ink="own"
      >
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
      <section id="about" className="org-intro section-shell" aria-labelledby="about-title" data-scroll-theme="forest">
        <AmbientLayer blooms={1} marks vignette tone="dark" />
        <div className="org-intro__grid">
          <Reveal className="org-intro__copy">
            <p className="section-label section-label--light">01 — {ese.intro.eyebrow}</p>
            <ScrollWords as="h2" id="about-title" text={ese.intro.heading} />
            {ese.intro.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Reveal>

          {/* A real photograph of a real ESE session. People are visible, so it
              cannot come from the generated pool — see `wideImage`. */}
          <Reveal className="org-intro__media" delay={140}>
            <figure className="photo-frame photo-frame--plate">
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
      </section>

      {/* ------------------------------------------------- who we are */}
      <section id="who-we-are" className="network-band" aria-labelledby="network-title" data-scroll-theme="forest">
        <AmbientLayer blooms={1} marks />
        <div className="network-band__inner">
          <Reveal className="network-band__copy">
            <p className="section-label">02 — {ese.whoWeAre.eyebrow}</p>
            <ScrollWords as="h2" id="network-title" text={ese.whoWeAre.heading} />
            {ese.whoWeAre.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Reveal>

          {/* Another real photograph — an ESE session, people visible. */}
          <Reveal className="network-band__media" delay={140}>
            <figure className="photo-frame photo-frame--plate">
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
      </section>

      {/* --------------------------------------------------------- mission */}
      {/*
        The mission, given a whole viewport.

        A full screen of photograph with the mission set into the foot of it —
        `main`'s landscape interlude, carrying the mission instead of a caption.
        The mission used to sit in a bordered panel at the foot of "What is ESE",
        where it read as a footnote to the section above rather than as the thing
        ESE is for.

        The photograph drifts on scroll like the rest of the page's imagery. The
        copy is anchored to one corner rather than centred, which is what makes
        that readable — a background moving behind centred text reads as a
        rendering fault, behind cornered text it reads as depth.
      */}
      <section
        className="principle-band"
        aria-labelledby="mission-title"
        data-scroll-theme="forest"
      >
        {/* The photograph sits inside a frame so the forest ground shows as a
            thin border around it, rather than bleeding to the viewport edge. */}
        <div className="principle-band__frame">
          <ParallaxImage
            src={ese.mission.image.src}
            alt=""
            sizes="100vw"
            zoom="out"
            intensity="soft"
          />
          <div className="principle-band__scrim" />
          <Reveal className="principle-band__content">
            {/* The rule and the copy sit in the foot of the frame, so the top two
                thirds of the photograph stay clear. */}
            <div className="principle-band__rule">
              <p className="section-label section-label--light">{ese.mission.eyebrow}</p>
              <ScrollWords as="h2" id="mission-title" text={ese.mission.statement} />
              <p>{ese.mission.supporting}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- people */}
      {/*
        The people, as their own section rather than a coda to "Who we are".

        Each card is the Service Area card — media, description, a link pinned to
        the foot — so the two card types on the page read as one component.
        Descriptions come from `people` in lib/data/ese-content.ts and stay empty
        rather than invented where nothing was supplied.
      */}
      <section
        id="people"
        className="people-band section-shell"
        aria-labelledby="people-title"
        data-scroll-theme="cream"
      >
        <AmbientLayer blooms={1} marks />

        <Reveal className="people-group people-group--standalone">
          <div className="people-group__head">
            <p className="section-label">03 — {people.eyebrow}</p>
            <ScrollWords as="h2" id="people-title" text={people.heading} />
            <p className="people-group__lede">{people.lede}</p>
          </div>

          <div className="people-group__grid">
            {people.members.map((person, index) => (
              <PersonCard key={person.slug} person={person} index={index} />
            ))}
          </div>

          <Link className="button" href={people.cta.href}>
            {people.cta.label} <Arrow />
          </Link>
        </Reveal>
      </section>

      {/* --------------------------------------------------- who we serve */}
      <section id="who-we-serve" className="serve-band section-shell" aria-labelledby="serve-title" data-scroll-theme="cream">
        <AmbientLayer blooms={1} />
        <Reveal className="serve-band__heading" variant="rule">
          <p className="section-label">04 — {ese.whoWeServe.eyebrow}</p>
          <ScrollWords as="h2" id="serve-title" text={ese.whoWeServe.heading} />
        </Reveal>
        <div className="serve-band__body">
          {/*
            One `Reveal` around the whole list rather than one per row.

            Six rows meant six IntersectionObservers to produce a stagger that is
            really a single event, and the delays drifted because each row fired
            on its own threshold. The wrapper fires once and the rows stagger off
            `--i` in CSS, which also lets the rule under each row wipe in — a
            per-row transition the old markup had nowhere to hang.
          */}
          <Reveal className="serve-index">
            <ol>
              {ese.whoWeServe.audiences.map((audience, index) => (
                <li key={audience} style={{ "--i": index } as CSSProperties}>
                  <span className="serve-index__num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="serve-index__name">{audience}</span>
                  <span className="serve-index__rule" aria-hidden="true" />
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal className="serve-band__media" delay={120}>
            <figure className="photo-frame photo-frame--plate">
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
      <section id="services" className="service-index section-shell" aria-labelledby="services-title" data-scroll-theme="cream">
        <AmbientLayer blooms={2} marks />
        <Reveal className="section-heading-row" variant="rule">
          <p className="section-label">05 — {ese.services.eyebrow}</p>
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
                  {/* Pushed to the foot of the card by `margin-top: auto`, so the
                      five buttons sit on one line regardless of how much
                      description each service has. */}
                  <Link className="button service-card__cta" href={`/services/${service.slug}`}>
                    Learn more
                    <span className="visually-hidden">{` about ${service.title}`}</span>
                    <Arrow />
                  </Link>
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
            <figure className="photo-frame photo-frame--plate">
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
              06 — {ese.caseStudy.eyebrow}: {ese.caseStudy.label}
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
      {/*
        Forest, not cream. 05, 06 and 07 were three cream sections in a row, which
        flattened the middle of the page.

        Note what this does rather than what it fixes: the case study above is also
        forest, so these two now read as one longer dark passage before the page
        returns to cream at 07. That is a deliberate hold, not alternation.

        Nothing else here changes. `data-scroll-theme` drives the whole inversion:
        the label picks up `--color-accent-light`, the heading and body take paper
        and soft white through `--ink` / `--ink-muted`, and the photograph swaps its
        drop shadow for the light ring the dark grounds use — a shadow is invisible
        on forest, so separation has to come from light instead.
      */}
      <section className="scholarship-band section-shell" aria-labelledby="scholarship-title" data-scroll-theme="forest">
        <AmbientLayer blooms={1} marks />
        <div className="scholarship-band__grid">
          <Reveal className="scholarship-band__inner">
            <p className="section-label">07 — {ese.scholarship.eyebrow}</p>
            <ScrollWords as="h2" id="scholarship-title" text={ese.scholarship.heading} />
            <p>{ese.scholarship.body}</p>
            <a className="button" href={ese.scholarship.cta.href}>
              {ese.scholarship.cta.label} <Arrow />
            </a>
          </Reveal>

          <Reveal className="scholarship-band__media" delay={140}>
            <figure className="photo-frame photo-frame--plate">
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
      <section className="scholarship-band section-shell" aria-labelledby="partner-title" data-scroll-theme="cream">
        <AmbientLayer blooms={1} marks />
        <div className="scholarship-band__grid scholarship-band__grid--reverse">
          <Reveal className="scholarship-band__inner">
            <p className="section-label">08 — {ese.becomePartner.eyebrow}</p>
            <ScrollWords as="h2" id="partner-title" text={ese.becomePartner.heading} />
            <p>{ese.becomePartner.body}</p>
            <a className="button" href={ese.becomePartner.cta.href}>
              {ese.becomePartner.cta.label} <Arrow />
            </a>
          </Reveal>

          <Reveal className="scholarship-band__media" delay={140}>
            <figure className="photo-frame photo-frame--plate">
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
      <section className="tools-index section-shell" aria-labelledby="tools-title" data-scroll-theme="cream">
        <AmbientLayer blooms={1} marks />
        <Reveal className="section-heading-row" variant="rule">
          <p className="section-label">10 — {ese.tools.eyebrow}</p>
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
          <p className="section-label section-label--light">11 — {contact.eyebrow}</p>
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
            {/* The logo carries the name here, so the "ESE" / full-name pair it
                replaced would only have repeated it in type. The mark is white
                by `currentColor` against the footer photograph. */}
            <EseLogo
              className="cinematic-footer__logo"
              label={site.name}
            />
            {/* The tagline as live text rather than the kit's lockup artwork —
                see the note on `brand.tagline`. One clause per line, as every
                lockup in the kit sets it. */}
            <ul className="cinematic-footer__tagline">
              {brand.tagline.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
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
