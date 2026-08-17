import type { Metadata } from "next";
import Link from "next/link";
import { SourceBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/blog/auth";
import { getAllPostsForAdmin } from "@/lib/blog/queries";
import { formatShortDate } from "@/lib/blog/format";
import { BLOG_PATH } from "@/lib/blog/config";

export const metadata: Metadata = { title: "Posts" };

type PageProps = {
  searchParams: Promise<{ deleted?: string; denied?: string; error?: string }>;
};

export default async function AdminPostsPage({ searchParams }: PageProps) {
  // The gate is here, in the page — not in the layout. See the note in
  // `lib/blog/auth.ts`.
  await requireAdmin();

  const [posts, params] = await Promise.all([getAllPostsForAdmin(), searchParams]);

  const aiDrafts = posts.filter(
    (post) => post.source === "ai-assisted" && post.status === "draft",
  ).length;

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <p className="section-label">Blog</p>
          <h1>Posts</h1>
          <p className="admin-page__lede">
            {posts.length === 0
              ? "No posts yet."
              : `${posts.length} post${posts.length === 1 ? "" : "s"}${
                  aiDrafts > 0
                    ? ` · ${aiDrafts} AI-assisted draft${aiDrafts === 1 ? "" : "s"} awaiting review`
                    : ""
                }`}
          </p>
        </div>
        <Link className="admin-button admin-button--primary" href="/admin/posts/new">
          Write a new post
        </Link>
      </header>

      {params.denied === "owner-only" ? (
        <p className="admin-notice admin-notice--error" role="alert">
          That page is owner-only.
        </p>
      ) : null}

      {params.deleted ? (
        <p className="admin-notice admin-notice--success" role="status">
          The post was deleted.
        </p>
      ) : null}

      {params.error === "missing" ? (
        <p className="admin-notice admin-notice--error" role="alert">
          That post no longer exists.
        </p>
      ) : null}

      {posts.length === 0 ? (
        <p className="admin-empty">
          Nothing here yet. Write the first post, or wait for the drafting tool to
          add one.
        </p>
      ) : (
        <ul className="admin-list">
          {posts.map((post) => (
            <li key={post.id} className="admin-list__row">
              <div className="admin-list__main">
                <div className="admin-list__badges">
                  <StatusBadge post={post} />
                  <SourceBadge source={post.source} />
                </div>
                <h2>
                  <Link href={`/admin/posts/${post.id}`}>{post.title}</Link>
                </h2>
                <p className="admin-list__excerpt">{post.excerpt}</p>
              </div>

              <dl className="admin-list__meta">
                <div>
                  <dt>Slug</dt>
                  <dd>
                    <code>{post.slug}</code>
                  </dd>
                </div>
                <div>
                  <dt>Published</dt>
                  <dd>{formatShortDate(post.published_at) ?? "—"}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatShortDate(post.updated_at) ?? "—"}</dd>
                </div>
              </dl>

              <div className="admin-list__actions">
                <Link className="admin-button" href={`/admin/posts/${post.id}`}>
                  Edit
                </Link>
                {post.status === "published" ? (
                  <Link className="admin-button admin-button--quiet" href={`${BLOG_PATH}/${post.slug}`}>
                    View live
                  </Link>
                ) : (
                  <Link
                    className="admin-button admin-button--quiet"
                    href={`/admin/posts/${post.id}/preview`}
                  >
                    Preview
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
