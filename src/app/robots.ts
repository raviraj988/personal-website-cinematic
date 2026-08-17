import type { MetadataRoute } from "next";
import { site } from "@/lib/data/ese-content";
import { ADMIN_PATH, SEARCH_ENGINE_INDEXING } from "@/lib/blog/config";

/**
 * Spec §23.
 *
 * Two states, one switch. While `SEARCH_ENGINE_INDEXING` is false the whole
 * design preview stays closed to crawlers, matching the `noindex` in the root
 * layout and the publication warning in README.md. Flipping it to true opens the
 * site and leaves exactly one thing disallowed: the admin console.
 *
 * The admin rule is written out in both branches rather than assembled
 * conditionally, so it cannot be lost in a future edit to the open branch. Note
 * that this is only a request to well-behaved crawlers — the admin console is
 * actually protected by its authorization checks and by RLS. The `noindex` in the
 * admin layout is the belt to this braces.
 */
export default function robots(): MetadataRoute.Robots {
  if (!SEARCH_ENGINE_INDEXING) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${site.canonicalBase}/sitemap.xml`,
    };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [`${ADMIN_PATH}/`, ADMIN_PATH] }],
    sitemap: `${site.canonicalBase}/sitemap.xml`,
  };
}
