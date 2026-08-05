import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { site } from "@/lib/data/site-content";
import "./globals.css";

/**
 * Fonts via next/font — spec §5.2. Two families, three weights in total, all
 * self-hosted at build time and subset to Latin.
 */
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-source-serif",
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
  themeColor: "#faf8f1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
