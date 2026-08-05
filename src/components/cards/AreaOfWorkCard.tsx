import { TextLink } from "@/components/ui/TextLink";
import { Icon } from "@/components/ui/icons";
import type { AreaOfWork } from "@/lib/data/types";

/**
 * Area-of-work card — spec §8.3.
 *
 * The card itself is not a link: only the descriptive link inside it is
 * interactive, so there is no ambiguous nested interactive region. The visible
 * link text stays short while a visually hidden qualifier keeps the accessible
 * name unambiguous when links are listed out of context.
 *
 * The heading level is passed in so the card never guesses its place in the
 * document outline.
 */
export function AreaOfWorkCard({
  area,
  headingLevel = 3,
}: {
  area: AreaOfWork;
  headingLevel?: 2 | 3 | 4;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const hasCount =
    typeof area.relatedWorkCount === "number" && area.relatedWorkCount > 0;

  return (
    <article className="area-card">
      <div className="area-card__head">
        <span className="area-card__icon">
          <Icon name={area.icon} />
        </span>
        {hasCount ? (
          <span className="area-card__count">
            {area.relatedWorkCount} entries
          </span>
        ) : null}
      </div>

      <Heading className="area-card__title">{area.title}</Heading>
      <p className="area-card__text">{area.description}</p>

      <div className="area-card__foot">
        <TextLink href={area.href}>
          {area.linkLabel}
          <span className="visually-hidden">{` ${area.linkQualifier}`}</span>
        </TextLink>
      </div>
    </article>
  );
}
