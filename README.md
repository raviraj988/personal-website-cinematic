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
- Scroll-aware cream, sage, moss, sand, and forest background transitions
- Ambient section backdrops: film grain, drifting light fields, faint column
  rules, and stroked botanical marks — all CSS-only, so they add no JavaScript
- Oversized decorative background typography per section, `aria-hidden` and
  hidden below 680px so it never crosses body copy
- A reading-progress hairline above the header
- Hairline separators that draw in from the left as a section heading arrives
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
- Decorative background words: `cinematicBackdrop` in `cinematic-content.ts`
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
- Reduced motion verified clearing parallax, word scrub, background drift, and
  ambient animation, with all content and controls preserved
- No browser console warnings or errors during the test pass
