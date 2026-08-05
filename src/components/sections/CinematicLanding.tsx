import Image from "next/image";
import { AmbientLayer, BackgroundText } from "@/components/motion/AmbientLayer";
import { Reveal } from "@/components/motion/Reveal";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import { ScrollWords } from "@/components/motion/ScrollWords";
import { HorizontalStory } from "./HorizontalStory";
import {
  cinematicAbout,
  cinematicAreaImages,
  cinematicApproach,
  cinematicAreas,
  cinematicBackdrop,
  cinematicHero,
  cinematicNavigation,
  cinematicResources,
  cinematicWork,
} from "@/lib/data/cinematic-content";

export function CinematicLanding() {
  return (
    <>
      <section id="top" className="cinematic-hero" aria-labelledby="hero-title" data-scroll-theme="cream">
        <ParallaxImage
          src={cinematicHero.image}
          alt={cinematicHero.alt}
          className="cinematic-hero__media"
          priority
        />
        <div className="cinematic-hero__scrim" />
        <div className="cinematic-hero__content">
          <p className="cinematic-hero__eyebrow">{cinematicHero.eyebrow}</p>
          <h1 id="hero-title">{cinematicHero.heading}</h1>
        </div>
        <a className="scroll-cue" href="#about">
          <span>Scroll to explore</span>
          <i aria-hidden="true" />
        </a>
      </section>

      <section id="about" className="about-editorial section-shell" aria-labelledby="about-title" data-scroll-theme="paper">
        <AmbientLayer rules blooms={1} marks />
        <BackgroundText
          text={cinematicBackdrop.about}
          className="bg-word--about"
          drift={90}
        />
        <div className="about-editorial__grid">
          <Reveal className="about-editorial__heading">
            <p className="section-label">01 — {cinematicAbout.eyebrow}</p>
            <ScrollWords
              as="h2"
              id="about-title"
              text={cinematicAbout.heading}
              className="about-editorial__title"
            />
          </Reveal>

          <div className="about-editorial__portrait">
            <figure>
              <Image
                src={cinematicAbout.image}
                alt={cinematicAbout.alt}
                fill
                sizes="(min-width: 960px) 42vw, 88vw"
              />
            </figure>
            <figcaption>Laura McKelvey — portrait supplied for this design.</figcaption>
          </div>

          <Reveal className="about-editorial__copy" delay={180}>
            {cinematicAbout.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className="link-row">
              <a className="text-link" href="#selected-work">
                Explore selected work <span aria-hidden="true">→</span>
              </a>
              <a className="text-link" href="#contact">
                Download résumé <span aria-hidden="true">↓</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="image-essay section-shell" aria-labelledby="essay-title" data-scroll-theme="cream">
        <AmbientLayer rules blooms={2} />
        <BackgroundText
          text={cinematicBackdrop.essay}
          className="bg-word--essay"
          drift={120}
        />

        <div className="image-essay__heading">
          <p className="section-label">Observation and participation</p>
          <ScrollWords
            as="h2"
            id="essay-title"
            text="The work moves between careful observation and the conversations that shape action."
            className="image-essay__title"
          />
          <p className="image-essay__motion-note">
            Scroll slowly — the photography responds to your movement.
          </p>
        </div>

        {/* Two columns: the tall portrait on the left, and a right-hand column
            that stacks the wide image with the text panel so no dangling space
            is left beneath it. */}
        <div className="image-essay__columns">
          <figure className="image-essay__portrait">
            <ParallaxImage
              src="/images/cinematic-fieldwork-stream.jpg"
              alt="A field researcher taking notes while colleagues collect water samples in a forest stream."
              sizes="(min-width: 960px) 44vw, 92vw"
              zoom="in"
            />
            <figcaption>Listening to the landscape — generated design placeholder.</figcaption>
          </figure>

          <div className="image-essay__aside">
            <figure className="image-essay__wide">
              <ParallaxImage
                src="/images/cinematic-community-mapping.jpg"
                alt="A diverse group discussing a topographic map around a community hall table."
                sizes="(min-width: 960px) 48vw, 92vw"
                zoom="out"
              />
              <figcaption>Making knowledge visible — generated design placeholder.</figcaption>
            </figure>

            <div className="image-essay__text-panel">
              <p className="section-label">From context to practical action</p>
              <h3>Listen first. Make the path clearer.</h3>
              <p>
                Listen and understand the local context. Organize available
                information. Support meaningful participation and develop
                practical next steps.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="landscape-interlude" aria-label="Environmental landscape" data-scroll-theme="forest">
        <ParallaxImage
          src="/images/riverside-hillside-neighborhood.jpg"
          alt="Homes on a wooded hillside overlooking a broad river in warm evening light."
          zoom="out"
        />
        <BackgroundText
          text={cinematicBackdrop.interlude}
          className="bg-word--interlude bg-word--over-image"
          variant="outline"
          drift={140}
        />
        <p>Place, history, and relationships shape every environmental decision.</p>
      </section>

      <section
        id="areas-of-work"
        className="area-index section-shell"
        aria-labelledby="areas-title"
        data-scroll-theme="moss"
      >
        <AmbientLayer rules blooms={2} marks />
        <BackgroundText
          text="02"
          className="bg-word--areas"
          variant="numeral"
          drift={110}
        />
        <Reveal className="section-heading-row" variant="rule">
          <p className="section-label">02 — Areas of work</p>
          <ScrollWords as="h2" id="areas-title" text="Where I focus my work" />
          <p>
            These subjects overlap more often than not. A project usually draws on
            several at once.
          </p>
        </Reveal>

        <ol className="area-card-grid">
          {cinematicAreas.map((area, index) => (
            <Reveal as="li" className="area-visual-card" key={area.slug} delay={index * 90}>
              <article>
                <div className="area-visual-card__media">
                  <ParallaxImage
                    src={cinematicAreaImages[index].src}
                    alt={cinematicAreaImages[index].alt}
                    sizes="(min-width: 960px) 44vw, 92vw"
                    zoom={index % 2 ? "in" : "out"}
                  />
                  <span className="area-visual-card__number">0{index + 1}</span>
                </div>
                <div className="area-visual-card__body">
                  <p className="area-visual-card__note">{cinematicAreaImages[index].note}</p>
                  <h3>{area.title}</h3>
                  <p>{area.description}</p>
                  <a className="text-link" href="#selected-work">
                    {area.linkLabel} <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </ol>
      </section>

      <section id="approach" className="approach-editorial" aria-labelledby="approach-title" data-scroll-theme="sage">
        <AmbientLayer blooms={1} marks />
        <BackgroundText
          text={cinematicBackdrop.approach}
          className="bg-word--approach"
          variant="solid"
          drift={100}
        />
        <div className="approach-editorial__media">
          <ParallaxImage
            src="/images/environmental-fieldwork.jpg"
            alt="People conducting environmental fieldwork beside a waterway."
            sizes="(min-width: 960px) 48vw, 100vw"
          />
        </div>
        <div className="approach-editorial__content">
          <Reveal>
            <p className="section-label">03 — My approach</p>
            <ScrollWords as="h2" id="approach-title" text="From context to practical action" />
            <p className="approach-editorial__lede">
              An adaptable way of working rather than a fixed method. The sequence
              shifts to fit the community, timeline, and decision at hand.
            </p>
          </Reveal>
          <ol>
            {cinematicApproach.map((step, index) => (
              <Reveal as="li" key={step.title} delay={index * 90}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="principle-band" aria-labelledby="principle-title" data-scroll-theme="forest">
        <Image src="/images/flowing-stream.jpg" alt="" fill sizes="100vw" />
        <div className="principle-band__scrim" />
        <Reveal className="principle-band__content">
          <p className="section-label section-label--light">Working principle</p>
          <ScrollWords
            as="h2"
            id="principle-title"
            text="Communities already know what they are living with. My job is to help make that knowledge count."
          />
          <p>Provisional statement, pending Laura&apos;s review.</p>
        </Reveal>
      </section>

      <section
        id="selected-work"
        className="selected-stories section-shell"
        aria-labelledby="work-title"
        data-scroll-theme="sand"
      >
        <AmbientLayer rules blooms={1} />
        <BackgroundText
          text={cinematicBackdrop.work}
          className="bg-word--work"
          drift={110}
        />
        <Reveal className="section-heading-row section-heading-row--work" variant="rule">
          <p className="section-label">04 — Selected work</p>
          <ScrollWords as="h2" id="work-title" text="Stories, projects, and useful resources" />
          <p>
            A small provisional selection showing how case studies and resources
            will appear once reviewed for publication.
          </p>
        </Reveal>

        <div className="selected-work-grid">
          {cinematicWork.map((work, index) => (
            <Reveal as="section" className="work-card" key={work.slug} delay={index * 90}>
              <article>
                <div className="work-card__media">
                  {work.image ? (
                    <ParallaxImage
                      src={work.image.src}
                      alt={work.image.alt}
                      sizes="(min-width: 1024px) 31vw, (min-width: 680px) 48vw, 100vw"
                      zoom={index % 2 ? "in" : "out"}
                    />
                  ) : null}
                </div>
                <div className="work-card__body">
                  <p className="work-card__meta">
                    {work.contentType} {work.date ? `— ${work.date}` : ""}
                  </p>
                  <h3>{work.title}</h3>
                  <p>{work.summary}</p>
                  <a className="text-link" href={work.action.href}>
                    {work.action.label} <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="resources" className="resource-library section-shell" aria-labelledby="resources-title" data-scroll-theme="sage">
        <AmbientLayer rules blooms={2} marks />
        <BackgroundText
          text={cinematicBackdrop.resources}
          className="bg-word--resources"
          drift={120}
        />
        <Reveal className="resource-library__heading">
          <p className="section-label">05 — Resources</p>
          <ScrollWords
            as="h2"
            id="resources-title"
            text="Working materials for clearer public participation"
          />
          <p>
            Guides, notes, and visual tools designed to make complicated public
            processes easier to enter and easier to use.
          </p>
        </Reveal>

        <div className="resource-card-grid">
          {cinematicResources.map((resource, index) => (
            <Reveal
              as="section"
              className={`resource-card${index === 0 ? " resource-card--featured" : ""}`}
              key={resource.title}
              delay={(index % 2) * 100}
            >
              <div className="resource-card__media">
                <ParallaxImage
                  src={resource.image}
                  alt={resource.alt}
                  sizes={index === 0 ? "(min-width: 960px) 58vw, 92vw" : "(min-width: 960px) 42vw, 92vw"}
                  zoom={index % 2 ? "in" : "out"}
                />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="resource-card__body">
                <p className="resource-card__meta">{resource.type} — {resource.year}</p>
                <h3>{resource.title}</h3>
                <p>{resource.summary}</p>
                <a className="text-link" href="#contact">
                  {resource.action} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="resource-library__disclaimer">
          Provisional examples for design review; final files and publication details will be added after approval.
        </p>
      </section>

      <HorizontalStory />

      <footer id="contact" className="cinematic-footer" data-scroll-theme="forest">
        <AmbientLayer blooms={2} marks tone="dark" />
        <BackgroundText
          text={cinematicBackdrop.contact}
          className="bg-word--contact bg-word--on-dark"
          drift={90}
        />
        <div className="cinematic-footer__visual">
          <ParallaxImage
            src="/images/contact-river-sunset.jpg"
            alt="A river landscape at sunset, opening toward the horizon."
            sizes="100vw"
            zoom="out"
          />
          <p>Bring the place, the people, and the decision into the same frame.</p>
        </div>
        <div className="cinematic-footer__cta">
          <p className="section-label section-label--light">06 — Contact</p>
          <h2>Let&apos;s connect.</h2>
          <p>
            I&apos;m open to conversations about collaboration, new ideas, and
            opportunities to support communities and public-interest work.
          </p>
          <a className="footer-button" href="mailto:replace-before-launch@example.com">
            Start a conversation <span aria-hidden="true">↗</span>
          </a>
          <small>Placeholder action — replace with Laura&apos;s approved contact method.</small>
        </div>

        <div className="cinematic-footer__bottom">
          <div>
            <p className="cinematic-footer__name">Laura McKelvey</p>
            <p>Environmental &amp; Community Practice</p>
          </div>
          <nav aria-label="Footer navigation">
            {cinematicNavigation.map((item) => (
              <a key={item.href} href={item.href}>{item.label}</a>
            ))}
          </nav>
          <div className="cinematic-footer__legal">
            <p>All copy and photography are provisional design content.</p>
            <a href="#top">Back to top ↑</a>
          </div>
        </div>
      </footer>
    </>
  );
}
