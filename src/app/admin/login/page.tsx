import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getViewer } from "@/lib/blog/auth";
import { safeReturnTo } from "@/lib/mcp-auth/return-to";
import { EseEmblem } from "@/components/brand/EseMark";
import { site } from "@/lib/data/ese-content";

export const metadata: Metadata = { title: "Sign in" };

type PageProps = { searchParams: Promise<{ error?: string; next?: string }> };

export default async function LoginPage({ searchParams }: PageProps) {
  // Already signed in and admitted — no reason to show a sign-in form.
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);

  // Validated here as well as in the action, so an already-signed-in
  // administrator arriving from a connector lands on the consent screen instead of
  // the dashboard. `safeReturnTo` accepts only `/oauth/authorize` — see its header
  // for why this is not a general return-to parameter.
  const next = safeReturnTo(params.next);

  if (viewer?.profile) redirect(next ?? "/admin");

  return (
    <main id="main-content" className="admin-gate">
      <div className="admin-gate__panel">
        <EseEmblem className="admin-gate__mark" label={site.name} />
        <h1>Admin console</h1>
        <p className="admin-gate__lede">
          Sign in to write, edit, and publish posts and newsletters.
        </p>
        <LoginForm error={params.error} next={next} />
      </div>
    </main>
  );
}
