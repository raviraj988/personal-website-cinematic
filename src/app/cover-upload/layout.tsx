import type { Metadata } from "next";

import "@/styles/admin.css";
import "@/styles/oauth.css";

/**
 * Layout for the out-of-band cover drop page.
 *
 * The page sits outside both `/admin` and `/oauth`, so neither of their layouts
 * loads its stylesheet. It borrows the admin tokens and the `.admin` wrapper the
 * styles are scoped to, the same way the OAuth consent surface does.
 *
 * `noindex` because the URL is a single-use credential with a fifteen-minute life.
 *
 * No `supabaseConfigured()` gate like the admin layout has: reaching this page at
 * all requires a ticket that only a working database could have issued, so a setup
 * panel here would be unreachable by construction.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function CoverUploadLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}
