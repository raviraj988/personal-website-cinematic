# Laura McKelvey — cinematic personal website

A separate implementation of Laura McKelvey's landing page using the cinematic
editorial direction documented in `moncalisse-inspired-specs.md`. The original
project at `../personal-website` is unchanged.

## Run locally

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm start
```

The development server defaults to `http://localhost:3000`.

## What is built

- Session-aware opening mark and name animation
- Full-viewport photographic hero
- Fixed transparent header that becomes a cream navigation bar after the hero
- Accessible full-screen mobile menu with focus trapping and Escape handling
- Editorial introduction and asymmetric biography layout
- Scroll-linked image parallax with clearly visible alternating zoom-in and zoom-out directions on desktop and touch devices
- Word-by-word scroll-scrub typography for major editorial statements
- Masked, intersection-triggered text and image reveals with image scale settling
- A new asymmetric fieldwork and community-participation image essay
- Four large, photography-led Areas of Work cards with staggered reveal, scroll zoom, and hover movement
- A compact three-card Selected Work editorial grid
- An image-paired opening statement and panoramic contact transition so major copy sections retain strong visuals
- Newsreader for display and editorial headings, Inter for body and UI. The type
  scale runs to 7.25rem display and 4rem h2 — close to spec §2.2, where the
  earlier 4.5rem/2.75rem ceiling was the main reason the page read restrained
  rather than cinematic.
- Scroll-aware cream, paper, sage, moss, clay, and forest page tones,
  crossfading over 1400ms. Green and brown alternate: the Observation and
  participation essay and Resources sit on warm clay, Approach on sage, Areas of
  Work on moss, and Selected Work and the contact footer on dark forest with
  their heading copy inverted. Every tone is verified to keep muted secondary
  copy above 4.5:1.
- Section labels take their colour from a `--label-color` property. On the clay
  grounds it flips to deep forest green, because the clay accent on a clay
  background is legible by the numbers but muddy to read.
- Ambient section backdrops: film grain, drifting light fields, an inner
  vignette on the dark sections, and stroked botanical marks — all CSS-only, so
  they add no JavaScript
- Text animation on real copy: uppercase labels settle in from wide tracking,
  and card headings wipe up from behind a mask
- A reading-progress hairline above the header
- Hairline separators that draw in from the left as a section heading arrives
- Arrows drawn as inline SVG rather than typed as Unicode, so iOS cannot
  substitute the emoji form of ↗ / → / ↓ / ↑ / ←
- A single shared scroll loop: every scroll-linked component subscribes to one
  `requestAnimationFrame` pass instead of registering its own listener
- Compact four-column Area and Resource card grids on wide screens, reducing to two and one columns responsively
- The new photography sequence appears immediately after the opening statement
- Ruled Areas of Work index
- Sticky-image Approach section
- Full-image working-principle band
- Alternating selected-work stories
- Full-viewport, scroll-snap Areas of Work story slider
- Responsive contact and navigation footer
- Reduced-motion fallbacks
- Metadata, structured data, sitemap, robots route, and 404 page

## Editing

- Cinematic content: `src/lib/data/cinematic-content.ts`
- Shared provisional content: `src/lib/data/site-content.ts`
- Design tokens: `src/styles/tokens.css`
- Layout and responsive styling: `src/app/globals.css`
- Motion primitives: `src/components/motion/`
- Shared scroll loop and reduced-motion watcher: `src/lib/scroll.ts`
- Page tones: the `html[data-scroll-theme=...]` block at the top of `globals.css`
- Landing-page composition: `src/components/sections/CinematicLanding.tsx`

## Committing

`/ship` stages everything, writes a commit message from the diff, and pushes.
Pass a remote URL to target a different repository: `/ship <git-url>`.

## Publication warning

All photographs and project copy are provisional design placeholders. The
portrait is generated and is not a photograph of Laura McKelvey. Replace the
placeholder contact action, photography, résumé link, canonical domain, and
unapproved copy before publishing. The website remains `noindex, nofollow`.

## Verification completed

- TypeScript type-check passed
- Next.js production build passed
- Zero horizontal document overflow measured at 1440, 1280, 1000, 800, 390, and
  320px
- Opening sequence completed and removed correctly
- Header state transition verified after scrolling
- Hero scroll zoom verified running from 1.46 down to 1.10 (`zoom="out"`)
- Scroll words verified progressing from 12% opacity to fully visible
- Opposing zoom directions verified in the image essay
- Image-essay columns verified flush at the top and aligned on the same baseline
  at desktop widths
- Areas and Resources card links verified sharing one baseline across a row
- Story slider navigation verified
- Mobile menu open, close, focus trap, and Escape focus restoration verified at
  800px, where the trigger is rendered
- One `h1`, one `main`, and alt attributes on all images verified
- All decorative layers verified `aria-hidden` and absent from the reading order
- Muted secondary copy measured against every settled page tone: forest 9.22:1,
  paper 6.3:1, cream 5.87:1, sage 5.03:1, clay 4.78:1 washed / 4.60:1 plain,
  moss 4.75:1
- Section labels on the clay grounds measured at 11.09:1 and 11.19:1 in forest
  green, against 5.5:1 for the clay accent they replaced
- Selected Work's inverted heading measured on forest (heading 15.62:1, eyebrow
  7.91:1, lede 9.22:1) with its cards confirmed still dark-on-paper (13.78:1,
  6.3:1), so no light text leaked onto the light cards

- The clay accent measured on every ground it is used on — paper 5.85:1, cream
  and moss 5.46:1, clay 5.5:1, sage 4.67:1 — all clearing AA. Sage is the
  tightest ground and is what the token is tuned against.
- The hero headline measured against the actual rendered pixels behind it
  (photograph plus scrim, text hidden): worst-case 3.81:1 and median 10.69:1,
  against the 3:1 large-text floor at 104px
- Zero Unicode arrow code points left in rendered text; 21 inline SVG arrows
  confirmed rendering identically on desktop and at 390px
- Reduced motion verified clearing parallax, word scrub, background drift, and
  ambient animation, with all content and controls preserved
- No browser console warnings or errors during the test pass
