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
- A Supabase-backed blog at `/blog` and an admin console at `/admin` — see
  "Blog and admin console" below

## Blog and admin console

A Supabase-backed blog at `/blog` with an admin console at `/admin`. An
external MCP drafting tool — which lives outside this repository — publishes
drafts straight into the database over PostgREST. It can only ever create
drafts; publishing is a human action in the console.

### Setting it up

1. **Create a Supabase project**, then copy `.env.local.example` to `.env.local`
   and fill in the project URL, publishable (anon) key, and service-role key. The
   URL must be the bare origin — a trailing `/rest/v1/` breaks every call in a way
   that looks like anything but a bad variable.
2. **Apply both migrations, in order**, by pasting each into the Supabase SQL
   editor. Both are idempotent, and `0002` depends on functions defined in `0001`:
   - `supabase/migrations/0001_blog_and_admin.sql` — the wire contract, RLS, the
     `blog-images` bucket
   - `supabase/migrations/0002_news_and_newsletters.sql` — `posts.category` and the
     `newsletters` table
3. **Create the owner.** Auth → Users → Add user (tick *Auto Confirm User*),
   then insert a `profiles` row with `role = 'owner'` for that UUID. The exact
   SQL is at the bottom of `0001`. The external tool attributes every draft to the
   oldest owner and **fails outright without one**.
4. **Restart the dev server** so it reads the new variables, then sign in at
   `/admin/login`. Further admins are granted from `/admin/people`.
5. **Prove it works:** `npm run verify:contract -- --base-url http://localhost:3000`
   (see below).

### Checks

```bash
npm run test:validation   # field rules vs. the CHECK constraints. No database.
npm run test:covers       # magic-byte sniffing and EXIF stripping. No database.
npm run verify:contract   # the wire contract and RLS, against the real database.
```

`verify:contract` reads `.env.local`, impersonates the external drafting tool, and
asserts the negative cases that actually prove RLS is doing something — anonymous
callers cannot read a draft, cannot insert, cannot publish, cannot read `profiles`,
cannot upload. Pass `--base-url` to add HTTP assertions (404 on drafts, one
canonical, sitemap contents, the two sections not leaking into each other's URLs).

Point `--base-url` at `npm run dev`, not a production server: it publishes straight
to the database rather than through the console, so nothing fires the cache
revalidation that a real publish would, and `/blog` is cached for an hour.

Everything it creates is namespaced under a `zz-contract-check-` slug prefix and
deleted afterwards, including on failure.

The database schema in Part 1 of that migration is a **wire contract** with the
external tool. Do not rename, retype, or drop any of those columns; add
alongside them instead.

### How authorization works

- A row in `profiles` is what grants access. An Auth account without one can
  sign in and gets an explicit "awaiting approval" page, never the console.
- Every field is validated in three places: the input attributes, the Server
  Action (`src/lib/blog/validation.ts`), and a Postgres CHECK constraint. Only
  the last cannot be bypassed.
- Every page **and every Server Action** re-checks authorization. A Server Action
  is a public HTTP endpoint, and a layout is not a security boundary.
- `middleware.ts` refreshes the session and makes no authorization decisions.
  Next 16 renames this convention to `proxy.ts`; on 15.5 that filename is ignored
  entirely, so rename it when the project upgrades.
- Row Level Security restricts anonymous and authenticated reads to published,
  non-future posts. The service-role key is used in exactly two places, both on
  the owner-only People page: listing `auth.users`, and creating accounts.

### Deliberate choices worth knowing

- **Raw HTML in post bodies is not rendered.** `rehype-raw` is deliberately not
  installed, so stored XSS is a non-event rather than a one-insert problem. Post
  bodies are untrusted input — some are machine-written.
- **The canonical origin is a hardcoded constant**, not an env var
  (`src/lib/blog/config.ts`). A missing variable silently yields an empty sitemap
  and no canonicals, which is very hard to notice.
- **The site stays `noindex` until `SEARCH_ENGINE_INDEXING` is flipped** in
  `src/lib/blog/config.ts`. All the SEO machinery is built and wired; that one
  boolean turns it on, and `/admin` stays disallowed either way.
- **`published_at` is stamped on the first publish only.** Editing a live post,
  or unpublishing and republishing, keeps the original date.
- **Cover uploads are typed from magic bytes**, not the filename or the declared
  MIME type. JPEG, PNG, and WebP only — SVG is refused as a script vector.
- **Reading time is computed at render**, skipping code blocks, and never stored.
- **The public blog reads through an anonymous, cookie-less client** so `/blog`
  can sit in the route cache; that is what makes on-demand revalidation on every
  mutation meaningful. A slug change also flushes the *old* slug.
- **Without Supabase credentials the blog fails soft** — an empty index, 404s on
  posts — so `next build` succeeds on a checkout with no `.env.local`. A query
  that fails against credentials that *are* present still throws.

### Known gaps

- **No password-change screen.** Rotate passwords from the Supabase dashboard
  under Authentication → Users. Building one needs a current-password re-check,
  or a stolen session cookie is enough to take over an account.
- **No email is sent, anywhere.** Accounts are created already-confirmed, so
  nothing depends on the built-in mailer — which allows 2 emails per hour
  project-wide and, on current projects, only delivers to members of your
  Supabase org. Configure custom SMTP before adding any flow that emails a user.
- **Set the environment variables before building.** `/blog`, `/news`, and
  `/sitemap.xml` are prerendered, so a build made without credentials bakes in an
  empty blog. They carry a one-hour revalidate, so it self-heals within the hour,
  but a deploy in that order will look broken at first.
- **`site.canonicalBase` is still `https://example.com`.** Every canonical,
  JSON-LD URL, and sitemap entry resolves against it.

## Editing

- Blog and admin config, including the canonical origin and the indexing switch:
  `src/lib/blog/config.ts`
- Post field limits, mirroring the DB constraints: `src/lib/blog/validation.ts`
- Blog styling: `src/styles/blog.css`; admin styling: `src/styles/admin.css`
- All site copy — Laura's and ESE's: `src/lib/data/ese-content.ts`
- News & Updates config, including the newsletter signup endpoint:
  `src/lib/news/config.ts`
- Design tokens: `src/styles/tokens.css`
- Layout and responsive styling: `src/app/globals.css`
- News & Updates styling: `src/styles/news.css`
- Motion primitives: `src/components/motion/`
- Shared scroll loop and reduced-motion watcher: `src/lib/scroll.ts`
- Page tones: the `html[data-scroll-theme=...]` block at the top of `globals.css`
- Landing-page composition: `src/components/sections/EseLanding.tsx`
- The photograph selection and the image pipeline: `scripts/prepare-images.mjs`.
  Re-run it with `node scripts/prepare-images.mjs` after changing the selection
  or dropping a new archive into `ref_docs/`.

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
