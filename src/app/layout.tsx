import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import { site } from "@/lib/data/site-content";
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
  },
  robots: {
    // Flip to `index: true` once the domain and content are approved.
    index: false,
    follow: false,
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
