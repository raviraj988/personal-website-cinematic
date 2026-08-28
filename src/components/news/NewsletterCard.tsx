import type { CSSProperties } from "react";
import Image from "next/image";
import { Arrow } from "@/components/ui/Arrow";
import { formatPostDate, machineDate } from "@/lib/blog/format";
import type { NewsletterSummary } from "@/lib/news/queries";

/**
 * One newsletter issue.
 *
 * The link leaves the site — issues are hosted wherever they were designed
 * (Canva, a PDF) rather than re-rendered here. `rel="noopener noreferrer"` is
 * required, not decorative: `external_url` is admin-supplied, and without
 * `noopener` the opened page can reach back through `window.opener`.
 *
 * The destination is announced rather than implied. A link that silently jumps
 * to another origin is disorienting with a screen reader and worse on mobile.
 */
export function NewsletterCard({
  issue,
  sizes,
  index = 0,
}: {
  issue: NewsletterSummary;
  sizes: string;
  /**
   * Position in its grid, which becomes the card's stagger step — see the
   * `card-rise` note in `globals.css`. Defaults to 0, so a card rendered on its
   * own simply arrives without a delay.
   */
  index?: number;
}) {
  const issued = formatPostDate(issue.issue_date);

  return (
    <article
      className="newsletter-card"
      style={{ "--i": index } as CSSProperties}
    >
      {issue.cover_image_url ? (
        <div className="newsletter-card__media photo-frame">
          <Image
            src={issue.cover_image_url}
            alt={issue.cover_image_alt ?? ""}
            fill
            sizes={sizes}
          />
        </div>
      ) : null}

      <div className="newsletter-card__body">
        <p className="newsletter-card__meta">
          Newsletter
          {issued ? (
            <>
              {" — "}
              <time dateTime={machineDate(issue.issue_date)}>{issued}</time>
            </>
          ) : null}
        </p>

        <h3>
          <span className="mask-rise">
            <span className="mask-rise__inner">{issue.title}</span>
          </span>
        </h3>

        <p>{issue.description}</p>

        <a
          className="text-link"
          href={issue.external_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>
            Read this issue
            <span className="visually-hidden">
              {`: ${issue.title} (opens in a new tab)`}
            </span>
          </span>
          <Arrow />
        </a>
      </div>
    </article>
  );
}
