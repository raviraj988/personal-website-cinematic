import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isMcpOAuthEnabled } from "@/lib/mcp-auth/config";

export const metadata: Metadata = {
  title: "Authorization failed",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ message?: string }> };

/**
 * Where an authorization request lands when it cannot safely be redirected.
 *
 * This page exists because of RFC 6749 §4.1.2.1: when `client_id` or
 * `redirect_uri` is bad, the server must not redirect anywhere. The redirect URI
 * is exactly what cannot be trusted in that case, so sending the error back to it
 * would forward the failure — and, in a slightly different flow, an authorization
 * code — to whoever supplied it. So the error stops here, on our own origin.
 *
 * The message is rendered as text, never as a link or markup. It comes from a
 * query parameter, and a message that could become a link is a phishing vector on
 * a page that a person has arrived at expecting to grant access to something.
 */
export default async function AuthorizeErrorPage({ searchParams }: PageProps) {
  if (!isMcpOAuthEnabled()) notFound();

  const { message } = await searchParams;

  return (
    <main id="main-content" className="admin-gate">
      <div className="admin-gate__panel">
        <p className="section-label">Authorize</p>
        <h1>Authorization failed</h1>
        <p className="admin-notice admin-notice--error" role="alert">
          {message?.trim() || "The authorization request could not be processed."}
        </p>
        <p className="admin-hint">
          Nothing was granted. This request was stopped before any permission was
          issued, because the application that sent it could not be verified —
          usually an unregistered client, or a redirect address that does not match
          the one it registered.
        </p>
        <p className="admin-hint">
          Start the connection again from the application you are trying to link.
          If it keeps failing, the client needs to re-register.
        </p>

        <div className="admin-actions">
          <Link className="admin-button admin-button--quiet" href="/admin">
            Back to the console
          </Link>
        </div>
      </div>
    </main>
  );
}
