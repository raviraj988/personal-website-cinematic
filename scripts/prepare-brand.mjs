/**
 * Turns the supplied ESE brand kit into the site's logo assets.
 *
 * Run once after dropping a new kit into `ref_docs/brand/`:
 *
 *   node scripts/prepare-brand.mjs
 *
 * Requires `pdftocairo` (poppler: `brew install poppler`). It is a one-time
 * authoring dependency, not a build dependency — everything this script emits is
 * committed, so `next build` never needs poppler.
 *
 * ---------------------------------------------------------------- the sources
 *
 * The kit ships each logo twice: as a 4000–9600px PNG export and as an `.ai`.
 * Every `.ai` is really a PDF 1.6 (`%PDF-1.6` magic, Illustrator 30.4) holding
 * FOUR pages — one per colour variant — and every path is already outlined. No
 * live text, no embedded rasters. That is the whole reason this script exists:
 * the marks can be shipped as real vector instead of downscaled screenshots of
 * vector.
 *
 * Page order inside each `.ai`, established by inspection:
 *
 *   p1  full colour, for light grounds
 *   p2  full colour, for dark grounds
 *   p3  all white
 *   p4  all blue
 *
 * ------------------------------------------------------------- why p4, not p3
 *
 * p3 and p4 are NOT the same artwork in two colours. p3 carries 18 extra paths
 * for the primary lockup: the white variant fills the emblem's interior segments
 * so the mark stays legible on a dark ground. p4 is the minimal positive-shape
 * version — outline, dividers, and the leaf/water/sun line detail, with the
 * interior left transparent.
 *
 * A `currentColor` mark wants exactly that minimal geometry. Extracting from p3
 * would bake those interior fills in, and they would render as opaque blobs the
 * moment the colour changed. So geometry comes from p4 and the colour is thrown
 * away.
 *
 * ------------------------------------------ one lockup, three ways to draw it
 *
 * What the kit calls the bare "Shield Icon" has no `.ai` at all — it ships only
 * as PNG. But it does not need one: the shield is the leftmost path of the
 * primary lockup, and the paths either side of it separate with a 51.5pt gap in
 * x that nothing straddles. Splitting on that gap yields the emblem and the
 * wordmark as independent vector.
 *
 * Both halves are then left in the ORIGINAL artboard coordinate system rather
 * than being normalised to their own origins. That is the trick that keeps this
 * cheap: the lockup is not a composition of two translated marks, it is the same
 * two path sets under a wider viewBox. So the geometry ships once, and the
 * spacing between emblem and wordmark is the designer's to the point rather than
 * a number re-guessed in CSS.
 *
 * `box` per mark is its tight bounding box in those shared coordinates, which is
 * what lets a component crop to the emblem alone, the wordmark alone, or the
 * union of the two.
 *
 * ------------------------------------------------------------- the bands
 *
 * The emblem's three colour bands come off the FULL-COLOUR page (p1), not p4,
 * and not as the paths that are actually painted there.
 *
 * Illustrator flattened each band's gradient into a mesh, so p1 paints them as
 * three big rectangles filled with 82-, 122- and 208-stop gradients, each
 * clipped twice: once to a bounding box, then to the band's real outline. The
 * useful geometry is therefore in the odd-numbered `<clipPath>` elements, and
 * each one turns out to be a plain 6–7 command quadrilateral.
 *
 * Taking the clip shapes instead of the painted paths is what makes this cheap:
 * 204 bytes for all three bands, against ~50KB of flattened mesh, and the site
 * gets to choose its own colours rather than inheriting a baked gradient. See the
 * `--ese-band-*` note in `src/styles/tokens.css` for why it chooses different
 * ones than the kit.
 *
 * The four white interior segments on p1 are deliberately NOT extracted. The
 * emblem is drawn as bands and segments UNDER the outline path, and the segments
 * exist to make the mark legible on a dark ground. Leaving them out lets the page
 * show through as the mark's negative space instead, which is what the mono mark
 * already did — and it means one asset works on cream and on forest without a
 * variant. Filling them was tried and reads as a heavy blob on dark.
 *
 * ------------------------------------------------------ how the icons are made
 *
 * NOT from the PNG exports, which is what this script used to do.
 *
 * poppler converts the `.ai` files' CMYK to RGB differently than Adobe did:
 * brand navy #2b4552 comes out of `pdftocairo` as #224653, a delta of 9 per
 * channel. That ruled out rendering the `.ai` colour pages, and the PNG exports
 * are authoritative sRGB, so the icons were cut from those.
 *
 * That is no longer the right source, because the icons should match the logo the
 * site actually draws — and the site recolours the bands and takes the outline
 * from the page. A PNG of the kit's navy-and-rose original next to a themed
 * olive-and-terracotta header logo reads as two different marks.
 *
 * So the icons are now composed here from the same geometry and the same
 * `--ese-band-*` values the components use, parsed out of `tokens.css` so the two
 * cannot drift, and rasterised by sharp. The CMYK problem disappears with the
 * PNGs: nothing in this path ever reads a colour out of a PDF.
 *
 * ------------------------------------------------------------- the precision
 *
 * `pdftocairo` emits ~6 decimal places. `COORD_PRECISION = 1` quantises to 0.1
 * of a PDF point on artboards 348–1210pt wide — between 1/3500th and 1/12000th
 * of the mark's width, i.e. well under a device pixel at any size the site
 * renders these. It cuts the primary lockup from 42KB to 20KB.
 *
 * Paths are kept as separate `<path>` elements rather than concatenated into
 * one. Every path in every source is `fill-rule="nonzero"`, and merging them
 * would make the winding of one subpath depend on its neighbours — which is how
 * counters in letterforms and the emblem's negative space get silently filled
 * in. The saving would have been ~30 bytes per path. Not worth the class of bug.
 *
 * -------------------------------------------------------------- not generated
 *
 * `seal.ai` (the emblem ringed by the full name and PROTECT · EMPOWER · CONNECT)
 * and `badge.ai` (the emblem under an arced PROTECT / EMPOWER / CONNECT) are
 * both left out. The brand walkthrough scopes them to "patches, embroidery, a
 * stamp on a printed report" — texture, not screen. They are kept in
 * `ref_docs/brand/` so adding an entry here is all it takes if that changes.
 */

