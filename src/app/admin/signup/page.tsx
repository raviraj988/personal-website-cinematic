import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/admin/SignupForm";
import { getViewer } from "@/lib/blog/auth";
import { EseEmblem } from "@/components/brand/EseMark";
import { site } from "@/lib/data/ese-content";

export const metadata: Metadata = { title: "Request access" };

export default async function SignupPage() {
  // Already signed in and admitted — there is nothing here for them.
  const viewer = await getViewer();
  if (viewer?.profile) redirect("/admin");
  if (viewer) redirect("/admin/no-access");

  return (
    <main id="main-content" className="admin-gate">
      <div className="admin-gate__panel">
        <EseEmblem className="admin-gate__mark" label={site.name} />
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
