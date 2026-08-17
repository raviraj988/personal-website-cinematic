import { ese } from "@/lib/data/ese-content";
import { SITE_ORIGIN, absoluteUrl, postUrl } from "@/lib/blog/config";
import type { PostRow } from "@/lib/supabase/database.types";

const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;

/**
 * `BlogPosting` structured data for one post.
 *
 * Every `@id` used here is also declared here, so the graph resolves without a
 * crawler having to have fetched the homepage first. The `@id` matches the
 * site-wide node in `components/seo/StructuredData.tsx`, so the Organization is
 * one entity across the site rather than a new one per page.
 *
 * ESE is both `author` and `publisher`. The posts table carries an `author_id`
 * but this component never resolves it to a name, and the console has more than
 * one admin — so naming any individual would be a guess. The organization
 * published it, which is a claim that stays true whoever wrote it.
 *
 * Fields with no data are **omitted**, never filled with a placeholder. A
 * `dateModified` of "now" or an `image` pointing at the site's generic OG picture
 * would both be assertions we cannot back up, and structured data that lies is
 * worse than structured data that is quiet.
 */
export function BlogPostingJsonLd({
  post,
  path,
}: {
  post: PostRow;
  /**
   * Site-relative path this post is being rendered at. News items live under
   * `/news/`, so without this the graph would name a `/blog/` URL that 404s and
   * point `mainEntityOfPage` at the wrong page.
   */
  path?: string;
}) {
  const url = path ? absoluteUrl(path) : postUrl(post.slug);

  const organization = {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: ese.name,
    alternateName: ese.abbreviation,
    url: `${SITE_ORIGIN}/`,
  };

  const blogPosting = {
    "@type": "BlogPosting",
    "@id": `${url}#post`,
    headline: post.title,
    description: post.seo_description ?? post.excerpt,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    // `published_at` is guaranteed present on a published row by
    // `posts_published_has_timestamp`, but this component is also rendered from
    // the admin preview, where a draft has none.
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    dateModified: post.updated_at,
    // No cover means no `image`. The OG tags fall back to a site-wide picture
    // because a link preview needs *something*; a schema.org `image` is a claim
    // about this article, and a generic photograph is not one.
    ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en",
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [organization, blogPosting],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(graph) }}
    />
  );
}

/**
 * Serialise for embedding inside a `<script>` element.
 *
 * `JSON.stringify` escapes quotes and backslashes but leaves `<` alone, so a post
 * whose title contained `</script>` would close this element early and drop the
 * rest of the post's metadata into the document as live markup. Post rows arrive
 * over PostgREST — some of them written by an AI drafting tool — so that string is
 * fully reachable input, not a hypothetical.
 *
 * `<` is a valid JSON escape and parses back to `<`, so the structured data
 * is unchanged for anything reading it as JSON.
 */
function serialize(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
