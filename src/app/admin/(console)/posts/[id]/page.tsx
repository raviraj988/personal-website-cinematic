import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { PublishControls } from "@/components/admin/PublishControls";
import { DeletePostForm } from "@/components/admin/DeletePostForm";
import { SourceBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/blog/auth";
import { getPostForAdmin } from "@/lib/blog/queries";
import { isFuture } from "@/lib/blog/format";
import { BLOG_PATH } from "@/lib/blog/config";

export const metadata: Metadata = { title: "Edit post" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    published?: string;
    unpublished?: string;
    error?: string;
  }>;
};

export default async function EditPostPage({ params, searchParams }: PageProps) {
  await requireAdmin();

  const [{ id }, flags] = await Promise.all([params, searchParams]);
  const post = await getPostForAdmin(id);

  if (!post) notFound();

  const scheduled = post.status === "published" && isFuture(post.published_at);

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <p className="section-label">
            <Link href="/admin">Posts</Link> — Edit
          </p>
          <h1>{post.title}</h1>
          <div className="admin-list__badges">
            <StatusBadge post={post} />
            <SourceBadge source={post.source} />
          </div>
        </div>

        <div className="admin-page__aside">
          <Link
            className="admin-button admin-button--quiet"
            href={`/admin/posts/${post.id}/preview`}
          >
            Preview
          </Link>
          {post.status === "published" && !scheduled ? (
            <Link
              className="admin-button admin-button--quiet"
              href={`${BLOG_PATH}/${post.slug}`}
            >
              View live
            </Link>
          ) : null}
        </div>
      </header>

      {flags.created ? (
        <p className="admin-notice admin-notice--success" role="status">
          Draft created. It is not visible on the blog until you publish it.
        </p>
      ) : null}

      {flags.published ? (
        <p className="admin-notice admin-notice--success" role="status">
          Published. <Link href={`${BLOG_PATH}/${post.slug}`}>View it live</Link>.
        </p>
      ) : null}

      {flags.unpublished ? (
        <p className="admin-notice admin-notice--success" role="status">
          Unpublished. The public URL now returns a 404.
        </p>
      ) : null}

      {flags.error ? (
        <p className="admin-notice admin-notice--error" role="alert">
          {flags.error}
        </p>
      ) : null}

      {scheduled ? (
        <p className="admin-notice" role="status">
          This post is marked published with a future date, so it is not visible
          yet. It will appear on the blog automatically — within an hour of the
          date passing, which is how often the public pages rebuild.
        </p>
      ) : null}

      {post.source === "ai-assisted" && post.status === "draft" ? (
        <p className="admin-notice" role="status">
          This draft came from the external writing tool. Nothing it produces is
          ever published automatically — read it through before you publish.
        </p>
      ) : null}

      <section className="admin-section" aria-labelledby="publish-heading">
        <h2 id="publish-heading" className="admin-section__heading">
          Publication
        </h2>
        <PublishControls
          id={post.id}
          status={post.status}
          publishedAt={post.published_at}
        />
      </section>

      <PostEditor mode="edit" post={post} />

      <DeletePostForm id={post.id} slug={post.slug} />
    </div>
  );
}
