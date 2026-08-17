/**
 * Turns the supplied photograph archive into the site's image set.
 *
 * Run once after dropping a new archive into `ref_docs/`:
 *
 *   node scripts/prepare-images.mjs
 *
 * `maxWidth` is a **ceiling expressing what the slot needs**, not a resize target.
 * `withoutEnlargement` means a source smaller than its ceiling passes through at
 * its own size, so nothing here is ever interpolated upward.
 *
 * These ceilings were raised when the re-exported photographs arrived. The first
 * archive was 480–640px, so the old ceilings (900–1400) never bound anything. The
 * revised files are 1050–1600px, and the old ceilings would have quietly
 * *downscaled* them — throwing away the exact detail the re-export existed to
 * add. If a future archive is larger again, raise these rather than assuming they
 * are inert.
 *
 * Metadata is dropped on the way through. The supplied files carried no GPS
 * tags, but that is a property of this particular archive rather than a
 * guarantee about the next one, so the strip is unconditional.
 *
 * Output is WebP into `public/images/ese/`, plus `manifest.json` holding the
 * real emitted dimensions — the content layer reads those rather than
 * hard-coding numbers that drift the moment a photograph is re-cropped.
 */

import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARCHIVE = path.join(ROOT, "ref_docs", "drive-download-20260813T050944Z-1-001.zip");
const OUT_DIR = path.join(ROOT, "public", "images", "ese");

/**
 * A folder of re-exported photographs, used in preference to the original archive
 * when it exists.
 *
 * The first archive was a reduced-size export — 480×640 for all but one file. This
 * folder holds the same photographs at 1050–1600px on the long edge, with EXIF
 * orientation already applied and metadata stripped. Same filenames, so the
 * `SELECTED` table below needs no changes.
 */
const REVISED_DIR = path.join(ROOT, "ref_docs", "revised_images");

/**
 * The selection.
 *
 * 26 photographs were supplied. These are the ones that read as professional
 * once treated: three genuinely on-brief work photographs, and a set of
 * landscapes strong enough to carry a section. The rest — selfies, a dog on a
 * porch, garden produce, a campfire — are a personal album rather than an
 * environmental practice, and are deliberately not copied into the repository.
 *
 * `slug` is what the site refers to the image by, so a re-crop or a swapped
 * source file never requires touching a component.
 */
const SELECTED = [
  { file: "IMG_3697.jpeg", slug: "hero-pines", maxWidth: 1400 },
  { file: "IMG_0244.JPG", slug: "portrait-laura", maxWidth: 1200 },
  { file: "IMG_1195.JPG", slug: "working-session", maxWidth: 1600 },
  { file: "IMG_3191.jpeg", slug: "conference-session", maxWidth: 1600 },
  { file: "IMG_1118.jpeg", slug: "service-policy", maxWidth: 1400 },
  { file: "IMG_1244.jpeg", slug: "service-grants", maxWidth: 1400 },
  { file: "IMG_1092.jpeg", slug: "service-technical", maxWidth: 1400 },
  { file: "IMG_1249.jpeg", slug: "service-resilience", maxWidth: 1400 },
  { file: "IMG_1347.jpeg", slug: "service-communications", maxWidth: 1400 },
  { file: "IMG_3585.jpeg", slug: "case-study-water", maxWidth: 1600 },
  { file: "IMG_1275.jpeg", slug: "approach-roots", maxWidth: 1600 },
  { file: "IMG_2324.jpeg", slug: "contact-horizon", maxWidth: 1600 },
  { file: "IMG_1119.jpeg", slug: "news-shoreline", maxWidth: 1400 },
];

function extractArchive() {
  const dir = mkdtempSync(path.join(tmpdir(), "ese-images-"));
  execFileSync("unzip", ["-o", "-q", ARCHIVE, "-d", dir]);
  return dir;
}

/**
 * Returns the directory to read from, and whether it is a temporary extraction
 * that should be deleted afterwards. The revised folder is checked in, so it must
 * not be.
 */
function resolveSource() {
  if (existsSync(REVISED_DIR)) {
    return { dir: REVISED_DIR, temporary: false, label: "ref_docs/revised_images" };
  }
  return { dir: extractArchive(), temporary: true, label: "the original archive" };
}

async function main() {
  const { dir: source, temporary, label } = resolveSource();
  console.log(`Reading from ${label}\n`);

  try {
    const available = new Set(readdirSync(source));
    const missing = SELECTED.filter((s) => !available.has(s.file));
    if (missing.length) {
      throw new Error(
        `${label} is missing ${missing.length} selected file(s): ${missing
          .map((m) => m.file)
          .join(", ")}`,
      );
    }

    mkdirSync(OUT_DIR, { recursive: true });

    const manifest = {};

    for (const { file, slug, maxWidth } of SELECTED) {
      const { data, info } = await sharp(path.join(source, file))
        // Phone photographs carry their orientation in EXIF. Applying it before
        // the metadata strip is what keeps portrait shots upright once the tag
        // that described them is gone.
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });

      writeFileSync(path.join(OUT_DIR, `${slug}.webp`), data);
      manifest[slug] = { width: info.width, height: info.height };

      console.log(
        `${slug.padEnd(24)} ${String(info.width).padStart(4)}x${String(info.height).padEnd(4)}  ${(data.length / 1024).toFixed(0)} KB`,
      );
    }

    writeFileSync(
      path.join(OUT_DIR, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    console.log(`\n${SELECTED.length} images written to public/images/ese/`);
  } finally {
    // Only a temporary extraction gets removed; `revised_images` is checked in.
    if (temporary) rmSync(source, { recursive: true, force: true });
  }
}

await main();
