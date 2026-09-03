import type { Metadata, Viewport } from "next";
import { site } from "@/lib/data/ese-content";
import { SEARCH_ENGINE_INDEXING } from "@/lib/blog/config";
import { LoadingCover } from "@/components/motion/LoadingCover";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import "./globals.css";

/**
 * NO WEBFONT LOADER. Every face is ESE's own file, self-hosted from
 * `src/styles/fonts.css` — Morvi, Gotham Book, Marion and Dongra Script.
 *
 * This used to load four substitutes from Google. Anton stood in for Morvi,
 * and measured rather than assumed the difference is real but modest: Morvi's
 * mean cap advance is 0.564 em against Anton's ~0.51, so the real face sets
 * about 10% wider. Enough to explain headings reading squished; not enough to
 * need the type scale re-cut, and the longest heading still wraps to the same
 * number of lines it was designed for.
 *
 * Serving them from this origin also removes a third-party connection from the
 * critical path.
 */



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
     * THE HERO, not the emblem. This was `/brand/og-default.png` — the mark on
     * brand navy — which is correct branding and a poor link preview: a logo on
     * a flat ground tells someone who sent it, not what it is.
     *
     * `og-hero.jpg` is the hero video's own poster frame, cropped from 2560x1440
     * to the 1.905:1 a card wants and carrying the same vignette the hero does,
     * so the preview is the first thing a visitor will actually see. Built by
     * the `og:hero` script in package.json; re-run it if the hero clip changes.
     *
     * Inherited by every route that does not set its own — which is all of them
     * except blog posts, whose `generateMetadata` supplies the post's cover.
     */
    images: [
      {
        url: "/brand/og-hero.jpg",
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
  themeColor: "#081b23",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body>
        {/*
          Both mounted here rather than per-page, and both render no markup of
          their own except the curtain itself.

          The curtain is FIRST in the body so it exists in the server HTML — a
          cover that mounts after hydration is not a cover, it is a flash of the
          page followed by something dropping over it. It removes itself; see the
          three independent guarantees in the component.

          `SmoothScroll` owns the single Lenis instance and the GSAP ticker
          binding for the whole site. It must not be mounted twice.
        */}
        <LoadingCover />
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
