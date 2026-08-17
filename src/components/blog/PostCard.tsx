import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui/Arrow";
import { formatPostDate, machineDate } from "@/lib/blog/format";
import { readingTimeLabel } from "@/lib/blog/reading-time";
import type { PostSummary } from "@/lib/blog/queries";

/**
 * One entry in the blog index.
 *
 * Built on the site's existing `work-card` language — paper card, hairline
 * border, clay meta line, masked heading rise — so the journal reads as part of
 * the same publication rather than a bolted-on CMS.
 */
export function PostCard({
  post,
  sizes,
  basePath = "/blog",
  actionLabel = "Read the post",
}: {
  post: PostSummary;
  sizes: string;
  /** `/blog` or `/news` — the two routes that render posts. */
  basePath?: string;
  actionLabel?: string;
}) {
  const published = formatPostDate(post.published_at);

  return (
    <article className="work-card post-card">
      {post.cover_image_url ? (
        <div className="work-card__media">
          <Image
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? ""}
            fill
            sizes={sizes}
          />
        </div>
      ) : null}

      <div className="work-card__body">
        <p className="work-card__meta">
          {published ? (
            <time dateTime={machineDate(post.published_at)}>{published}</time>
          ) : null}
          {published ? " — " : ""}
          {readingTimeLabel(post.content)}
        </p>

        <h3>
          <span className="mask-rise">
            <span className="mask-rise__inner">{post.title}</span>
          </span>
        </h3>

        <p>{post.excerpt}</p>

        <Link className="text-link" href={`${basePath}/${post.slug}`}>
          <span>
            {actionLabel}
            {/* Keeps the link unambiguous in a screen reader's links list, where
                twelve identical "Read the post" entries are useless. */}
            <span className="visually-hidden">{`: ${post.title}`}</span>
          </span>
          <Arrow />
        </Link>
      </div>
    </article>
  );
}
