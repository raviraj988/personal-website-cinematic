import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/blog/config";

/**
 * Metadata for a standalone page.
 *
 * One helper rather than four hand-written blocks: these pages are siblings in
 * the navigation, and the usual way canonical URLs and card images drift is by
 * being retyped once per page.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = "/images/ese/conference-session.webp",
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", title, description, url: path },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(image)],
    },
  };
}
