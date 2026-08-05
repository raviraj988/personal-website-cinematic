import type { MetadataRoute } from "next";
import { site } from "@/lib/data/site-content";

/** Spec §23. Extend as the remaining routes are built. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${site.canonicalBase}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
