# ESE brand kit

Source material for the logo assets. `node scripts/prepare-brand.mjs` reads this
directory and writes everything the site actually ships; that script's header is
the technical companion to this file.

Supplied as `ESE 🐢-20260826T071706Z-1-001.zip`, by **Vivid Thistle Studio**.

## What is here, and what was left out

**Build inputs** — the only two files `prepare-brand.mjs` reads:

| File | What it is |
| --- | --- |
| `primary-logo.ai` | Emblem + "Environment Sovereignty & Equity" wordmark. Every mark on the site is cut from this: the mono geometry off its all-blue page, the three band shapes off the clip paths of its colour page. |
| `tagline-lockup.ai` | ESE monogram + the mission over three lines. |

**Reference** — kept for people, not for the build. Nothing reads these:

| File | What it is |
| --- | --- |
| `colors-and-fonts.jpg` | The palette and type specimen. Authoritative for the hex values below. |
| `emblem-full-color.png` | The emblem as the kit colours it, navy outline, for light grounds. What the mark looks like *unmodified* — the site recolours it, see below. |
| `emblem-full-color-on-dark.png` | The same, with a white outline, for dark grounds. |
| `monogram-full-color.png` | The ESE monogram with its hand-drawn "S". |
| `seal.ai` | The emblem ringed by the full name and PROTECT · EMPOWER · CONNECT. |
| `badge.ai` | The emblem under an arced PROTECT / EMPOWER / CONNECT. |

Every `.ai` is really a PDF 1.6 with four pages — full colour on light, full
colour on dark, all white, all blue.

**Not committed.** The kit also ships `ESE Magic Hour.pdf`, the 6-page brand
walkthrough, and PNG exports of every logo at 4000–9600px. The PDF is 74MB and
the PNGs are redundant with the `.ai` files, so neither is in the repository —
they are in the original zip. The walkthrough's substance is transcribed below,
because the site's design decisions cite it.

## Palette

From `colors-and-fonts.jpg`. Mirrored into `src/styles/tokens.css` as
`--brand-*`, with a note there on why they are not the page's colours.

| Hex | Name |
| --- | --- |
| `#2b4552` | navy |
| `#899163` | olive |
| `#c98150` | terracotta |
| `#c24e78` | rose |
| `#dec26a` | gold |
| `#b8d0d8` | sky |
| `#e5e8eb` | paper — a brand **neutral** |
| `#081b23` | ink — a brand **neutral** |

The specimen is explicit about the last two: use them "instead of black and white
(#000000/#ffffff) whenever possible, including text and backgrounds."

### Gradients

Three, each pulled from one of the emblem's protection bands. The kit names them
but prints no stop values, so these were sampled off the walkthrough's usage page
and snapped to the palette at each end:

- **land** — olive → gold
- **sunrise** — gold → terracotta → rose
- **water** — sky → navy

## Type

Not used by the site, which is set in Newsreader and Inter. Recorded because the
kit specifies it and print work should match.

| Role | Face | Note |
| --- | --- | --- |
| Headline | Morvi | all caps |
| Sub-heading | Gotham Book | all caps, tracking +25 |
| Body | Marion Regular | |
| Accent / quote | Dongra Script | |

## The walkthrough

Transcribed from `ESE Magic Hour.pdf`. Verbatim where quoted.

**Business attributes** — what ESE wants to be known for: protect the
environment, empower people, connect resources, fairness, respect, compassion,
hope, work worth doing, Native American ethic, being the bridge.

**Brand attributes** — how ESE wants to be seen: personal, organic, disruptive,
sunset/natural colors, calm, warm, natural, clear/legible, powerful.

### Aesthetic & experience

> ESE's aesthetic borrows from the fifteen minutes after a storm, when the sun
> finally makes it through. Every touchpoint carries that same exhale —
> land-based color, structure that doesn't announce itself, warmth that reads as
> expertise instead of decoration. Nothing here performs credibility. It's
> earned, then worn lightly.

### Colour & identity

> The palette runs on a duality: the deep navy the sector already trusts, paired
> with sunset tones most of the sector won't touch. It's the visual version of
> Mama Bear with thirty-four years at the EPA — structured enough for a
> regulator, warm enough for a kitchen table. In a category built on
> institutional blue and forest green, personal is the disruption.

This is the passage the note in `src/styles/tokens.css` is about. The site is
currently built on cream and forest green, which is the thing this paragraph
names as the category default. Reconciling the two is an open design decision,
deliberately not made as a side effect of adding a logo.

### Symbolism & meaning

> The emblem holds many meanings — a shield and a turtle shell, holding three
> bands for what ESE protects: plant life, water, and sunrise breaking over the
> hills. Look into the negative space and you'll find the roots of a white cedar,
> subtle enough to miss on the first pass, permanent once you see it. Every line
> earns its place.
>
> Everything here runs on the sacred circle ethic — balance and connection over
> rank and polish. This isn't a mark built to impress a boardroom. It's built to
> belong at a tribal council table and a legislative hearing, because ESE has to
> sit comfortably in both.

The wordmark is described as deliberately unfussy: "friendly letterforms, no
sharp corners, nothing that reads as institutional distance… approachable enough
that a community member emails without a second thought, credible enough that a
policy office takes it seriously."

### On the submarks

> The ESE monogram is the compact option, built for the moments the full name
> won't fit. The connected, hand-drawn "S" keeps the personality intact even at
> three letters — a badge for social profiles, a favicon, a hard hat sticker, a
> lapel pin.
>
> The circular seal takes the emblem and the "Protect · Empower · Connect"
> language and wraps them into a single mark — the version built for texture. It
> reads as insignia rather than logo, which is exactly the point: patches,
> embroidery, a stamp on a printed report, anywhere the brand needs to feel
> earned rather than applied.

Three places the site departs from this, each on evidence:

- The favicon is the **emblem**, not the monogram. Rendered and compared at 16px,
  three letters in a 1.7:1 landscape mark have to be letterboxed into a square
  and the crossbars close up; the emblem is near square already and its
  silhouette survives. See the note in `scripts/prepare-brand.mjs`.
- The bands are **recoloured**. The site draws the emblem with its outline in the
  page's own ink and the three bands in `--ese-band-*` — the kit's hues pulled
  into the muted register the rest of the site is in. Dropped in unchanged, the
  navy outline fights the greens and the rose reads as a different brand. The
  hues stay distinct from one another, because three shades of green in a shield
  says nothing.
- The **seal** and **badge** are not generated at all. The walkthrough scopes
  them to texture — patches, embroidery, print — not screen.

### Facts the walkthrough settles

- **Laura McKelvey is "Founder".** The business-card mockups set it in type. The
  site had inferred the title from "the driving force behind the business" and
  flagged it; that TODO is resolved in `src/lib/data/ese-content.ts`.
- **Both surnames are "McKelvey".** The cards confirmed Laura's. Joshua's was
  confirmed separately; the source document's "McKelvie" was a typo and is gone
  from the repository.
- **The tagline** is "Protect the environment / Empower people / Connect
  resources", three clauses, one verb each. Carried in `brand.tagline`.
- The mockups use a headline the site does not: "The Bridge Between the Plan and
  the People."
