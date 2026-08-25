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

A Supabase-backed blog at `/blog` with an admin console at `/admin`. An MCP
drafting tool — in `mcp/`, see "The drafting server" below — writes drafts
straight into the database over PostgREST. It can only ever create drafts;
publishing is a human action in the console.

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
   - `supabase/migrations/0003_focus_keyword.sql` — `posts.focus_keyword`
3. **Create the owner.** Auth → Users → Add user (tick *Auto Confirm User*),
   then insert a `profiles` row with `role = 'owner'` for that UUID. The exact
   SQL is at the bottom of `0001`. The drafting server attributes every draft to
   the oldest owner and **fails outright without one**.
4. **Restart the dev server** so it reads the new variables, then sign in at
   `/admin/login`. Further admins are granted from `/admin/people`.
5. **Prove it works:** `npm run verify:contract -- --base-url http://localhost:3000`
   (see below).

### Accounts, sign-in, and password reset

Four ways in, one gate. **Authentication and authorization are separate**: any of
these creates credentials, none of them creates access. A new account has no
`profiles` row, lands on `/admin/no-access`, and can read nothing until an owner
grants it access from `/admin/people`.

| Route | What it does |
|---|---|
| `/admin/login` | Email + password, or Google |
| `/admin/signup` | Creates an account. Grants nothing |
| `/admin/forgot-password` | Sends a reset link |
| `/admin/reset-password` | Where a verified reset link lands |
| `/admin/account` | Change password, see role and sign-in method |

#### Two dashboard steps this depends on

**1. Custom SMTP — password reset does not work without it.**

Supabase's built-in mailer allows **2 emails per hour, project-wide**, and on
current projects only delivers to members of your Supabase organisation. A reset
for anybody else is accepted, reports success, and reaches nobody, with no error
in any log. Configure Authentication → Emails → SMTP Settings before relying on
the flow.

**2. The recovery email template must pass `token_hash` as a query parameter.**

The default template links to Supabase's `/auth/v1/verify`, which redirects with
the tokens in a URL **fragment**. A fragment is never sent to the server, so the
callback receives nothing and reports a broken link for an email that was fine.
Set the recovery template to:

```
{{ .SiteURL }}/admin/auth/callback?token_hash={{ .TokenHash }}&type=recovery
```

**For Google:** enable the provider under Authentication → Providers, add the
client ID and secret, and register `<origin>/admin/auth/callback` as a redirect
URL. A Google account with no `profiles` row is treated exactly like an email
account with none.

#### How the password rules are enforced

- Changing a password **requires the current one**, verified server-side.
  `updateUser({ password })` does not ask, so without that check a stolen session
  cookie is a full account takeover. The check runs on a throwaway client with
  `persistSession: false` so it cannot rotate the live session's cookies.
- A reset link legitimately has no current password. That path is authorised by a
  short-lived **httpOnly** cookie set by the callback *after* verifying the token,
  and deleted on use. Without it, "I am recovering" would be a claim any client
  could make — which is a reset bypass for anyone holding a session cookie.
- Length over composition, 10 characters minimum, and a 72-**byte** ceiling
  because bcrypt silently truncates there.

### The drafting server

An MCP server in `mcp/` that drafts SEO-shaped blog and news posts straight into
Supabase. Its counterpart was declared before it existed: Part 1 of
`supabase/migrations/0001_blog_and_admin.sql` calls itself "a wire contract with
an external drafting tool", the `source` column exists to badge its output, and
`scripts/verify-contract.mjs` has been impersonating it all along.

**It can only create drafts.** Not "is configured not to publish" — there is no
publish, update, unpublish, or delete function anywhere in
`mcp/adapters/supabase.ts`, and `status: 'draft'` / `source: 'ai-assisted'` are
literals in the insert. That matters because the server holds the service-role
key, which bypasses Row Level Security completely, and everything it does is
downstream of a language model reading text nobody reviewed. A function that does
not exist cannot be reached by a prompt-injected tool call.

For the same reason: **the stdio server must never be deployed, bound to a port,
or exposed beyond the local client that spawns it.** That sentence is about the
process `mcp/server.ts` starts — a server whose only caller is whoever spawned it,
where adding a network listener would mean an unauthenticated port on a process
holding an RLS-bypassing key.

