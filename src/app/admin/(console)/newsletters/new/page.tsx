import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterEditor } from "@/components/admin/NewsletterEditor";
import { requireAdmin } from "@/lib/blog/auth";

export const metadata: Metadata = { title: "Add an issue" };

export default async function NewNewsletterPage() {
  await requireAdmin();

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <p className="section-label">
            <Link href="/admin/newsletters">Newsletters</Link>
          </p>
          <h1>Add an issue</h1>
          <p className="admin-page__lede">
            Issues are created as drafts. Publishing is a separate step.
          </p>
        </div>
      </header>

      <NewsletterEditor mode="create" />
    </div>
  );
}
