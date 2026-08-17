import { ese, people, site } from "@/lib/data/ese-content";

/**
 * Site-wide structured data.
 *
 * The `Organization` is the primary entity — this is ESE's site. Laura is
 * declared as its `founder`, which is the relationship the site actually
 * asserts, and the `WebSite` node points its `about` at ESE rather than at a
 * person.
 *
 * Deliberately minimal beyond that: no ratings, reviews, awards, address, logo,
 * `sameAs`, or `foundingDate`, because none of those are confirmed in the
 * supplied material. Structured data that overstates is worse than structured
 * data that is quiet.
 */
export function StructuredData() {
  /**
   * The Organization's `founder`. Taken from `people.members` rather than a
   * separate export so there is one list of people on the site, and the graph
   * cannot describe someone the page does not show.
   */
  const founderMember =
    people.members.find((member) => /founder/i.test(member.role)) ?? people.members[0];

  const organization = {
    "@type": "Organization",
    "@id": `${site.canonicalBase}/#organization`,
    name: ese.name,
    alternateName: ese.abbreviation,
    description: ese.mission.statement,
    url: `${site.canonicalBase}/`,
    founder: { "@id": `${site.canonicalBase}/#laura-mckelvey` },
  };

  const person = {
    "@type": "Person",
    "@id": `${site.canonicalBase}/#laura-mckelvey`,
    name: founderMember.name,
    // `jobTitle` is inferred from "the driving force behind the business" — see
    // the TODO on `people`. It is the one claim here that is not verbatim from
    // the source material.
    jobTitle: founderMember.role,
    worksFor: { "@id": organization["@id"] },
  };

  const website = {
    "@type": "WebSite",
    "@id": `${site.canonicalBase}/#website`,
    url: `${site.canonicalBase}/`,
    name: site.homepageTitle,
    description: site.metaDescription,
    inLanguage: "en",
    about: { "@id": organization["@id"] },
    publisher: { "@id": organization["@id"] },
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [organization, person, website],
  };

  return (
    <script
      type="application/ld+json"
      // Serialised from a local object literal — no user or CMS input reaches it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
