import Link from "next/link";
import { SkipLink } from "@/components/layout/SkipLink";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { getViewer, viewerName } from "@/lib/blog/auth";
import { BLOG_PATH } from "@/lib/blog/config";
import { NEWS_PATH } from "@/lib/news/config";

/**
 * Console chrome: the bar, the nav, and the main landmark.
 *
 * This is a **presentation** layer and nothing else. It reads the viewer only to
 * print their name and decide whether to show the owner-only link. Every page
 * inside it calls `requireAdmin()` itself, and every Server Action does too,
 * because a layout is not a security boundary — it does not run for action
 * invocations at all.
 *
 * Sign-in and the access-denied page deliberately sit outside this group: neither
 * should render a console nav to somebody who is not in the console.
 */
export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  return (
    <>
      <SkipLink />

      {viewer?.profile ? (
        <header className="admin-bar">
          <div className="admin-bar__brand">
            <Link href="/admin">
              <span>Blog</span>
              <small>Admin console</small>
            </Link>
          </div>

          <nav className="admin-bar__nav" aria-label="Admin navigation">
            <Link href="/admin">Posts</Link>
            <Link href="/admin/newsletters">Newsletters</Link>
            {viewer.profile.role === "owner" ? (
              <Link href="/admin/people">People</Link>
            ) : null}
            <Link href={BLOG_PATH}>View blog</Link>
            <Link href={NEWS_PATH}>View news</Link>
          </nav>

          <div className="admin-bar__viewer">
            <span className="admin-bar__name">{viewerName(viewer)}</span>
            <span className="admin-chip admin-chip--role">{viewer.profile.role}</span>
            <SignOutButton />
          </div>
        </header>
      ) : null}

      <main id="main-content" className="admin-main">
        {children}
      </main>
    </>
  );
}
