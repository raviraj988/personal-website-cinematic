import { site } from "@/lib/data/site-content";

/**
 * Structured data — spec §23.
 *
 * Deliberately minimal: no ratings, reviews, awards, address, credentials, or
 * affiliations, since none are confirmed. `jobTitle`, `worksFor`, `sameAs`, and
 * `alumniOf` are left out for the same reason.
 */
export function StructuredData() {
  const person = {
    "@type": "Person",
    "@id": `${site.canonicalBase}/#laura-mckelvey`,
    name: site.name,
    description: site.metaDescription,
    url: `${site.canonicalBase}/`,
  };

  const website = {
    "@type": "WebSite",
    "@id": `${site.canonicalBase}/#website`,
    url: `${site.canonicalBase}/`,
    name: site.homepageTitle,
    description: site.metaDescription,
    inLanguage: "en",
    about: { "@id": person["@id"] },
  };

  const graph = { "@context": "https://schema.org", "@graph": [person, website] };

  return (
    <script
      type="application/ld+json"
      // Serialised from a local object literal — no user or CMS input reaches it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
