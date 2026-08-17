import type { NextConfig } from "next";

/**
 * Security headers per spec §26. Kept conservative: no external scripts are
 * loaded by the site, so the CSP does not need third-party allowances yet.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    /**
     * Blog cover images live in the public `blog-images` Supabase Storage bucket
     * and are served from the project's own CDN hostname.
     *
     * Scoped to the public-object path rather than the whole host: next/image is
     * an open proxy for whatever it is allowed to fetch, so the allowance is kept
     * to the one prefix that can only ever return public bucket contents.
     *
     * The wildcard subdomain avoids pinning the project ref here — it is the one
     * value that legitimately differs per environment, and it is already in
     * `NEXT_PUBLIC_SUPABASE_URL`.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
