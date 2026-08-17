import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostArticle } from "@/components/blog/PostArticle";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/blog/auth";
import { getPostForAdmin } from "@/lib/blog/queries";
import { BLOG_PATH } from "@/lib/blog/config";
import "@/styles/blog.css";

export const metadata: Metadata = { title: "Preview" };

type PageProps = { params: Promise<{ id: string }> };

/**
 * Admin-only preview of a post at any status.
 *
 * It renders `PostArticle` — the exact component the live route at
 * `/blog/[slug]` renders — and imports the same `blog.css`. Nothing about the
 * article is re-implemented here, so preview and production cannot drift: the only
 * difference between this page and the live one is the bar at the top and the
 * chrome around it.
 *
 * This route is not in the sitemap, is `noindex` through the admin layout, and is
 * disallowed in robots.txt along with the rest of `/admin`.
 */
export default async function PreviewPostPage({ params }: PageProps) {
  await requireAdmin();

  const { id } = await params;
  const post = await getPostForAdmin(id);

  if (!post) notFound();

  return (
    <div className="admin-preview-page">
      <div className="admin-preview-page__bar">
        <div>
          <p className="section-label">Preview</p>
          <p className="admin-preview-page__note">
            Exactly what the live page renders. Not indexed, not in the sitemap.
          </p>
        </div>
        <div className="admin-preview-page__actions">
          <StatusBadge post={post} />
          <Link className="admin-button" href={`/admin/posts/${post.id}`}>
            Back to editing
          </Link>
          {post.status === "published" ? (
            <Link
              className="admin-button admin-button--quiet"
              href={`${BLOG_PATH}/${post.slug}`}
            >
              View live
            </Link>
          ) : null}
        </div>
      </div>

      <PostArticle post={post} />
    </div>
  );
}
