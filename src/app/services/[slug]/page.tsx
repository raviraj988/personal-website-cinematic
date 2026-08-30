import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SkipLink } from "@/components/layout/SkipLink";
import { CinematicHeader } from "@/components/navigation/CinematicHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import { Arrow } from "@/components/ui/Arrow";
import { ese } from "@/lib/data/ese-content";
import { SITE_ORIGIN, absoluteUrl } from "@/lib/blog/config";
import "@/styles/blog.css";
import "@/styles/services.css";

type PageProps = { params: Promise<{ slug: string }> };

const findService = (slug: string) =>
  ese.services.items.find((service) => service.slug === slug);

/**
 * One page per service area. Five slugs, all known at build time, so all five
 * prerender and an unknown slug is a genuine 404 rather than a rendered shell.
 */
export function generateStaticParams() {
  return ese.services.items.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = findService(slug);

  if (!service) {
    return { title: "Service not found", robots: { index: false, follow: false } };
  }

  const canonical = `/services/${service.slug}`;

  return {
    title: service.title,
    // The document's own description, which is already a summary of the service.
    description: service.description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: `${service.title} | ${ese.abbreviation}`,
      description: service.description,
      url: canonical,
      images: [{ url: service.image.src, alt: service.image.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${service.title} | ${ese.abbreviation}`,
      description: service.description,
      images: [absoluteUrl(service.image.src)],
    },
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const service = findService(slug);

  if (!service) notFound();

  const page = ese.servicePage;
  const index = ese.services.items.findIndex((item) => item.slug === service.slug);
  const isTechnical = service.slug === "project-implementation";

  /**
   * `Service` structured data, with `provider` pointing at the site-wide
   * Organization by `@id`. `areaServed` and `offers` are omitted rather than
   * guessed: the document states neither a geography nor a price.
   */
  const graph = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_ORIGIN}/services/${service.slug}#service`,
    name: service.title,
    description: service.description,
    url: absoluteUrl(`/services/${service.slug}`),
    provider: { "@id": `${SITE_ORIGIN}/#organization` },
    audience: ese.whoWeServe.audiences.map((audience) => ({
      "@type": "Audience",
      audienceType: audience.name,
    })),
  };

  return (
    <>
      <SkipLink />
      <CinematicHeader solid />
      <div className="page-grain" aria-hidden="true" />

      <script
        type="application/ld+json"
        // Serialised from a local object literal; `<` is escaped so a title
        // containing `</script>` could not close this element early.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
        }}
      />

      <main id="main-content" className="blog-main">
        <article className="service-page section-shell">
          <header className="service-page__header">
            <p className="section-label">
              {String(index + 1).padStart(2, "0")} — {page.eyebrow}
            </p>
            <h1 className="service-page__title">{service.title}</h1>
            <p className="service-page__lede">{service.description}</p>
          </header>

          <figure className="service-page__media photo-frame photo-frame--plate">
            <ParallaxImage
              src={service.image.src}
              alt={service.image.alt}
              sizes="(min-width: 1200px) 1100px, 100vw"
              intensity="soft"
            />
          </figure>

          <div className="service-page__body">
            <section aria-labelledby="covers-heading">
              <h2 id="covers-heading" className="service-page__heading">
                {page.coversHeading}
              </h2>
              <ul className="service-page__covers">
                {service.covers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            {isTechnical ? (
              <section className="service-page__related" aria-labelledby="related-heading">
                <p className="section-label">{ese.caseStudy.eyebrow}</p>
                <h2 id="related-heading" className="service-page__heading">
                  {ese.caseStudy.label}
                </h2>
                <p>{ese.caseStudy.body}</p>
                <p className="service-page__status">{ese.caseStudy.status}</p>
              </section>
            ) : null}

            <section aria-labelledby="audience-heading">
              <h2 id="audience-heading" className="service-page__heading">
                {page.audienceHeading}
              </h2>
              <ul className="service-page__audiences">
                {ese.whoWeServe.audiences.map((audience) => (
                  <li key={audience.name}>{audience.name}</li>
                ))}
              </ul>
            </section>

            {/*
              A stated gap, not an omission. What a project involves and what a
              client receives are absent from the source document and are not
              inferable — see the note on `servicePage` in ese-content.ts.
            */}
            <section className="service-page__pending" aria-labelledby="pending-heading">
              <h2 id="pending-heading" className="service-page__heading">
                {page.awaitingHeading}
              </h2>
              <p>{page.awaiting}</p>
            </section>

            <aside className="service-page__scholarship">
              <p>{page.scholarshipNote}</p>
              <Link className="text-link" href={page.scholarshipCta.href}>
                <span>{page.scholarshipCta.label}</span>
                <Arrow />
              </Link>
            </aside>

            <div className="service-page__actions">
              <Link className="button" href={page.contactCta.href}>
                {page.contactCta.label} <Arrow />
              </Link>
              <Link className="text-link" href={page.backCta.href}>
                <span>{page.backCta.label}</span>
                <Arrow direction="left" />
              </Link>
            </div>
          </div>
        </article>
      </main>

      <BlogFooter />
    </>
  );
}
