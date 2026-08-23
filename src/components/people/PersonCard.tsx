import type { CSSProperties } from "react";
import Link from "next/link";
import { Arrow } from "@/components/ui/Arrow";
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
 * **The empty `summary`.** Nothing in the source document describes an
 * individual, and writing a description on a named person's behalf is not
 * something this site should do. Name and role are facts and render now; the
 * description appears the moment real copy exists, with no other change.
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
    <article className="person-card" style={{ "--i": index } as CSSProperties}>
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

      <div className="person-card__body">
        <Heading>
          <span className="mask-rise">
            <span className="mask-rise__inner">{person.name}</span>
          </span>
        </Heading>
        {person.role ? <p className="person-card__role">{person.role}</p> : null}

        {person.summary ? (
          <p className="person-card__summary">{person.summary}</p>
        ) : (
          <p className="person-card__pending">Biography to come.</p>
        )}

        {/* Pushed to the foot by `margin-top: auto`, so the links line up across
            cards however much description each person has — same as the services. */}
        <Link className="button person-card__cta" href="/people">
          Read biography
          <span className="visually-hidden">{`: ${person.name}`}</span>
          <Arrow />
        </Link>
      </div>
    </article>
  );
}
