import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { AmbientLayer } from "@/components/motion/AmbientLayer";
import { EseLogo } from "@/components/brand/EseMark";
import { Arrow } from "@/components/ui/Arrow";
import { Reveal } from "@/components/motion/Reveal";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import { VideoBackdrop } from "@/components/motion/VideoBackdrop";
import { GlowCards } from "@/components/motion/GlowCards";
import { ScrollDissolve } from "@/components/motion/ScrollDissolve";
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
/**
 * Splits a paragraph into its opening sentence and whatever follows.
 *
 * The card shows the lead; the rest is revealed on hover. This is progressive
 * disclosure of copy that is already in `ese-content.ts` — nothing is written,
 * summarised or reworded, and the split is at a full stop or semicolon the
 * author put there.
 *
 * A single-sentence paragraph yields no `rest`, and its card simply has no hover
 * panel. That is the honest outcome rather than padding it with invented text.
 */
function splitLead(paragraph: string): { lead: string; rest: string } {
  const parts = paragraph.split(/(?<=[.;])\s+/);
  /* A lead ending on a semicolon is left dangling once the clause after it moves
     behind hover — "field trials are underway;" reads as truncated. The semicolon
     becomes a full stop, which is what it would be if the clause had never been
     joined. A lead ending in "." is untouched. */
  const lead = (parts[0] ?? paragraph).replace(/;$/, ".");
  return { lead, rest: parts.slice(1).join(" ") };
}

/** Every sentence of a paragraph, as its own line. */
function splitSentences(paragraph: string): string[] {
  return paragraph.split(/(?<=\.)\s+/).filter(Boolean);
}

/**
 * The dark sections' card set: a short heading per card, with the source
 * document's own sentence revealed on hover.
 *
 * The heading is the only drafted text — `cardHeadings` in `ese-content.ts`,
 * marked for approval. The body is transcribed and unmodified.
 *
 * `zip` pairs them positionally and stops at the shorter list, so a missing
 * heading drops that card rather than shifting every heading onto the wrong
 * sentence — which is the failure that matters when two parallel arrays drift.
 *
 * `offset` shifts which gradient band each card takes, so two adjacent sections
 * do not open on the same colour.
 */
function zip(headings: readonly string[], bodies: readonly string[]) {
  return headings
    .slice(0, bodies.length)
    .map((heading, index) => ({ heading, body: bodies[index] as string }));
}

