import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { hero } from "@/lib/data/site-content";

/**
 * Landing hero — spec §8.1, adapted to a full-bleed treatment.
 *
 * The photograph fills the band and the copy is overlaid on it. Note this
 * departs from the two-column split described in §8.1; the requirement that no
 * copy be *baked into* the image file still holds — all text here is live HTML.
 *
 * Contrast is carried by a fixed two-layer scrim that is heaviest exactly where
 * the text sits (lower left on desktop, the lower band on narrow screens), so
 * cream text stays well above the AA threshold over every part of the image.
 */
export function Hero() {
  const { image } = hero;

  return (
    <section className="hero on-inverse" aria-labelledby="hero-heading">
      <div className="hero__media">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="100vw"
          quality={84}
          priority
        />
      </div>
      <div className="hero__scrim" />

      <div className="container container--wide hero__inner">
        <div className="hero__copy">
          <p className="eyebrow eyebrow--inverse">{hero.eyebrow}</p>

          <h1 id="hero-heading" className="hero__headline">
            {hero.headline}
          </h1>

          <p className="hero__lede">{hero.supportingCopy}</p>

          <div className="hero__actions button-row">
            <ButtonLink href={hero.primaryCta.href} variant="on-inverse">
              {hero.primaryCta.label}
            </ButtonLink>
            <ButtonLink href={hero.secondaryCta.href} variant="ghost-inverse">
              {hero.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>

        <div className="hero__meta">
          <div className="hero__note">
            <p className="hero__note-label">{hero.audience.label}</p>
            <p className="hero__note-text">{hero.audience.text}</p>
          </div>
          {image.credit ? (
            <p className="hero__credit">{image.credit}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
