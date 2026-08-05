import { BotanicalMark } from "./BotanicalMark";
import { DriftingBackgroundText } from "./DriftingBackgroundText";

type AmbientLayerProps = {
  /** Faint vertical column rules, masked at the top and bottom edges. */
  rules?: boolean;
  /** Slow-drifting soft light fields. Two reads as a landscape, one as a hint. */
  blooms?: 0 | 1 | 2;
  /** Drifting botanical marks. */
  marks?: boolean;
  /** Chooses the ink used by every layer. */
  tone?: "light" | "dark";
};

/**
 * Ambient section backdrop — decorative only.
 *
 * Deliberately a server component: every layer animates through CSS keyframes
 * on composited properties, so this adds no client JavaScript and no scroll
 * work. The global reduced-motion block in `globals.css` freezes all of it.
 *
 * Sits at `z-index: -1` inside a section that isolates its stacking context, so
 * it paints over the page background but under all content — text contrast is
 * unaffected (spec §8).
 */
export function AmbientLayer({
  rules = false,
  blooms = 0,
  marks = false,
  tone = "light",
}: AmbientLayerProps) {
  return (
    <div className={`ambient ambient--${tone}`} aria-hidden="true">
      {rules ? <div className="ambient__rules" /> : null}

      {blooms >= 1 ? <div className="ambient__bloom ambient__bloom--a" /> : null}
      {blooms >= 2 ? <div className="ambient__bloom ambient__bloom--b" /> : null}

      {marks ? (
        <>
          <BotanicalMark variant="leaf" className="ambient__mark ambient__mark--a" />
          <BotanicalMark variant="leaf" className="ambient__mark ambient__mark--b" />
        </>
      ) : null}
    </div>
  );
}

type BackgroundTextProps = {
  text: string;
  /** Placement + scale come from a section-specific class in globals.css. */
  className?: string;
  variant?: "outline" | "solid" | "numeral";
  /** Scroll-linked vertical travel in px. 0 keeps it static, with no JS at all. */
  drift?: number;
};

/**
 * Oversized decorative type set behind a section.
 *
 * `aria-hidden` and unselectable: it is texture, not content, so it must never
 * reach assistive technology or the reading order. With `drift` at 0 this stays
 * a server component; a non-zero drift swaps in a thin client wrapper that
 * shares the single page scroll loop.
 */
export function BackgroundText({
  text,
  className = "",
  variant = "outline",
  drift = 0,
}: BackgroundTextProps) {
  const classes = `bg-word bg-word--${variant} ${className}`.trim();

  if (drift === 0) {
    return (
      <span className={classes} aria-hidden="true">
        {text}
      </span>
    );
  }

  return <DriftingBackgroundText text={text} className={classes} drift={drift} />;
}
