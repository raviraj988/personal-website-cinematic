/**
 * Normalise any cover source to one shape: 1200×630 WebP.
 *
 * ## Why this is not `reencodeCover`
 *
 * `src/lib/blog/image-server.ts` deliberately **preserves aspect ratio and
 * format** — `fit: "inside"`, `MAX_EDGE` 2400, PNG stays PNG. That is the right
 * behaviour for a human upload: an author who exported a diagram as PNG or
 * cropped a portrait meant it, and silently reflowing their image to a 1.91:1
 * letterbox would be the tool overruling them. Do not change that function to
 * suit this one.
 *
 * Generated and imported artwork is the opposite case. Nobody chose its
 * dimensions, it exists to be a link preview, and Open Graph consumers all expect
 * 1200×630. So this is a second normaliser rather than a parameter on the first.
 *
 * ## Two details borrowed from `reencodeCover`, both load-bearing
 *
 * `.rotate()` with no argument comes **before** anything else. It bakes the EXIF
 * orientation flag into the pixels while that flag still exists; without it,
 * every photo shot in portrait is stored sideways once the metadata is dropped.
 *
 * And the bytes are re-encoded rather than passed through. That is what strips
 * EXIF — including GPS. `image-server.ts` gives the reason that matters here too:
 * a photograph taken on a phone at a community meeting carries the coordinates of
 * that meeting, and `blog-images` is a public bucket on a CDN origin. Re-encoding
 * also drops anything appended after the image data, which is otherwise a
 * convenient way to host a payload on somebody else's domain.
 */
import sharp from "sharp";
import { COVER } from "./brand";
import { sniffImage, COVER_MAX_BYTES } from "../src/lib/blog/image";

/**
 * Ceiling on decoded pixels.
 *
 * sharp's own default is 0x3FFF_FFFF. A small, highly compressible file can
 * declare enormous dimensions — a 20000×20000 single-colour PNG is a few
 * kilobytes on disk and gigabytes decoded — so the cap is set to something a
 * legitimate cover source cannot exceed. 100 megapixels is roughly a 10000×10000
 * image, far past anything a 1200×630 target needs.
 */
const MAX_INPUT_PIXELS = 100_000_000;

/** WebP quality. Matches what `reencodeCover` uses for the same reason. */
const WEBP_QUALITY = 82;

/**
 * Every field is a literal type, not the general one.
 *
 * `contentType` is `"image/webp"` rather than `CoverMime` on purpose: this
 * function emits exactly one format, and typing it as the union would push a
 * needless narrowing onto every caller — including the storage upload, which has
 * to name a real MIME type.
 */
export type NormalisedCover = {
  bytes: Uint8Array;
  width: number;
  height: number;
  format: "webp";
  contentType: "image/webp";
  ext: "webp";
};

export type NormaliseResult =
  | { ok: true; cover: NormalisedCover }
  | { ok: false; reason: string };

/**
 * Decode, validate, and re-emit as a 1200×630 WebP.
 *
 * Returns a reason rather than throwing: every caller of this treats failure as
 * "fall back to the next cover source", and a coverless draft is valid, so there
 * is nothing here worth turning into an exception.
 */
export async function normaliseCover(input: Uint8Array): Promise<NormaliseResult> {
  if (input.byteLength === 0) return { ok: false, reason: "The image was empty." };

  // Magic bytes before sharp sees it. The type is never taken from a filename, a
  // URL, or a Content-Type header — all three are supplied by whoever supplied
  // the image. This also refuses SVG by name, which matters because an SVG is a
  // document that can carry script and these files are served publicly.
  const sniffed = sniffImage(input);
  if (!sniffed.ok) return { ok: false, reason: sniffed.error };

  try {
    const bytes = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      // Before the resize, and before the metadata carrying the flag is dropped.
      .rotate()
      .resize({
        width: COVER.width,
        height: COVER.height,
        // `cover`, not `inside`: the output must be exactly 1200×630, and
        // cropping to fill reads better than letterboxing artwork nobody framed.
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    if (bytes.byteLength > COVER_MAX_BYTES) {
      return {
        ok: false,
        reason: `The processed cover is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB, over the bucket's 5 MB limit.`,
      };
    }

    return {
      ok: true,
      cover: {
        bytes,
        width: COVER.width,
        height: COVER.height,
        format: "webp",
        contentType: "image/webp",
        ext: "webp",
      },
    };
  } catch {
    // Sniffing proves a file *starts* like an image. It says nothing about the
    // rest of it, and a file that cannot be decoded is not a usable image
    // whatever its first eight bytes claim.
    return {
      ok: false,
      reason: "The image could not be decoded. It may be truncated or corrupt.",
    };
  }
}
