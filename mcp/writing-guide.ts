/**
 * The brief this server serves to whatever model is drafting.
 *
 * ## Why this is rules rather than preferences
 *
 * ESE is Environment Sovereignty & Equity: environmental consulting for Native
 * Nations and other marginalized communities. A fabricated statistic on a
 * marketing blog is embarrassing. A fabricated grant deadline, eligibility rule,
 * or partnership here may be *acted on* by a Tribal environmental office, and the
 * cost of that lands on the reader rather than on the writer. So the constraints
 * below are stated as prohibitions with reasons attached, not as style advice.
 *
 * ESE's own site already works this way: `src/lib/data/ese-content.ts` marks
 * every gap in its source document `TODO(ese)` and renders an honest empty state
 * rather than inventing copy, and it declines to write biographies for its own
 * people on the grounds that "a bio is not something to compose on somebody's
 * behalf." This guide is that same standard, applied to a generator.
 *
 * ## The rendering rules are load-bearing
 *
 * Five of the rules below are not editorial at all — they are facts about
 * `src/components/blog/PostBody.tsx`, whose header says post bodies are treated
 * as untrusted input *because an external AI drafting tool writes them*. This is
 * that tool. Raw HTML is silently discarded, a stray `#` is downgraded, external
 * links are `nofollow`. A draft that ignores these does not fail; it renders
 * differently from what was written, which is worse.
 *
 * ## Keep this in step with README.md
 *
 * The same guide is mirrored into README.md so a human can read it without an
 * MCP client. The two must be edited together.
 */
import type { RegisteredSite } from "./site";
import { BODY_MIN_WORDS, TITLE_RANGE, DESCRIPTION_RANGE, SLUG_MAX_WORDS } from "../src/lib/blog/seo";
import { FIELD_LIMITS } from "../src/lib/blog/validation";

function bullets(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function renderWritingGuide(site: RegisteredSite): string {
  const placeholderOrigin = site.origin.includes("example.com");

  return `# Writing for ${site.name} (${site.shortName})

${site.role}.

**Mission.** ${site.mission}

**Positioning.** ${site.positioning}

Call this tool first, before drafting. Then call \`list_posts\` — writing a topic
that already exists wastes the draft and splits whatever ranking it might earn.

## The order to work in

1. \`get_writing_guide\` — this document.
2. \`list_posts\` — so you do not draft a topic that already exists.
3. Write the article. Choose the title and slug.
4. \`check_slug\` — format and availability.
5. **Generate a cover image with your own image tool.** See "Covers" below.
6. \`upload_cover_image\` — hand over that file, get back a hosted URL and alt text.
7. \`suggest_internal_links\` — real routes only; a plausible-looking path 404s.
8. \`check_seo\` — pass the exact \`url\` and \`alt\` from step 6.
9. Fix everything the report marks **blocking**. Recommended findings are yours to judge.
10. \`create_draft\` — with that same \`url\` and \`alt\`, unchanged.

Steps 5 and 6 are the default, not an extra. Skip to \`generate_cover_image\` only
if you cannot produce an image yourself.

## What ${site.shortName} does

Five service areas, each with its own page to link to:

${site.services.map((service) => `- **${service.title}** — \`${service.path}\`\n  ${service.description}`).join("\n")}

A post should sit inside one of these, or explain how two of them meet. Work that
falls outside all five is not work ${site.shortName} is claiming to do.

## Who is reading

${bullets(site.audience)}

Tribal environmental staff, community organisers, and agency partners. Not
consumers, and not other consultants. Assume a reader who knows their own
context far better than you do and wants the part they cannot get elsewhere.

## Use these words

${bullets(site.preferredTerminology)}

## Never do these

${bullets(site.topicsToAvoid)}

Two of those deserve their reasons spelled out.

**Never invent a specific.** Not a client, a Tribe or Nation as an ESE client, a
grant award, a dollar figure, a project outcome, a statistic, a regulatory
deadline, or a credential. A vague sentence is recoverable; a confident wrong
specific may be acted on. ${site.shortName}'s own site leaves its gaps visible rather
than filling them, and so should a draft.

**No deficit framing.** ${site.shortName}'s stated position is the opposite of
communities-as-helpless: *"the communities facing environmental harm are the most
critical lever in addressing the harms that impact their homes."* Match that.
${site.shortName} is not the protagonist of these posts.

## Shape of a post

- Answer the question in the **first hundred words**. Everything after that is
  for the reader who wants more, not for the reader deciding whether to stay.
