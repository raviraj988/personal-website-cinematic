/**
 * The last-resort cover: an ESE-branded typographic card.
 *
 * This is what a draft gets when no `imageUrl` was supplied and image generation
 * is unavailable — no API key, a timeout, a provider error, bytes that will not
 * decode. It must therefore be the one path in the cover pipeline that cannot
 * itself fail for an interesting reason: no network, no API, no font file
 * shipped alongside, nothing to configure.
 *
 * It should also never be the *normal* result of omitting `imageUrl`. If drafts
 * are coming back with `source: "composed-brand-cover"`, that is a signal that
 * generation is broken, not that the fallback is working well.
 *
 * ## Why an SVG rasterised by sharp
 *
 * sharp renders SVG through libvips, which resolves font families through
 * fontconfig against whatever the host actually has. That is why the stacks in
 * `brand.ts` end in a generic family: a missing Georgia degrades to some serif
 * rather than to blank. The alternative — compositing text from a bundled font
 * file — would mean shipping a binary asset for the path that exists to work when
 * nothing else does.
 *
 * The title is escaped and hard-wrapped here rather than left to the renderer:
 * SVG has no text flow, and an unescaped `&` in a post title would produce
 * malformed XML that libvips refuses outright.
 */
import sharp from "sharp";
import { BRAND, COVER, COVER_FONTS } from "./brand";
import { normaliseCover, type NormalisedCover } from "./cover-normalise";

/** Escape the five XML metacharacters. An unescaped `&` breaks the whole document. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Greedy wrap by estimated width.
 *
 * Estimated rather than measured: measuring would mean asking the renderer, and
 * the renderer is the thing this module is trying not to depend on the details
 * of. 0.52em per character is a reasonable average for a serif at display size,
 * and the consequence of being wrong is a line that is slightly short.
 */
function wrap(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const perChar = fontSize * 0.52;
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length * perChar > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }

  if (lines.length < maxLines && current) lines.push(current);

  // Ellipsis on the last line if anything was dropped, so a truncated title
  // reads as truncated rather than as a strange short title.
  const used = lines.join(" ").split(/\s+/).length;
  if (used < words.length && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1]}…`;
  }

  return lines;
}

export type BrandCoverInput = {
  title: string;
  /** The section or topic line above the title. */
  eyebrow: string;
  /** ESE's wordmark, bottom left. */
  wordmark: string;
};

export function buildBrandCoverSvg(input: BrandCoverInput): string {
  const { width, height } = COVER;
  const margin = 88;
  const titleSize = 62;
  const lines = wrap(input.title, titleSize, width - margin * 2, 4);

  // Bottom-anchored so a one-line title and a four-line title share a baseline
  // rather than one floating in the middle of the card.
  const blockBottom = height - margin - 74;
  const firstBaseline = blockBottom - (lines.length - 1) * (titleSize * 1.18);

  const titleTspans = lines
    .map(
      (line, index) =>
        `<text x="${margin}" y="${firstBaseline + index * titleSize * 1.18}" font-family="${COVER_FONTS.display}" font-size="${titleSize}" fill="${BRAND.ink}">${escapeXml(line)}</text>`,
    )
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BRAND.groundSoft}"/>
      <stop offset="100%" stop-color="${BRAND.ground}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#ground)"/>
  <rect x="0" y="0" width="${width}" height="8" fill="${BRAND.accent}"/>
  <g>
    <text x="${margin}" y="${margin + 18}" font-family="${COVER_FONTS.mono}" font-size="21" letter-spacing="3.5" fill="${BRAND.accent}">${escapeXml(input.eyebrow.toUpperCase())}</text>
    ${titleTspans}
    <rect x="${margin}" y="${height - margin - 46}" width="64" height="3" fill="${BRAND.accent}"/>
    <text x="${margin}" y="${height - margin + 2}" font-family="${COVER_FONTS.display}" font-size="26" fill="${BRAND.muted}">${escapeXml(input.wordmark)}</text>
  </g>
</svg>`;
}

export type BrandCoverResult =
  | { ok: true; cover: NormalisedCover }
  | { ok: false; reason: string };

/**
 * Rasterise the card and hand it through the same normaliser as every other
 * source, so the output shape is identical whatever produced it.
 */
export async function composeBrandCover(
  input: BrandCoverInput,
): Promise<BrandCoverResult> {
  try {
    const png = await sharp(Buffer.from(buildBrandCoverSvg(input)), {
      density: 144,
    })
      .png()
      .toBuffer();

    return await normaliseCover(png);
  } catch (error) {
    return {
      ok: false,
      reason: `The branded cover could not be rendered: ${
        error instanceof Error ? error.message.replace(/\s+/g, " ").slice(0, 160) : "unknown"
      }`,
    };
  }
}

/**
 * Alt text for the branded card.
 *
 * Deliberately ignores any `imageAlt` the caller supplied: that text was written
 * for artwork that was never produced, so it would describe an image that does
 * not exist. Describing the card itself is the honest answer, and alt text that
 * confidently describes the wrong image is worse than plain text for the readers
 * who depend on it.
 */
export function brandCoverAlt(input: BrandCoverInput): string {
  return `A plain ${input.wordmark} title card, dark green, reading “${input.title}”.`;
}
