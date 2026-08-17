import { isFuture } from "@/lib/blog/format";
import type { PostRow } from "@/lib/supabase/database.types";

/**
 * The status of a post at a glance.
 *
 * "Scheduled" is not a value in the `status` column — a post with
 * `status = 'published'` and a future `published_at` is invisible to the public
 * because both the RLS policy and the public query require
 * `published_at <= now()`. Without this label the admin list would show it as
 * "Published" while every reader got a 404, which is the kind of discrepancy that
 * costs an afternoon.
 */
export function StatusBadge({ post }: { post: Pick<PostRow, "status" | "published_at"> }) {
  if (post.status === "published" && isFuture(post.published_at)) {
    return <span className="admin-chip admin-chip--scheduled">Scheduled</span>;
  }

  if (post.status === "published") {
    return <span className="admin-chip admin-chip--live">Published</span>;
  }

  return <span className="admin-chip admin-chip--draft">Draft</span>;
}

/**
 * Provenance badge, driven by the `source` column.
 *
 * The whole point of `source` is that a human can see at a glance which drafts
 * arrived from the external drafting tool and therefore have not been read by
 * anyone yet.
 */
export function SourceBadge({ source }: { source: PostRow["source"] }) {
  if (source !== "ai-assisted") return null;

  return (
    <span className="admin-chip admin-chip--ai" title="Drafted by the external writing tool">
      AI-assisted
    </span>
  );
}
