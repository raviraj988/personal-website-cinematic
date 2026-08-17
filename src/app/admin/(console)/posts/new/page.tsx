import type { Metadata } from "next";
import Link from "next/link";
import { PostEditor } from "@/components/admin/PostEditor";
import { requireAdmin } from "@/lib/blog/auth";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  await requireAdmin();

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <p className="section-label">
            <Link href="/admin">Posts</Link> — New
          </p>
          <h1>Write a new post</h1>
          <p className="admin-page__lede">
            The slug follows the title until you edit it. Everything is saved as a
            draft; publishing is a separate step on the next screen.
          </p>
        </div>
      </header>

      <PostEditor mode="create" />
    </div>
  );
}
