# Reframing plan: ESE as the brand

**Supersedes the Identity decision in `REDESIGN_PLAN.md`.** That plan's first
row read *"Laura McKelvey is primary. This stays her personal site; ESE is
presented as the organization her work runs through."* That is now reversed:

> The brand and the business are **Environment Sovereignty & Equity (ESE)**.
> Laura McKelvey is the driving force behind it, but she is one of several
> people, not the subject of the site.

Everything else in `REDESIGN_PLAN.md` — the photography assessment, the
`category` + `newsletters` data model, the duotone approach — still stands unless
contradicted below.

---

## 1. Why this is a bigger change than a find-and-replace

The site is currently built so that **Laura is the subject and ESE is a section
of her page.** Three things encode that, and all three have to move:

| Where | Currently | Has to become |
|---|---|---|
| `site.name` | `"Laura McKelvey"` | `"Environment Sovereignty & Equity"` |
| Wordmark | "Laura McKelvey / Environmental & Community Practice" | "ESE" / full name |
| Nav | About · Approach · **ESE** · Services · News · Blog · Contact | ESE *is* the site; a section called "ESE" is incoherent |
| Page order | Hero (Laura) → About Laura → My approach → **What is ESE** → services… | ESE's proposition first; people later |
| Voice | Laura's `"I work with communities…"` | The doc's `"we"` — `"At ESE, we've assembled a network…"` |
| JSON-LD | `WebSite.about` → **Person** (Laura); Organization secondary | `Organization` primary; Laura a `founder` |
| Footer | "Laura McKelvey / Environmental & Community Practice" + ESE as a sub-line | ESE, with Laura credited in a People section |

The approved copy in `ref_docs/ESE Website language_CM Notes1.docx` is **already
entirely in ESE's voice** — 32 lines, first-person plural throughout, and it never
mentions Laura once. So the reframing is mostly *removing* an inserted personal
frame, not writing new organizational copy.

## 2. What the source document gives us, in full

Everything below is approved copy. Nothing else should be invented.

- **What is ESE** — 3 paragraphs (support Native Nations and marginalized
  communities; a network of partners and experts; profits go back to communities,
  plus the ESE Scholarship Program)
- **Who We Are** — "a network of environmental engineers, consultants,
  sustainability organizers, and Tribal and community-focused advocates"
- **Who We Serve** — 6 audiences
- **Become a partner** — for environmental professionals and facilitators
- **Service Areas** — 5: Policy Support & Sovereignty · Grant Development ·
  Project Implementation (Technical) · Sustainability & Climate Resilience ·
  Communications Support
- **Case Study: PFAS Degradation** — with Bioremediation Resource Recovery
  Systems, LLC; provisional patent; bench testing and field trials underway
- **Tools and Resources** — 2, both explicitly "Coming soon"
- **Our Mission** — two alternative statements

**What the document does not contain:** any person's name or biography, any
contact address, any office or location, any client list, any founding date, any
staff count. So the People section cannot be written from this source — see
Blockers.

## 3. Proposed information architecture

ESE's proposition opens the page. People appear after the work, which is the
convention for a consultancy: a visitor wants to know what you do before who you
are.

| # | Section | Copy source | Notes |
|---|---|---|---|
| 1 | **Hero — ESE** | "What is ESE" ¶1, condensed | The headline becomes ESE's claim, not Laura's. See §5 for the image question. |
| 2 | **What we do / What is ESE** | "What is ESE" ¶1–2 + Mission | The bridge between communities and agencies. |
| 3 | **Service Areas** (5 cards) | Service Areas | Unchanged from the current build. |
| 4 | **Who We Serve** (6) | Who We Serve | Typographic, no imagery. Unchanged. |
| 5 | **Case Study: PFAS** | Case Study | Unchanged. |
| 6 | **Tools & Resources** | Tools and Resources | Honest "coming soon", no fake links. Unchanged. |
| 7 | **Who We Are — the network** | Who We Are | Currently generic. Becomes the People section if names are supplied. |
| 8 | **People / Leadership** | **needs input** | Laura as founder / principal, plus others. Honest empty state until supplied. |
| 9 | **Scholarship Program** | "What is ESE" ¶3 | Unchanged. |
| 10 | **Become a partner** | Become a partner | Unchanged. |
| 11 | **News & Updates teaser** | live from the database | Unchanged. |
| 12 | **Contact + footer** | Become a partner | Copy moves from "I'm open to conversations…" to ESE's voice. |

