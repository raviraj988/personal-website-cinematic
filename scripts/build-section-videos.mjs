/**
 * Transcodes the supplied footage in `videos/` into web-sized section backdrops.
 *
 * `videos/` is 430MB of mostly-4K vertical source and is NOT served — it is the
 * master folder. Everything the site actually loads is built from it into
 * `public/video/` by this script.
 *
 * TWO ENCODES PER CLIP, AND THE CROP IS THE POINT
 * -----------------------------------------------
 * Ten of the eleven masters are portrait (1080x1920 and up). A backdrop is
 * displayed with `object-fit: cover`, so on a wide screen a portrait clip has
 * most of its height thrown away by the browser — after it has been downloaded.
 * Cropping to 16:9 at encode time instead means those pixels are never shipped:
 * a 1080x1920 master carries ~2.07M pixels per frame, the 16:9 slice the desktop
 * actually shows is ~0.66M. That is the single biggest saving here, far more than
 * any CRF change.
 *
 * So: `wide` is a centre-cut 16:9 for desktop, `tall` is a centre-cut 9:16 for
 * phones, and `<source media>` picks one. Neither device fetches the other.
 *
 * A caveat worth knowing when picking clips: a 16:9 centre-cut of a VERTICAL
 * composition is a thin horizontal band through the middle of it. Textural
 * footage — canopy, water, foliage — survives that intact. A scenic vertical with
 * its subject at the top or bottom does not, and should be given the `tall` slot
 * only, or replaced with landscape footage.
 *
 * SLOW MOTION IS NOT BAKED IN
 * ---------------------------
 * Deliberately. Slowing with `setpts` at a fixed 30fps output just duplicates
 * frames — the result is identical to setting `playbackRate` in the browser, but
 * it costs a longer file and locks the rate at encode time. True smooth slow
 * motion needs optical-flow interpolation (`minterpolate`), which is slow and
 * tears badly on exactly the moving water and foliage these clips are made of.
 * `VideoBackdrop` sets `playbackRate` instead: free, tunable per section, and
 * with no interpolation artefacts.
 *
 *   node scripts/build-section-videos.mjs
 *
 * Requires ffmpeg on PATH.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC = "videos";
const OUT = "public/video";

/* `start` skips a lead-in that is dark, static, or holds a logo; `seconds` is how
   much to keep. Backdrops are crossfaded rather than looped seamlessly, so these
   do not need to be palindromes — the cut is always hidden under a dissolve. */
const CLIPS = [
  /* Two surfaces, four clips, every one of them from a >=2560px master. That is
     now a hard rule for this page rather than a coincidence: anything whose 16:9
     crop lands under 2560 wide is visibly soft full-bleed at 2x, and no encoder
     setting recovers it. */

  // ---- hero: one clip, looping.
  /* A 4096x2160 master at 25 Mbps — the healthiest source in the folder, and the
     only clip in the hero now. Single clip means `VideoBackdrop` sets `loop` and
     never crossfades. */
  { id: "hero-1", file: "20732245-uhd_4096_2160_30fps.mp4", start: 2, seconds: 12, tier: "hero" },

  // ---- 04 who we serve: a portrait figure, not a full-bleed ground.
  /* UNCROPPED. The master is 1080x1920, which is exactly 9:16, so the "tall"
     rendition is the whole frame at native resolution — `fit()` reports no
     downscale because 1080 is under the 1440 cap. This is the one placement
     where this clip is at its best: it was removed from the mission band because
     a 16:9 cut left it at 1080x608, and the fix was never a better encode, it was
     a frame shaped like the footage. */
  { id: "serve-1", file: "10348654-hd_1080_1920_30fps.mp4", start: 4, seconds: 12, renditions: ["tall"] },

  // ---- mission: one clip, looping.
  /* A single clip rather than a cycle, so `VideoBackdrop` sets `loop` on it and
     never crossfades. 12s at 0.5x plays for 24 real seconds before it repeats,
     which is long enough that the loop is not the thing you notice. */
  /* `wide` only. The master is 2560x1440 — exactly 16:9 — so the wide rendition
     is the entire frame with nothing cropped, and the band renders it whole. A
     9:16 cut would be an 810px slice of it that nothing ever requests. */
  { id: "mission-1", file: "347325_medium.mp4", start: 2, seconds: 12, renditions: ["wide"] },
];

/* REMOVED, and why.
 *
 * `360527.mp4` — dropped from the hero at request. It is a 3840x2160 master, so
 * this was a content call rather than a technical one; it would still qualify
 * under the resolution rule above if it is ever wanted back.
 *
 * `10348654-...mp4` — a 1080x1920 vertical. Its 16:9 crop is 1080x608, which is
 * its ceiling, not a setting: on a 1440px window at 2x that is a 2.7x upscale and
 * it was the clip making the mission band look soft. It remains the sharpest of
 * the set on a PHONE, where it plays at its native 1080x1920 uncropped, so it is
 * a good mobile-only candidate if the component is ever taught per-orientation
 * clip lists.
 *
 * `istockphoto-*.mp4` — 768x432 Getty comp previews with the watermark burned
 * into the frame. No high-resolution version exists locally and they are
 * unlicensed, so they cannot ship at any size.
 *
 * `258799_medium.mp4` — 720x1280 master, 720x405 once cut to 16:9. */

