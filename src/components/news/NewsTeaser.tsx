import Link from "next/link";
import { AmbientLayer } from "@/components/motion/AmbientLayer";
import { Arrow } from "@/components/ui/Arrow";
import { Reveal } from "@/components/motion/Reveal";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import { ScrollWords } from "@/components/motion/ScrollWords";
import { formatPostDate, machineDate } from "@/lib/blog/format";
import { getPublishedPosts } from "@/lib/blog/queries";
import { getPublishedNewsletters } from "@/lib/news/queries";
import { NEWS_TEASER_LIMIT } from "@/lib/news/config";
import { newsTeaser } from "@/lib/data/ese-content";

/**
 * The landing page's News & Updates block.
 *
 * Merges the two streams the /news page keeps in separate sections — issues and
 * news items — into one short "most recent, whatever it was" list, which is what
 * a teaser is for.
 *
 * Renders nothing at all when both streams are empty. A section heading over an
 * empty-state paragraph would be the landing page admitting it has no news,
 * which is worse than the section not being there; /news itself still explains
 * the empty case for anyone who goes looking.
 */
export async function NewsTeaser() {
  const [posts, issues] = await Promise.all([
    getPublishedPosts(NEWS_TEASER_LIMIT, "news"),
    getPublishedNewsletters(NEWS_TEASER_LIMIT),
  ]);

  const entries = [
    ...posts.map((post) => ({
      key: `post-${post.id}`,
      kind: "News" as const,
      title: post.title,
      summary: post.excerpt,
      date: post.published_at,
      href: `/news/${post.slug}`,
      external: false,
    })),
    ...issues.map((issue) => ({
      key: `issue-${issue.id}`,
      kind: "Newsletter" as const,
      title: issue.title,
      summary: issue.description,
      date: issue.issue_date,
      href: issue.external_url,
      external: true,
    })),
  ]
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") * -1)
    .slice(0, NEWS_TEASER_LIMIT);

  if (entries.length === 0) return null;

  return (
    <section
      className="news-teaser section-shell"
      aria-labelledby="news-teaser-title"
      data-scroll-theme="paper"
    >
      <AmbientLayer blooms={1} marks />

      <div className="news-teaser__grid">
        <Reveal className="news-teaser__heading" variant="rule">
          <p className="section-label">08 — {newsTeaser.eyebrow}</p>
          <ScrollWords as="h2" id="news-teaser-title" text={newsTeaser.heading} />
          <Link className="text-link" href={newsTeaser.cta.href}>
            {newsTeaser.cta.label} <Arrow />
          </Link>
        </Reveal>

        <Reveal className="news-teaser__media" delay={140}>
          <figure className="photo-frame">
            <ParallaxImage
              src={newsTeaser.image.src}
              alt={newsTeaser.image.alt}
              sizes="(min-width: 960px) 34vw, 90vw"
              intensity="soft"
              zoom="in"
            />
          </figure>
        </Reveal>
      </div>

      <ol className="news-teaser__list">
        {entries.map((entry, index) => {
          const formatted = formatPostDate(entry.date);

          return (
            <Reveal as="li" key={entry.key} delay={index * 80}>
              <p className="news-teaser__meta">
                {entry.kind}
                {formatted ? (
                  <>
                    {" — "}
                    <time dateTime={machineDate(entry.date)}>{formatted}</time>
                  </>
                ) : null}
              </p>
              <h3>{entry.title}</h3>
              <p>{entry.summary}</p>
              {entry.external ? (
                <a
                  className="text-link"
                  href={entry.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    Read this issue
                    <span className="visually-hidden">
                      {`: ${entry.title} (opens in a new tab)`}
                    </span>
                  </span>
                  <Arrow />
                </a>
              ) : (
                <Link className="text-link" href={entry.href}>
                  <span>
                    Read more
                    <span className="visually-hidden">{`: ${entry.title}`}</span>
                  </span>
                  <Arrow />
                </Link>
              )}
            </Reveal>
          );
        })}
      </ol>
    </section>
  );
}
