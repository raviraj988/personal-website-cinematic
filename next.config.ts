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
  /**
   * Dev-only. Next blocks `/_next/*` requests whose origin is not the one the
   * server was started on, which happens the moment you open the dev server from
   * a phone on the same network.
   *
   * These are matched as **hostname patterns, not CIDR ranges** — an earlier
   * version of this list held `192.168.0.0/16` and friends, which look like they
   * cover a private network and in fact match nothing at all, because the value
   * is compared against the request's hostname string. The wildcards below are
   * literal `*` globs over the last octet.
   *
   * No effect on a production build: Next only reads this in dev.
   */
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.*",
    "192.168.0.*",
    "10.0.0.*",
    "172.20.*.*",
  ],
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