/* NOT USED.
 *
 * `videos/istockphoto-*.mp4` are 768x432 iStock comp previews with the Getty
 * watermark burned into the frame. They cannot be used at high resolution
 * because no high resolution exists — 768px is the whole file — and they cannot
 * ship at any size because they are unlicensed samples with the mark baked in.
 * Licensed full-resolution downloads would slot into the hero list above with no
 * other change.
 *
 * `258799_medium.mp4` is a 720x1280 master: 720x405 once cut to 16:9, which is
 * soft full-bleed at any bitrate.
 *
 * The remaining clips in `videos/` are unused simply because only two surfaces
 * carry video now. */

/* DROPPED, with reasons.
 *
 * `258799_medium.mp4` is a 720x1280 master. Cropped to 16:9 that is 720x405 —
 * about a quarter of the pixels a 2x laptop asks for full-bleed, so it would be
 * visibly soft however it is encoded. It is the one clip in the folder that
 * cannot be fixed by the encoder.
 *
 * `istockphoto-*.mp4` are 768x432 iStock comp previews with the Getty watermark
 * burned across the frame — unlicensed samples, so they cannot ship regardless
 * of resolution. Licensed downloads would slot straight into the list above. */

/* NOT USED, and deliberately.
 *
 * `videos/istockphoto-*.mp4` are iStock comp previews — 768x432 with "iStock by
 * Getty Images" burned across the middle of the frame. They are unlicensed
 * watermarked samples, so they cannot ship, and the watermark sits exactly where
 * a hero backdrop is looked at. Licensed full-resolution downloads would drop
 * into the list above with no other change. */

/* Sized and quantised for what these actually are: a moving ground behind a
   scrim with a heading over it, never the subject.
 *
 * A first pass at 1280x720 / CRF 30 produced 4.3MB for a single 11-second mission
 * clip — about 3.1 Mbps, which is streaming-video bitrate for something the page
 * then deliberately darkens and covers with text. 1024x576 at CRF 33 lands near
 * 1MB for the same clip with no visible difference once the scrim is over it.
 *
 * Raise these only if a backdrop is ever promoted to being the subject. */
/* Output size is COMPUTED from each master, not fixed.
 *
 * The first version of this shipped everything at 1024x576 on the reasoning that
 * a backdrop behind a scrim does not need resolution. That was wrong, and
 * visibly so: these are full-bleed with `object-fit: cover`, so a 1440px window
 * at 2x device pixel ratio asks for ~2880 real pixels and got 1024 — a 2.8x
 * upscale, 3.4x on a 16" laptop. Every one of them looked soft.
 *
 * So each rendition now takes the LARGEST crop the master can actually give at
 * the target aspect, capped, and never upscaled. A 3840x2160 master yields a
 * true 1920x1080; a 1080x1920 vertical master can only give 1080x608 at 16:9 and
 * is encoded at exactly that rather than being stretched to look like more. */
const TARGETS = {
  /* 2560, not 1600/1920. The earlier caps were set when six sections competed
     for bandwidth, and they threw away resolution the masters actually hold: the
     mission clips are 2560x1440 originals that were shipping at 1600x900, a 1.6x
     width discard, and the hero's 4K masters were going out at 1920.
     A 1440px window at 2x asks for ~2880 real pixels, so 2560 is a 1.13x upscale
     where 1920 was 1.5x. That gap is what "looks low quality" was. */
  wide: { aspect: 16 / 9, cap: 2560, capHero: 2560 },
  tall: { aspect: 9 / 16, cap: 1440, capHero: 1440 },
};

/* CONSTRAINED quality, not plain CRF.
 *
 * Plain CRF is a quality target with no ceiling, and on high-frequency footage it
 * has no mercy: at CRF 26 the 4K forest clip — dappled sun through leaves over
 * moving water, about the worst case there is for a block-based codec — came out
 * at 17.4MB for 11 seconds, roughly 12 Mbps. The easy clips in the same run landed
 * near 1.4MB. A 12x spread across a set that is all used the same way is not a
 * quality decision, it is an accident of content.
 *
 * `maxrate` + `bufsize` puts a ceiling on it. Easy clips still come in under the
 * cap and cost what they cost; hard clips stop at the cap and spend their bits
 * where they matter. Resolution is untouched — this trades peak fidelity on the
 * busiest few seconds for a predictable page, which is the right trade for
 * something running behind a scrim with text on it.
 *
 * bufsize is 2x maxrate: one second of tolerance for a burst, which is enough to
 * carry a cut or a fast pan without letting the average drift up. */
