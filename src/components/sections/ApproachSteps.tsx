import { approach } from "@/lib/data/site-content";

/**
 * Approach — spec §8.4.
 *
 * An ordered list, so the sequence is conveyed structurally as well as
 * visually. Desktop lays the steps out horizontally; mobile stacks them.
 */
export function ApproachSteps() {
  if (approach.steps.length === 0) return null;

  return (
    <section
      id="approach"
      className="section section--divided"
      aria-labelledby="approach-heading"
    >
      <div className="container container--wide">
        <div className="section-head section-head--split">
          <div>
            <p className="eyebrow">{approach.eyebrow}</p>
            <h2 id="approach-heading" className="section-heading">
              {approach.heading}
            </h2>
          </div>
          <p className="section-lede">{approach.lede}</p>
        </div>

        <ol className="approach__list">
          {approach.steps.map((step, index) => (
            <li key={step.title} className="approach__step">
              <span className="approach__number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="approach__title">{step.title}</h3>
              <p className="approach__text">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