The same eight tools *are* reachable over HTTP, by a different arrangement, at
`/api/mcp` — see [The remote endpoint](#the-remote-endpoint-for-chatgpt) below.
There the key sits inside the Next.js runtime that already holds it for `/admin`,
and the port is not unauthenticated: every request carries a token an
administrator approved by hand.

#### Registering it

`.mcp.json` at the repository root is already configured:

```json
{
  "mcpServers": {
    "ese-blog": {
      "command": "node",
      "args": ["--import", "<repo>/scripts/register-ts.mjs", "<repo>/mcp/server.ts"],
      "cwd": "<repo>"
    }
  }
}
```

The paths are absolute on purpose. `--import ./scripts/register-ts.mjs` resolves
against the working directory, and an MCP client picks that directory, not you.

Needs the same Supabase variables as the site. `OPENAI_API_KEY` is optional —
see `.env.local.example`; without it covers fall back to a branded card.

#### The nine tools

| Tool | What it does |
|---|---|
| `get_writing_guide` | The ESE brief: audience, terminology, prohibitions, post shape, and how `PostBody` really renders Markdown. **Call first.** |
| `list_posts` | Existing titles and slugs, so a topic is not drafted twice |
| `check_slug` | Format validity and availability, with a `slugify` suggestion when wrong |
| `get_link_targets` | Every real route, plus the paths that look real and 404 |
| `suggest_internal_links` | 2–4 targets, each with the phrase already in the draft that motivates it |
| `check_seo` | The editor's own checks plus the ones it cannot run. Writes nothing |
| `upload_cover_image` | **Preferred.** Hosts a cover the *client* generated. Normalises to 1200×630 WebP, uploads to `blog-images/covers/`. Needs no `OPENAI_API_KEY` |
| `generate_cover_image` | Fallback for clients that cannot draw. A 1200×630 WebP cover, uploaded to `blog-images/covers/` |
| `create_draft` | Inserts the draft, returns the id and `/admin/posts/<id>` |

The workflow: `get_writing_guide` → `list_posts` → `check_slug` →
`get_link_targets` → draft → `check_seo` → `generate_cover_image` →
`create_draft` → a human opens the review URL.

#### Cover images

**Four sources, in strict priority. The first is the one a capable client should
use.**

1. **A cover the client generated itself** — `upload_cover_image`. ChatGPT and
   Claude both draw, and a cover made with the finished article in front of the
   model beats one this server prompts for from a title alone. The client sends
   the file (base64, or a local path on stdio), and the server validates,
   normalises, and hosts it. **This needs no `OPENAI_API_KEY`** — which is the
   point: a deployment with no image key can still attach real artwork.
2. **A supplied `imageUrl`** — imported. HTTPS only, no redirects followed, DNS
   resolved and the resulting addresses checked before the fetch (loopback,
   RFC1918, link-local, CGNAT and multicast all refused — an unguarded fetch of a
   model-chosen URL is an SSRF primitive, and `169.254.169.254` is the standard
   target). Type comes from magic bytes, never from the URL or `Content-Type`.
3. **Generated artwork** — `generate_cover_image`, now the fallback for clients
   that cannot draw. The prompt forbids text, logos,
   watermarks, implied statistics, real people, sci-fi, stock clichés, and any
   depiction of identifiable Indigenous people, regalia, ceremony, or sacred
   sites. That last one follows the rule `ese-content.ts` already sets for the
   site's photography, for the same reason.
4. **An ESE-branded title card** — the last resort *only*. Every generation
   failure (no key, timeout, provider error, empty result, undecodable bytes)
   lands here rather than erroring. A run of drafts coming back
   `composed-brand-cover` means generation is broken, not that the fallback is
   working well.

Only an *upload* failure is an error, and even then a coverless draft is valid —
`cover_image_url` is nullable.

Alt text is derived from the title or taken from the caller; the image model is
never asked to describe its own output, because it describes what it meant to
draw. On the branded card a caller's alt text is ignored, since it was written
for artwork that was never produced.

Generated covers are normalised to 1200×630 WebP by `mcp/cover-normalise.ts` —
**not** by `reencodeCover`, which deliberately preserves a human author's aspect
ratio and format and should stay that way.

#### The writing guide is mirrored here

`mcp/writing-guide.ts` is what the tool serves; the rules below are the same
brief for a human reading the repository. **Edit the two together.**

- Write for Tribal environmental staff, community organisers, and agency
  partners. Not consumers, not other consultants.
- ESE's own terminology: *Native Nations*, *Tribal*, *sovereignty*,
  *self-determination*, *marginalized communities*, *culturally-informed*.
  "Communities", not "clients".
- **Never invent** a client, a Tribe or Nation as an ESE client, a grant award, a
  dollar figure, a project outcome, a statistic, a regulatory deadline, or a
  credential. A reader may act on it. `ese-content.ts` marks its own gaps
  `TODO(ese)` and renders honest empty states; a draft should hold the same line.
- Never speak *for* a Nation, or imply a partnership `ese-content.ts` does not
  document.
- No legal, regulatory, or funding-eligibility advice as determinative. Point at
  the agency or at `/#contact`.
- No deficit framing. ESE's position is the opposite: *"the communities facing
  environmental harm are the most critical lever."*
- Answer in the first hundred words. `##` per sub-question. 300+ words. 2–4
  internal links with descriptive anchors. End on a real CTA — in `/#…` form,
  never a `mailto:`, because `contact.email` is still a placeholder.

Four rules that are facts about the renderer rather than style:

1. **Markdown only.** `rehype-raw` is deliberately absent, so raw HTML is
   silently dropped between the draft and the page.
2. **Never `#`** — the title is the page's only `<h1>`; a stray `#` is downgraded.
3. External links get `nofollow`; internal links are followed.
4. Fenced code does not count toward the word floor, and an inline image with no
   alt text ships unlabelled.

The site is `noindex` and `site.canonicalBase` is still `https://example.com`, so
`check_seo` warns on every run and these are pre-launch drafts rather than posts
competing for rankings today.

#### Cover images the client draws, and the ChatGPT flow

`upload_cover_image` exists so the *client* can make the picture. The server's job
becomes receive, validate, host, associate — and nothing model-specific lives in
`mcp/`. There is no ChatGPT API call anywhere in this server.

The flow, end to end:

1. You ask ChatGPT for an ESE blog post.
2. It calls `get_writing_guide`, then `list_posts` so it does not repeat a topic.
3. It writes the article and picks a title and slug, checking the slug with
   `check_slug`.
4. **It generates a cover with its own image generator**, producing a file.
5. It calls `upload_cover_image` with `site`, `title`, `slug`, and that file as
   `imageBase64` (plus an optional `imageAlt`).
6. The server sniffs the magic bytes, decodes, crops to 1200×630, strips metadata,
   re-encodes as WebP, and uploads to `blog-images/covers/<slug>-<suffix>.webp`.
7. It returns `url`, `alt`, `width`, `height`, `contentType`, and
   `source: client-generated`.
8. ChatGPT passes that exact `url` and `alt` into `check_seo`, fixes anything
   blocking, then into `create_draft`.
9. The draft appears in `/admin/posts` with ChatGPT's artwork as its cover, for a
   human to publish.

##### The three input modes, and why `imagePath` is not always available

MCP has **no file-input type for tool arguments** — `inputSchema` is plain JSON
Schema, and the SDK's `BlobResourceContents` is resource *content*, whose `blob`
is itself base64. So there is no framework file mechanism to use, and `imageBase64`
is the mode every client has. Two conveniences sit alongside it:

| Mode | Available on | Notes |
|---|---|---|
| `imageBase64` | everywhere | The portable one. A `data:` prefix is accepted |
| `imagePath` | **stdio only** | An absolute path, for a client that just wrote the file to disk |
| `imageUrl` | everywhere | Fetched through the same SSRF-guarded importer as `generate_cover_image` |

`imagePath` is refused over HTTP, and that is deliberate rather than incidental.
On stdio the client spawned this process and runs as the same user, so it can
already read anything the server could — accepting a path saves it an encode. Over
HTTP the caller is remote, and returning the bytes of a path they chose, through a
public storage bucket, is arbitrary file disclosure; `.env.local` is two
directories up from `mcp/`. So the capability travels as a *dependency the HTTP
transport never constructs* (`RegisterOptions.localFiles`) rather than as a flag
someone has to remember to turn off. `mcp/server.ts` passes `nodeFileReader`;
`src/app/api/mcp/route.ts` passes nothing.

##### Validation

Reuses the existing pipeline rather than adding a second one. `normaliseCover`
does the work: magic-byte sniffing (never the filename or a client-supplied
content type), SVG refused by name because these objects are served publicly and
an SVG can carry script, a 100-megapixel decode ceiling against compression bombs,
`.rotate()` before the resize so EXIF orientation is baked in while the flag still
exists, and a full re-encode — which is what strips EXIF including GPS, and drops
anything appended after the image data. 5 MB in, and the object key is *derived*
from the validated slug plus a random suffix by `coverObjectPath`, never taken
from input, so a client cannot choose a bucket or traverse a path.

##### If it fails

Never blocks the article. `upload_cover_image` reports the failure and names the
fallback; the client retries with `generate_cover_image`, and if that fails too it
calls `create_draft` with no cover, which is valid — `cover_image_url` is nullable.

The guide is explicit that the client must then **say which happened**, and the
tool responses make that checkable: `source` is `client-generated` only when the
client's own file was hosted, and `fellBackToBrandCover` is `true` whenever only a
title card was produced. Never report custom artwork that was not attached.

#### The remote endpoint, for ChatGPT

The stdio server above needs a client that can spawn a local process. ChatGPT
cannot, so the same eight tools are also served over HTTP at `/api/mcp` —
one tool surface (`mcp/tools.ts`), two transports.

**Off unless switched on.** Every endpoint below returns 404 unless
`MCP_OAUTH_ENABLED=true`, so merging this code does not open a write path into the
database; only a deliberate environment change does.

##### Why this needs a whole OAuth server

Because ChatGPT will not accept anything smaller. It cannot present a static API
key or a custom header — OAuth or nothing — and it registers itself via RFC 7591
dynamic client registration, so a hand-made `client_id` is not an option either.
That rules out every shortcut and leaves a real authorization server, which is
what `src/lib/mcp-auth/` and `supabase/migrations/0004_mcp_oauth.sql` are.

Tokens are opaque, not JWTs: the authorization server and the resource server are
the same deployment sharing one database, so a signature would buy nothing while
delaying revocation until expiry. Only SHA-256 hashes are stored.

##### The surface

| Path | What it is |
|---|---|
| `/api/mcp` | The MCP endpoint. Streamable HTTP, stateless, bearer-gated |
| `/.well-known/oauth-protected-resource/api/mcp` | RFC 9728. What the 401 challenge points at |
| `/.well-known/oauth-authorization-server` | RFC 8414 |
| `/oauth/register` | RFC 7591 dynamic client registration. Open, deliberately |
| `/oauth/authorize` | The consent screen. Admin-gated, and the only real boundary |
| `/oauth/token` | `authorization_code` and `refresh_token`, PKCE S256 required |
| `/oauth/revoke` | RFC 7009 |

##### Where the boundary actually is

**Not registration.** Anyone may register a client; the RFC intends that and
ChatGPT requires it. A registered client is powerless until a signed-in
administrator ticks a box on `/oauth/authorize`, and everything downstream — a
token, a tool call, a draft — descends from that click.

Two scopes, split at the read/write line rather than per tool: `blog:read` and
`blog:draft`. They gate the tool surface at *registration*, so a `blog:read` token
has no `create_draft` in `tools/list` and no handler behind it either — see
`mcp/scopes.ts` and `RegisterOptions` in `mcp/tools.ts`. `blog:draft` implies
`blog:read`, because drafting needs the writing guide and the slug check.

The ceiling on damage is unchanged from the stdio server: a stolen token creates
drafts. It cannot publish, edit, or delete, because no such function exists. **If
a publish path is ever added to `mcp/adapters/supabase.ts`, this endpoint has to
be reconsidered, not merely re-reviewed.**

##### Turning it on

1. Apply `supabase/migrations/0004_mcp_oauth.sql` (`npm run db:migrate`, or paste
   it into the Supabase SQL editor).
2. Set `MCP_OAUTH_ENABLED=true`.
3. Set `MCP_OAUTH_ORIGIN` to the site's absolute origin — no trailing slash, no
   path. Required today because `site.canonicalBase` is still the placeholder
   `https://example.com`; once that is real, this can be dropped. See
   `src/lib/mcp-auth/origin.ts`, including why the request's `Host` header is
   deliberately never consulted.
4. In ChatGPT, add a connector pointing at `https://<origin>/api/mcp`. It will
   discover the rest and run the OAuth flow itself.

A quick check that it is live, without a client:

```bash
curl -i -X POST https://<origin>/api/mcp -d '{}'
# 401 + WWW-Authenticate: Bearer resource_metadata="https://<origin>/.well-known/..."
curl -s https://<origin>/.well-known/oauth-protected-resource/api/mcp
```

A 401 carrying that header is success — it is the whole basis of the client's
discovery, and without it ChatGPT reports no useful error.

### SEO in the editor

The output was already correct — canonical, `BlogPosting` JSON-LD, OG, Twitter,
sitemap, and cache flushes including the old slug on a rename. What the editor
adds is guidance while writing:

- a **search preview** that truncates where Google truncates, so an over-long
  title is visible rather than described
- a **live checklist**: title and description length, slug, cover and alt text,
  body length, subheadings, links, and where an optional focus keyword appears
- `posts.focus_keyword` (migration `0003`, additive and nullable)

All of it is advisory and none of it blocks publishing. The rules that must hold
are in `validation.ts` and in CHECK constraints.

### Checks

```bash
# The site. No database, no network.
npm run test:validation      # field rules vs. the CHECK constraints
npm run test:password        # password rules
npm run test:seo             # SEO checks and scoring
npm run test:covers          # magic-byte sniffing and EXIF stripping

# The drafting server. No database, no network, no paid image request.
npm run test:mcp-validation  # slugs, path guards, the site registry, module purity
npm run test:mcp-seo         # every added SEO check, and the blocking/recommended split
npm run test:mcp-cover       # the full cover source-priority matrix
npm run test:mcp-upload      # the client-generated cover path, and its transport gate
npm run test:mcp-handshake   # spawns the server, checks the 8 tools and stdout purity
npm run test:mcp-scopes      # the scope-to-tool map, and that registration honours it
npm run test:mcp-oauth       # PKCE, scope parsing, redirects, origin, the return-to guard

# Against the real database. Run these serially.
npm run verify:contract      # the wire contract and RLS
npm run test:mcp-adapter     # the adapter, and that it exports nothing publish-shaped
npm run test:mcp-e2e         # one draft through the real tool surface, then deleted
```

`npm run lint` does not work, and did not before this: `next lint` needs an ESLint
config, and there is none in the repository or in `node_modules`. It would also
never have covered `mcp/`, which `next lint` does not walk. `npm run typecheck` is
the real static gate, and it does cover `mcp/` — `tsconfig.json` includes
`**/*.ts`, which is also why a type error there would fail `next build`.

The three database suites use two different slug prefixes — `zz-contract-check-`
for `verify:contract`, `zz-mcp-check-` for the other two — so they cannot delete
each other's fixtures. Each cleans up in a `finally`, rows and storage objects
both.

`test:mcp-oauth` imports only the OAuth modules free of `import "server-only"` —
`store.ts` and `bearer.ts` throw on import outside a Next runtime, the same
constraint that keeps `mcp/tools.ts` reusing `validation.ts` but not `queries.ts`.
So it covers the parts where a bug would be a vulnerability (PKCE bounds, the
open-redirect guard, origin resolution) and leaves the database-backed token
lifecycle to a live client.

No test makes a paid image request. `openai` is imported by exactly one module,
`mcp/image-generate.ts`, which only `mcp/deps.ts` imports; every cover test
injects a fake provider and asserts its call count. `MCP_NO_PAID_CALLS=1` is a
second, independent stop.

`verify:contract` reads `.env.local`, impersonates the drafting server, and
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
drafting server in `mcp/`. Do not rename, retype, or drop any of those columns;
add alongside them instead.

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

- **Password reset needs custom SMTP**, and the recovery email template needs
  editing. Both are covered under "Accounts, sign-in, and password reset" above.
  Until SMTP is configured the flow reports success and delivers nothing.
- **Sign-up is open.** Anyone can create an account; nobody gets access without an
  owner granting it. If you would rather strangers could not create Auth accounts
  at all, remove `/admin/signup` and keep the owner-invite path in
  `/admin/people`.
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