- One \`##\` per sub-question. ${SLUG_MAX_WORDS} words or fewer in the slug.
- **${BODY_MIN_WORDS} words minimum** in the body. Fenced code and inline code do
  not count toward it — the word counter strips them — so a post cannot reach the
  floor on listings.
- Title reads best at ${TITLE_RANGE.min}–${TITLE_RANGE.max} characters, meta description at ${DESCRIPTION_RANGE.min}–${DESCRIPTION_RANGE.max}.
- Hard caps, enforced by the database: title ${FIELD_LIMITS.title.max}, excerpt ${FIELD_LIMITS.excerpt.max}, SEO title ${FIELD_LIMITS.seoTitle.max}, SEO description ${FIELD_LIMITS.seoDescription.max}, focus keyword ${FIELD_LIMITS.focusKeyword.max}.
- **2–4 internal links** with descriptive anchor text. Call
  \`get_link_targets\` for the real routes and \`suggest_internal_links\` to
  place them. Never guess a path: there is no catch-all route, so a wrong path is
  a hard 404. \`/services\` in particular does not exist — only the five
  \`/services/<slug>\` pages do.
- End on one of ${site.shortName}'s real calls to action:
${site.callsToAction.map((cta) => `  - [${cta.label}](${cta.href})`).join("\n")}

  Use those \`/#…\` paths exactly. A bare \`#contact\` works only on the
  homepage and scrolls to nothing from a post. **Never write a \`mailto:\`** —
  ${site.shortName}'s public address is still a placeholder.

## How the page actually renders

These are not preferences. They are what \`PostBody\` does with your Markdown.

1. **Markdown only. Raw HTML is silently dropped** — \`rehype-raw\` is
   deliberately not installed, so an embed or a \`<div>\` disappears between the
   draft and the page rather than erroring.
2. **Never \`#\`.** The post title is already the page's only \`<h1>\`; a stray
   \`#\` is downgraded to \`<h2>\`. Start at \`##\`.
3. **Internal links carry the weight.** Site-relative links are followed;
   external links render \`rel="nofollow noopener noreferrer"\`. Cite sources
   externally, but build the internal structure deliberately.
4. **Every inline image needs alt text.** \`![](url)\` ships an unlabelled image.
5. Tables and code blocks get their own scroll containers, so a wide table is
   safe — but it is still a wide table on a phone.

## Fields, and what is not a field

\`create_draft\` writes: title, slug, excerpt, content, SEO title, SEO
description, cover image URL and alt text, focus keyword, and category
(\`blog\` or \`news\`).

**There are no columns for tags, related keywords, or internal links.** If you
pass \`relatedKeywords\` or \`internalLinks\` they are validated and reported back
to you, and then discarded. They belong *inside* \`content\` — a related keyword
is a phrase in a sentence, and an internal link is a Markdown link. Do not expect
to read them back.

## Covers

**If you can generate images, do.** When creating a blog draft, generate a
contextually appropriate cover image using your own native image-generation
capability by default. Then call \`upload_cover_image\` with that generated file
and pass the returned URL and alt text unchanged into \`check_seo\` and
\`create_draft\`. Use \`generate_cover_image\` only when you cannot generate an
image or when no image file is available.

You have read the article. This server has not. A cover you draw with the piece in
front of you will fit it better than one this server prompts for from a title.

Order of preference:

1. \`upload_cover_image\` with artwork you generated — the default.
2. \`generate_cover_image\` — server-side artwork, for clients that cannot draw.
3. The ESE-branded title card, which \`generate_cover_image\` falls back to on its
   own. This is a *last resort*, not a normal outcome.

Send the file as \`imageBase64\`. Local clients may pass \`imagePath\` instead;
over HTTP that is refused, so base64 is the portable choice.

### What the cover must not contain

These are rules, not preferences, and they hold whichever route produced the
image:

- **Do not invent or depict a specific Tribe or Nation as an ESE client.** ESE
  serves Native Nations; illustrating that work with a fabricated client
  misrepresents both the communities and ESE's actual record, on the website of
  the organisation serving them.
- **No Tribal flags, seals, Nation-specific symbols, regalia, or stereotypical
  Indigenous imagery** unless explicitly and legitimately supplied by the user. A
  generated river claims nothing; a generated person in regalia makes several
  claims, all of them false.
- **Do not visually imply specific project outcomes that are not documented.** No
  before/after pairings, no charts, no dashboards, no maps carrying data.
- **No fabricated statistics, awards, projects, or named partnerships** — in the
  image or its alt text.
- **No embedded text.** The article title already appears on the page beside the
  image, so lettering in the artwork is duplication at best and a mismatch once a
  headline is edited.
- Prefer respectful, community-led environmental imagery drawn from the article's
  actual context: land, water, and weather at human scale; working infrastructure;
  documentary interiors; traces of fieldwork without people.

### Alt text

Describe what the image *shows*, not what you asked for. If you pass
\`imageAlt\`, it is kept when it fits the length limit; omit it and a plain
factual line is derived from the title. Either way, do not name a Tribe, Nation,
person, affiliation, or outcome in it.

Pass the returned alt through unchanged afterwards. Do not rewrite it between
\`upload_cover_image\` and \`create_draft\`.

### When the image step fails

A draft with no cover is valid — \`cover_image_url\` is nullable. So an image
failure must never stop you writing the article. In order: retry with
\`generate_cover_image\`, and if that fails too, call \`create_draft\` with no
cover.

Then **say which happened.** Never tell a human you attached custom artwork when
only the branded title card was used — check the \`source\` field the cover tool
returned and report it as it is.

## Publication

You can only ever create **drafts**. There is no publish tool, no update tool, and
no delete tool — not disabled, absent. Every draft lands at
\`/admin/posts/<id>\` for a person to read, edit, and publish.
${
  placeholderOrigin || !site.indexingEnabled
    ? `
## This site is not indexed yet

${!site.indexingEnabled ? `The site ships \`noindex, nofollow\`.` : ""}${
        placeholderOrigin
          ? ` Its canonical domain is still the placeholder \`${site.origin}\`, so every absolute URL — canonicals, the sitemap, JSON-LD — is fictional until the real domain is set.`
          : ""
      }

You are preparing drafts ahead of a launch, not competing for a ranking today.
Write for the reader; the SEO checks are there so the archive is in good shape on
the day indexing is switched on.`
    : ""
}
`;
}
