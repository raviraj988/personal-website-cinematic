import { BotanicalMark } from "./BotanicalMark";

type AmbientLayerProps = {
  /** Slow-drifting soft light fields. Two reads as a landscape, one as a hint. */
  blooms?: 0 | 1 | 2;
  /** Drifting botanical line marks. */
  marks?: boolean;
  /**
   * A topographic contour field, weighted to the right of the section.
   *
   * For sections whose content does not fill their width — `people` lays out
   * for four columns and has two — where the remainder otherwise reads as a
   * section that failed to finish rather than as space.
   *
   * Contours rather than an abstract pattern: cumulative-impact mapping, water
   * systems and air-quality work are what ESE does, so the reference is to the
   * subject rather than to decoration in general.
   */
  contours?: boolean;
  /** Adds an inner vignette; suits the dark sections. */
  vignette?: boolean;
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
  blooms = 0,
  marks = false,
  contours = false,
  vignette = false,
  tone = "light",
}: AmbientLayerProps) {
  return (
    <div className={`ambient ambient--${tone}`} aria-hidden="true">
      {blooms >= 1 ? <div className="ambient__bloom ambient__bloom--a" /> : null}
      {blooms >= 2 ? <div className="ambient__bloom ambient__bloom--b" /> : null}

      {marks ? (
        <>
          <BotanicalMark className="ambient__mark ambient__mark--a" />
          <BotanicalMark className="ambient__mark ambient__mark--b" />
        </>
      ) : null}

      {contours ? <div className="ambient__contours" /> : null}

      {vignette ? <div className="ambient__vignette" /> : null}
    </div>
  );
}
