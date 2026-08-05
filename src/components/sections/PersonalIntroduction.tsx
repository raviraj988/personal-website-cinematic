import Image from "next/image";
import { TextLink } from "@/components/ui/TextLink";
import { LeafOrnament } from "@/components/ui/icons";
import { personalIntroduction } from "@/lib/data/site-content";

/**
 * Personal introduction — spec §8.2.
 *
 * Portrait beside copy on desktop, portrait above copy on mobile. The portrait
 * is not cropped tightly, so the face and surrounding context stay intact.
 */
export function PersonalIntroduction() {
  const { portrait } = personalIntroduction;

  return (
    <section
      id="about"
      className="section section--divided"
      aria-labelledby="about-heading"
    >
      <div className="container container--wide intro__grid">
        <figure className="intro__portrait">
          <div className="intro__portrait-frame">
            <Image
              src={portrait.src}
              alt={portrait.alt}
              width={portrait.width}
              height={portrait.height}
              sizes="(min-width: 62rem) 42vw, 100vw"
              quality={82}
            />
          </div>
          {portrait.caption ? (
            <figcaption className="image-credit">{portrait.caption}</figcaption>
          ) : null}
        </figure>

        <div className="intro__body">
          <p className="eyebrow">{personalIntroduction.eyebrow}</p>
          <h2 id="about-heading" className="section-heading">
            {personalIntroduction.heading}
          </h2>

          <div className="intro__paragraphs">
            {personalIntroduction.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>

          <div className="intro__actions">
            {personalIntroduction.actions.map((action) => (
              <TextLink key={action.label} href={action.href}>
                {action.label}
              </TextLink>
            ))}
          </div>

          <LeafOrnament className="intro__ornament" />
        </div>
      </div>
    </section>
  );
}
