import type { Metadata } from "next";
import { supabaseConfigured } from "@/lib/supabase/env";
import "@/styles/admin.css";

/**
 * `noindex` for everything under /admin.
 *
 * robots.txt also disallows this path, but robots.txt is a request to
 * well-behaved crawlers and a publicly readable list of the paths you would
 * rather people did not visit. This meta tag is the second layer; the
 * authorization checks in each page and action are the actual one.
 *
 * `nocache` and the explicit `googleBot` block matter because the admin console
 * is the one part of the site where a cached snapshot in a search result would be
 * a genuine disclosure rather than an annoyance.
 */
/**
 * Never prerender anything under /admin.
 *
 * Without this the layout's `supabaseConfigured()` check below runs at **build**
 * time. A build made before the environment variables are available renders the
 * "not connected" panel, Next stores that as the static output, and the console
 * then serves it to everyone for as long as the entry lives — after the variables
 * are set, with no error anywhere to explain it. Verified: the route table listed
 * `/admin`, `/admin/account`, and `/admin/people` as static (`○`) before this.
 *
 * There is no upside to prerendering these in any case. Every page here is
 * per-viewer, authorization-gated, and `noindex`.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Blog admin", template: "%s | Blog admin" },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * Configuration check, not an authorization check.
   *
   * Without credentials every page below would construct a Supabase client, throw
   * on the missing variable, and render a bare 500 — during setup, which is
   * precisely when somebody is here for the first time and least able to guess
   * why. This says what is missing instead.
   *
   * Doing it in the layout is safe because it decides nothing about *who* may be
   * here: the pages and actions still run their own `requireAdmin()`. When
   * credentials are absent there is no session to check anyway.
   */
  if (!supabaseConfigured()) {
    return (
      <div className="admin">
        <main id="main-content" className="admin-gate">
          <div className="admin-gate__panel">
            <p className="section-label">Setup</p>
            <h1>The blog is not connected yet</h1>
            <p className="admin-gate__lede">
              This console needs Supabase credentials before it can do anything.
              The public site works without them — the blog simply has no posts.
            </p>
            <ol className="admin-setup">
              <li>
                Copy <code>.env.local.example</code> to <code>.env.local</code> and
                fill in the project URL, publishable key, and service-role key.
              </li>
              <li>
                Run <code>supabase/migrations/0001_blog_and_admin.sql</code> in the
                Supabase SQL editor.
              </li>
              <li>
                Create the owner account and its <code>profiles</code> row — the
                steps are at the bottom of that migration.
              </li>
              <li>Restart the dev server so the new variables are read.</li>
            </ol>
          </div>
        </main>
      </div>
    );
  }

  return <div className="admin">{children}</div>;
}