const CRF = { hero: 18, section: 18 };
/* Near-transparent, deliberately over-provisioned.
 *
 * These were 21/6000k, which measured fine — but the mission clip kept reading as
 * soft and the reason turned out not to be the encoder. Measured master bitrates:
 *
 *   20732245  4096x2160  25.1 Mbps   healthy
 *   311442    2560x1440  12.4 Mbps   healthy
 *   10348654  1080x1920   5.1 Mbps   healthy
 *   347325    2560x1440   3.9 Mbps   SOURCE-LIMITED (~11 Mbps would be healthy)
 *
 * `347325_medium.mp4` carries about a third of the data its resolution implies —
 * it is a "medium" download, 1440p in dimensions only. No encoder setting adds
 * detail that is not in the source, and a 1:1 crop of master vs encode was
 * indistinguishable, so the pipeline was already nearly a passthrough for it.
 *
 * CRF 18 at a 12 Mbps ceiling puts every clip at the point where this stage
 * contributes no visible loss of its own. For the three healthy masters that is
 * a real gain. For 347325 it mostly just stops the encoder being blamed: the only
 * actual fix there is re-downloading the full-size original rather than the
 * medium. */
const RATE = {
  hero: { wide: "12000k", tall: "6000k" },
  section: { wide: "12000k", tall: "6000k" },
};

/** Largest crop `aspect` can take from a `mw x mh` master, then capped. */
function fit(mw, mh, aspect, cap) {
  let cw, ch;
  if (mw / mh > aspect) {
    ch = mh;
    cw = Math.round(mh * aspect);
  } else {
    cw = mw;
    ch = Math.round(mw / aspect);
  }
  /* Cap on the LONG edge so a portrait rendition is limited by its width and a
     landscape one by its width too — both end up bounded by what is actually
     delivered horizontally, which is what the upscale maths above is about. */
  let ow = cw, oh = ch;
  if (ow > cap) {
    oh = Math.round((cap / ow) * oh);
    ow = cap;
  }
  /* h264 with yuv420p needs even dimensions. */
  const even = (n) => (n % 2 ? n - 1 : n);
  return { cw: even(cw), ch: even(ch), ow: even(ow), oh: even(oh) };
}

function probe(file) {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
     "-of", "csv=p=0:s=x", file],
    { encoding: "utf8" },
  ).trim().split("\n")[0];
  const [w, h] = out.split("x").map(Number);
  return { w, h };
}

function ff(args) {
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
}
const mb = (p) => (statSync(p).size / 1e6).toFixed(2);

mkdirSync(OUT, { recursive: true });
let total = 0;

for (const clip of CLIPS) {
  const input = join(SRC, clip.file);
  if (!existsSync(input)) {
    console.warn(`  SKIP ${clip.id} — missing ${input}`);
    continue;
  }

  const master = probe(input);
  const isHero = clip.tier === "hero";

  /* A clip may declare its own renditions. The serve-band video is displayed in
     a PORTRAIT frame at every width, so a 16:9 "wide" cut would be both unused
     and destructive — 1080x1920 cropped to 16:9 is 1080x608, throwing away 68% of
     the frame to produce a file nothing ever requests. */
  for (const suffix of clip.renditions ?? ["wide", "tall"]) {
    const t = TARGETS[suffix];
    const cap = isHero ? t.capHero : t.cap;
    const { cw, ch, ow, oh } = fit(master.w, master.h, t.aspect, cap);
    const out = join(OUT, `${clip.id}-${suffix}.mp4`);

    /* Crop at full master resolution FIRST, then scale down once. Scaling up to
       a target and cropping back — which is what this did before — resamples
       twice and softens the result even when the numbers work out. */
    ff([
      "-ss", String(clip.start),
      "-i", input,
      "-t", String(clip.seconds),
      "-vf",
      `crop=${cw}:${ch}:(iw-${cw})/2:(ih-${ch})/2,` +
        `scale=${ow}:${oh}:flags=lanczos,format=yuv420p`,
      "-an",
      "-c:v", "libx264", "-crf", String(isHero ? CRF.hero : CRF.section),
      "-maxrate", RATE[isHero ? "hero" : "section"][suffix],
      "-bufsize", String(parseInt(RATE[isHero ? "hero" : "section"][suffix], 10) * 2) + "k",
      "-preset", "slow", "-profile:v", "high", "-level", "4.1",
      "-movflags", "+faststart",
      out,
    ]);
    total += Number(mb(out));
    const note = ow < cap ? `  (master-limited)` : "";
    console.log(`  ${clip.id}-${suffix}.mp4  ${ow}x${oh}  ${mb(out)} MB${note}`);
  }

  /* One poster per clip, from the wide encode's first frame. Only the FIRST clip
     of each section is ever used as a poster attribute, but generating all of
     them keeps the set swappable without re-running anything. */
  const poster = join(OUT, `${clip.id}-poster.jpg`);
  const posterFrom = (clip.renditions ?? ["wide", "tall"])[0];
  ff(["-i", join(OUT, `${clip.id}-${posterFrom}.mp4`), "-frames:v", "1", "-q:v", "5", poster]);
}

console.log(`\n  total shipped: ${total.toFixed(1)} MB across ${CLIPS.length} clips`);
