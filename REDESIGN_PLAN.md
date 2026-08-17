# ESE website — reframe plan

Branch: `redesign/content-refresh-news`

## The decision

**The brand and the business is Environment Sovereignty & Equity (ESE).** This is
ESE's website, not Laura McKelvey's. Laura is the driving force behind the
business and appears as its founder — a named, portrait-carrying presence inside
ESE's story, not the subject the site is about.

This supersedes the two earlier positions in this branch's history (a full ESE
rebrand, then "primarily Laura's personal site"). Everything below is written
against the final one.

### What that means concretely

| Surface | Before | After |
|---|---|---|
| Header wordmark | Laura McKelvey | Environment Sovereignty & Equity |
| Opening animation | "Laura McKelvey" | "Environment Sovereignty & Equity" |
| `<title>` / metadata | Laura McKelvey \| … | ESE \| … |
| Page voice | "I work with communities…" | "We support Native Nations…" |
| JSON-LD primary entity | `Person` (Laura) | `Organization` (ESE), with Laura as `founder` |
| Footer name | Laura McKelvey | Environment Sovereignty & Equity |
| Laura's placement | the whole site | one founder block inside "Who we are" |

### The voice rewrite

Laura's existing copy is first-person practice writing ("I work with…", "Much of
my work begins with listening"). Two things happen to it:

- **The Approach section** becomes **"How we work"** and moves to ESE's plural
  voice. The five steps themselves are neutral method descriptions and are
  unchanged.
- **Her three "About Laura" paragraphs** are *not* rewritten into third person.
  Rewriting someone's first-person account of their own practice into a
  third-person bio means inventing biographical framing that nobody supplied.
  Instead they are **attributed** — presented as a founder's statement in her own
  words, under her name and portrait. Nothing is invented and nothing is lost.

`TODO(ese)`: her exact title is still unknown. The founder block says "Founder"
because that is what "the driving force behind the business" supports; if she is
Principal, Managing Director, or anything else, it is one string in
`ese-content.ts`.

---

## Section order

ESE's own story runs the whole page. Laura appears at position 8, where the
network is introduced.

| # | Section | Copy source |
|---|---|---|
| 1 | Hero — ESE | Mission / positioning |
| 2 | What is ESE (+ mission panel) | What is ESE ×2, both missions |
| 3 | Who we serve | Who We Serve |
| 4 | Service areas (5 cards) | Service Areas |
| 5 | How we work | Approach steps, re-voiced |
| 6 | Case study: PFAS degradation | Case Study |
| 7 | Tools & resources — "in development" | Tools and Resources |
| 8 | **Who we are** — the network, **Laura as founder**, become a partner | Who We Are + Become a partner + Laura's statement |
| 9 | Scholarship program | What is ESE ¶3 |
| 10 | News & updates | live from DB |
| 11 | Contact | Become a partner |

---

## Photography

Both pools are now in play, and they have very different properties:

- **`public/images/*.jpg` — 16 files from `main`, 1200×800 to 2000×799.**
  High-resolution and compositionally strong. But per this repo's own README they
  are *generated design placeholders*, not photographs of anything real.
- **`public/images/ese/*.webp` — 13 files from `ref_docs`, 427×640 to 1286×965.**
  Real photographs of real ESE work and people. Low-resolution.

### The allocation rule

**Anywhere a person is visible, the photograph must be real.** Landscapes,
places, and objects may come from the generated pool.

This matters more than usual here. ESE serves Native Nations and marginalized
communities; illustrating that work with AI-generated images of people would
misrepresent both the communities depicted and ESE's own record, on the website
of the organization serving them. Generated rivers and empty meeting rooms carry
no such claim.

The rule also happens to solve the resolution problem: the generated pool is
high-res and goes in the large formats, the real pool is contained in cards and
figures where 480–640px holds up.

### Assignment

| Section | Image | Source | Why |
|---|---|---|---|
| Hero (full-bleed) | `cinematic-river-valley.jpg` 1672×941 | main | Needs the pixels; landscape, no people |
| What is ESE | `working-session` 1286×965 | **ref** | Real ESE working session — people, so it must be real |
| Who we serve | `environmental-justice-neighborhood.jpg` | main | Place, no people |
| Policy & Sovereignty | `public-process-chamber.jpg` | main | An empty civic room — literal, and unpeopled |
| Grant Development | `planning-resources.jpg` | main | Maps and planning materials |
| Project Implementation | `service-technical` | **ref** | Real water; card-contained |
| Sustainability & Resilience | `restored-wetland.jpg` 1800×962 | main | Landscape |
| Communications Support | `community-tools-mapping.jpg` | main | Workshop materials, no people |
| How we work | `riverside-hillside-neighborhood.jpg` 1672×941 | main | Large side panel needs the pixels |
| Case study: PFAS | `flowing-stream.jpg` 2000×666 | main | Water systems; wide format needs the pixels |
| Who we are | `conference-session` | **ref** | Real ESE event — people |
| Founder | `portrait-laura` | **ref** | A real person's face. See below |
| News teaser | `news-shoreline` | **ref** | Contained |
| Contact | `contact-river-sunset.jpg` 2000×799 | main | Unchanged from `main` |

`laura-mckelvey-portrait.jpg` and `portrait-placeholder.jpg` from `main` are
**deliberately unused**. Both are generated portraits; the first is named for a
real person who is not in it. Putting a synthetic face under a real founder's
name is the one thing in this whole set that would be straightforwardly
dishonest, so the founder block uses the real archive portrait instead.

---

## Files

- `src/lib/data/ese-content.ts` — rewritten: ESE identity, ESE-voiced hero,
  `founder` export, `howWeWork` replacing `approach`, new image assignments
- `src/components/sections/EseLanding.tsx` — new section order, founder block
- `src/components/navigation/CinematicHeader.tsx` — ESE wordmark
- `src/components/motion/PageIntro.tsx` — ESE in the opening animation
- `src/components/blog/BlogFooter.tsx` — ESE footer name
- `src/components/seo/StructuredData.tsx` — Organization primary, `founder` link
- `src/components/blog/BlogPostingJsonLd.tsx` — ESE as publisher and author
- `src/app/layout.tsx`, `blog/page.tsx`, `news/page.tsx` — ESE metadata
- `src/app/globals.css` — founder block styles

## Unchanged

The blog, News & Updates, the admin console, the migrations, and the whole
Supabase layer. None of them depend on whose name is on the front.

## Still outstanding

Unchanged from before: contact address, production domain, which mission
statement is authoritative, the `(Josh fill out)` gap, and confirmation that the
archive portrait is Laura. All marked `TODO(ese):` in code.