function StatementCards({
  items,
  offset = 0,
}: {
  items: { heading: string; body: string }[];
  offset?: number;
}) {
  return (
    <GlowCards className="statement-cards">
      <ol>
        {items.map((item, index) => (
          <li
            key={item.heading}
            style={{ "--i": index } as CSSProperties}
            data-band={(index + offset) % 4}
            data-glow-card
          >
            <span className="statement-card__band" aria-hidden="true" />
            <span className="statement-card__num" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="statement-card__line">{item.heading}</p>
            <span className="glow-card__desc">
              <span>{item.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </GlowCards>
  );
}

export function EseLanding() {
  /* Sentences two and three of the case-study body. The first is set as prose
     above them, so it is deliberately not repeated here. */
  const caseStudyFacts = splitSentences(ese.caseStudy.body).slice(1);

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
        data-scroll-theme="haze"
        /* The copy sits on a full-bleed photograph, not on the cream page tone,
           so this section sets its own light ink. See the note in globals.css. */
        data-ink="own"
      >
        {/* Three landscape clips, cycling at 0.62x. `eager` because this is
            above the fold — the lazy default would show the poster first and
            then visibly swap.

            Slower than the section backdrops would be wrong here: the hero is
            looked at directly rather than read over, and below about 0.6x the
            30fps masters start to judder on a moving horizon. */}
        <VideoBackdrop
          clips={["hero-1"]}
          rate={0.62}
          crossfade={1.8}
          eager
        />
        <div className="lede-hero__scrim" aria-hidden="true" />

        {/* The cinematic part: the hero erodes upward into the page as it
            leaves, rather than sliding away intact. */}
        <ScrollDissolve target="#top" />

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
      <section id="about" className="org-intro section-shell" aria-labelledby="about-title" data-scroll-theme="dusk">
        <AmbientLayer blooms={1} marks vignette tone="dark" />
        <div className="org-intro__grid">
          <Reveal className="org-intro__copy">
            <p className="section-label section-label--light">01 — {ese.intro.eyebrow}</p>
            <ScrollWords as="h2" id="about-title" text={ese.intro.heading} />
            {/* Statement cards with a proximity glow — the border lights where
                the pointer is, and fades up as it approaches rather than snapping
                on at `:hover`. See `GlowCards`.

                Each card shows the paragraph's opening sentence and reveals the
                rest on hover. No copy is written: the split is at a full stop the
                author already put there. */}
            {/* The first source paragraph is the lede; the second supplies the
                cards, one per sentence. Only the headings are drafted. */}
            <p className="org-intro__lede">{ese.intro.paragraphs[0]}</p>
            <StatementCards
              items={zip(ese.intro.cardHeadings, splitSentences(ese.intro.paragraphs[1] ?? ""))}
            />
            {/* Each landing section is a summary; the button is the way through
                to the full page the navigation also points at. */}
            <Link className="button button--light" href="/about">
              More about ESE <Arrow />
            </Link>
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
      <section id="who-we-are" className="network-band" aria-labelledby="network-title" data-scroll-theme="dusk">
        <AmbientLayer blooms={1} marks />
        <div className="network-band__inner">
          <Reveal className="network-band__copy">
            <p className="section-label">02 — {ese.whoWeAre.eyebrow}</p>
            <ScrollWords as="h2" id="network-title" text={ese.whoWeAre.heading} />
            <p className="org-intro__lede">{ese.whoWeAre.lede}</p>
            <StatementCards items={zip(ese.whoWeAre.cardHeadings, ese.whoWeAre.body)} offset={1} />
            <Link className="button button--light" href="/who-we-are">
              Who we are <Arrow />
            </Link>
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
        data-scroll-theme="dusk"
      >
        {/* The photograph sits inside a frame so the forest ground shows as a
            thin border around it, rather than bleeding to the viewport edge. */}
        <div className="principle-band__frame">
          {/* Was a single parallax photograph. Three clips now cross-dissolve
              here at half speed — the section had a whole viewport and one still
              image in it, which is the case a moving ground is actually for.
              `ese.mission.image` is still in the content file and is no longer
              read; the poster comes from the first clip. */}
          {/* No `orientation`: the default picks the 9:16 cut on phones, where the band
              is full-bleed, and the uncropped 16:9 file everywhere else. */}
          <VideoBackdrop clips={["mission-1"]} rate={1} />
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
        data-scroll-theme="haze"
      >
        <AmbientLayer blooms={1} marks />

        <Reveal className="people-group people-group--standalone">
          <div className="people-group__head">
            <p className="section-label">03 — {people.eyebrow}</p>
            <ScrollWords as="h2" id="people-title" text={people.heading} />
            <p className="people-group__lede">{people.lede}</p>
          </div>

          <GlowCards>
            <div className="people-group__grid">
              {people.members.map((person, index) => (
                <PersonCard key={person.slug} person={person} index={index} />
              ))}
            </div>
          </GlowCards>

          <Link className="button" href={people.cta.href}>
            {people.cta.label} <Arrow />
          </Link>
        </Reveal>
      </section>

      {/* --------------------------------------------------- who we serve */}
      <section id="who-we-serve" className="serve-band section-shell" aria-labelledby="serve-title" data-scroll-theme="haze">
        <AmbientLayer blooms={1} />
        <Reveal className="serve-band__heading" variant="rule">
          <p className="section-label">04 — {ese.whoWeServe.eyebrow}</p>
          <ScrollWords as="h2" id="serve-title" text={ese.whoWeServe.heading} />
          <p className="serve-band__intro">{ese.whoWeServe.intro}</p>
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
          {/* Six cards rather than six rules-under-rows. Same numbered-index
              language, same single reveal driving a `--i` stagger; what changes is
              that each audience now reads as its own constituency instead of a
              line to scan past. */}
          <Reveal className="audience-cards">
            <GlowCards>
            <ol>
              {ese.whoWeServe.audiences.map((audience, index) => (
                <li key={audience.name} style={{ "--i": index } as CSSProperties} data-glow-card>
                  <span className="audience-card__num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="audience-card__name">{audience.name}</span>
                  <span className="glow-card__desc">
                    <span>{audience.description}</span>
                  </span>
                </li>
              ))}
            </ol>
            </GlowCards>
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
      <section id="services" className="service-index section-shell" aria-labelledby="services-title" data-scroll-theme="haze">
        <AmbientLayer blooms={2} marks />
        <Reveal className="section-heading-row" variant="rule">
          <p className="section-label">05 — {ese.services.eyebrow}</p>
          <ScrollWords as="h2" id="services-title" text={ese.services.heading} />
          <p className="section-lede">{ese.services.lede}</p>
        </Reveal>

        <GlowCards>
        <ol className="service-card-grid">
          {ese.services.items.map((service, index) => (
            <Reveal as="li" className="service-card" key={service.slug} delay={index * 80} data-glow-card>
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
                  {/* The short summary stays visible; the full description —
                      fifty words, and the reason these cards used to read so
                      long — is behind hover and on the service's own page. */}
                  <p className="service-card__summary">{service.summary}</p>
                  <span className="glow-card__desc">
                    <span>{service.description}</span>
                  </span>

                  {/* Pushed to the foot of the card by `margin-top: auto`, so the
                      five buttons sit on one line regardless of how much
                      description each service has. */}
                  <Link className="button service-card__cta service-card__cta--stretched" href={`/services/${service.slug}`}>
                    Learn more
                    <span className="visually-hidden">{` about ${service.title}`}</span>
                    <Arrow />
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </ol>
        </GlowCards>

        <Reveal>
          <Link className="button" href="/services">
            All service areas <Arrow />
          </Link>
        </Reveal>
      </section>

      {/* ------------------------------------------------------ case study */}
      <section className="case-study" aria-labelledby="case-title" data-scroll-theme="dusk">
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

            {/* The opening sentence as prose, then the supporting facts as cards.
                The standalone `case-study__status` line that used to close this
                section is gone: it said "Bench testing and field trials underway",
                which is the opening clause of the third sentence now carried by
                the last card. `caseStudy.status` is referenced nowhere else — no
                schema or metadata reads it — so it is left in the content file
                rather than deleted, in case the badge is ever wanted back. */}
            <p className="case-study__lede">{splitLead(ese.caseStudy.body).lead}</p>
            <StatementCards items={zip(ese.caseStudy.cardHeadings, caseStudyFacts)} offset={2} />
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
      <section className="scholarship-band section-shell" aria-labelledby="scholarship-title" data-scroll-theme="dusk">
        <AmbientLayer blooms={1} marks />
        <div className="scholarship-band__grid">
          <Reveal className="scholarship-band__inner">
            <p className="section-label">07 — {ese.scholarship.eyebrow}</p>
            <ScrollWords as="h2" id="scholarship-title" text={ese.scholarship.heading} />
            <p className="org-intro__lede">{ese.scholarship.lede}</p>
            <StatementCards
              items={zip(ese.scholarship.cardHeadings, splitSentences(ese.scholarship.body))}
              offset={3}
            />
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
      <section className="scholarship-band section-shell" aria-labelledby="partner-title" data-scroll-theme="haze">
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
      <section className="tools-index section-shell" aria-labelledby="tools-title" data-scroll-theme="haze">
        <AmbientLayer blooms={1} marks />
        <Reveal className="section-heading-row" variant="rule">
          <p className="section-label">10 — {ese.tools.eyebrow}</p>
          <ScrollWords as="h2" id="tools-title" text={ese.tools.heading} />
          <p className="section-lede">{ese.tools.lede}</p>
        </Reveal>

        {/*
          Deliberately not links and deliberately not cards with a call to
          action. Neither tool exists yet, and a tile that looks clickable but
          is not costs more trust than an honest "in development" state.
        */}
        <GlowCards>
        <ol className="tools-list">
          {ese.tools.items.map((tool, index) => (
            <Reveal as="li" key={tool.title} delay={index * 90} data-glow-card>
              <p className="tools-list__status">In development</p>
              <h3>{tool.title}</h3>
              <span className="glow-card__desc">
                <span>{tool.description}</span>
              </span>
            </Reveal>
          ))}
        </ol>
        </GlowCards>
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
      <footer id="contact" className="cinematic-footer" data-scroll-theme="dusk">
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
          {/* The sixth navigation destination reached from the landing page, so
              every nav item has a route AND a button into it. Secondary to the
              mailto above, which is still the fastest path. */}
          <Link className="footer-button footer-button--ghost" href="/contact">
            All the ways to reach us <Arrow />
          </Link>
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
