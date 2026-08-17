# Image brief — what resolutions the site actually needs

Every number below is derived from the `sizes` attribute the component genuinely
requests, at a 2× pixel ratio, on displays up to 2560px wide. They are not
round-number guesses.

`next/image` never upscales past the source file, so a source smaller than the
target is not an error — it just serves soft. And a source *larger* than the
target costs nothing at runtime: Next emits the smaller variants and serves the
one the browser asks for. **When in doubt, send the larger file.**

---

## 1. What each slot needs

| Slot | Where | Aspect | Minimum | Ideal | Why |
|---|---|---|---|---|---|
| **Hero background** | landing, full viewport | 16:9 | 1920×1080 | **2560×1440** | `sizes="100vw"`. The only slot where the image spans the whole window. |
| **Contact footer background** | landing footer, full width | ~21:9 | 1920×900 | **2560×1200** | `sizes="100vw"`, ~1070px tall section. |
| **Post / news cover** | `/blog`, `/news` article header | 16:9 | 1600×900 | **2400×1350** | `sizes="(min-width: 1200px) 1100px, 100vw"` → 1100px at 1×, 2200px at 2×. Uploaded through the admin console. |
| **Approach panel** | sticky full-height panel | 4:5 portrait | 1200×1500 | **1600×2000** | `sizes="(min-width: 960px) 48vw, 100vw"`, full viewport height. |
| **Case study figure** | contained figure | 4:3 | 1300×975 | **1600×1200** | `sizes="(min-width: 960px) 46vw, 92vw"`. |
| **Person portrait** | People section | 3:4 | 1000×1333 | **1200×1600** | `sizes="(min-width: 960px) 34vw, 90vw"`. |
| **Service / news card** | 3-up and 4-up card grids | 4:3 | 900×675 | **1400×1050** | `sizes="(min-width: 1024px) 31vw, …"` — the smallest slots, and where the current 640px files already hold up best. |

### What you have now, against that table

| | Current source | Verdict |
|---|---|---|
| Hero background | `cinematic-river-valley.jpg` 1672×941 | Under ideal, fine to 1672px wide. **Keeping this** per your instruction. |
| Contact background | `contact-river-sunset.jpg` 2000×799 | Good. **Keeping this.** |
| ESE photographs | 23 of 26 at ≤640px; largest 1286×965 | Fine for **cards** and small figures. Below minimum for every large slot. |

So: the two full-bleed slots stay on the existing large photography, and ESE's own
photographs are used in the contained slots where their resolution genuinely holds
up. Nothing is upscaled — `scripts/prepare-images.mjs` passes
`withoutEnlargement`, because interpolating a 640px file up to 1600px produces a
bigger file that looks worse, not better.

---

## 2. Instruction to paste into ChatGPT

Use this **only for the landscape / atmosphere images** — see the limits in §3.
Replace the bracketed line with the subject you want.

> Generate a photorealistic landscape photograph for an environmental consulting
> organization's website.
>
> **Subject:** [e.g. a broad river curving through a forested valley in early
> morning light, mist on the water, no people, no text, no logos]
>
> **Output requirements:**
> - Resolution: **2560×1440 pixels**, landscape orientation, exactly 16:9
> - Photorealistic, as if shot on a full-frame camera with a 35mm lens
> - Natural colour, no HDR look, no oversaturation, no vignette, no film border
> - No text, watermarks, logos, borders, or signatures anywhere in the frame
> - No identifiable human faces
> - Composition: keep the **left third and the bottom third comparatively
>   uncluttered and darker** — white headline and body copy sit there, and busy or
>   bright detail behind text makes it unreadable
> - Deliver as JPEG or PNG at full resolution, not a preview or thumbnail
>
> Do not add a caption or describe the image back to me — just produce the file.

For the **footer background**, change the resolution line to **2560×1200 pixels,
exactly 21:9** and the composition line to *"keep the whole frame comparatively
dark and even; light copy sits across the full width."*

For a **card image**, use **1400×1050 pixels, exactly 4:3** and drop the
composition constraint — no text sits on those.

### If you would rather enlarge the photos you already have

Ask for an **upscale**, not a regeneration, and say so explicitly:

> Upscale this photograph to 2560 pixels on its long edge. Do not change the
> composition, colours, crop, or any content. Do not add, remove, sharpen, or
> stylise anything. Preserve it as the same photograph at a higher resolution.

Be aware that image models often ignore that and reinterpret the picture. Compare
the result against the original before using it.

---

## 3. Where **not** to do this

Two of ESE's photographs must not be run through an image model:

1. **`IMG_0244.JPG` — the portrait** (currently `portrait-laura.webp`). Generating
   or "enhancing" a photograph of a real, named person produces an image of
   someone who does not exist, published under their name. If a larger portrait is
   needed, it needs the camera original or a reshoot.
2. **`IMG_1195.JPG` — the working session** with identifiable people around a
   table. Same reason.

The same applies to any future photograph of actual ESE work: a generated
substitute presented as ESE's project is a claim about work that was not done.

**The best outcome by a wide margin is the camera originals.** Every one of these
files looks like a reduced-size export — a phone shooting 480×640 has not existed
for a long time. If the originals are on a phone, in a Photos library, or in a
Drive folder at full size, they solve this completely and cost nothing.

---

## 4. Once you have new files

Drop them in and run the prep script — it strips metadata, emits WebP, and writes
the real dimensions into a manifest the content layer reads:

```bash
node scripts/prepare-images.mjs
```

For a **new full-bleed background**, put the file in `public/images/` and point
`hero.image` / `contact.image` in `src/lib/data/ese-content.ts` at it via
`wideImage(file, alt, width, height)` with its true dimensions.

Then re-check that text still reads against it — the scrims are tuned to the
current photographs, and a brighter image will need them adjusted:

```bash
npm run build && PORT=3000 npm start          # in one shell
node scripts/measure-contrast.mjs http://localhost:3000/ 1440 '[…]'
```
