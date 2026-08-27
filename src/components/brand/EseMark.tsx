/**
 * The ESE logo, in the four crops the site uses.
 *
 * Geometry comes from `mark-paths.ts`, generated from the Illustrator sources by
 * `scripts/prepare-brand.mjs`. Nothing here holds a coordinate; each component is
 * a `viewBox` over shared path data.
 *
 * ------------------------------------------------------------------- colour
 *
 * The mark is drawn in two registers at once, and the split is the whole idea.
 *
 * **Structure follows the page.** The emblem's outline, its interior detail and
 * the wordmark are all `currentColor`. In the site header that means the logo is
 * near-white over the photographic hero and forest ink once the bar goes solid —
 * not a second asset or a filter, just the `color` the header already animates
 * for its own links, which the mark rides through the same transition.
 *
 * **Colour follows the brand.** The emblem's three bands, and the wordmark's
 * ampersand, take fixed values from `--ese-band-*`. Each band is one of the three
 * things the shield says ESE protects, so their hues are meaning, not decoration,
 * and they should not drift with the surrounding text colour.
 *
 * The band colours are the kit's hues pulled into this site's muted register
 * rather than the kit's own navy-and-rose — see the `--ese-band-*` note in
 * `src/styles/tokens.css` for why, and for why they are flat rather than the
 * kit's gradients.
 *
 * ------------------------------------------------------------ negative space
 *
 * The four interior segments are deliberately not drawn. In the source artwork
 * they are filled white so the mark reads on a dark ground; leaving them open
 * lets whatever the mark sits on show through instead. That is what makes ONE
 * asset work on cream, on the forest footer, and over a photograph — and it keeps
 * the line quality of the mark, where filling them reads as a heavy blob.
 *
 * ------------------------------------------------------- accessible naming
 *
 * Default `aria-hidden`, because most placements sit inside something already
 * named — the header's `<a aria-label="Environment Sovereignty & Equity, home">`.
 * A decorative duplicate of that name is noise to a screen reader, not help.
 *
 * Pass `label` for a standalone placement and the mark becomes `role="img"` with
 * that accessible name instead.
 */

import type { CSSProperties, ReactNode } from "react";
import type { Mark } from "./mark-paths";
import {
  ampersand,
  emblem,
  emblemBands,
  lockup,
  taglineLockup,
  wordmark,
} from "./mark-paths";

type Box = Mark["box"];

type MarkProps = {
  className?: string;
  /** Names the mark for assistive tech. Omit when a labelled ancestor covers it. */
  label?: string;
};

const union = (...boxes: Box[]): Box => ({
  minX: Math.min(...boxes.map((b) => b.minX)),
  minY: Math.min(...boxes.map((b) => b.minY)),
  maxX: Math.max(...boxes.map((b) => b.maxX)),
  maxY: Math.max(...boxes.map((b) => b.maxY)),
});

/**
 * Referenced as inline styles rather than a stylesheet rule so the mark carries
 * its own colour wherever it is dropped, needing only the custom properties —
 * which `tokens.css` defines on `:root`, so they are always in scope.
 */
const BAND_STYLE: Record<keyof typeof emblemBands, CSSProperties> = {
  land: { fill: "var(--ese-band-land)" },
  water: { fill: "var(--ese-band-water)" },
  sunrise: { fill: "var(--ese-band-sunrise)" },
};

/** The bands, painted under whatever outline follows them. */
function Bands() {
  return (
    <>
      {(Object.keys(emblemBands) as (keyof typeof emblemBands)[]).map((band) => (
        <path key={band} d={emblemBands[band]} style={BAND_STYLE[band]} />
      ))}
    </>
  );
}

/** The ampersand, in the olive the colour artwork gives it. */
function Ampersand() {
  return <path d={ampersand.paths[0]} style={BAND_STYLE.land} />;
}

function Svg({
  box,
  className,
  label,
  children,
}: MarkProps & { box: Box; children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox={`${box.minX} ${box.minY} ${box.maxX - box.minX} ${box.maxY - box.minY}`}
      // Inherited by the structural paths below, which set no fill of their own.
      // The bands and the ampersand override it with their own.
      fill="currentColor"
      // `focusable` is an IE/old-Edge artefact that still costs nothing and still
      // stops an inline SVG becoming a tab stop in a nav bar.
      focusable="false"
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true, role: "presentation" })}
    >
      {children}
    </svg>
  );
}

const paths = (mark: Mark) => mark.paths.map((d) => <path key={d} d={d} />);

/**
 * The primary logo: emblem and wordmark locked up together, 2.87:1.
 *
 * The default for anywhere with room for it. The spacing between the two halves
 * is the source artboard's, not a gap re-guessed here.
 */
export function EseLogo(props: MarkProps) {
  return (
    <Svg box={lockup.box} {...props}>
      <Bands />
      {paths(emblem)}
      {paths(wordmark)}
      <Ampersand />
    </Svg>
  );
}

/**
 * The emblem alone, 0.86:1 — a shield and a turtle shell, three bands for what
 * ESE protects, white cedar roots in the negative space.
 *
 * For the places the wordmark would be redundant or unreadable: beside a heading
 * that already says the name, or small.
 */
export function EseEmblem(props: MarkProps) {
  return (
    <Svg box={emblem.box} {...props}>
      <Bands />
      {paths(emblem)}
    </Svg>
  );
}

/** The wordmark alone, 2.14:1, set over three lines. */
export function EseWordmark(props: MarkProps) {
  return (
    <Svg box={union(wordmark.box, ampersand.box)} {...props}>
      {paths(wordmark)}
      <Ampersand />
    </Svg>
  );
}

/**
 * The monogram beside the mission over three lines, 6.38:1 — PROTECT THE
 * ENVIRONMENT / EMPOWER PEOPLE / CONNECT RESOURCES.
 *
 * Wide and text-heavy, so it wants a full column rather than a slot. Single
 * colour: its own artboard carries no emblem, so there are no bands to place.
 */
export function EseTaglineLockup(props: MarkProps) {
  return (
    <Svg box={taglineLockup.box} {...props}>
      {paths(taglineLockup)}
    </Svg>
  );
}