import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "ref_docs", "brand");
const PATHS_OUT = path.join(ROOT, "src", "components", "brand", "mark-paths.ts");
const TOKENS = path.join(ROOT, "src", "styles", "tokens.css");
const APP_DIR = path.join(ROOT, "src", "app");
const PUBLIC_BRAND = path.join(ROOT, "public", "brand");

/** See the header note on precision. */
const COORD_PRECISION = 1;

/** The page inside each `.ai` holding the minimal single-colour geometry. */
const MONO_PAGE = 4;

/** The page holding the colour artwork, whose clip shapes give the bands. */
const COLOUR_PAGE = 1;

/**
 * Reads a custom property's value out of `tokens.css`.
 *
 * The stylesheet is the single source of truth for every colour this script
 * bakes into a raster, so the favicon cannot drift from the logo the site draws.
 * Deliberately strict: a renamed or deleted token fails the run rather than
 * silently falling back to a default that would ship as a wrong-coloured icon.
 */
function token(css, name) {
  const value = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(css);
  if (!value) {
    throw new Error(
      `tokens.css has no --${name} with a hex value. This script colours the ` +
        `icons from that block; update the name here if it moved.`,
    );
  }
  return value[1];
}

function requirePdftocairo() {
  try {
    execFileSync("pdftocairo", ["-v"], { stdio: "pipe" });
  } catch {
    throw new Error(
      "pdftocairo not found. Install poppler (`brew install poppler`) — it is " +
        "only needed to regenerate these assets, never to build the site.",
    );
  }
}

/**
 * Rounds every number in a path's `d` and strips the whitespace `pdftocairo`
 * puts around command letters.
 */
