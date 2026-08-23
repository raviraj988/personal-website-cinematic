import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/admin/SignupForm";
import { getViewer } from "@/lib/blog/auth";

export const metadata: Metadata = { title: "Request access" };

export default async function SignupPage() {
  // Already signed in and admitted — there is nothing here for them.
  const viewer = await getViewer();
  if (viewer?.profile) redirect("/admin");
  if (viewer) redirect("/admin/no-access");

  return (
    <main id="main-content" className="admin-gate">
      <div className="admin-gate__panel">
        <p className="section-label">ESE</p>
        <h1>Request access</h1>
        <p className="admin-gate__lede">
          Create an account for the ESE console. An owner grants access
          separately — an account on its own can see nothing.
        </p>
        <SignupForm />
      </div>
    </main>
  );
}
