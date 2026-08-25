# ESE blog-generation MCP server — findings and implementation brief

A dedicated MCP drafting server for this site, conceptually modelled on the one
built for Denalix but configured and isolated for ESE.

**Status: nothing is built.** This document is the plan and the brief. Part 4 is
written to be handed to a fresh Claude Code session as-is; parts 1–3, 5 and 6 are
the reasoning behind it, the acceptance bar, and the questions the repository
cannot answer.

Produced from a read-only survey of this repository. Every claim about ESE below
was verified against a file, not assumed from how such projects usually look.

## Contents

1. [What this repository actually is](#1-what-this-repository-actually-is)
2. [Where ESE differs from the Denalix assumption](#2-where-ese-differs-from-the-denalix-assumption)
3. [Recommended approach](#3-recommended-approach)
4. [The implementation prompt](#4-the-implementation-prompt)
5. [Acceptance criteria and verification](#5-acceptance-criteria-and-verification)
6. [Unresolved questions](#6-unresolved-questions)

---

## 1. What this repository actually is

**Stack.** Next.js 15.5.22 App Router, React 19.1.1, TypeScript 5.8.3,
`@supabase/ssr` 0.12.4, `@supabase/supabase-js` 2.112.3, `sharp` 0.35.3. The app
talks HTTPS to PostgREST and never opens a Postgres connection at runtime;
`SUPABASE_DB_URL` exists only for `npm run db:migrate`.

**No zod, and no test framework.** Scripts run through a TypeScript resolve hook:
`node --import ./scripts/register-ts.mjs <script>`. Existing scripts are
`test:covers`, `test:validation`, `test:seo`, `test:password`, `verify:contract`,
`check:schema`, `db:migrate`, `sql:bundle`. `lint` is `next lint`; `typecheck` is
`tsc --noEmit`.

**The decisive find: the schema is already a declared wire contract for exactly
this tool.** The header of `supabase/migrations/0001_blog_and_admin.sql` reads:

> The `profiles` and `posts` definitions below are a wire contract with an
> external drafting tool (an MCP server that lives outside this repository). It
> inserts and reads these exact column names.

`scripts/verify-contract.mjs` already *impersonates* that tool, and `README.md`
states it "can only ever create drafts; publishing is a human action in the
console." This is not a retrofit — it is building the counterpart the schema was
designed around.

**`posts` columns.**

```
id uuid pk
title text            1..160
slug text unique      ^[a-z0-9]+(?:-[a-z0-9]+)*$, 1..160
excerpt text          1..320
content text          non-empty after trim
cover_image_url text  nullable
cover_image_alt text  nullable — but a DB CHECK requires it whenever url is set
author_id uuid        NOT NULL, references auth.users(id)
status text           'draft' | 'published'
source text           'human' | 'ai-assisted'
published_at timestamptz
seo_title text        <= 60
seo_description text  <= 160
created_at, updated_at timestamptz
category text         'blog' | 'news', default 'blog'   (migration 0002)
focus_keyword text    <= 120, nullable                  (migration 0003)
```

There are **no columns for tags, related keywords, internal links, or an author
display name**.

**Auth.** `profiles(id, display_name, role owner|admin)` plus `public.is_admin()`
and `public.is_owner()` security-definer functions. Per `README.md`, the external
tool attributes every draft to the **oldest owner** and fails outright without
one.

**Storage.** Bucket `blog-images` — public, 5 MB limit, allowed MIME
`image/jpeg`/`image/png`/`image/webp`, writes gated on `is_admin()`. Covers live
under a `covers/` prefix.

**Review URL.** `/admin/posts/<id>`. The `(console)` route group does not appear
in the path.

**Already built and reusable — this is the most important section.**

| Concern | Module | What it gives you |
| --- | --- | --- |
| Validation | `src/lib/blog/validation.ts` | `FIELD_LIMITS`, `SLUG_PATTERN`, `POST_CATEGORIES`, `slugify`, `validatePost`, `emptyToNull` |
| SEO checks | `src/lib/blog/seo.ts` | `runSeoChecks`, `seoScore`, `CheckStatus` (pass/warn/fail/skip), `TITLE_RANGE` 30–60, `DESCRIPTION_RANGE` 70–160, `SLUG_MAX_WORDS` 8, `BODY_MIN_WORDS` 300 |
| Image safety | `src/lib/blog/image.ts` | `sniffImage` magic-byte detection, `checkCoverSize`, `COVER_MAX_BYTES` 5 MB. Deliberately import-free so plain `node` can run it |
| Image processing | `src/lib/blog/image-server.ts` | `reencodeCover` — strips EXIF/GPS, bakes orientation via `.rotate()`, caps at `MAX_EDGE` 2400 |
| Queries | `src/lib/blog/queries.ts` | `getPublishedPosts`, `getPublishedPost`, `getSitemapPosts`, `getAllPostsForAdmin`, `getPostForAdmin` |
| URLs | `src/lib/blog/config.ts` | `SITE_ORIGIN`, `absoluteUrl`, `postUrl`, `BLOG_PATH`, `ADMIN_PATH` |
| Brand and content | `src/lib/data/ese-content.ts` | `site`, `hero`, `people`, `ese` (intro, mission, five services), `contact` |

**Real internal-link targets.** `/services/policy-support-and-sovereignty`,
`/services/grant-development`, `/services/project-implementation`,
`/services/sustainability-and-climate-resilience`,
`/services/communications-support`, plus `/people`, `/news`, `/blog` and the
homepage anchors `/#about`, `/#services`, `/#who-we-are`, `/#contact`.

**Two live caveats.** `site.canonicalBase` is still `https://example.com`
(`TODO(ese)` in the file) and `SEARCH_ENGINE_INDEXING` is `false`. The site is
`noindex, nofollow` with placeholder canonicals.

**Subject matter.** ESE is Environment Sovereignty & Equity — environmental
consulting for Native Nations and other marginalized communities. That carries
editorial and image-generation obligations an ordinary marketing blog does not,
and they are written into the brief as rules rather than preferences.

---

## 2. Where ESE differs from the Denalix assumption

| | Denalix | ESE |
| --- | --- | --- |
| Next.js | 16.2.10, with an `AGENTS.md` "this is not the Next.js you know" rule | **15.5.22**, no such rule |
| Tool schemas | zod (`postInputSchema`) | Hand-written `validatePost`. **Adding zod would give ESE two validation idioms** |
| Test runner | `tsx --test` + the Node test runner | `node --import ./scripts/register-ts.mjs`, no framework |
| Lint | `eslint` | `next lint` |
| Post model | flat | has a `category` `blog\|news` discriminator, and `focus_keyword` |
| Cover pipeline | forces 1200×630 WebP | `reencodeCover` **deliberately preserves aspect ratio and format** (`fit: "inside"`, `MAX_EDGE` 2400) so an author's PNG or portrait crop survives |
| SEO checks | built inside `mcp/seo-audit.ts` | already in the app at `src/lib/blog/seo.ts` |
| Multi-site | three-site registry with a `SITE_<KEY>_*` credential convention | single site; **no such convention exists and none should be added** |
| Schema awareness | MCP owns the schema | the schema declares itself a contract *for* the MCP, and `verify-contract.mjs` already tests it |

The cover-pipeline row is the one most likely to cause a mistake: a 1200×630
target is correct for generated artwork but must not be imposed on
`reencodeCover`, whose behaviour is a deliberate choice for human uploads.

---

## 3. Recommended approach

A standalone `mcp/` directory in this repository that **imports ESE's existing
libraries** rather than reimplementing them, with the provider and database
boundaries injected so the cover source-priority matrix is testable without paid
requests or a live database.

Isolation from Denalix is structural rather than conventional: the site registry
contains only `ese`, and no code path reads a `SITE_<KEY>_*` variable, so there
is nothing to misconfigure toward Denalix in the first place.

**Do not extract shared code with Denalix yet.** The two schemas genuinely
differ — ESE has `category` and `focus_keyword` and no tags; Denalix has neither
category nor keyword — and premature extraction would couple two projects whose
contracts are not the same. Revisit only once a third site exists.

---

## 4. The implementation prompt

Everything from here to the end of this section is self-contained. Open a fresh
Claude Code session in this repository and paste it in.

---

Work in `/Users/ravir/CS/startup/West_oakland/test_projects/personal-website-cinematic`.

Build a blog-drafting MCP server for the ESE website. Read this whole brief before
writing code, then read the files it names. The repository has already been
surveyed; the facts below are verified against it, so trust them over your priors
about how a Next.js + Supabase blog is usually wired.

### 0. Read these first

- `README.md` — especially "Blog and admin console" (line ~70) and the
  publication warning near the end.
- `supabase/migrations/0001_blog_and_admin.sql` — **Part 1 is a declared wire
  contract with an external MCP drafting tool.** You are building that tool. The
  header says the columns must not be renamed, retyped or dropped.
- `supabase/migrations/0002_news_and_newsletters.sql` — adds `posts.category`.
- `supabase/migrations/0003_focus_keyword.sql` — adds `posts.focus_keyword`, and
  note its comment: it assumes the external tool *does not know this column
  exists*.
- `src/lib/blog/validation.ts`, `seo.ts`, `image.ts`, `image-server.ts`,
  `queries.ts`, `config.ts`
- `src/lib/data/ese-content.ts` — the brand, services and people source of truth.
- `scripts/verify-contract.mjs` — already impersonates this tool. Your server must
  keep it passing.

**Do not consult or copy the Denalix project.** This brief already contains what
carries over. ESE's schema, image pipeline and SEO engine differ, and copying
Denalix code will produce a server that inserts columns ESE does not have.

### 1. What already exists and must be reused, not rebuilt

This is the single most important instruction. ESE has working, well-documented
libraries for most of what an MCP server needs. Import them.

| Need | Use this | Do not |
| --- | --- | --- |
| Field limits, slug rules, `slugify`, `validatePost` | `src/lib/blog/validation.ts` | Re-declare limits |
| SEO checks, scoring | `src/lib/blog/seo.ts` — `runSeoChecks`, `seoScore`, `TITLE_RANGE`, `DESCRIPTION_RANGE`, `SLUG_MAX_WORDS`, `BODY_MIN_WORDS` | Write a second SEO engine |
| Image magic-byte sniffing, size cap | `src/lib/blog/image.ts` — `sniffImage`, `checkCoverSize`, `COVER_MAX_BYTES` | Hand-roll header checks |
| Reading published/admin posts | `src/lib/blog/queries.ts` | New ad-hoc queries where one exists |
| Canonical URLs | `src/lib/blog/config.ts` — `absoluteUrl`, `postUrl`, `SITE_ORIGIN` | Build URLs by hand |
| Brand, services, people | `src/lib/data/ese-content.ts` | Duplicate copy into the MCP |

`src/lib/blog/image.ts` is deliberately import-free so a plain `node` process can
run it. Keep it that way — do not add imports to it.

### 2. Verified ESE facts

**Stack.** Next.js 15.5.22 App Router, React 19.1.1, TypeScript 5.8.3,
`@supabase/ssr` 0.12.4, `@supabase/supabase-js` 2.112.3, `sharp` 0.35.3.
**There is no zod and no test framework.** Scripts run through a TS resolve hook:
`node --import ./scripts/register-ts.mjs <script>`.

**`posts` columns** (the contract — exactly these, nothing else exists):

```
id uuid pk
title text            1..160
slug text unique      ^[a-z0-9]+(?:-[a-z0-9]+)*$, 1..160
excerpt text          1..320
content text          non-empty after trim
cover_image_url text  nullable
cover_image_alt text  nullable — but DB CHECK requires it whenever url is set
author_id uuid        NOT NULL, references auth.users(id)
status text           'draft' | 'published'
source text           'human' | 'ai-assisted'
published_at timestamptz
seo_title text        <= 60
seo_description text  <= 160
created_at, updated_at timestamptz
category text         'blog' | 'news', default 'blog'   (migration 0002)
focus_keyword text    <= 120, nullable                  (migration 0003)
```

**There are no columns for tags, related keywords, internal links, or an author
display name.** Do not invent them and do not add migrations for them. Related
keywords and internal links are expressed *inside* `content` and reported back in
the tool response; they are not persisted as structured fields. Say so plainly in
the writing guide so the client does not expect otherwise.

**Author attribution.** `author_id` is NOT NULL. Resolve it the way ESE's README
documents: the **oldest `profiles` row with `role = 'owner'`**. Fail the tool with
a clear message if none exists.

**Auth model.** `profiles(id, display_name, role owner|admin)` plus
`public.is_admin()` / `public.is_owner()` security-definer functions. The MCP uses
the service-role key and therefore bypasses RLS — which is exactly why draft-only
must be enforced in code.

**Storage.** Bucket `blog-images`, public, 5 MB limit, allowed MIME
`image/jpeg`, `image/png`, `image/webp`. Covers go under a `covers/` prefix. RLS
requires `is_admin()` for writes.

**Review URL.** `/admin/posts/<id>` — the `(console)` route group does not appear
in the path.

**Internal link targets** (real routes, verified):

- `/services/policy-support-and-sovereignty`
- `/services/grant-development`
- `/services/project-implementation`
- `/services/sustainability-and-climate-resilience`
- `/services/communications-support`
- `/people`, `/news`, `/blog`
- Homepage anchors: `/#about`, `/#services`, `/#who-we-are`, `/#contact`

Read the matching entries in `ese-content.ts` (`ese.services`) for each service's
own heading and summary; the writing guide and `suggest_internal_links` should use
that real copy rather than a restatement.

**Two live caveats you must surface rather than paper over.**
`site.canonicalBase` in `ese-content.ts` is still `https://example.com`, and
`SEARCH_ENGINE_INDEXING` in `src/lib/blog/config.ts` is `false`. The site is
`noindex, nofollow` and its absolute URLs are placeholders. Your SEO tool should
emit a **warning** when `SITE_ORIGIN` still contains `example.com`, because every
canonical and absolute internal link it validates is fictional until the real
domain is set.

### 3. What to build

Create a `mcp/` directory at the repository root, kept out of the Next build
graph (nothing under `src/app` may import it).

```
mcp/
  server.ts            stdio entry point
  tools.ts             tool registration, scope-free (stdio is locally trusted)
  site.ts              ESE site registry + allowlist + resolveSite()
  brand.ts             ESE colour/wordmark tokens for the fallback cover
  writing-guide.ts     the ESE-specific brief, served to the model
  seo-report.ts        thin adapter over src/lib/blog/seo.ts + extra ESE checks
  cover-source.ts      import -> generate -> branded fallback, injectable
  image-generate.ts    OpenAI Image API, injectable provider boundary
  cover-brand.ts       the typographic fallback cover (SVG -> sharp)
  adapters/supabase.ts the only module that touches the database
  lib.ts               env loading, textResult/errorResult helpers
  *.test.ts            tests (see section 8)
```

Add `@modelcontextprotocol/sdk` as a production dependency. **Do not add zod** —
the SDK accepts a raw JSON Schema for `inputSchema`; use that, and validate values
with ESE's own `validatePost` plus small local guards. Introducing zod would give
ESE two validation idioms.

#### 3.1 Site configuration and the allowlist

`mcp/site.ts` exports one registered site:

```
key: "ese"
name / shortName / role       from ese-content.ts `site`
origin                        SITE_ORIGIN from src/lib/blog/config.ts
audience, positioning         from ese-content.ts `ese.intro`, `ese.mission`
services                      the five service areas, with slug + title + summary
callsToAction                 the real CTAs from ese-content.ts `contact`
preferredTerminology          see section 4
topicsToAvoid                 see section 4
linkTargets                   the routes listed in section 2
```

Every mutating tool takes a required `site` argument, and `resolveSite(key)` must
do an **exact, case-folded match against the allowlist** — no default, no fuzzy
matching. An unknown key fails with the valid keys listed.

Read the allowlist from `ESE_SITES_ENABLED` (comma-separated, default `ese`).
Resolve it **lazily and memoised inside a function**, never in a module-scope
IIFE: a throw during module evaluation cannot be reported by anything that
imports it, and it takes the whole tool surface down with no usable error.

**Isolation from Denalix is structural, not conventional.** The registry contains
only `ese`. There is no `SITE_<KEY>_*` credential convention and no code path that
reads one. Credentials come from ESE's own `.env.local` variables and nothing
else. Never add a second site to this registry — a second ESE-adjacent site gets
its own deployment.

#### 3.2 Adapter — `mcp/adapters/supabase.ts`

The only module allowed to touch Supabase. It must:

- Build a service-role client from `NEXT_PUBLIC_SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY`. Fail with a clear message naming the missing
  variable.
- `resolveAuthorId()` — oldest `owner` profile; throw if absent.
- `listPosts({ category?, status?, limit })` — id, title, slug, status, category,
  published_at, updated_at.
- `slugExists(slug)`.
- `linkableContent()` — published posts (slug + title + excerpt) for post-to-post
  linking, joined with the static route list from `mcp/site.ts`.
- `createDraft(input)` — **hard-code `status: 'draft'` and `source: 'ai-assisted'`
  as literals in the insert object.** Reject the call outright if the input
  carries a `status` field at all. Re-check slug availability immediately before
  insert.
- `uploadCover(bytes, slug, { ext, contentType })` — into `blog-images` under
  `covers/`, returning the public URL.

**Export no publish, update, unpublish or delete function.** Not "don't call
one" — don't export one. A function that does not exist cannot be reached by a
prompt-injected tool call.

Filenames: derive the storage path from the **validated slug** plus a short
random suffix. Never interpolate raw caller input into a path, and reject any
value containing `/`, `\`, `..`, a leading dot, or a null byte.

#### 3.3 Tools

All eight, registered in `mcp/tools.ts`:

| Tool | Notes |
| --- | --- |
| `get_writing_guide` | Returns `mcp/writing-guide.ts` rendered for the site. Tell the client to call this first. |
| `list_posts` | Existing titles and slugs, so the client can avoid duplicating a topic. Supports `category`. |
| `check_slug` | Format validity against `SLUG_PATTERN` **and** availability. Return a corrected suggestion via `slugify` when invalid. |
| `get_link_targets` | The five service pages plus `/people`, `/news`, homepage anchors, each with its real heading and summary. |
| `suggest_internal_links` | Given draft text, propose 2–4 targets and the exact anchor phrase already present in the draft that motivates each. Include published posts. |
| `check_seo` | See section 5. |
| `generate_cover_image` | See section 6. |
| `create_draft` | Validates with `validatePost`, inserts a draft, returns the row id and the `/admin/posts/<id>` review URL. |

Each mutating tool (`generate_cover_image`, `create_draft`) requires `site` and
resolves it before doing anything. Every response echoes the resolved site so a
misdirected call is visible in the transcript.

Return structured errors: a short message naming what to fix, never a raw
provider or Postgres error object, and never a secret or a connection string.

#### 3.4 Draft fields

`create_draft` accepts and maps:

| Argument | Destination |
| --- | --- |
| `title`, `slug`, `excerpt`, `content` | direct columns |
| `seoTitle`, `seoDescription` | `seo_title`, `seo_description` |
| `coverImageUrl`, `coverImageAlt` | `cover_image_url`, `cover_image_alt` |
| `focusKeyword` | `focus_keyword` |
| `category` | `category`, default `'blog'`, only `'blog'` or `'news'` |
| `relatedKeywords`, `internalLinks` | **not persisted** — validated, reported in the response, and expected to appear inside `content` |

Empty optional strings become NULL (`emptyToNull` in `validation.ts`).

The response returns the id, slug, review URL, resolved site, the `check_seo`
findings for what was actually saved, and `status: "draft"`.

### 4. The ESE writing guide — read this carefully

ESE is **Environment Sovereignty & Equity**: environmental consulting for Native
Nations and other marginalized communities — policy support, grant development,
technical project implementation, climate resilience, communications. This subject
matter carries obligations an ordinary marketing blog does not, and the writing
guide must state them as rules, not preferences.

The guide must instruct the client to:

- **Inspect `list_posts` before writing**, to avoid duplicating an existing topic,
  and to link to relevant existing posts.
- Write for the actual audience: Tribal environmental staff, community
  organisers, and agency partners. Not consumers, and not other consultants.
- Use ESE's own terminology: *Native Nations*, *Tribal*, *sovereignty*,
  *self-determination*, *marginalized communities*, *culturally-informed*. Prefer
  "communities" over "clients" where ESE's own copy does.
- **Never invent** a client name, a Tribe or Nation as an ESE client, a grant
  award, a dollar figure, a project outcome, a statistic, a regulatory deadline,
  or a staff credential. ESE's site currently contains provisional placeholder
  copy; a fabricated specific is worse here than a vague one, because the reader
  may act on it.
- Never speak *for* a Tribe or Nation, characterise a community's position, or
  imply endorsement or partnership that is not documented in `ese-content.ts`.
- Never present legal, regulatory or funding-eligibility advice as
  determinative. Point to the relevant agency or to ESE's contact CTA instead.
- Avoid deficit framing — communities as helpless, ESE as saviour. ESE's own
  positioning is the opposite: *"the communities facing environmental harm are the
  most critical lever."* Match it.
- Answer the query in the first hundred words, use `##` per sub-question, and
  include 2–4 internal links with descriptive anchors.
- End with one of ESE's real calls to action from `ese-content.ts`.
- Call `generate_cover_image` before `create_draft` and pass the returned URL and
  alt text through unchanged.

State plainly in the guide that the site is currently `noindex` and its canonical
domain is a placeholder, so drafts are being prepared ahead of launch rather than
competing for rankings today.

Mirror this guide into `README.md` (or a doc under a new `docs/`), and note in
both that the two must be edited together.

### 5. SEO and quality validation — `check_seo`

Wrap `runSeoChecks` from `src/lib/blog/seo.ts` rather than replacing it, then add
the checks it does not cover. Return every finding as
`{ id, label, status: "pass" | "warn" | "fail" | "skip", message }`, plus
`seoScore`, and split the summary into **blocking** (`fail`) and
**recommended** (`warn`).

From the existing engine: title/description length, heading structure, slug
readability, cover presence, internal-link count, focus-keyword usage.

Add:

- **Duplicate or near-duplicate topic** — compare the title and slug against
  `list_posts` using normalised token overlap. High similarity is a `fail`; a
  moderate overlap is a `warn` naming the existing post.
- **Internal-link validity** — every site-relative link in `content` must match a
  real route from section 2 or an existing published slug. An unknown path is a
  `fail`; ESE has no catch-all route, so it would be a hard 404.
- **Missing cover or alt text** — `fail`, because the database CHECK will reject
  the insert anyway. Better to say so before the write.
- **Repetitive wording** — flag any non-stopword whose frequency is
  disproportionate to body length, and any phrase repeated verbatim three or more
  times.
- **Required CTA** — `warn` when no ESE call to action appears.
- **Minimum depth** — reuse `BODY_MIN_WORDS` (300); below it is a `fail`.
- **Placeholder origin** — `warn` while `SITE_ORIGIN` contains `example.com`.
- **Fabrication risk** — `warn` listing any sentence containing a bare figure,
  percentage, currency amount, or a proper noun shaped like an organisation that
  does not appear in `ese-content.ts`. This one is advisory by design; it is a
  prompt to verify, not an assertion of falsity.

`check_seo` must never mutate anything.

### 6. Cover images — `generate_cover_image`

Source order, in exactly this priority:

1. **`imageUrl`**, if supplied — import it.
2. **Generated artwork** via the OpenAI Image API. This is the default; the caller
   passes nothing but the article details.
3. **ESE-branded typographic cover** — the final fallback only.

The branded cover must never be the normal result of omitting `imageUrl`.

**Import guard** (`imageUrl` path). HTTPS only. Resolve DNS and reject
loopback, private, link-local, carrier-grade-NAT and multicast addresses *after*
resolution — an unguarded server-side fetch of a model-chosen URL is an SSRF
primitive, and cloud instance metadata at `169.254.169.254` is the standard
target. Do not follow redirects. Enforce a streaming byte cap using
`COVER_MAX_BYTES` and a request timeout. Sniff the type from bytes with
`sniffImage`, never from the URL or `Content-Type`. Refuse SVG.

**Generation** (`mcp/image-generate.ts`). Use the official `openai` package.

- Key: `OPENAI_API_KEY`, server-only. Never `NEXT_PUBLIC_`.
- `OPENAI_IMAGE_MODEL`, default `gpt-image-2`.
- `OPENAI_IMAGE_QUALITY`, default `medium`.
- Exactly one image per call. Set the SDK's `maxRetries` to `0` and pass an
  explicit timeout — each call bills, and the default retry bills twice for a
  request that was already failing.
- Put the provider call behind an injected interface so tests can replace it.
- Log and return nothing sensitive: no key, no headers, no base64. Flatten and
  truncate provider messages before surfacing them, since they can echo the
  prompt back.

**Prompt.** Build it from the title, the topic/eyebrow, the ESE audience, and the
brand palette. Request a restrained documentary or editorial illustration
appropriate to environmental and community work — landscape, water, land,
infrastructure, meeting and fieldwork settings. Forbid, explicitly:

- any text, letters, numbers or captions in the image;
- logos, wordmarks or imitations of any real organisation's identity;
- watermarks;
- charts or figures implying specific statistics or outcomes;
- recognisable real people;
- **depictions of identifiable Indigenous people, regalia, ceremony, or sacred
  sites, or any generic "Native American" visual trope.** This is the constraint
  that matters most for this client. Prefer land, water, infrastructure and
  documentary settings without people, or figures shown at a distance and not
  ethnically characterised;
- science-fiction and cyberpunk imagery;
- stock-photo clichés such as handshakes or rising arrows.

Accept an optional `imagePrompt` argument for extra subject direction that never
relaxes those constraints.

**Processing, all sources.** Decode and validate, then produce a **1200×630 WebP**
cover and upload it via the adapter.

> ESE's existing `reencodeCover` in `src/lib/blog/image-server.ts` deliberately
> **preserves aspect ratio and format** (`fit: "inside"`, `MAX_EDGE` 2400) so a
> human author's choice of PNG or portrait crop survives. **Do not change it.**
> Add a separate cover normaliser for the MCP path that targets 1200×630 WebP,
> and reuse `reencodeCover`'s two hard-won details: call `.rotate()` before
> stripping metadata, so EXIF orientation is baked into the pixels rather than
> lost; and re-encode rather than passing bytes through, which is what strips GPS
> EXIF — the reason that comment gives is a photograph taken at a community
> meeting carrying that meeting's coordinates. That reasoning applies here too.
> Also pass an explicit `limitInputPixels` so a small, highly compressible image
> cannot declare enormous dimensions and exhaust memory.

**Alt text.** Use `imageAlt` when the caller supplies it. Otherwise derive it
deterministically from the title, e.g.
`Editorial illustration representing "<title>".` **Never ask the image model to
write alt text** — it describes what it intended to draw, not what it drew, and
confidently wrong alt text is worse than plain text for the readers who depend on
it. On the branded fallback, ignore an `imageAlt` written for artwork that was
never produced and describe the branded cover instead.

**Response.** Return `source` (`"imported-image"` | `"generated-image"` |
`"composed-brand-cover"`), `url`, `alt`, `width`, `height`, `format`,
`fellBackToBrandCover`, and on the fallback `attemptedSource` plus a sanitized
`reason`. When an explicit import fails but generation succeeds, return the
generated image with a `warning` explaining that the supplied URL was unusable.

**Every one of these falls back rather than failing the tool:** missing
`OPENAI_API_KEY`, timeout, provider error, empty result, invalid base64,
unsupported or corrupt bytes, image-processing failure. Only an upload failure may
error, because without storage there is no URL to attach either way.

Image failure must never block `create_draft`. A draft with no cover is valid —
`cover_image_url` is nullable.

### 7. Reliability rules

- **Nothing in `mcp/` may throw at module scope.** Resolve configuration lazily
  inside functions and memoise it. A throw during module evaluation is
  unreportable by design.
- Validate every tool input before use.
- Reject unsafe filenames and path traversal (section 3.2).
- Never log or return secrets, connection strings, or raw provider errors.
- `check_slug` before insert, and again inside `createDraft`, so a skipped step
  produces a clean error rather than a duplicate.
- Preserve existing ESE behaviour. Do not refactor unrelated code, do not touch
  `src/app/**`, and do not modify Part 1 of migration `0001`.
- **Add no migrations.** Everything needed already exists.

### 8. Documentation and tests

**Environment.** Add to `.env.local.example`, with placeholder values and
comments in the file's existing voice: `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`,
`OPENAI_IMAGE_QUALITY`, `ESE_SITES_ENABLED`. State that the image key costs money
— one paid request per cover call — and that omitting it yields the branded
fallback rather than an error.

**Setup docs.** In `README.md` under "Blog and admin console": how to register the
server with an MCP client (a `.mcp.json` at the repo root running
`node --import ./scripts/register-ts.mjs mcp/server.ts`, or the equivalent),
the full draft workflow end to end, the tool list, and the cover source order.
Note that the server holds the service-role key and must not be deployed or
exposed on a port in this form.

**Tests.** Use the existing runner — `node --import ./scripts/register-ts.mjs` —
and add scripts alongside the current ones. Do not introduce a test framework.

- `test:mcp-validation` — slug handling, field limits, draft-only enforcement
  (including that a `status` argument is refused), unsafe-filename rejection.
- `test:mcp-cover` — the full source-priority matrix with the provider injected:
  no `imageUrl` + working provider → `generated-image`; valid `imageUrl` wins and
  the provider is **not called**; failed import falls forward to generated; missing
  key → branded fallback; provider timeout and provider error → branded fallback;
  corrupt bytes → branded fallback. Assert the output really is **1200×630 WebP**
  by decoding it with sharp, not by trusting the mock. Assert alt text matches the
  actual source.
- `test:mcp-seo` — each added check fires on a crafted draft and stays quiet on a
  clean one; blocking versus recommended separation.
- `test:mcp-adapter` — against the real database, namespaced under a
  `zz-mcp-check-` slug prefix and deleted afterwards including on failure, in the
  style of `scripts/verify-contract.mjs`. Assert the inserted row has
  `status = 'draft'` and `source = 'ai-assisted'`, and that the adapter exports no
  publish-shaped function.
- A safe end-to-end draft test that creates one draft through the real tool
  surface with the image provider stubbed, asserts the review URL resolves to a
  real id, then deletes the row.

**No paid image request in any test.** Inject the provider everywhere.

### 9. Report when done

- Files created and modified.
- The final cover source order, and what each fallback reason looks like.
- Environment variables required, and which are optional.
- Output of: `npm run typecheck`, `npm run lint`, every new test script, plus the
  pre-existing `npm run test:validation`, `npm run test:seo`,
  `npm run test:covers`, and `npm run verify:contract`.
- **Explicit confirmation that no post was published**: show a query proving
  every row your tests touched was `status = 'draft'`, and that none survives.
- Anything you could not determine from the repository.

Do not commit or push unless asked.

---

## 5. Acceptance criteria and verification

1. Eight tools registered; `generate_cover_image` and `create_draft` require and
   validate `site`.
2. `mcp/adapters/supabase.ts` **exports no publish, update, unpublish or delete
   function**; `status: 'draft'` and `source: 'ai-assisted'` are literals in the
   insert object.
3. Cover source order proven by test: `imageUrl` → generated → branded fallback,
   with the provider **not called** when the import succeeds.
4. All six generation failure modes fall back rather than erroring; only an upload
   failure errors.
5. Generated and imported covers decode to exactly **1200×630 WebP**, asserted
   with sharp rather than trusted from a mock.
6. `check_seo` separates blocking `fail` from recommended `warn`, and mutates
   nothing.
7. No new migrations. Part 1 of `0001` untouched. `src/app/**` untouched.
8. Nothing in `mcp/` throws at module scope.
9. No paid image request in any test.

```bash
npm run typecheck
npm run lint

npm run test:mcp-validation
npm run test:mcp-cover
npm run test:mcp-seo
npm run test:mcp-adapter

# pre-existing suites must still pass
npm run test:validation
npm run test:seo
npm run test:covers
npm run verify:contract -- --base-url http://localhost:3000
```

Plus a published-nothing proof: a query showing every row the tests touched was
`status = 'draft'`, and that none of them survives the run.

---

## 6. Unresolved questions

These cannot be answered from the repository.

1. **Production domain.** `site.canonicalBase` is `https://example.com`.
   Canonicals, the sitemap, and internal-link validation all resolve against it.
2. **Separate OpenAI key for ESE?** Sharing Denalix's key merges billing and blurs
   the isolation boundary this work is meant to establish.
3. **May the MCP draft `category: 'news'`,** or blog only?
4. **Should it write `focus_keyword`?** Migration `0003` explicitly assumes the
   external tool *does not know this column exists*. Writing it is additive and
   safe, but it breaks that stated assumption, so it should be a decision rather
   than a side effect.
5. **Is a Supabase project provisioned for ESE with an owner profile seeded?** The
   adapter fails hard without one.
6. **Will `SEARCH_ENGINE_INDEXING` be flipped before drafting begins?** It changes
   whether these drafts are pre-launch preparation or live SEO.
7. **Author identity.** Oldest owner, or a dedicated MCP service account?
   `people.laura-mckelvey`'s title is also still a `TODO(ese)` in
   `ese-content.ts`.

Two incidental observations, not blockers: `package.json` is still named
`laura-mckelvey-cinematic-website` and the `ship` skill's default remote is
`raviraj988/personal-website-cinematic`, so the repository identity has not caught
up with the ESE rebrand. The working branch is `feature/service-detail-pages`.