function compactPath(d) {
  return d
    .replace(/-?\d*\.?\d+/g, (n) =>
      String(Number(Number.parseFloat(n).toFixed(COORD_PRECISION))),
    )
    .replace(/\s+/g, " ")
    .replace(/ ?([MLCZHVmlczhv]) ?/g, "$1")
    .trim();
}

/**
 * The tight bounding box of a compacted path.
 *
 * Every command `pdftocairo` emits — M, L, C, Z — takes coordinate pairs and
 * nothing else, so alternating the flat number list into x and y is exact here.
 * It would not be for a general SVG path containing A (elliptical arc) or the
 * one-dimensional H/V, which is why this is a helper for THIS pipeline's output
 * rather than a general-purpose bbox.
 *
 * Control points are included, so a curve bowing outward reports slightly wider
 * than it draws. For cropping a viewBox that errs in the safe direction.
 */
function pathBox(d) {
  const nums = d.match(/-?\d+\.?\d*/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

const unionBox = (boxes) => ({
  minX: Math.min(...boxes.map((b) => b.minX)),
  minY: Math.min(...boxes.map((b) => b.minY)),
  maxX: Math.max(...boxes.map((b) => b.maxX)),
  maxY: Math.max(...boxes.map((b) => b.maxY)),
});

const round1 = (n) => Number(n.toFixed(1));

/** Converts one page of one `.ai` and returns its ordered, compacted paths. */
function convert(dir, file, label) {
  const source = path.join(SRC_DIR, file);
  if (!existsSync(source)) throw new Error(`missing source: ref_docs/brand/${file}`);

  const out = path.join(dir, `${label}.svg`);
  execFileSync("pdftocairo", [
    "-svg",
    "-f", String(MONO_PAGE),
    "-l", String(MONO_PAGE),
    source,
    out,
  ]);

  const svg = readFileSync(out, "utf8");

  // Anything other than a flat single fill means the wrong page was converted,
  // which would otherwise surface as a mark that silently lost its detail.
  const fills = new Set(svg.match(/fill="rgb\([^)]*\)"/g) ?? []);
  if (fills.size !== 1) {
    throw new Error(
      `${file}: expected one flat fill on page ${MONO_PAGE}, found ${fills.size}. ` +
        `Has the page order inside the .ai changed?`,
    );
  }
  if (svg.includes("<image")) throw new Error(`${file}: embedded raster`);
  if (svg.includes("<text")) throw new Error(`${file}: live text, expected outlines`);

  const paths = [...svg.matchAll(/<path[^>]*?\sd="([^"]+)"/gs)].map((m) =>
    compactPath(m[1]),
  );
  if (!paths.length) throw new Error(`${file}: no paths`);
  return paths;
}

/**
 * Pulls the emblem's three colour bands off the full-colour page.
 *
 * See the header note on the bands for why the geometry is in the clip paths
 * rather than the painted ones. Illustrator emits them as `clip-0`/`clip-1`
 * pairs — an axis-aligned bounding box, then the band's real outline — so the
 * odd-numbered clips are the shapes and the even ones are discarded.
 *
 * Which band is which is decided by POSITION, not by clip order, so a re-export
 * that reorders the artwork still lands each colour on the right segment: the
 * shield's leaf sits upper-right, its water fills the left, its sunrise sits
 * lower-right.
 */
function extractBands(dir) {
  const out = path.join(dir, "colour.svg");
  execFileSync("pdftocairo", [
    "-svg",
    "-f", String(COLOUR_PAGE),
    "-l", String(COLOUR_PAGE),
    path.join(SRC_DIR, "primary-logo.ai"),
    out,
  ]);
  const svg = readFileSync(out, "utf8");

  const clips = [
    ...svg.matchAll(/<clipPath id="([^"]+)">\s*<path[^>]*?\sd="([^"]+)"/gs),
  ].map((m) => ({ id: m[1], d: compactPath(m[2]) }));

  /**
   * The band shapes, i.e. the second clip of each pair.
   *
   * The discriminator is that the bounding-box clips are AXIS-ALIGNED: a
   * rectangle, however many commands it is written with, visits exactly two
   * distinct x values and two distinct y values. The band outlines are
   * quadrilaterals and pentagons on the shield's diagonals and visit more.
   *
   * Counting commands does not work — one band happens to be a quadrilateral and
   * so has exactly as many points as a rectangle.
   */
  const axisAligned = (d) => {
    const n = (d.match(/-?\d+\.?\d*/g) ?? []).map(Number);
    return (
      new Set(n.filter((_, i) => i % 2 === 0)).size <= 2 &&
      new Set(n.filter((_, i) => i % 2 === 1)).size <= 2
    );
  };
  const shapes = clips
    .filter((c) => !axisAligned(c.d))
    .map((c) => ({ ...c, box: pathBox(c.d) }));

  if (shapes.length !== 3) {
    throw new Error(
      `primary-logo.ai: expected 3 band clip shapes on page ${COLOUR_PAGE}, ` +
        `found ${shapes.length}. Has the colour artwork changed?`,
    );
  }

  const mid = (b) => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
  const centres = shapes.map((s) => ({ ...s, c: mid(s.box) }));
  const meanX = centres.reduce((t, s) => t + s.c.x, 0) / 3;

  const left = centres.filter((s) => s.c.x < meanX);
  const right = centres.filter((s) => s.c.x >= meanX);
  if (left.length !== 1 || right.length !== 2) {
    throw new Error(
      "primary-logo.ai: the three bands are not one-left / two-right as the " +
        "emblem's composition requires — re-check the colour artwork.",
    );
  }

  const [upper, lower] = right.sort((a, b) => a.c.y - b.c.y);
  const named = { land: upper, water: left[0], sunrise: lower };

  for (const [name, s] of Object.entries(named)) {
    console.log(`  band ${name.padEnd(8)} ${s.d.length} B  ${s.id}`);
  }

  /**
   * The ampersand, which the colour artwork sets in olive while the rest of the
   * wordmark is navy.
   *
   * Found by its fill on this page, and returned as a BOX rather than a path so
   * the geometry can still come from p4 with everything else. p1 and p4 describe
   * the same glyph with different coordinates, so the two pages' `d` strings
   * never match — but their bounding boxes do, which is enough to identify which
   * of the 29 wordmark paths it is.
   */
  const olive = [
    ...svg.matchAll(/<path[^>]*?fill="rgb\(52\.9[^"]*"[^>]*?\sd="([^"]+)"/gs),
  ].map((m) => pathBox(compactPath(m[1])));

  if (olive.length !== 1) {
    console.log(
      `  note: expected 1 olive path in the colour artwork, found ${olive.length}` +
        ` — the ampersand will not be tinted.`,
    );
  }

  return {
    bands: Object.fromEntries(
      Object.entries(named).map(([k, s]) => [k, { d: s.d, box: s.box }]),
    ),
    ampersandBox: olive.length === 1 ? olive[0] : null,
  };
}

/**
 * Splits the primary lockup into emblem and wordmark on the single vertical gap
 * between them.
 *
 * The gap is found rather than hard-coded: paths are swept left to right and the
 * one widest run of x that no path occupies becomes the seam. A re-exported kit
 * with different letter-spacing still splits correctly, and a kit whose lockup
 * genuinely has no seam fails loudly instead of silently cutting a letter off.
 */
function splitLockup(paths) {
  const boxed = paths.map((d) => ({ d, box: pathBox(d) }));
  const byX = [...boxed].sort((a, b) => a.box.minX - b.box.minX);

  let seam = null;
  let reach = byX[0].box.maxX;
  for (const { box } of byX.slice(1)) {
    const gap = box.minX - reach;
    if (gap > 0 && (!seam || gap > seam.gap)) {
      seam = { gap, at: reach + gap / 2 };
    }
    reach = Math.max(reach, box.maxX);
  }

  // The emblem is ~320pt wide and the wordmark ~700pt, so a real seam between
  // them is tens of points. Inter-letter gaps in the wordmark are a fraction of
  // that. 20pt separates the two cases with room to spare.
  if (!seam || seam.gap < 20) {
    throw new Error(
      `primary-logo.ai: no clear gap between emblem and wordmark ` +
        `(widest was ${seam ? seam.gap.toFixed(1) : 0}pt). ` +
        `The lockup's spacing has changed — re-check the split.`,
    );
  }

  const emblem = boxed.filter((p) => p.box.maxX < seam.at);
  const wordmark = boxed.filter((p) => p.box.minX > seam.at);
  if (!emblem.length || !wordmark.length) {
    throw new Error("primary-logo.ai: split left one side empty");
  }

  console.log(
    `  seam at x=${seam.at.toFixed(1)} (${seam.gap.toFixed(1)}pt gap) — ` +
      `${emblem.length} emblem path(s), ${wordmark.length} wordmark path(s)`,
  );
  return { emblem, wordmark };
}

function buildMarks(dir) {
  console.log("primary-logo.ai");
  const { emblem, wordmark } = splitLockup(convert(dir, "primary-logo.ai", "primary"));
  const { bands, ampersandBox } = extractBands(dir);

  /**
   * Lifts the ampersand out of the wordmark so it can take its own colour.
   *
   * Matched to the colour page's olive glyph by bounding-box centre. The nearest
   * wordmark path wins, and only if it lands within a couple of points — a
   * re-export that shifts the wordmark would otherwise silently tint whichever
   * letter happened to be closest.
   */
  let ampersand = null;
  let letters = wordmark;
  if (ampersandBox) {
    const centre = (b) => [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
    const [ax, ay] = centre(ampersandBox);
    const scored = wordmark
      .map((p, i) => {
        const [x, y] = centre(p.box);
        return { i, dist: Math.hypot(x - ax, y - ay) };
      })
      .sort((a, b) => a.dist - b.dist);

    if (scored[0].dist <= 2) {
      ampersand = wordmark[scored[0].i];
      letters = wordmark.filter((_, i) => i !== scored[0].i);
      console.log(`  ampersand matched (${scored[0].dist.toFixed(2)}pt off), tinted olive`);
    } else {
      console.log(
        `  note: no wordmark path within 2pt of the olive glyph ` +
          `(nearest ${scored[0].dist.toFixed(1)}pt) — ampersand not tinted.`,
      );
    }
  }

  console.log("tagline-lockup.ai");
  const tagline = convert(dir, "tagline-lockup.ai", "tagline").map((d) => ({
    d,
    box: pathBox(d),
  }));

  const mark = (note, entries) => ({
    note,
    box: unionBox(entries.map((e) => e.box)),
    paths: entries.map((e) => e.d),
  });

  return {
    bands,
    ampersand: ampersand ? mark("The wordmark's ampersand.", [ampersand]) : null,
    emblem: mark(
      "The emblem's outline and interior detail — a shield and a turtle shell, " +
        "three bands for what ESE protects (plant life, water, and sunrise " +
        "breaking over the hills), with the roots of a white cedar in the " +
        "negative space. One path; the negative space is nonzero winding, not a " +
        "second shape. Drawn OVER `emblemBands`.",
      emblem,
    ),
    wordmark: mark(
      'The wordmark\'s letters — "Environment Sovereignty & Equity" over three ' +
        "lines, WITHOUT the ampersand, which is `ampersand` so it can take the " +
        "olive the colour artwork gives it.",
      letters,
    ),
    lockup: mark(
      "The primary logo: emblem and wordmark together, at the spacing they carry " +
        "in the source artboard.",
      [...emblem, ...wordmark],
    ),
    taglineLockup: mark(
      "The ESE monogram beside the mission over three lines: PROTECT THE " +
        "ENVIRONMENT / EMPOWER PEOPLE / CONNECT RESOURCES. Its own artboard, so " +
        "its coordinates are unrelated to the three marks above.",
      tagline,
    ),
  };
}

/**
 * `lockup` re-uses the very path strings held by `emblem` and `wordmark`, so it
 * is emitted as a reference to them rather than a third copy of the geometry —
 * which is the point of keeping both halves in shared coordinates.
 */
function writeMarkPaths(marks) {
  const box = (b) =>
    `{ minX: ${round1(b.minX)}, minY: ${round1(b.minY)}, ` +
    `maxX: ${round1(b.maxX)}, maxY: ${round1(b.maxY)} }`;

  const declare = (name, m) =>
    `/** ${m.note} */\nexport const ${name}: Mark = {\n` +
    `  box: ${box(m.box)},\n  paths: [\n` +
    m.paths.map((d) => `    "${d}",`).join("\n") +
    `\n  ],\n};`;

  const file = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by \`node scripts/prepare-brand.mjs\` from the Illustrator sources in
 * \`ref_docs/brand/\`. That script's header explains where the geometry comes
 * from, why it is the all-blue page of each \`.ai\` rather than the white one,
 * and why \`emblem\` and \`wordmark\` share one coordinate system.
 *
 * Every mark is the minimal positive-shape version with its colour discarded, so
 * the components in this directory can drive it with \`currentColor\`.
 *
 * \`box\` is the mark's tight bounding box in its artboard's units. Components
 * turn it into a viewBox; nothing here assumes a particular rendered size.
 */

export type Mark = {
  box: { minX: number; minY: number; maxX: number; maxY: number };
  paths: readonly string[];
};

${declare("emblem", marks.emblem)}

/**
 * The emblem's three colour bands, in the emblem's own coordinates.
 *
 * Painted UNDER \`emblem\`, whose outline and interior detail sit on top and
 * whose negative space is what lets these show through. Order matters only in
 * that all three must precede the outline.
 *
 * Each band names one of the three things the shield says ESE protects, which is
 * why they are keyed rather than an array: the colour applied to each is a
 * semantic choice, not a slot. The colours themselves are NOT here — they live in
 * \`--ese-band-*\` in \`src/styles/tokens.css\`.
 */
export const emblemBands: Readonly<Record<"land" | "water" | "sunrise", string>> = {
${["land", "water", "sunrise"].map((k) => `  ${k}: "${marks.bands[k].d}",`).join("\n")}
};

${declare("wordmark", marks.wordmark)}

${
  marks.ampersand
    ? `/**
 * The wordmark's ampersand, held apart from the letters.
 *
 * The colour artwork sets it in olive against a navy wordmark — the one place the
 * lockup's type is not a single colour. Components draw it in
 * \`--ese-band-land\`, which is this site's olive.
 */
export const ampersand: Mark = {
  box: ${box(marks.ampersand.box)},
  paths: ["${marks.ampersand.paths[0]}"],
};`
    : "/* No `ampersand`: the olive glyph could not be matched. See the script. */"
}

/**
 * ${marks.lockup.note}
 *
 * \`paths\` is the whole lockup in one list, for drawing it in a single colour.
 * Components that tint the ampersand compose \`emblem\`, \`wordmark\` and
 * \`ampersand\` themselves and use this only for its \`box\`.
 */
export const lockup: Mark = {
  box: ${box(marks.lockup.box)},
  paths: [...emblem.paths, ...wordmark.paths${marks.ampersand ? ", ...ampersand.paths" : ""}],
};

${declare("taglineLockup", marks.taglineLockup)}
`;

  mkdirSync(path.dirname(PATHS_OUT), { recursive: true });
  writeFileSync(PATHS_OUT, file);

  console.log("\nmarks");
  for (const [name, m] of Object.entries(marks)) {
    // `bands` is reported by `extractBands`; `ampersand` may legitimately be null.
    if (name === "bands" || !m) continue;
    const w = round1(m.box.maxX - m.box.minX);
    const h = round1(m.box.maxY - m.box.minY);
    const bytes = m.paths.reduce((s, d) => s + d.length, 0);
    const shared = name === "lockup" ? "  (shares emblem + wordmark)" : "";
    console.log(
      `  ${name.padEnd(14)} ${String(m.paths.length).padStart(3)} paths  ` +
        `${w}x${h}pt  ${(bytes / 1024).toFixed(1)} KB${shared}`,
    );
  }
  console.log(
    `\nsrc/components/brand/mark-paths.ts  ${(file.length / 1024).toFixed(1)} KB on disk`,
  );
}

/**
 * Builds the themed emblem as an SVG string, for sharp to rasterise.
 *
 * The same composition the components render: bands underneath, outline over
 * them, interior segments left open so `ground` shows through as the mark's
 * negative space. Colours come from `tokens.css`, so an icon can never disagree
 * with the logo on the page.
 *
 * `ground` is painted as a full-bleed rect rather than left transparent when it
 * is given, because the outline is drawn in the page's ink and needs its page.
 * Passing `null` leaves it transparent, which is what a favicon wants — browsers
 * put it on tab chrome of an unknown colour.
 */
function themedEmblemSvg({ marks, colours, ink, ground, width, height, inset }) {
  const { minX, minY, maxX, maxY } = marks.emblem.box;
  const w = maxX - minX;
  const h = maxY - minY;

  // Fit the mark into `inset` of the shorter side, centred.
  const scale = (Math.min(width, height) * inset) / Math.max(w, h);
  const x = (width - w * scale) / 2 - minX * scale;
  const y = (height - h * scale) / 2 - minY * scale;

  const bands = ["land", "water", "sunrise"]
    .map((k) => `<path d="${marks.bands[k].d}" fill="${colours[k]}"/>`)
    .join("");

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
      `viewBox="0 0 ${width} ${height}">` +
      (ground ? `<rect width="${width}" height="${height}" fill="${ground}"/>` : "") +
      `<g transform="translate(${x} ${y}) scale(${scale})">` +
      bands +
      marks.emblem.paths.map((d) => `<path d="${d}" fill="${ink}"/>`).join("") +
      `</g></svg>`,
  );
}

/**
 * The favicon and app icon.
 *
 * Sizes follow the Next.js file conventions in `src/app/`: `icon.png` is the
 * favicon and `apple-icon.png` is the iOS home-screen icon, both wired up by the
 * framework with no `<link>` tags to maintain.
 *
 * The emblem is the icon rather than the ESE monogram, which is what the brand
 * walkthrough nominates for a favicon. Rendered and compared at 16px the
 * monogram loses: three letters inside a 1.7:1 landscape mark have to be
 * letterboxed into a square, and the crossbars close up. The emblem is near
 * square already and its silhouette survives the downscale, which is the only
 * thing a favicon has to do. The monogram source stays in `ref_docs/brand/` for
 * the uses the deck is actually describing — social avatars, a lapel pin.
 *
 * These carry an OPAQUE cream ground, unlike every other placement of the mark.
 *
 * A transparent favicon was tried first and fails on a dark tab bar: the outline
 * is drawn in forest ink, and against dark chrome it disappears, leaving the
 * three bands as coloured fragments with no shield around them. A favicon cannot
 * use `currentColor` to escape that — it has no page to inherit from, and it
 * cannot know whether the browser is in light or dark mode. Media-switched icons
 * are unevenly supported and would still leave the fragments case on any browser
 * that ignored them.
 *
 * So the icons bring their own page with them. Cream ground, forest mark: the
 * same pairing as the site's solid header, legible on tab chrome of any colour.
 *
 * The insets differ because the two icons get cropped differently. `icon.png` is
 * shown as drawn, so it wants only enough margin to breathe. iOS masks
 * `apple-icon.png` to a rounded rectangle and clips the corners, so its mark sits
 * further in to clear them.
 */
const ICONS = [
  { out: path.join(APP_DIR, "icon.png"), size: 512, inset: 0.82 },
  { out: path.join(APP_DIR, "apple-icon.png"), size: 180, inset: 0.72 },
];

async function writeIcons(marks, colours, ink, ground) {
  console.log("");
  for (const { out, size, inset } of ICONS) {
    const svg = themedEmblemSvg({
      marks,
      colours,
      ink,
      ground,
      width: size,
      height: size,
      inset,
    });
    const buffer = await sharp(svg).png().toBuffer();

    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, buffer);
    console.log(
      `${path.relative(ROOT, out).padEnd(34)} ${size}x${size}  ` +
        `${(buffer.length / 1024).toFixed(0)} KB`,
    );
  }
}

/**
 * The themed emblem as a standalone raster, on transparent.
 *
 * No component uses it. It exists so the emblem can go into an email signature or
 * a slide without anyone rebuilding the colour composition by hand.
 */
async function writePublicBrand(marks, colours, ink) {
  const svg = themedEmblemSvg({
    marks,
    colours,
    ink,
    ground: null,
    width: 1024,
    height: 1024,
    inset: 1,
  });
  const { data, info } = await sharp(svg)
    .webp({ quality: 90 })
    .toBuffer({ resolveWithObject: true });

  mkdirSync(PUBLIC_BRAND, { recursive: true });
  writeFileSync(path.join(PUBLIC_BRAND, "ese-emblem.webp"), data);
  console.log(
    `public/brand/ese-emblem.webp       ` +
      `${info.width}x${info.height}  ${(data.length / 1024).toFixed(0)} KB`,
  );
}

/**
 * The Open Graph card: the themed emblem centred on the site's forest, 1200x630.
 *
 * Composed here rather than rendered per-request by `next/og`, because nothing
 * about it varies. A static file costs no function invocation, and a social
 * crawler that ignores cache headers still gets a stable image.
 *
 * Forest ground with a cream outline, which is the footer's combination — not the
 * cream page ground. A card is seen in a feed beside other cards, where the
 * site's dark tone reads as deliberate and its cream reads as a blank image.
 *
 * An earlier version used brand navy and the kit's original artwork. It is now
 * the site's own palette for the same reason the header logo is: a social card is
 * usually the first ESE mark somebody sees, and it should be the mark the site
 * then shows them.
 *
 * `inset: 0.48` — the emblem is the only element, so the restraint is the design.
 * Scaled to fill the card it reads as a cropped texture rather than a mark.
 */
const OG = { width: 1200, height: 630, inset: 0.48 };

async function writeOpenGraphImage(marks, colours, ink, ground) {
  const svg = themedEmblemSvg({
    marks,
    colours,
    ink,
    ground,
    width: OG.width,
    height: OG.height,
    inset: OG.inset,
  });
  const card = await sharp(svg).png().toBuffer();

  mkdirSync(PUBLIC_BRAND, { recursive: true });
  writeFileSync(path.join(PUBLIC_BRAND, "og-default.png"), card);
  console.log(
    `public/brand/og-default.png        ${OG.width}x${OG.height}  ` +
      `${(card.length / 1024).toFixed(0)} KB`,
  );
}

async function main() {
  requirePdftocairo();

  /**
   * Every colour baked into a raster below is read from `tokens.css`, never
   * written here. `--color-forest` is the ink for the icons and `--color-canvas`
   * would be too light on them; the social card inverts the pair, matching the
   * footer.
   */
  const css = readFileSync(TOKENS, "utf8");
  const colours = {
    land: token(css, "ese-band-land"),
    water: token(css, "ese-band-water"),
    sunrise: token(css, "ese-band-sunrise"),
  };
  const forest = token(css, "color-forest");
  const canvas = token(css, "color-canvas");

  const dir = mkdtempSync(path.join(tmpdir(), "ese-brand-"));
  try {
    const marks = buildMarks(dir);
    writeMarkPaths(marks);

    console.log(
      `\ncolours from tokens.css — land ${colours.land}  water ${colours.water}` +
        `  sunrise ${colours.sunrise}  ink ${forest}`,
    );

    await writeIcons(marks, colours, forest, canvas);
    await writePublicBrand(marks, colours, forest);
    await writeOpenGraphImage(marks, colours, canvas, forest);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
