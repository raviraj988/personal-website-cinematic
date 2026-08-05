import type { Metadata } from "next";
import { SkipLink } from "@/components/layout/SkipLink";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { TextLink } from "@/components/ui/TextLink";
import { primaryNavigation } from "@/lib/data/site-content";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/** Custom 404 — spec §17. Same visual language as the rest of the site. */
export default function NotFound() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main-content">
        <section className="section" aria-labelledby="not-found-heading">
          <div className="container container--reading">
            <p className="eyebrow">Error 404</p>
            <h1 id="not-found-heading" className="section-heading">
              That page could not be found
            </h1>
            <p className="section-lede">
              The address may have changed, or the page may never have existed.
              Nothing has gone wrong on your end.
            </p>

            <div className="button-row" style={{ marginTop: "var(--space-8)" }}>
              <ButtonLink href="/" variant="primary">
                Go to the homepage
              </ButtonLink>
            </div>

            <ul
              style={{
                marginTop: "var(--space-12)",
                paddingTop: "var(--space-6)",
                borderTop: "1px solid var(--border-hairline)",
                display: "grid",
                gap: "var(--space-3)",
              }}
            >
              {primaryNavigation.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <TextLink href={item.href}>{item.label}</TextLink>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
