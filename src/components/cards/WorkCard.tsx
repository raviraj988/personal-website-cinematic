import Image from "next/image";
import { TextLink } from "@/components/ui/TextLink";
import type { WorkEntry } from "@/lib/data/types";

/**
 * Work / resource card — spec §8.5, §11.2.
 *
 * Every field below the title is optional; omitted fields leave no blank
 * heading or gap. The action label is content-driven ("Read the case study",
 * "Download PDF", "View resource") and carries a hidden qualifier so the link
 * name stays unambiguous in a links list.
 */
export function WorkCard({
  entry,
  headingLevel = 3,
  sizes,
}: {
  entry: WorkEntry;
  headingLevel?: 2 | 3 | 4;
  sizes: string;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const metaItems = [entry.date, entry.location].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <article
      className={
        entry.featured ? "work-card work-card--featured" : "work-card"
      }
    >
      {entry.image ? (
        <div className="work-card__media">
          <Image
            src={entry.image.src}
            alt={entry.image.alt}
            width={entry.image.width}
            height={entry.image.height}
            sizes={sizes}
            quality={80}
          />
        </div>
      ) : null}

      <div className="work-card__body">
        <div className="work-card__meta">
          <span className="badge">{entry.contentType}</span>
          {metaItems.length > 0 ? (
            <>
              <span className="work-card__meta-sep" aria-hidden="true" />
              {/* Joined into one run so a narrow card never wraps a trailing
                  separator onto the end of a line. */}
              <span className="meta-text">{metaItems.join(" · ")}</span>
            </>
          ) : null}
        </div>

        <Heading className="work-card__title">{entry.title}</Heading>
        <p className="work-card__summary">{entry.summary}</p>

        <div className="work-card__foot">
          <TextLink href={entry.action.href}>
            {entry.action.label}
            <span className="visually-hidden">{`: ${entry.title}`}</span>
          </TextLink>
        </div>
      </div>
    </article>
  );
}