### Sections that lose their current framing

- **Hero** — was Laura's headline over her photograph. Becomes ESE's.
- **"About Laura"** (3 paragraphs, first person) — this is the one piece of
  genuinely good practice writing on the site and it is entirely in "I" voice.
  Three options, and this needs your call (§6, Q2).
- **"My approach"** (5 steps, first person) — same problem. The steps themselves
  describe how ESE works and survive a rewrite to "we" almost unchanged.
- **`#ese` section** — dissolves. When the whole site is ESE, a section
  introducing ESE to Laura's audience has no reader.

### Navigation

Current: `About · Approach · ESE · Services · News · Blog · Contact`

Proposed: `What we do · Services · Who we serve · Case study · People · News · Blog · Contact`

That is 8 items, which is one more than the 7 the header currently fits
comfortably. I measured the header at 14 widths earlier: 7 items fit down to
960px with the nav collapsing to the fullscreen menu below that. An 8th needs
either a shorter label set or an earlier collapse — I'd drop "Case study" from
the nav (it stays a page section) and keep 7.

## 4. Identity surfaces to change

Small files, but they are what makes the site *be* ESE rather than look like it:

- `src/lib/data/ese-content.ts` — `site.name`, `homepageTitle`,
  `metaDescription`, `footerDescription`, `navigation`
- `src/components/navigation/CinematicHeader.tsx` — wordmark markup and
  `aria-label`
- `src/components/seo/StructuredData.tsx` — invert the graph: `Organization` as
  the primary entity and `WebSite.about`; `Person` becomes
  `Organization.founder`. The `@id`s stay stable so the blog's `BlogPosting`
  → `publisher` reference keeps resolving.
- `src/components/blog/BlogPostingJsonLd.tsx` — `author` currently points at
  Laura's Person `@id`. For ESE-published posts the author should be the
  Organization, unless posts carry a byline (they do not — `posts` has no author
  name column, only `author_id`).
- `src/components/blog/BlogFooter.tsx` and the landing footer — wordmark
- `src/app/layout.tsx` — title template `%s | Laura McKelvey` → `%s | ESE`
- `src/app/admin/**` — the console says "Blog admin"; unaffected by identity but
  worth a pass for "ESE" where it says nothing

**Not affected at all:** the Supabase schema, both migrations, the blog, the news
section, the admin console, RLS, the upload pipeline, and every check in
`scripts/`. The reframing is content, copy, IA, and identity metadata. No data
model changes.

## 5. The photography problem, stated plainly

This is the part where your two most recent instructions collide, so I want it in
front of you rather than resolved silently.

You asked me to restore the hero and the "Let's connect" footer to a **full-bleed
background photograph**, as they were before the branch. I did, and it is verified
— every piece of text on both sections clears WCAG AA against the real rendered
pixels (hero 6.6–15.9:1, contact 5.0–17.9:1, header over the photo 5.1–12.5:1).

**But those two images are not ESE's.** They are `cinematic-river-valley.jpg` and
`contact-river-sunset.jpg` — generated placeholder stock from the original
personal-site design. The README's publication warning already says so.

And ESE's own photographs cannot replace them at that size. I measured all 26
files in `drive-download-20260813T050944Z-1-001`:

- 23 of 26 are **640px or smaller** on the long edge
- the largest is `IMG_1195.JPG` at **1286×965**
- the smallest is `IMG_7800.jpeg` at **240×320**

A 1286px-wide file across a 1440px viewport is already under-sampled; on a 2× or
2560px display it is roughly a 4× upscale. These are the originals as supplied —
the small `.webp` files in `public/images/ese/` are not the cause.

### Decided (2026-08-13)

