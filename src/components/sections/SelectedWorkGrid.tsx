import { WorkCard } from "@/components/cards/WorkCard";
import { TextLink } from "@/components/ui/TextLink";
import { selectedWork, selectedWorkSection } from "@/lib/data/site-content";

/**
 * Selected work and resources — spec §8.5.
 *
 * A mixed editorial grid: the first featured entry reads as a spread, the rest
 * follow as cards. With one, two, or three entries the section still looks
 * intentional. With none it renders nothing rather than an empty grid (§27).
 */
export function SelectedWorkGrid() {
  if (selectedWork.length === 0) return null;

  const featured = selectedWork.find((entry) => entry.featured);
  const rest = selectedWork.filter((entry) => entry !== featured);

  return (
    <section
      id="selected-work"
      className="section section--divided"
      aria-labelledby="work-heading"
    >
      <div className="container container--wide">
        <div className="section-head section-head--split">
          <div>
            <p className="eyebrow">{selectedWorkSection.eyebrow}</p>
            <h2 id="work-heading" className="section-heading">
              {selectedWorkSection.heading}
            </h2>
          </div>
          <p className="section-lede">{selectedWorkSection.lede}</p>
        </div>

        <div className="work-grid">
          {featured ? (
            <WorkCard
              entry={featured}
              headingLevel={3}
              sizes="(min-width: 56rem) 56vw, 100vw"
            />
          ) : null}

          {rest.length > 0 ? (
            <ul className="work-grid__secondary">
              {rest.map((entry) => (
                <li key={entry.slug}>
                  <WorkCard
                    entry={entry}
                    headingLevel={3}
                    sizes="(min-width: 56rem) 42vw, 100vw"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="section-foot">
          <p className="meta-text">
            Entries are published as they are reviewed and approved.
          </p>
          <TextLink href={selectedWorkSection.footLink.href}>
            {selectedWorkSection.footLink.label}
          </TextLink>
        </div>
      </div>
    </section>
  );
}
