import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getViewer } from "@/lib/blog/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // Already signed in and admitted — no reason to show a sign-in form.
  const viewer = await getViewer();
  if (viewer?.profile) redirect("/admin");

  return (
    <main id="main-content" className="admin-gate">
      <div className="admin-gate__panel">
        <p className="section-label">Blog</p>
        <h1>Admin console</h1>
        <p className="admin-gate__lede">
          Sign in to write, edit, and publish blog posts.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
