import Link from "next/link";
import { SkipLink } from "@/components/layout/SkipLink";
import { CinematicHeader } from "@/components/navigation/CinematicHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { PageHero } from "@/components/layout/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { Arrow } from "@/components/ui/Arrow";
import { contact, ese } from "@/lib/data/ese-content";
import { pageMetadata } from "@/lib/page-meta";
import "@/styles/blog.css";

export const metadata = pageMetadata({
  title: "Contact",
  description: contact.copy,
  path: "/contact",
});

/**
 * Contact.
 *
 * TODO(ese): `contact.email` is still `replace-before-launch@example.com`. It is
 * rendered as written rather than hidden, because a visible placeholder gets
 * fixed and a quietly omitted one ships — this page is now the primary route to
 * ESE from the navigation, so the wrong address here is the most expensive
 * placeholder on the site.
 */
export default function ContactPage() {
  return (
    <>
      <SkipLink />
      <CinematicHeader solid />
      <div className="page-grain" aria-hidden="true" />

      <main id="main-content">
        <PageHero eyebrow={contact.eyebrow} heading={contact.heading} lede={contact.copy} />

        <div className="page-body">
          <div className="page-body__inner">
            <Reveal className="page-section">
              <h2 className="page-section__heading">By email</h2>
              <p className="page-lede">
                <a className="contact-page__email" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </p>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.scholarship.eyebrow}</h2>
              <p className="page-prose">{ese.scholarship.body}</p>
            </Reveal>

            <Reveal className="page-section">
              <h2 className="page-section__heading">{ese.becomePartner.eyebrow}</h2>
              <p className="page-prose">{ese.becomePartner.body}</p>
              <Link className="button" href="/who-we-are">
                Who we are <Arrow />
              </Link>
            </Reveal>
          </div>
        </div>
      </main>

      <BlogFooter />
    </>
  );
}
