import Image from "next/image";
import type { EseImage } from "@/lib/data/ese-content";

export type Person = {
  slug: string;
  name: string;
  role: string;
  bio: string[];
  portrait: EseImage | null;
};

/**
 * One person, built on the same card as a Service Area.
 *
 * Same markup shape as `.service-card` in `EseLanding.tsx` — an `article` with a
 * 4:3 media block above a padded body — so the two card types on the page read as
 * one component rather than two designs. The class names differ only so the
 * people grid can size itself independently.
 *
 * Two details are deliberate rather than unfinished:
 *
 * **The monogram.** Only one portrait was supplied. A person without one gets
 * their initials in the display face, which holds the card's shape and reads as a
 * decision where an empty frame reads as a missing file.
 *
 * **The empty `bio`.** Nothing in the source document is a biography, and writing
 * one on a named person's behalf is not something this site should do. Name and
 * role are facts and render now; the paragraphs appear the moment real copy
 * exists, with no other change.
 */
export function PersonCard({
  person,
  headingLevel = 3,
}: {
  person: Person;
  headingLevel?: 2 | 3;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const initials = person.name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <article className="person-card">
      {person.portrait ? (
        <div className="person-card__media">
          <Image
            src={person.portrait.src}
            alt={person.portrait.alt}
            fill
            sizes="(min-width: 1024px) 31vw, (min-width: 680px) 46vw, 92vw"
          />
        </div>
      ) : (
        <div className="person-card__media person-card__media--monogram" aria-hidden="true">
          <span>{initials}</span>
        </div>
      )}

      <div className="person-card__body">
        <Heading>{person.name}</Heading>
        {person.role ? <p className="person-card__role">{person.role}</p> : null}

        {person.bio.length > 0 ? (
          person.bio.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
        ) : (
          <p className="person-card__pending">Biography to come.</p>
        )}
      </div>
    </article>
  );
}
