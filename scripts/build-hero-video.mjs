/**
 * Builds the hero background video from a still photograph.
 *
 * WHY THIS EXISTS, AND WHAT IT IS NOT
 * -----------------------------------
 * The hero wants moving footage. This repository has none, and the public-domain
 * government archives that supply its photographs do not have usable footage
 * either — USGS's river videos are terrain visualisations with a burned-in
 * agency watermark and a date counter, which is a data product, not B-roll.
 *
 * So this renders a slow push across a still instead. Be clear-eyed about what
 * that buys: a Ken Burns move encoded to h264 is a WORSE way to do a Ken Burns
 * move than a CSS transform on the responsive image already in the page. It
 * costs a download, it is locked to one resolution, and it cannot show a single
 * thing the still does not already show — no moving water, no drifting cloud, no
 * wind in a canopy. Those are the only reasons a hero video beats a hero image.
 *
 * It is here because it makes the video PIPELINE real: two encodes, a poster, and
 * a component that has been tested against actual files rather than written
 * blind. Drop real footage in as `SOURCE` and the whole path works unchanged.
 *
 * The source is one of the repository's own generated placeholders, so nothing
 * here is licensed from anyone and no real person is depicted. See the pool rule
 * in `lib/data/ese-content.ts`.
 *
 *   node scripts/build-hero-video.mjs
 *
 * Requires ffmpeg on PATH.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "public/images/cinematic-river-valley.jpg";
const OUT_DIR = "public/video";
const TMP = join(OUT_DIR, ".tmp");

/* A palindrome, which is what makes the loop seamless.
 *
 * The push runs for HALF_SECONDS and is then concatenated with its own reverse,
 * so the last frame is the first frame and `loop` has nothing to cut. A one-way
 * push jumps back to its start every cycle, which on a hero reads as a glitch —
 * the one artefact a background loop can never get away with. */
const HALF_SECONDS = 10;
const FPS = 25;

/* Two encodes, keyed to how the element picks a source: the desktop file is only
 * ever fetched above 48rem, so the phone never pays for it. */
const RENDITIONS = [
  { name: "hero-loop-desktop", w: 1440, h: 810, crf: 30 },
  { name: "hero-loop-mobile", w: 960, h: 540, crf: 32 },
];

/* The zoom ceiling. 1.13 on a 1672px source means the tightest crop is ~1480px
 * against a 1440px output — just inside 1:1, so the push never resolves detail
 * the photograph does not have. Raising this starts upscaling and the softness
 * shows immediately behind the headline. */
const ZOOM_MAX = 1.13;

function ff(args) {
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
}

function mb(p) {
  return (statSync(p).size / 1e6).toFixed(2);
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

for (const { name, w, h, crf } of RENDITIONS) {
  const frames = HALF_SECONDS * FPS;
  const step = (ZOOM_MAX - 1) / frames;
  const forward = join(TMP, `${name}-fwd.mp4`);
  const reversed = join(TMP, `${name}-rev.mp4`);

  /* The 2x pre-scale is not cosmetic. `zoompan` computes its crop in whole
     source pixels, so on a 1672px original each frame's zoom snaps to a integer
     boundary and the push visibly stutters. Doubling the source halves the size
     of that step and the move goes smooth. */
  ff([
    "-loop", "1", "-i", SOURCE,
    "-vf",
    `scale=${1672 * 2}:${941 * 2}:flags=lanczos,` +
      `zoompan=z='min(1+${step.toFixed(8)}*on,${ZOOM_MAX})':d=${frames}` +
      `:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${w}x${h}:fps=${FPS},` +
      `format=yuv420p`,
    "-t", String(HALF_SECONDS),
    "-an", "-c:v", "libx264", "-crf", String(crf), "-preset", "slow",
    forward,
  ]);

  ff(["-i", forward, "-vf", "reverse", "-an", "-c:v", "libx264", "-crf", String(crf), "-preset", "slow", reversed]);

  /* `-movflags +faststart` puts the moov atom first so playback can begin before
     the file has finished arriving. Without it a hero video waits for the whole
     download. */
  ff([
    "-i", forward, "-i", reversed,
    "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[v]",
    "-map", "[v]", "-an",
    "-c:v", "libx264", "-crf", String(crf), "-preset", "slow",
    "-movflags", "+faststart",
    join(OUT_DIR, `${name}.mp4`),
  ]);

  console.log(`  ${name}.mp4  ${w}x${h}  ${mb(join(OUT_DIR, `${name}.mp4`))} MB`);
}

/* The poster is the video's own first frame, not the source photograph.
 *
 * They are not the same picture: frame 0 is already at zoom 1.0 but cropped to
 * the render's aspect, so using the uncropped original would make the video
 * jump the moment it starts playing. */
ff([
  "-i", join(OUT_DIR, "hero-loop-desktop.mp4"),
  "-frames:v", "1", "-q:v", "4",
  join(OUT_DIR, "hero-loop-poster.jpg"),
]);
console.log(`  hero-loop-poster.jpg  ${mb(join(OUT_DIR, "hero-loop-poster.jpg"))} MB`);

rmSync(TMP, { recursive: true, force: true });
