import type { Metadata } from "next";
import Link from "next/link";
import { SkipLink } from "@/components/layout/SkipLink";
import { CinematicHeader } from "@/components/navigation/CinematicHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { PersonCard } from "@/components/people/PersonCard";
import { Arrow } from "@/components/ui/Arrow";
import { ese, people } from "@/lib/data/ese-content";
import { absoluteUrl } from "@/lib/blog/config";
import "@/styles/blog.css";
import "@/styles/people.css";

const TITLE = "People";
const DESCRIPTION =
  "The network behind ESE — environmental engineers, consultants, sustainability organizers, and Tribal and community-focused advocates.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/people" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/people",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [absoluteUrl("/images/ese/conference-session.webp")],
  },
};

/**
 * The people behind ESE.
 *
 * The landing page shows a short card each; this is where the full biographies
 * go. They are not written yet, so every card states that plainly rather than
 * padding the page — see the note on `people` in `lib/data/ese-content.ts` for
 * why an invented biography is the one thing this site will not carry.
 *
 * The page ships regardless, because the structure is what takes time to get
 * right; the copy drops into `people.members[].bio` and needs no code change.
 */
export default function PeoplePage() {
  const pending = people.members.filter((person) => person.bio.length === 0);

  return (
    <>
      <SkipLink />
      <CinematicHeader solid />
      <div className="page-grain" aria-hidden="true" />

      <main id="main-content" className="blog-main">
        <div className="people-page section-shell">
          <header className="people-page__header">
            <p className="section-label">{people.eyebrow}</p>
            <h1 className="people-page__title">{people.heading}</h1>
            {ese.whoWeAre.body.map((paragraph) => (
              <p className="people-page__lede" key={paragraph}>
                {paragraph}
              </p>
            ))}
          </header>

          <div className="people-page__grid">
            {people.members.map((person) => (
              <PersonCard key={person.slug} person={person} headingLevel={2} />
            ))}
          </div>

          {pending.length > 0 ? (
            <p className="people-page__note">
              {pending.length === people.members.length
                ? "Biographies are being finalised and will be published here."
                : "Further biographies are being finalised."}
            </p>
          ) : null}

          <nav className="post__return" aria-label="Page navigation">
            <Link className="text-link" href="/">
              <span>Back to the homepage</span>
              <Arrow direction="left" />
            </Link>
            <Link className="text-link" href="/#contact">
              <span>Contact us</span>
              <Arrow />
            </Link>
          </nav>
        </div>
      </main>

      <BlogFooter />
    </>
  );
}
