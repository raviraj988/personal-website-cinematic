import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsletterEditor } from "@/components/admin/NewsletterEditor";
import {
  DeleteNewsletterForm,
  NewsletterPublishControls,
} from "@/components/admin/NewsletterControls";
import { requireAdmin } from "@/lib/blog/auth";
import { getNewsletterForAdmin } from "@/lib/news/queries";
import { NEWS_PATH } from "@/lib/news/config";

export const metadata: Metadata = { title: "Edit issue" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    published?: string;
    unpublished?: string;
    error?: string;
  }>;
};

export default async function EditNewsletterPage({
  params,
  searchParams,
}: PageProps) {
  await requireAdmin();

  const [{ id }, flags] = await Promise.all([params, searchParams]);
  const issue = await getNewsletterForAdmin(id);

  if (!issue) notFound();

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <p className="section-label">
            <Link href="/admin/newsletters">Newsletters</Link> — Edit
          </p>
          <h1>{issue.title}</h1>
          <div className="admin-list__badges">
            <span
              className={`admin-chip admin-chip--${
                issue.status === "published" ? "published" : "draft"
              }`}
            >
              {issue.status === "published" ? "Published" : "Draft"}
            </span>
          </div>
        </div>

        <div className="admin-page__aside">
          <a
            className="admin-button admin-button--quiet"
            href={issue.external_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open issue
          </a>
        </div>
      </header>

      {flags.created ? (
        <p className="admin-notice admin-notice--success" role="status">
          Issue created. It is not listed on /news until you publish it.
        </p>
      ) : null}

      {flags.published ? (
        <p className="admin-notice admin-notice--success" role="status">
          Published. <Link href={NEWS_PATH}>See it on News &amp; Updates</Link>.
        </p>
      ) : null}

      {flags.unpublished ? (
        <p className="admin-notice admin-notice--success" role="status">
          Unpublished. It no longer appears on /news.
        </p>
      ) : null}

      {flags.error ? (
        <p className="admin-notice admin-notice--error" role="alert">
          {flags.error}
        </p>
      ) : null}

      <section className="admin-section" aria-labelledby="publish-heading">
        <h2 id="publish-heading" className="admin-section__heading">
          Publication
        </h2>
        <NewsletterPublishControls id={issue.id} status={issue.status} />
      </section>

      <NewsletterEditor mode="edit" issue={issue} />

      <DeleteNewsletterForm id={issue.id} slug={issue.slug} />
    </div>
  );
}
