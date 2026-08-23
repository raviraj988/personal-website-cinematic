import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getViewer } from "@/lib/blog/auth";

export const metadata: Metadata = { title: "Sign in" };

type PageProps = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: PageProps) {
  // Already signed in and admitted — no reason to show a sign-in form.
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  if (viewer?.profile) redirect("/admin");

  return (
    <main id="main-content" className="admin-gate">
      <div className="admin-gate__panel">
        <p className="section-label">ESE</p>
        <h1>Admin console</h1>
        <p className="admin-gate__lede">
          Sign in to write, edit, and publish posts and newsletters.
        </p>
        <LoginForm error={params.error} />
      </div>
    </main>
  );
}
