# Image sizes to send back

The 13 photographs the site uses, with what each one is now and what the layout
actually asks for. Aspect ratio matters as much as pixel count — the site crops to
these shapes, so a portrait sent for a 4:3 slot loses its top and bottom.

**Send larger than asked if you have it.** `next/image` generates the smaller
variants automatically and never upscales past the source, so extra pixels cost
nothing at runtime.

| # | Your file | Now | Please send | Shape | Used for |
|---|---|---|---|---|---|
| 1 | `IMG_1275.jpeg` | 480×640 | **1600×2000** | 4:5 portrait | Tall full-height panel — the biggest ask, and the most visible |
| 2 | `IMG_0244.JPG` | 427×640 | **1200×1600** | 3:4 portrait | The portrait. **Camera original only — see the note below.** |
| 3 | `IMG_1195.JPG` | 1286×965 | **1600×1200** | 4:3 | Working session. **Camera original only.** |
| 4 | `IMG_3585.jpeg` | 640×480 | **1600×1200** | 4:3 | PFAS case study figure |
| 5 | `IMG_3191.jpeg` | 640×480 | **1600×1200** | 4:3 | Conference session |
| 6 | `IMG_2324.jpeg` | 640×480 | **1600×1200** | 4:3 | Sunset — section figure |
| 7 | `IMG_3697.jpeg` | 480×640 | **1400×1050** | 4:3 | Pines — section figure |
| 8 | `IMG_1118.jpeg` | 480×640 | **1400×1050** | 4:3 | Service card — Policy & Sovereignty |
| 9 | `IMG_1244.jpeg` | 480×640 | **1400×1050** | 4:3 | Service card — Grant Development |
| 10 | `IMG_1092.jpeg` | 480×640 | **1400×1050** | 4:3 | Service card — Technical Implementation |
| 11 | `IMG_1249.jpeg` | 480×640 | **1400×1050** | 4:3 | Service card — Climate Resilience |
| 12 | `IMG_1347.jpeg` | 480×640 | **1400×1050** | 4:3 | Service card — Communications |
| 13 | `IMG_1119.jpeg` | 480×640 | **1400×1050** | 4:3 | News card |

Every one is currently below what its slot asks for, so all 13 would benefit.
If you only do some, do **1, 2, 3, 4** — the four largest slots on the page.

## The two full-bleed backgrounds

Not in the table because they are staying as they are, per your instruction:

- Hero — `cinematic-river-valley.jpg`, 1672×941
- Contact footer — `contact-river-sunset.jpg`, 2000×799

If you ever want ESE photography there instead, those slots need **2560×1440**
(hero, 16:9) and **2560×1200** (footer, 21:9) — far beyond anything in the archive.

## Two files not to run through an image model

**`IMG_0244.JPG` (the portrait) and `IMG_1195.JPG` (the working session)** both show
identifiable real people. An image model asked to enlarge a face will regenerate
it, and the result is a photograph of someone who does not exist published under a
real person's name. For these two: the camera original, or leave them at the size
they are. Soft is fine; invented is not.

The same applies to any photograph of actual ESE work — a generated stand-in
presented as ESE's project is a claim about work that was not done.

## Easiest path first

These all look like reduced-size exports — no phone has shot 480×640 in over a
decade. **If the originals are still in a Photos library, on a phone, or in Drive
at full size, that solves every row in the table at once** and needs no editing at
all. Worth checking before anything else.

## If you do want to enlarge them

Landscapes and nature detail only — files 4 through 13. Paste this per image:

> Upscale this photograph to 1600 pixels on its long edge. Do not change the
> composition, crop, colours, or content. Do not add, remove, sharpen, or stylise
> anything. Preserve it as the same photograph at higher resolution.

Then compare against the original before sending it back — image models frequently
ignore that and repaint the picture.

Fuller detail, including the reasoning behind each number, is in
`ref_docs/IMAGE_BRIEF.md`.

## When they arrive

Drop them into `ref_docs/drive-download-20260813T050944Z-1-001/` with the same
filenames and run:

```bash
node scripts/prepare-images.mjs
```

It strips metadata, emits WebP, and records the real dimensions in a manifest the
site reads — so no code changes are needed, the images just get sharper.
