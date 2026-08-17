# Prompt for ChatGPT — enlarging the ESE photographs

Copy everything between the lines into ChatGPT, after replacing the two folder
paths on the first two lines. Attach the folder or point ChatGPT at it.

**Read the note at the bottom first** — it explains what this can and cannot fix,
so you don't spend an hour on something that won't help.

---

INPUT FOLDER: `<paste the path to drive-download-20260813T050944Z-1-001>`
OUTPUT FOLDER: `<paste a path for a new, empty folder — e.g. .../ese-images-large>`

I have 13 photographs that need to be larger. Please process them with Python and
Pillow — not with an image generation model — and write the results to the output
folder.

**Create the output folder if it does not exist.** Keep every filename exactly as
it is; the website looks images up by filename.

For each file below, resize so its **long edge** matches the target. Use Lanczos
resampling.

| Filename | Target long edge |
|---|---|
| IMG_1275.jpeg | 2000 |
| IMG_0244.JPG | 1600 |
| IMG_1195.JPG | 1600 |
| IMG_3585.jpeg | 1600 |
| IMG_3191.jpeg | 1600 |
| IMG_2324.jpeg | 1600 |
| IMG_3697.jpeg | 1600 |
| IMG_1118.jpeg | 1400 |
| IMG_1244.jpeg | 1400 |
| IMG_1092.jpeg | 1400 |
| IMG_1249.jpeg | 1400 |
| IMG_1347.jpeg | 1400 |
| IMG_1119.jpeg | 1400 |

Rules, all of them important:

1. **Do not crop, and do not change the aspect ratio.** Scale the whole frame. The
   website handles its own cropping, and a pre-cropped file removes options I need.
2. **Do not change the content in any way.** No sharpening, denoising, colour
   correction, contrast, saturation, filters, borders, watermarks, or text. No
   removing or adding anything in the frame. These are records of real work and
   real people.
3. **Apply EXIF orientation before saving, then strip all metadata.** Several files
   carry an orientation flag; if it is stripped without being applied first, the
   photograph ends up rotated.
4. Save as **JPEG, quality 95**, same filename as the input.
5. Print a table at the end: filename, original pixel dimensions, new pixel
   dimensions, and new file size.
6. If any file in the list is missing from the input folder, say which — do not
   skip it silently.

Please also tell me, honestly: for each file, how much of the target size is real
detail from the original versus interpolation. I would rather know a file cannot
be genuinely improved than receive a soft one that looks processed.

---

## What this actually achieves — read before you start

A Lanczos resize makes the **file** bigger. It does not add detail that was never
captured. A 480px photograph resampled to 1400px contains exactly as much real
information as it did before, spread over more pixels.

It is still worth doing, for one specific reason: `next/image` never generates a
variant larger than the source file. So a 480px source is served at 480px and the
*browser* stretches it at display time using cheap bilinear scaling. Supplying a
1400px file means the good Lanczos scaling happens once, in advance, instead of
badly in every visitor's browser. The gain is modest but real.

**What would actually fix this is the camera originals.** Every file in that folder
looks like a reduced-size export — no phone has taken a 480×640 photograph in over
a decade. If the full-size versions are anywhere (Photos library, the phone itself,
a Drive folder, an email you sent), they carry real detail and beat any amount of
processing. Please check for those before running the prompt above.

## If you want to try AI super-resolution as well

A generative upscaler *does* add detail — by inventing it. For a waterfall or a
treeline that is an acceptable trade. For these two files it is not:

- **`IMG_0244.JPG`** — the portrait
- **`IMG_1195.JPG`** — the working session, with identifiable faces around a table

Enlarging a face generatively produces a person who does not exist. Published under
a real name, on the site of an organisation that serves the communities in these
photographs, that is not a trade worth making. For those two: camera original, or
leave them soft.

For the other eleven, if you do try it, ask for an upscale and be explicit:

> Upscale this photograph. Do not change the composition, crop, colours, or
> content. Do not add, remove, stylise, or reinterpret anything. Preserve it as the
> same photograph at higher resolution.

Then compare side by side with the original before sending it on. Models routinely
ignore that instruction and repaint the image.

## When you send them back

Drop the output folder's contents into
`ref_docs/drive-download-20260813T050944Z-1-001/`, overwriting the originals only
if you are happy to — otherwise send the new folder and I will point the pipeline
at it. Then:

```bash
node scripts/prepare-images.mjs
```

That strips metadata, emits WebP at the right sizes, and records the real
dimensions in a manifest the site reads. No code changes needed.
