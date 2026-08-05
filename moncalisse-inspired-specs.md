# Laura McKelvey Personal Website
## Cinematic Editorial Frontend Specification

**Status:** Proposed visual and motion direction  
**Reference reviewed:** [Moncalisse](https://www.moncalisse.com/en)  
**Relationship to reference:** Capture the reference site's cinematic pacing, editorial composition, restrained palette, image treatment, and motion language. Do not copy its branding, logo, copy, photography, page structure, or wine-specific functionality.  
**Existing product specification:** This document refines and supersedes the visual, layout, and motion direction in `specs.md`; the existing content, accessibility, SEO, privacy, and positioning requirements remain in force.

---

## 1. Creative Direction

Create a sophisticated personal website that feels immersive, quiet, tactile, and connected to place. It should resemble a carefully art-directed environmental publication rather than a conventional consultant or agency landing page.

The experience should communicate:

- Deep attention to land, communities, and public systems
- Confidence without corporate self-promotion
- A long-term, thoughtful practice
- Editorial credibility and visual restraint
- A personal point of view

The site must remain Laura's personal professional website. Do not imply a firm, permanent team, invented clients, awards, or project outcomes.

### Transfer from the reference

- Full-viewport photographic opening
- Fixed, minimal navigation over the hero
- Large editorial serif typography
- Warm, nearly white page background with very dark text
- Asymmetric multi-column compositions
- Alternating intimate portraits and expansive landscapes
- Text that enters in staggered words or lines
- Images that reveal through masks and subtle scale reduction
- A final full-viewport horizontal content slider
- Spacious, information-rich footer

### Do not transfer

- Moncalisse name, logo, symbols, content, or exact layouts
- Wine, hospitality, weather, or age-verification features
- Hidden native cursor or a site-wide custom cursor
- Long blocking loader
- Automatic carousels that cannot be paused
- Motion that delays access to essential information

---

## 2. Visual System

### 2.1 Color tokens

Use an original environmental interpretation of the reference palette.

| Token | Value | Use |
|---|---:|---|
| `--color-canvas` | `#FAF8F1` | Main page background |
| `--color-paper` | `#FFFDF8` | Cards and light overlays |
| `--color-ink` | `#1C3025` | Primary text and dark controls |
| `--color-forest` | `#173D2A` | Inverse sections and brand anchor |
| `--color-forest-deep` | `#102C1E` | Footer and image overlays |
| `--color-moss` | `#718265` | Secondary environmental accent |
| `--color-clay` | `#B85F3D` | Small emphasis and active state |
| `--color-line` | `#D9D4C8` | Rules and separators |
| `--color-text-muted` | `#596159` | Secondary copy |
| `--color-white` | `#FCFCFA` | Text over dark photography |

No gradients in the UI. A transparent black or forest scrim may be used over photography when needed for contrast.

### 2.2 Typography

Use licensed or open-source fonts rather than the reference site's proprietary typefaces.

- Display and editorial headings: `Newsreader` or `Source Serif 4`
- Body, navigation, labels, and controls: `Inter`
- Display weight: 400
- Body weights: 400 and 500
- Avoid bold display headings; scale and whitespace should create hierarchy
- Uppercase only for small labels, counters, and navigation metadata

Fluid type tokens:

```css
--type-display: clamp(3.5rem, 8vw, 8.5rem);
--type-hero-support: clamp(1.25rem, 2vw, 2rem);
--type-h2: clamp(2.5rem, 5vw, 4.5rem);
--type-h3: clamp(1.75rem, 3vw, 2.8rem);
--type-body-lg: clamp(1.125rem, 1.5vw, 1.35rem);
--type-body: 1rem;
--type-meta: 0.75rem;
```

- Display line height: `0.95–1.02`
- Body line height: `1.55–1.7`
- Paragraph measure: `55–70ch`
- Navigation and metadata letter spacing: `0.05em–0.1em`

### 2.3 Grid and spacing

- Desktop content maximum: `75rem / 1200px`
- Wide media maximum: `100vw`
- Desktop grid: 24 columns
- Tablet grid: 12 columns
- Mobile grid: 1 column
- Desktop side gutter: `clamp(2rem, 4.3vw, 3.5rem)`
- Mobile side gutter: `1.5rem–1.625rem`
- Standard desktop section spacing: `clamp(7rem, 12vw, 11rem)`
- Mobile section spacing: `5rem–6rem`
- Header height: `100px` desktop, `72px` mobile
- Corner radius: `0–3px`; imagery remains square
- Use hairline borders instead of shadows

Breakpoints:

- Compact/mobile: below `800px`
- Tablet: `800–959px`
- Desktop: `960px` and above
- Wide: `1440px` and above

---

## 3. Global Experience

### 3.1 Opening sequence

On a visitor's first page load:

1. Show the canvas color with a small original botanical line mark or Laura's initials centered.
2. Draw or fade the mark in over `400ms`.
3. Reveal the name `Laura McKelvey` over `500ms`, beginning `150ms` after the mark.
4. Lift the intro layer upward or crossfade it into the hero over `650ms`.
5. Total sequence must not exceed `1.4s` on a normal connection.

Rules:

- Skip the sequence after the first visit in the current session.
- Skip it when `prefers-reduced-motion: reduce` is active.
- Never use it to hide asset loading; the hero must load independently.
- Do not block keyboard focus longer than the visual sequence.

### 3.2 Smooth scrolling

- Use native scrolling as the baseline.
- Optional Lenis-style interpolation may be enabled on desktop fine-pointer devices only.
- Do not hijack scrolling on touch devices.
- Anchor links must land accurately below the fixed header.
- Browser back/forward and keyboard scrolling must behave normally.
- Disable interpolation for reduced motion.

### 3.3 Global navigation

Desktop:

- Fixed at the top, `100px` high
- Initially transparent with white content over the hero
- Laura's wordmark centered or left-aligned depending on viewport width
- Language controls are replaced by a small role label: `Environmental & Community Practice`
- Menu trigger on the right; a compact direct navigation may be used on very wide screens
- After the hero threshold, switch to canvas background with dark text and a hairline bottom border
- Transition colors and background over `300ms`

Menu overlay:

- Full viewport, deep forest background
- Large serif navigation links
- Links enter from `translateY(32px)` with `opacity: 0`
- Stagger links by `80ms`
- Menu open/close duration: `600ms`
- Menu icon morphs from two lines into a close symbol
- Trap focus, close on Escape, and restore focus to the trigger

Mobile:

- `72px` fixed header
- Wordmark left and menu button right
- Full-height menu; no hover-only interactions
- Minimum target size: `44px`

---

## 4. Landing Page Structure

### 4.1 Hero — “Practice rooted in place”

- Height: `100svh`, minimum `680px` desktop
- Full-bleed documentary environmental image or quiet looped video
- Dark forest scrim between `20%` and `38%` based on source image
- Centered or lower-left name treatment, depending on the selected photograph
- Main hero copy:
  - Eyebrow: `Environmental and public-interest practice`
  - Heading: `Working across communities, policy, and public systems.`
- Show one restrained scroll cue at the bottom
- No card, panel, or oversized button over the hero
- CTA appears immediately after the hero rather than competing with the image

Hero motion:

- Image begins at `scale(1.06)` and settles to `scale(1)` over `1.4s`
- Wordmark/name fades and rises `24px` over `700ms`
- Heading reveals by line with `80ms` stagger
- On scroll, image translates vertically at approximately `0.1–0.15 × scroll distance`
- Hero name fades between `0` and `25%` page scroll

### 4.2 Introductory statement

- Canvas background
- Two-column 24-grid composition
- Large serif statement spans roughly 15 columns
- Small role/audience note occupies the remaining columns
- Copy remains concise: no more than 55 words in the large statement
- A short text link leads to About

Motion:

- Split statement by line, not by individual character
- Initial state: `opacity: 0.15`, `translateY(5vh)`
- Enter to `opacity: 1`, `translateY(0)` over `700ms`
- Stagger lines by `80ms`

### 4.3 About Laura — asymmetric portrait section

- Oversized heading on the left, portrait or fieldwork photo on the right
- Image is tall, approximately `2:3`
- Supporting biography sits below or beside the heading
- Include `Read the full biography` and `Download résumé`
- No fictional portrait; use a neutral labeled placeholder until Laura supplies one

Motion:

- Image wrapper reveals with `clip-path: inset(0 0 100% 0)` to `inset(0)` over `900ms`
- Image inside starts at `scale(1.18)` and settles to `scale(1)` over `1.1s`
- Copy rises `5vh` and fades in

### 4.4 Full-width landscape interlude

- Wide environmental or community photograph
- Height: `65vh` desktop, `50vh` mobile
- Optional single-sentence caption in a small corner block
- Image uses a gentle vertical parallax; crop must remain safe at all breakpoints
- Decorative image only if the same information is provided nearby

### 4.5 Areas of work — editorial index

- Heading: `Where I focus my work`
- Four topics:
  1. Environmental Justice
  2. Community Engagement
  3. Policy and Public Processes
  4. Facilitation and Planning
- Desktop: four full-width ruled rows or a two-by-two grid, not rounded cards
- Each entry contains number, heading, one-sentence description, and arrow
- Hover expands the arrow and shifts the title `6px`; image preview is optional on desktop only
- Mobile: stacked list with always-visible description

Motion:

- Entries rise `32px` and fade in with `100ms` stagger
- Separator lines animate from `scaleX(0)` to `scaleX(1)` with left origin
- Hover duration: `300ms`

### 4.6 Working approach

- Asymmetric composition inspired by an editorial feature
- Large heading on one side and five numbered steps on the other
- Steps must remain scannable; do not animate them into a confusing horizontal sequence
- Optional fieldwork image behind or adjacent to the list

Motion:

- Numbers fade first, then titles and descriptions
- Stagger each step by `100ms`
- Image mask reveal may run simultaneously

### 4.7 Working principle band

- Dark forest or full-image band
- Display one approved statement in large serif type
- Keep the attribution modest
- Text reveal occurs line-by-line as the band enters the middle 70% of the viewport

### 4.8 Selected work and resources

- One featured project with a large portrait or landscape image
- One news/resource editorial item
- Alternate image-left/text-right, then text-left/image-right
- Use generous whitespace and no elevated card backgrounds
- Each item includes type, year, title, summary, and text link

Motion:

- Images reveal through an overflow mask
- Text enters from the lower edge by `5vh`
- Link underline draws on hover
- No autoplay in project media

### 4.9 Full-viewport areas slider

This is the most cinematic section and should be used once, near the end of the page.

- Each slide fills `calc(100svh - header height)`
- Full-bleed image background with deep overlay
- Centered paper-colored content panel, maximum `560px`
- Show `current / total`, title, short description, and CTA
- Persistent text paging along the bottom: the four area names
- Desktop supports drag, wheel only when the pointer is over the slider, arrow keys, and visible previous/next controls
- Mobile supports swipe and standard buttons
- Autoplay is off by default
- If autoplay is later enabled, provide pause/resume and use at least `7000ms` per slide

Slide transition:

- Duration: `850ms`
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- Background crossfade plus `scale(1.04)` to `scale(1)`
- Content panel moves `24px` and fades
- Never trap vertical page scrolling

### 4.10 Contact and footer

- Transition from the slider into a spacious deep-forest footer
- Primary CTA: `Let's connect`
- Do not publish placeholder contact details
- Include navigation, social links only when confirmed, image credits, privacy, accessibility, and copyright
- Add a small back-to-top control

---

## 5. Motion System

### 5.1 Tokens

```css
--motion-fast: 180ms;
--motion-ui: 300ms;
--motion-reveal: 700ms;
--motion-image: 900ms;
--motion-cinematic: 1200ms;
--ease-standard: cubic-bezier(0.645, 0.045, 0.355, 1);
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--stagger-word: 60ms;
--stagger-line: 80ms;
--stagger-item: 100ms;
```

### 5.2 Reveal primitives

Build reusable components rather than bespoke animation code in each section:

- `RevealLines`: line-based opacity and vertical reveal
- `RevealGroup`: intersection-triggered stagger for children
- `ImageReveal`: overflow mask plus scale settle
- `ParallaxMedia`: restrained image translation within a clipped wrapper
- `HorizontalStory`: accessible drag/keyboard slide experience
- `PageIntro`: session-aware opening sequence
- `MotionProvider`: reduced-motion settings and shared timing

Intersection behavior:

- Trigger once at approximately `15–25%` element visibility
- Do not replay reveals when a user scrolls back
- Essential text is present in the DOM and readable before JavaScript loads
- Initial hidden states are applied only after hydration to prevent blank server-rendered content

### 5.3 Reduced motion

When `prefers-reduced-motion: reduce` is active:

- Skip the page intro
- Remove parallax and smooth-scroll interpolation
- Replace masked image reveals with a `150ms` opacity fade
- Display all text without stagger
- Make sliders transition instantly or with a `150ms` crossfade
- Preserve every piece of content and every control

---

## 6. Recommended Implementation

### 6.1 Stack

- Next.js 15 App Router
- React 19 and TypeScript
- CSS Modules plus global design tokens
- `motion/react` for component-level reveals and presence transitions
- Intersection Observer for activation boundaries
- Embla Carousel for the full-viewport slider
- Optional Lenis only for desktop smooth scrolling
- `next/image` with AVIF/WebP sources
- `next/font` with Newsreader or Source Serif 4 and Inter

Do not import the reference site's JavaScript, CSS, fonts, or assets.

### 6.2 Component structure

```text
components/
  motion/
    MotionProvider.tsx
    PageIntro.tsx
    RevealLines.tsx
    RevealGroup.tsx
    ImageReveal.tsx
    ParallaxMedia.tsx
  navigation/
    CinematicHeader.tsx
    FullscreenMenu.tsx
  sections/
    CinematicHero.tsx
    EditorialIntroduction.tsx
    AsymmetricBiography.tsx
    LandscapeInterlude.tsx
    WorkAreaIndex.tsx
    ApproachEditorial.tsx
    SelectedStories.tsx
    HorizontalStory.tsx
    ContactFooter.tsx
```

### 6.3 Content architecture

Keep all text, images, captions, credits, links, and visibility settings in typed data files. Animation components must not contain business content. CMS data should be able to replace seed data without changing layout components.

---

## 7. Media Direction

- Use authentic documentary photography with natural light
- Favor environmental scale, lived places, listening, facilitation, and fieldwork
- Mix wide landscapes with a small number of intimate human images
- Avoid generic corporate meeting photography
- Avoid over-saturated greens and artificial HDR treatment
- Use AVIF first, WebP fallback, and explicit dimensions
- Hero image target: 2400px wide, under 450KB when practical
- Standard editorial image target: under 250KB
- Provide focal-point metadata for art direction across breakpoints
- Every non-decorative image needs approved alt text and credit

Generated photographs may be used only as clearly labeled design placeholders.

---

## 8. Accessibility and Interaction Requirements

- WCAG 2.2 AA minimum
- Skip link and semantic `main`, `nav`, and `footer` landmarks
- One page-level `h1`; no skipped heading levels
- Full keyboard operation for menu, slider, links, and controls
- Visible focus ring with at least `2px` contrast-safe outline
- Minimum `44 × 44px` pointer targets
- Menu overlay traps focus and closes with Escape
- Slider announces current item and total without excessive live-region updates
- Do not hide the system cursor
- Text over images must maintain `4.5:1` contrast
- Support 200% text zoom and 400% browser zoom/reflow
- Never encode meaning using animation alone

---

## 9. Performance Budgets

- Lighthouse performance target: 90+ on production mobile profile
- LCP: under `2.5s` at the 75th percentile
- CLS: under `0.1`
- INP: under `200ms`
- Initial client JavaScript: target under `180KB` compressed
- Preload only the active hero image and primary font subsets
- Lazy-load all below-the-fold media
- Do not autoplay video on mobile or reduced-data connections
- Pause offscreen video and expensive animation loops
- Avoid layout reads on every scroll frame; use transforms and requestAnimationFrame

---

## 10. Responsive Behavior

### Mobile

- Hero uses `100svh`
- Single-column content flow
- No decorative custom cursor, desktop hover preview, or smooth-scroll interpolation
- Heading maximum around `3.5rem`
- Full-width images with intentional crops
- Slider uses swipe and visible buttons
- Editorial asymmetry becomes a clear linear reading order

### Tablet

- Use 12 columns
- Preserve offset images when space permits
- Areas may remain two columns
- Menu remains full screen

### Desktop

- Use 24 columns and asymmetric spans
- Enable restrained parallax and masked media reveals
- Fixed 100px header
- Horizontal story supports drag and keyboard controls

---

## 11. Testing and Acceptance Criteria

The theme is accepted when:

- The hero fills the initial viewport without layout shift
- Header colors change reliably after leaving the hero
- The first-visit intro never exceeds `1.4s` and is skipped on repeat visits
- All reveal animations run once and remain readable without JavaScript
- Reduced-motion mode removes parallax, stagger, and long transitions
- Image reveals do not expose blank areas during scroll
- The full-viewport slider works by mouse, touch, and keyboard
- The slider does not capture normal vertical scrolling
- Menu focus is trapped and correctly restored
- The page reflows cleanly at 320px width
- Every image has approved alt text or is marked decorative
- No Moncalisse assets, code, copy, typography files, or brand identifiers are used
- Placeholder portraits, projects, contact details, and claims are visibly marked and excluded from production
- Automated accessibility, keyboard, screen-reader, and performance checks pass before launch

---

## 12. Build Sequence

1. Add the revised design tokens, typography, and 24-column layout primitives.
2. Build the motion provider, reduced-motion behavior, and reusable reveal components.
3. Replace the current header and hero with the cinematic versions.
4. Recompose About, Areas of Work, Approach, and Selected Work into asymmetric editorial sections.
5. Add the single full-viewport horizontal story section.
6. Rebuild the contact invitation and footer.
7. Replace all generated photography with approved assets.
8. Complete responsive, accessibility, performance, and interaction testing.

