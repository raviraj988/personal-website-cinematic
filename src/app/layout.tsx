import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import { site } from "@/lib/data/ese-content";
import { SEARCH_ENGINE_INDEXING } from "@/lib/blog/config";
import "./globals.css";

/**
 * Fonts via next/font — spec §5.2. Two families, self-hosted at build time and
 * subset to Latin.
 *
 * Newsreader is the display face the spec names first (§2.2). It carries more
 * stroke contrast and finer serifs than Source Serif 4, which reads closer to
 * documentation than to the art-directed publication this is meant to be. The
 * italic is loaded for editorial emphasis.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.canonicalBase),
  title: {
    default: site.homepageTitle,
    template: `%s | ${site.name}`,
  },
  description: site.metaDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: site.homepageTitle,
    description: site.metaDescription,
    siteName: site.name,
    locale: "en_US",
    url: "/",
    /**
     * The emblem on brand navy, composited by `scripts/prepare-brand.mjs`.
     *
     * Inherited by every route that does not set its own — which is all of them
     * except blog posts, whose `generateMetadata` supplies the post's cover.
     */
    images: [
      {
        url: "/brand/og-default.png",
        width: 1200,
        height: 630,
        alt: site.name,
      },
    ],
  },
  /**
   * Twitter reads `openGraph.images` when no `twitter.images` is given, but not
   * the card type — without this it renders the 1200x630 card as a small square
   * thumbnail beside the text instead of a full-width image.
   */
  twitter: { card: "summary_large_image" },
  robots: {
    /**
     * One switch for the whole site, shared with `app/robots.ts` so the meta tag
     * and robots.txt can never disagree. Flip `SEARCH_ENGINE_INDEXING` in
     * `lib/blog/config.ts` once the domain and content are approved. The admin
     * console overrides this back to `noindex` in its own layout regardless.
     */
    index: SEARCH_ENGINE_INDEXING,
    follow: SEARCH_ENGINE_INDEXING,
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f5ec",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
