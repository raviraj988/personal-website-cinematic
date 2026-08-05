type Direction = "up-right" | "right" | "left" | "up" | "down";

/**
 * Inline SVG arrow.
 *
 * Replaces the Unicode arrows (↗ → ← ↑ ↓, U+2190–U+2199) that used to sit in
 * link labels. Those code points all carry an emoji presentation, and iOS
 * Safari picks it by default — so a link that read "READ THE FIELD NOTE ↗" on
 * desktop rendered with a blue boxed emoji arrow on iPhone. Drawing the arrow
 * ourselves makes it identical everywhere and lets it inherit `currentColor`,
 * weight, and size from the surrounding text.
 *
 * Renders inside a `span.arrow` so the existing `.text-link span` hover nudge
 * continues to apply unchanged. Decorative: the link text carries the meaning.
 */
export function Arrow({ direction = "up-right" }: { direction?: Direction }) {
  return (
    <span className="arrow" aria-hidden="true">
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        {PATHS[direction]}
      </svg>
    </span>
  );
}

const PATHS: Record<Direction, React.ReactNode> = {
  "up-right": (
    <>
      <path d="M3.5 12.5 12.5 3.5" />
      <path d="M5.5 3.5h7v7" />
    </>
  ),
  right: (
    <>
      <path d="M2 8h12" />
      <path d="M9.5 3.5 14 8l-4.5 4.5" />
    </>
  ),
  left: (
    <>
      <path d="M14 8H2" />
      <path d="M6.5 3.5 2 8l4.5 4.5" />
    </>
  ),
  up: (
    <>
      <path d="M8 14V2" />
      <path d="M3.5 6.5 8 2l4.5 4.5" />
    </>
  ),
  down: (
    <>
      <path d="M8 2v12" />
      <path d="M3.5 9.5 8 14l4.5-4.5" />
    </>
  ),
};
