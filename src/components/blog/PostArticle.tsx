import Image from "next/image";
import { PostBody } from "./PostBody";
import { formatPostDate, machineDate } from "@/lib/blog/format";
import { readingTimeLabel } from "@/lib/blog/reading-time";
import type { PostRow } from "@/lib/supabase/database.types";

/**
 * A whole post, from the eyebrow to the last paragraph.
 *
 * The live route at `/blog/[slug]` and the admin preview at
 * `/admin/posts/[id]/preview` both render *this* component and nothing else, so
 * preview and production cannot drift. If a preview ever looks different from the
 * published page, the bug is in one of the two routes, not in a second copy of
 * the layout — because there is no second copy.
 */
export function PostArticle({ post }: { post: PostRow }) {
  const published = formatPostDate(post.published_at);
  const reading = readingTimeLabel(post.content);

  return (
    <article className="post">
      <header className="post__header">
        <p className="section-label">
          Blog{published ? ` — ${published}` : ""}
        </p>
        <h1 className="post__title">{post.title}</h1>
        <p className="post__standfirst">{post.excerpt}</p>
        <p className="post__meta">
          {post.published_at ? (
            <>
              <time dateTime={machineDate(post.published_at)}>{published}</time>
              <span className="post__meta-sep" aria-hidden="true" />
            </>
          ) : null}
          <span>{reading}</span>
        </p>
      </header>

      {post.cover_image_url ? (
        <figure className="post__cover photo-frame photo-frame--plate">
          <Image
            src={post.cover_image_url}
            // The database refuses a cover without alt text, so this string is
            // guaranteed non-empty by `posts_cover_alt_required`.
            alt={post.cover_image_alt ?? ""}
            fill
            sizes="(min-width: 1200px) 1100px, 100vw"
            priority
          />
        </figure>
      ) : null}

      <div className="post__body-shell">
        <PostBody content={post.content} />
      </div>
    </article>
  );
}
