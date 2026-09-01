import type { Metadata, Viewport } from "next";
import { Anton, Caveat, Montserrat, Newsreader } from "next/font/google";
import { site } from "@/lib/data/ese-content";
import { SEARCH_ENGINE_INDEXING } from "@/lib/blog/config";
import { LoadingCover } from "@/components/motion/LoadingCover";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import "./globals.css";

/**
 * Fonts via next/font — self-hosted at build time and subset to Latin.
 *
 * THESE ARE STAND-INS. The brand kit (`ref_docs/brand/colors-and-fonts.jpg`)
 * names Morvi, Gotham Book, Marion Regular and Dongra Script. All four are
 * licensed retail faces, none was supplied with the kit, and none can be
 * self-hosted here without that licence. `--font-*` in `tokens.css` names the
 * real face FIRST in every stack, so dropping in a licensed `@font-face` later
 * switches the site over with no other change.
 *
 * Each stand-in is picked to match the specimen's shape, not just its category:
 *
 *   Morvi          -> Anton       heavy condensed caps display; the specimen's
 *                                 "HEADLINE" is tight, flat-terminalled and
 *                                 very bold, which is Anton's entire brief.
 *   Gotham Book    -> Montserrat  geometric sans drawn from the same signage
 *                                 tradition; the standard Gotham substitute.
 *   Marion Regular -> Newsreader  transitional book serif, already loaded, and
 *                                 the closest thing on hand to the specimen's
 *                                 moderate-contrast body face.
 *   Dongra Script  -> Caveat      monoline casual hand rather than a formal
 *                                 calligraphic script, which is what the
 *                                 specimen's "Accent - like a quote" is.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
});

/* One weight is all Anton has, and all a caps display face needs. */
const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-anton",
});

/* Gotham Book is the kit's sub-heading weight, so 400 carries the labels; 500
   and 600 are here for buttons and the navigation's active state. */
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-montserrat",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-caveat",
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
      className={`${newsreader.variable} ${anton.variable} ${montserrat.variable} ${caveat.variable}`}
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
