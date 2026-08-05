import { AreaOfWorkCard } from "@/components/cards/AreaOfWorkCard";
import { areasOfWork, areasOfWorkSection } from "@/lib/data/site-content";

/**
 * Areas of work — spec §8.3.
 *
 * Renders nothing at all when there is no published content, rather than an
 * empty heading above an empty grid (spec §27).
 */
export function AreasOfWorkGrid() {
  if (areasOfWork.length === 0) return null;

  return (
    <section
      id="areas-of-work"
      className="section section--divided section--sunken"
      aria-labelledby="areas-heading"
    >
      <div className="container container--wide">
        <div className="section-head section-head--split">
          <div>
            <p className="eyebrow">{areasOfWorkSection.eyebrow}</p>
            <h2 id="areas-heading" className="section-heading">
              {areasOfWorkSection.heading}
            </h2>
          </div>
          <p className="section-lede">{areasOfWorkSection.lede}</p>
        </div>

        <ul className="card-grid card-grid--areas">
          {areasOfWork.map((area) => (
            <li key={area.slug}>
              <AreaOfWorkCard area={area} headingLevel={3} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
