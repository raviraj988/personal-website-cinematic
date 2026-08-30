import type { CSSProperties } from "react";
import Link from "next/link";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import type { EseImage } from "@/lib/data/ese-content";

export type Person = {
  slug: string;
  name: string;
  role: string;
  summary: string;
  bio: string[];
  portrait: EseImage | null;
};

/**
 * One person, built on the same card as a Service Area.
 *
 * Same shape as `.service-card` — media block, padded body, a description, and a
 * link pinned to the foot of the card — so the two card types on the page read as
 * one component rather than two designs.
 *
 * Three details are deliberate rather than unfinished:
 *
 * **The portrait drifts and settles on scroll**, like every other photograph on
 * the page. `intensity="soft"` because the source is 1068x1600: the full parallax
 * peaks at 1.46x scale, which would ask for more pixels than this file has.
 *
 * **The monogram.** Only one portrait was supplied. A person without one gets
 * their initials in the display face, which holds the card's shape and reads as a
 * decision where an empty frame reads as a missing file.
 *
 * **No description.** Nothing in the source document describes an individual,
 * and writing one on a named person's behalf is not something this site should
 * do. The card carries the two things that ARE facts — name and role — and the
 * `summary` field stays on the type so real copy can be reinstated here without
 * touching anything else.
 */
export function PersonCard({
  person,
  headingLevel = 3,
  index = 0,
}: {
  person: Person;
  headingLevel?: 2 | 3;
  /** Position in the grid. Drives the reveal stagger — see `--i` in people.css. */
  index?: number;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const initials = person.name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <article className="person-card" style={{ "--i": index } as CSSProperties} data-glow-card>
      {/* The gradient band, matching the statement cards on the dark sections so
          the two card families read as one system. */}
      <span className="person-card__band" aria-hidden="true" />
      {person.portrait ? (
        <div className="person-card__media photo-frame">
          <ParallaxImage
            src={person.portrait.src}
            alt={person.portrait.alt}
            sizes="(min-width: 1024px) 31vw, (min-width: 680px) 46vw, 92vw"
            intensity="soft"
            zoom="in"
          />
        </div>
      ) : (
        <div className="person-card__media person-card__media--monogram" aria-hidden="true">
          <span>{initials}</span>
        </div>
      )}

      {/* Name and role only.
       *
       * The summary, the "Biography to come." placeholder and the footer CTA are
       * all gone. Nothing in the source document describes an individual, so the
       * card was spending two thirds of its height on an empty state and a button
       * — it announced a gap rather than presenting a person.
       *
       * The NAME carries the link now instead of a separate button. That keeps
       * the card keyboard-reachable and keeps `:focus-within` firing, which is
       * what drives the lift and the seam; a card with no focusable child would
       * have those states only for mouse users. */}
      <div className="person-card__body">
        <Heading>
          <Link className="person-card__link" href="/people">
            <span className="mask-rise">
              <span className="mask-rise__inner">{person.name}</span>
            </span>
            <span className="visually-hidden">{` — read biography`}</span>
          </Link>
        </Heading>
        {person.role ? <p className="person-card__role">{person.role}</p> : null}

        {/* The summary, below the card's own text — the card expands to show it
            rather than the panel covering the portrait.
         *
         * `person.summary` is real copy that has been in `ese-content.ts` all
         * along and rendered nowhere once the card was cut back to a portrait, a
         * name and a role.
         *
         * The layout cost is real and accepted: these sit in a grid, a grid row
         * is as tall as its tallest item, so an expanding card grows its row.
         * `.people-group__grid` sets `align-items: start` so the cards beside it
         * are not stretched to match — the movement stays in the row rather than
         * resizing every sibling.
         *
         * Joshua's summary is an empty string — nothing in the source document
         * describes him — so his card renders no panel rather than inventing a
         * biography for a named person. */}
        {person.summary ? (
          <span className="glow-card__desc">
            <span>{person.summary}</span>
          </span>
        ) : null}
      </div>
    </article>
  );
}
