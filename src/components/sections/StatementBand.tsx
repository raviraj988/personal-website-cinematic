import Image from "next/image";
import { LeafOrnament } from "@/components/ui/icons";
import { statement } from "@/lib/data/site-content";

/**
 * A quiet full-bleed band between sections. Static image with a fixed scrim —
 * no parallax, no entrance animation (spec §4.2, §21).
 *
 * The photograph is decorative here: it carries no information the text does
 * not already convey, so its alternative text is empty.
 */
export function StatementBand() {
  const { image } = statement;

  return (
    <section
      className="statement on-inverse"
      aria-labelledby="statement-label"
    >
      <div className="statement__image">
        <Image
          src={image.src}
          alt=""
          width={image.width}
          height={image.height}
          sizes="100vw"
          quality={78}
        />
      </div>
      <div className="statement__scrim" />

      <div className="container container--wide">
        <p className="eyebrow eyebrow--inverse" id="statement-label">
          {statement.eyebrow}
        </p>

        <blockquote className="statement__quote">{statement.quote}</blockquote>

        <LeafOrnament inverse className="statement__ornament" />

        <p className="statement__attribution">{statement.attribution}</p>
      </div>
    </section>
  );
}
