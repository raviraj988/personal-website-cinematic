/**
 * Cover-image identification. Deliberately dependency-free.
 *
 * This module imports nothing — not the config, not `server-only`, not `sharp`.
 * That is the point: magic-byte sniffing is the security check most worth having a
 * test for, and a module that reaches for a path alias or a native binding cannot
 * be run by a plain `node` process. Re-encoding, which does need `sharp`, lives in
 * `image-server.ts` behind `server-only`.
 */

/** Mirrors the bucket's `file_size_limit` in the migration. */
export const COVER_MAX_BYTES = 5 * 1024 * 1024;

/** The three formats the bucket accepts. */
export type CoverMime = "image/jpeg" | "image/png" | "image/webp";

export type SniffResult =
  | { ok: true; mime: CoverMime; extension: "jpg" | "png" | "webp" }
  | { ok: false; error: string };

/**
 * Identify an uploaded image from its **magic bytes**.
 *
 * Neither the filename nor the browser's declared `Content-Type` is consulted.
 * Both are supplied by the client and both are trivially wrong: `.png` is a
 * rename away, and the multipart `Content-Type` header is whatever the request
 * says it is. Reading the file's own leading bytes is the only check here that an
 * attacker does not control.
 *
 * SVG is called out by name in the rejection rather than falling through to the
 * generic message, because "why was my SVG refused" is a question worth
 * answering once, in the product, instead of in a support thread. It is refused
 * because an SVG is a document that can carry `<script>`, and these files are
 * served from a public bucket on a CDN origin.
 */
export function sniffImage(bytes: Uint8Array): SniffResult {
  if (bytes.length < 12) {
    return { ok: false, error: "That file is too small to be an image." };
  }

  // FF D8 FF — JPEG SOI followed by the first marker.
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ok: true, mime: "image/jpeg", extension: "jpg" };
  }

  // 89 "PNG" CR LF SUB LF — the full 8-byte PNG signature.
  if (
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return { ok: true, mime: "image/png", extension: "png" };
  }

  // "RIFF" .... "WEBP" — a RIFF container whose form type is WEBP. Both halves
  // are checked: "RIFF" alone is also how a WAV file starts.
  if (
    matchesAscii(bytes, 0, "RIFF") &&
    matchesAscii(bytes, 8, "WEBP")
  ) {
    return { ok: true, mime: "image/webp", extension: "webp" };
  }

  if (looksLikeSvg(bytes)) {
    return {
      ok: false,
      error:
        "SVG files are not accepted. An SVG can contain script, and cover images are served from a public URL. Export the artwork as PNG, JPEG, or WebP.",
    };
  }

  if (matchesAscii(bytes, 0, "GIF8")) {
    return {
      ok: false,
      error: "GIF files are not accepted. Use PNG, JPEG, or WebP.",
    };
  }

  return {
    ok: false,
    error:
      "That file is not a JPEG, PNG, or WebP image. The check reads the file's own contents, so renaming the extension will not help.",
  };
}

/**
 * Size gate, mirroring the bucket's `file_size_limit`.
 *
 * Checked here so an oversized file fails with a sentence a person can act on,
 * rather than as a storage API error. The bucket's own limit is the copy that
 * actually cannot be bypassed.
 */
export function checkCoverSize(size: number): { ok: true } | { ok: false; error: string } {
  if (size === 0) return { ok: false, error: "That file is empty." };

  if (size > COVER_MAX_BYTES) {
    const mb = (size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: `That image is ${mb} MB. The limit is 5 MB — try exporting it at a lower quality or a smaller pixel size.`,
    };
  }

  return { ok: true };
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function matchesAscii(bytes: Uint8Array, offset: number, ascii: string): boolean {
  for (let index = 0; index < ascii.length; index += 1) {
    if (bytes[offset + index] !== ascii.charCodeAt(index)) return false;
  }
  return true;
}

/**
 * SVG has no magic number — it is XML, so detection means looking for its
 * opening markup past any leading whitespace, BOM, XML declaration, or comment.
 */
function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, 1024))
    .trimStart()
    .toLowerCase();

  return (
    head.startsWith("<svg") ||
    head.startsWith("<?xml") ||
    head.startsWith("<!doctype svg") ||
    head.includes("<svg")
  );
}
