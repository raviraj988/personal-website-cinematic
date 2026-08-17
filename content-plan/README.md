# ESE content plan

The approved copy for the website, and the rules that produced it.

**These files are the authority.** When copy needs to change, change it here
first, then in `src/lib/data/ese-content.ts`. That order matters: the reason the
site drifted into invented marketing language once already is that copy was edited
in components, where nothing records where a sentence came from.

## Source

`ref_docs/ESE Website language_CM Notes1.docx` — 32 lines, entirely in ESE's
plural voice. It is the only source of substantive claims about ESE. Nothing on
the website asserts anything about the organization that is not traceable to it.

Two edits were made to the source text and are carried throughout:

- "help you in identify funding" drops the stray "in"
- the EJ GIS tool's unfinished "(Josh fill out)" note is not published

## Provenance codes

Every line of copy in these files carries one:

| Code | Meaning |
|---|---|
| **[V]** | Verbatim from the document |
| **[P]** | Promoted — a document sentence moved from body copy into a heading, and removed from the body so it appears once |
| **[C]** | Compressed — built from the document's own words, asserting nothing new |
| **[S]** | Structural — a label, nav item, or button. Names a part of the page; makes no claim about ESE |
| **[T]** | Not in the document. Needs input — see `03-open-questions.md` |

If you add a line that cannot take a code, it does not belong on the site.

## The four rules

These exist because the page previously broke each one, in ways that were
measurable rather than matters of taste.

### 1. Promote, don't duplicate

When a sentence is strong enough to be a heading, it **moves** there and is
deleted from the body. Each sentence of the document appears on the page exactly
once.

*Why:* the scholarship heading previously repeated **100%** of its words in the
paragraph immediately beneath it; "Become a partner" repeated 75%. Both were
faithful to the document and both looked careless, because the reader met the same
sentence twice in two sizes.

### 2. Headings are compressions — 10 words or fewer, no terminal period

*Why:* headings render at 63px. A 13-word heading at that size is a paragraph
pretending to be a headline. "A network of environmental engineers, consultants,
sustainability organizers, and Tribal and community-focused advocates" was a
sentence in a headline's clothes.

Terminal periods are dropped because a full stop tells the eye to stop, which is
the opposite of a heading's job.

### 3. The eyebrow names the section; the heading says something else

*Why:* an eyebrow reading "Who we serve" above a heading listing the audiences
that appear as a numbered list directly below says one thing three times.

### 4. Where the document is silent, say so deliberately

An honest, designed empty state — never a slot with nothing in it.

*Why:* the founder card rendered a name and a role into a layout built for a
statement, so it read as broken rather than as restraint. A missing biography is a
fact about what has been supplied, and the design should look like it knows that.

## Checking the work

The duplication problem is measurable, so it can be caught again. Measure the
**longest run of consecutive words** a heading shares with the paragraph beneath
it — not the percentage of words in common.

The distinction matters. Counting shared words flags short headings that are
perfectly fine: "For environmental professionals and facilitators" shares 33% of
its words with a body containing "environmental professional or facilitator",
which sounds alarming and is not, because a section cannot introduce its own
subject without naming it. What actually reads as careless is meeting the *same
phrase* twice.

| Heading | Words | Longest shared run | |
|---|---|---|---|
| "Everyone should have access to the resources they need…" (before) | 13 | **13** | the whole heading, verbatim, in its own body |
| "Access shouldn't depend on what a community can afford" (after) | 9 | 1 | fine |
| "If you work in place-based community problem-solving…" (before) | 13 | 4 | borderline |
| "For environmental professionals and facilitators" (after) | 5 | 1 | fine |

**Threshold: a shared run of 3+ consecutive words, or half the heading's length,
means the heading is restating its body.** Rewrite it, or promote the sentence
properly under rule 1.

## Files

| File | Covers |
|---|---|
| `01-homepage.md` | Every section of the landing page, in order |
| `02-blog-and-news.md` | `/blog` and `/news` indexes, empty states, metadata |
| `03-open-questions.md` | Everything blocked on input from ESE |
