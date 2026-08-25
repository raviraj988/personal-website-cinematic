import type { Metadata } from "next";

import "@/styles/admin.css";
import "@/styles/oauth.css";

/**
 * Layout for the OAuth consent surface.
 *
 * The consent screen is an admin surface that cannot live under `/admin`: its URL
 * is chosen by the RFC 8414 discovery document, which advertises
 * `<origin>/oauth/authorize`, and clients construct that URL themselves. So it
 * borrows the admin console's stylesheet and the `.admin` wrapper the styles are
 * scoped to, rather than duplicating either.
 *
 * `noindex` for the same reason as `/admin`, plus one specific to here: the URL
 * carries an authorization request, and an indexed consent screen is a phishing
 * template with our domain on it.
 *
 * No `supabaseConfigured()` panel like the admin layout's. A misconfigured
 * deployment must not answer a *protocol* endpoint with a human setup page —
 * `/oauth/register` and `/oauth/token` return OAuth-shaped errors instead, and the
 * consent page cannot be reached without a client row that only a working database
 * could hold.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Authorize", template: "%s | Authorize" },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function OAuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}
