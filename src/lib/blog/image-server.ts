import sharp from "sharp";
import { COVER_MAX_BYTES, type CoverMime } from "./image";

/**
 * No `server-only` marker here, unlike `lib/supabase/service.ts`.
 *
 * That marker exists to stop a secret reaching a client bundle. This module holds
 * no secret, and `sharp` is a native binding that could not run in a browser even
 * if something tried to import it — so the marker would add no protection while
 * making the function unimportable from a plain `node` process. Stripping EXIF is
 * a privacy guarantee worth asserting against real files, so testability wins.
 */

/**
 * Longest edge a cover is stored at.
 *
 * The post page asks for at most 1100px and the index cards far less, so anything
 * beyond this is bytes nobody downloads. Generous enough to stay sharp on a 2×
 * display at full width.
 */
const MAX_EDGE = 2400;

export type ReencodeResult =
  | { ok: true; data: Buffer; mime: CoverMime; extension: "jpg" | "png" | "webp" }
  | { ok: false; error: string };

/**
 * Re-encode an uploaded cover instead of storing the bytes we were handed.
 *
 * Passing the magic-byte check proves a file *starts* like a JPEG. It says nothing
 * about the rest of it. Storing the original would publish, from our own origin:
 *
 *   - **EXIF metadata**, including GPS coordinates. A photograph taken on a phone
 *     at a community meeting carries the location of that meeting, and a public
 *     bucket would serve it to anyone who downloads the picture. This is the
 *     reason that matters most here.
 *   - **Anything appended after the image data.** A valid image followed by
 *     arbitrary bytes is still a valid image to a decoder, and a convenient way to
 *     host a payload on somebody else's domain.
 *   - **Absurd dimensions.** A 20000×20000 PNG is small on disk and ruinous to
 *     decode in a browser.
 *
 * Decoding and re-emitting drops all three. `sharp` writes no metadata unless
 * asked, so the strip is the default rather than an extra call.
 *
 * `.rotate()` with no argument is load-bearing and easy to delete by accident: it
 * bakes the EXIF orientation flag into the pixels *before* the metadata carrying
 * that flag is discarded. Without it, every photo shot in portrait on a phone is
 * stored sideways.
 */
export async function reencodeCover(
  input: Uint8Array,
  mime: CoverMime,
): Promise<ReencodeResult> {
  try {
    const pipeline = sharp(input, { failOn: "error" })
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      });

    // Format is preserved so an author's choice of PNG for a diagram or WebP for
    // a photo is respected, rather than silently normalising everything to JPEG.
    const { data, extension, outMime } =
      mime === "image/png"
        ? {
            data: await pipeline.png({ compressionLevel: 9 }).toBuffer(),
            extension: "png" as const,
            outMime: "image/png" as const,
          }
        : mime === "image/webp"
          ? {
              data: await pipeline.webp({ quality: 82 }).toBuffer(),
              extension: "webp" as const,
              outMime: "image/webp" as const,
            }
          : {
              data: await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
              extension: "jpg" as const,
              outMime: "image/jpeg" as const,
            };

    // Re-encoding almost always shrinks a file, but a pathological source can
    // grow — a photographic PNG, for instance. The bucket would reject it with a
    // storage error, so it is caught here where the message can be useful.
    if (data.byteLength > COVER_MAX_BYTES) {
      return {
        ok: false,
        error:
          "That image is still over 5 MB after processing. Try exporting it as JPEG, or at smaller pixel dimensions.",
      };
    }

    return { ok: true, data, mime: outMime, extension };
  } catch {
    // A file that sniffed as an image but cannot be decoded is not a usable
    // image, whatever it is. Refusing it is both the safe and the correct answer.
    return {
      ok: false,
      error:
        "That file could not be read as an image. It may be truncated or corrupt — try re-exporting it.",
    };
  }
}
