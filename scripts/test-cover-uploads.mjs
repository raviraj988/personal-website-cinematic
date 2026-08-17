/**
 * Cover-upload checks, run against real image bytes.
 *
 *   node scripts/test-cover-uploads.mjs
 *
 * No database and no credentials needed. These assert the two properties the
 * upload path exists to guarantee: that a file's type is decided by its contents
 * rather than its name, and that nothing an uploaded photograph carries alongside
 * its pixels survives into the public bucket.
 */
import sharp from "sharp";
import { sniffImage, checkCoverSize } from "../src/lib/blog/image.ts";
import { reencodeCover } from "../src/lib/blog/image-server.ts";

let failures = 0;
const ok = (pass, name, detail = "") => {
  if (!pass) failures += 1;
  console.log(`${pass ? "PASS " : "FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
};

const solid = (w, h) =>
  sharp({ create: { width: w, height: h, channels: 3, background: "#4a6b52" } });

/* ------------------------------------------------------- magic-byte sniffing */

const jpeg = await solid(64, 64).jpeg().toBuffer();
const png = await solid(64, 64).png().toBuffer();
const webp = await solid(64, 64).webp().toBuffer();
const gif = Buffer.from("GIF89a" + "\0".repeat(20), "binary");
const svg = Buffer.from(
  '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
);
const wav = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.alloc(4),
  Buffer.from("WAVEfmt "),
]);

ok(sniffImage(jpeg).mime === "image/jpeg", "JPEG identified from magic bytes");
ok(sniffImage(png).mime === "image/png", "PNG identified from magic bytes");
ok(sniffImage(webp).mime === "image/webp", "WebP identified from magic bytes");
ok(sniffImage(gif).ok === false, "GIF refused");
ok(
  sniffImage(svg).ok === false && /SVG/.test(sniffImage(svg).error),
  "SVG refused, and told it is an SVG",
);
ok(sniffImage(wav).ok === false, "WAV refused (RIFF alone is not enough for WebP)");
ok(sniffImage(Buffer.alloc(4)).ok === false, "Truncated file refused");

// The whole point of sniffing: a lie in the filename or the declared MIME type
// changes nothing, because neither is consulted.
ok(
  sniffImage(svg).ok === false,
  "An SVG named cover.png is still refused",
  "filename is never read",
);
ok(sniffImage(jpeg).extension === "jpg", "Extension comes from the sniffed type");

/* --------------------------------------------------------------- size gate */

ok(checkCoverSize(0).ok === false, "Empty file refused");
ok(checkCoverSize(4 * 1024 * 1024).ok === true, "4 MB accepted");
ok(checkCoverSize(6 * 1024 * 1024).ok === false, "6 MB refused (5 MB bucket limit)");

/* ------------------------------------------------- re-encoding: EXIF and GPS */

// A photograph as a camera or phone would hand it over: EXIF present, including
// GPS coordinates of wherever it was taken.
const withGps = await solid(200, 150)
  .withExif({
    IFD0: { Make: "TestCam", Model: "X100", Copyright: "someone" },
    GPS: { GPSLatitudeRef: "N", GPSLongitudeRef: "W" },
  })
  .jpeg()
  .toBuffer();

const beforeMeta = await sharp(withGps).metadata();
ok(Boolean(beforeMeta.exif), "Fixture really does carry EXIF to begin with");

const reencoded = await reencodeCover(new Uint8Array(withGps), "image/jpeg");
ok(reencoded.ok === true, "Photograph re-encodes successfully");

if (reencoded.ok) {
  const afterMeta = await sharp(reencoded.data).metadata();
  ok(!afterMeta.exif, "EXIF is gone after re-encoding", "GPS cannot leak to the CDN");
  ok(!afterMeta.icc, "ICC profile is gone after re-encoding");
  ok(afterMeta.format === "jpeg", "JPEG stays a JPEG");
}

/* ------------------------------------------- re-encoding: appended payloads */

// A valid JPEG with arbitrary bytes stapled to the end is still a valid JPEG to
// any decoder, and a tidy way to host a payload on somebody else's domain.
const smuggled = Buffer.concat([jpeg, Buffer.from("<?php system($_GET[0]); ?>")]);
ok(sniffImage(smuggled).mime === "image/jpeg", "Appended payload still sniffs as JPEG");

const cleaned = await reencodeCover(new Uint8Array(smuggled), "image/jpeg");
ok(
  cleaned.ok === true && !cleaned.data.includes(Buffer.from("php system")),
  "Appended payload does not survive re-encoding",
);

/* --------------------------------------------------- re-encoding: dimensions */

const huge = await solid(5000, 4000).jpeg().toBuffer();
const bounded = await reencodeCover(new Uint8Array(huge), "image/jpeg");
if (bounded.ok) {
  const meta = await sharp(bounded.data).metadata();
  ok(
    Math.max(meta.width, meta.height) === 2400,
    "5000px image is bounded to a 2400px long edge",
    `${meta.width}×${meta.height}`,
  );
} else {
  ok(false, "Oversized image re-encodes");
}

const small = await reencodeCover(new Uint8Array(png), "image/png");
if (small.ok) {
  const meta = await sharp(small.data).metadata();
  ok(meta.width === 64, "A small image is not upscaled", `${meta.width}px`);
  ok(meta.format === "png", "PNG stays a PNG (author's format choice respected)");
}

/* ------------------------------------------------------- orientation, format */

// EXIF orientation 6 means "rotate 90° clockwise on display". Stripping EXIF
// without baking it in first would leave the photo sideways forever.
//
// Note `withMetadata({orientation})` rather than `withExif({IFD0:{Orientation}})`:
// the latter does not actually set the orientation tag — it reads back as 1 — so a
// fixture built that way would let this assertion pass no matter what the code
// did. Hence the guard on the next line.
const rotated = await solid(200, 100).withMetadata({ orientation: 6 }).jpeg().toBuffer();

ok(
  (await sharp(rotated).metadata()).orientation === 6,
  "Fixture really is flagged as needing a 90° rotation",
);

const uprighted = await reencodeCover(new Uint8Array(rotated), "image/jpeg");
if (uprighted.ok) {
  const meta = await sharp(uprighted.data).metadata();
  ok(
    meta.width === 100 && meta.height === 200,
    "EXIF orientation is baked into the pixels before EXIF is dropped",
    `${meta.width}×${meta.height}`,
  );
  ok(
    meta.orientation === undefined,
    "The orientation tag itself is gone, so nothing rotates it twice",
  );
}

const corrupt = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(200, 7)]);
const refused = await reencodeCover(new Uint8Array(corrupt), "image/jpeg");
ok(refused.ok === false, "A file that sniffs as JPEG but cannot be decoded is refused");

console.log(
  failures === 0
    ? "\nAll cover-upload checks passed."
    : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
