import { BotanicalMark } from "./BotanicalMark";
import { WatershedMark } from "./WatershedMark";
import { EseEmblem } from "@/components/brand/EseMark";

type AmbientLayerProps = {
  /** Slow-drifting soft light fields. Two reads as a landscape, one as a hint. */
  blooms?: 0 | 1 | 2;
  /** Drifting botanical line marks. */
  marks?: boolean;
  /**
   * A watershed drawn across the space a section's content does not fill.
   *
   * For sections that lay out wider than they fill — `people` sizes for four
   * columns and has two — where the remainder otherwise reads as a section that
   * failed to finish rather than as space. See `WatershedMark` for why a
   * drainage network rather than a texture.
   */
  watershed?: boolean;
  /**
   * The emblem, very large and very faint, behind the section's content.
   *
   * Barely visible on purpose — it is a watermark, not a logo placement. At
   * this size and opacity it reads as texture in the ground rather than as the
   * mark being shown twice on one page.
   */
  emblem?: boolean;
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
  watershed = false,
  emblem = false,
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

      {emblem ? (
        <div className="ambient__emblem">
          <EseEmblem />
        </div>
      ) : null}

      {watershed ? <WatershedMark className="ambient__watershed" /> : null}

      {vignette ? <div className="ambient__vignette" /> : null}
    </div>
  );
}
