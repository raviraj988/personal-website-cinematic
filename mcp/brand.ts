/**
 * The tokens the branded fallback cover draws with.
 *
 * Transcribed from `src/styles/tokens.css`, which is the site's palette and
 * carries measured contrast ratios in its comments. Only the handful of values a
 * 1200×630 typographic card needs are here; this is not a second copy of the
 * design system, and anything beyond a cover should read the stylesheet.
 *
 * Kept in TypeScript rather than parsed out of the CSS at runtime because the
 * fallback cover must work when everything else has failed — parsing a stylesheet
 * is one more thing that can throw on the path that exists to not throw.
 */

export const BRAND = {
  /** `--color-forest-deep`. The card ground. */
  ground: "#0e2719",
  /** `--color-forest`. The band behind the wordmark. */
  groundSoft: "#173d2a",
  /** `--color-canvas`. Cream, for the title. */
  ink: "#f8f5ec",
  /** `--color-accent-light`. 7.68:1 on forest — the eyebrow and the rule. */
  accent: "#a9cdb3",
  /** `--color-moss`. Muted, for the wordmark's supporting line. */
  muted: "#718265",
} as const;

/** Cover geometry. Open Graph's canonical size, and what every consumer expects. */
export const COVER = {
  width: 1200,
  height: 630,
} as const;

/**
 * Font stacks for the SVG the fallback rasterises.
 *
 * Named families only, with a generic last. libvips resolves these through
 * fontconfig against whatever the host actually has, so a stack that ends in
 * `serif` degrades to something readable rather than to nothing — which matters
 * because this is the path taken when image generation is unavailable, and an
 * unreadable cover would be worse than the coverless draft it replaced.
 */
export const COVER_FONTS = {
  display: "Georgia, 'Times New Roman', serif",
  mono: "'SF Mono', 'DejaVu Sans Mono', monospace",
} as const;
