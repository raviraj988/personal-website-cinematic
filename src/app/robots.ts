import type { MetadataRoute } from "next";
import { site } from "@/lib/data/site-content";

/**
 * Spec §23. The design preview is closed to crawlers; change `disallow` to "" and
 * flip `robots.index` in the root layout once content and domain are approved.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
    sitemap: `${site.canonicalBase}/sitemap.xml`,
  };
}