**Hybrid, and the existing large photographs stay.** The two full-bleed slots keep
`cinematic-river-valley.jpg` and `contact-river-sunset.jpg`; ESE's own photographs
carry the contained slots — cards, figures, the portrait — where 640px genuinely
holds up. Nothing is upscaled.

Per-slot target resolutions, and a paste-ready instruction for producing better
originals, are in **`ref_docs/IMAGE_BRIEF.md`**. Two of ESE's photographs are
excluded from any image-model processing there, for reasons worth reading: the
portrait and the working-session photograph both show identifiable real people.

The three options below are kept as the reasoning behind that decision.



1. **Contained + duotone** (what `REDESIGN_PLAN.md` chose). Photography appears
   in cards and bounded panels where 640px holds up, rendered through a brand
   duotone so 26 phone photos from different years read as one system. The
   premium feel is carried by typography and motion, which are resolution-
   independent. *Cost:* the full-bleed hero you just asked for goes away again.
2. **Keep full-bleed, ESE photograph, accept the softness.** Use `IMG_1195` or a
   landscape from the set behind the hero. Honest imagery, visibly soft on a
   large screen, partly masked by the scrim and grain.
3. **Keep full-bleed, get higher-resolution originals.** The set looks like it
   was exported at reduced size — if the camera originals exist, this problem
   disappears entirely. This is the only option that gets both.

My recommendation is **3 if the originals exist, otherwise 1.** Shipping
generated stock photography on a real consultancy's site is the option I would
avoid: it is the one that could actively mislead someone about ESE's work.

## 5b. Two calls I made rather than block on

Both are reversible in about a line, and both are the conservative option — they
preserve approved copy verbatim rather than rewriting or discarding it.

**Laura's framing → founder profile.** The site speaks as "we" throughout. Laura's
three About paragraphs are kept *verbatim and attributed to her* in a People
section, where first person is correct and honest. Her five Approach steps
describe how ESE works rather than anything personal, so those are rewritten to
"we" and stay in the body of the page as ESE's method.

The alternative — pluralising her About paragraphs into ESE's voice — would put
words in the mouth of "a network of engineers, consultants and advocates" that one
person wrote about her own practice. Attribution is both safer and better writing.

**Mission → both statements.** The document offers two and does not say which is
canonical. The longer one becomes the mission proper; the shorter one sits beneath
it as a supporting line. This uses all approved copy and invents nothing. Say
which you want if you'd rather have one.

## 6. Blockers — things I cannot invent

1. **People.** "Laura is the driving force but there are others as well." The
   source document names nobody (only a "Josh" in an unfinished TODO). To build a
   People section I need, per person: name, role, one- or two-line bio, and
   whether they want a photograph. The set has exactly one usable portrait
   (`IMG_0244`). Until then the section renders an honest "network" statement with
   no invented profiles.
2. **Laura's framing.** How should she appear? See Q2 below.
3. **Contact address.** Still `replace-before-launch@example.com`.
4. **Canonical domain.** Still `https://example.com`, which every canonical tag,
   sitemap URL, and JSON-LD `@id` resolves against.
5. **The EJ GIS tool description** ends mid-sentence — "(Josh fill out)". Rendered
   as coming-soon with no description rather than guessed at.
6. **Mission** — the document gives two alternative statements. Which one, or both?

## 7. Implementation sequence

Once §5 and §6 Q2 are decided:

1. Content layer — rewrite `ese-content.ts` to ESE-first: `site`, `navigation`,
   hero, and a new `people` export with an honest empty state.
2. Voice pass — every "I"/"my" in rendered copy becomes ESE's "we"/"our", or moves
   into a founder profile.
3. Recompose `EseLanding.tsx` to the §3 order; delete the `#ese` section wrapper.
4. Identity surfaces — §4, including the JSON-LD inversion.
5. Photography — per the §5 decision.
6. Re-run the gates: `npm run typecheck`, `npm run build`,
   `npm run test:validation`, `npm run test:covers`, the contrast harness at
   1440/1024/390, and a horizontal-overflow sweep.

Steps 1–4 are mechanical once decided. Step 5 is the one with a real fork in it.
