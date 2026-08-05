import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { contactInvitation } from "@/lib/data/site-content";

/**
 * Closing contact invitation — spec §8.8.
 *
 * A calm invitation on a dark forest background with cream text. No urgency,
 * counters, or funnel language. The photograph is decorative.
 */
export function ContactInvitation() {
  const { image } = contactInvitation;

  return (
    <section
      id="contact"
      className="contact on-inverse"
      aria-labelledby="contact-heading"
    >
      <div className="contact__image">
        <Image
          src={image.src}
          alt=""
          width={image.width}
          height={image.height}
          sizes="100vw"
          quality={78}
        />
      </div>
      <div className="contact__scrim" />

      <div className="container container--wide">
        <p className="eyebrow eyebrow--inverse">{contactInvitation.eyebrow}</p>

        <h2 id="contact-heading" className="contact__heading">
          {contactInvitation.heading}
        </h2>

        <p className="contact__lede">{contactInvitation.copy}</p>

        <div className="contact__actions button-row">
          <ButtonLink
            href={contactInvitation.primaryCta.href}
            variant="on-inverse"
          >
            {contactInvitation.primaryCta.label}
          </ButtonLink>
          <ButtonLink
            href={contactInvitation.secondaryCta.href}
            variant="ghost-inverse"
          >
            {contactInvitation.secondaryCta.label}
          </ButtonLink>
        </div>

        <dl className="contact__aside">
          {contactInvitation.aside.map((item) => (
            <div key={item.term}>
              <dt>{item.term}</dt>
              <dd>{item.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
