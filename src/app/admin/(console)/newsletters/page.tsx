import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/blog/auth";
import { getAllNewslettersForAdmin } from "@/lib/news/queries";
import { formatShortDate } from "@/lib/blog/format";

export const metadata: Metadata = { title: "Newsletters" };

type PageProps = {
  searchParams: Promise<{ deleted?: string; error?: string }>;
};

export default async function AdminNewslettersPage({ searchParams }: PageProps) {
  // The gate is here, in the page — not in the layout. See the note in
  // `lib/blog/auth.ts`.
  await requireAdmin();

  const [issues, params] = await Promise.all([
    getAllNewslettersForAdmin(),
    searchParams,
  ]);

  const drafts = issues.filter((issue) => issue.status === "draft").length;

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <p className="section-label">News &amp; Updates</p>
          <h1>Newsletter issues</h1>
          <p className="admin-page__lede">
            {issues.length === 0
              ? "No issues yet."
              : `${issues.length} issue${issues.length === 1 ? "" : "s"}${
                  drafts > 0 ? ` · ${drafts} draft${drafts === 1 ? "" : "s"}` : ""
                }`}
          </p>
        </div>
        <Link
          className="admin-button admin-button--primary"
          href="/admin/newsletters/new"
        >
          Add an issue
        </Link>
      </header>

      {params.deleted ? (
        <p className="admin-notice admin-notice--success" role="status">
          The issue was deleted.
        </p>
      ) : null}

      {params.error === "missing" ? (
        <p className="admin-notice admin-notice--error" role="alert">
          That issue no longer exists.
        </p>
      ) : null}

      {issues.length === 0 ? (
        <p className="admin-empty">
          Nothing here yet. Add the first issue — you will need its public link
          and a cover image.
        </p>
      ) : (
        <ul className="admin-list">
          {issues.map((issue) => (
            <li key={issue.id} className="admin-list__row">
              <div className="admin-list__main">
                <div className="admin-list__badges">
                  <span
                    className={`admin-chip admin-chip--${
                      issue.status === "published" ? "published" : "draft"
                    }`}
                  >
                    {issue.status === "published" ? "Published" : "Draft"}
                  </span>
                </div>
                <h2>
                  <Link href={`/admin/newsletters/${issue.id}`}>{issue.title}</Link>
                </h2>
                <p className="admin-list__excerpt">{issue.description}</p>
              </div>

              <dl className="admin-list__meta">
                <div>
                  <dt>Issue date</dt>
                  <dd>{formatShortDate(issue.issue_date) ?? "—"}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatShortDate(issue.updated_at) ?? "—"}</dd>
                </div>
              </dl>

              <div className="admin-list__actions">
                <Link
                  className="admin-button"
                  href={`/admin/newsletters/${issue.id}`}
                >
                  Edit
                </Link>
                <a
                  className="admin-button admin-button--quiet"
                  href={issue.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open issue
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
