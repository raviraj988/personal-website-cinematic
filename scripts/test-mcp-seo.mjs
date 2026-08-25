/**
 * The SEO report layer: every added check fires when it should and stays quiet
 * when it should not.
 *
 * Needs no database and no network — `buildSeoReport` takes its corpora as
 * arguments, which is what makes `check_seo` provably non-mutating. The corpora
 * here are fixtures, including an empty one, because the live `posts` table is
 * empty and that is the state every early draft will actually be checked in.
 *
 *   node --import ./scripts/register-ts.mjs scripts/test-mcp-seo.mjs
 */
import { buildSeoReport, renderSeoReport } from "../mcp/seo-report.ts";
import { resolveSite } from "../mcp/site.ts";
import { suggestInternalLinks, validateInternalLinks, extractLinks } from "../mcp/internal-links.ts";
import { seoScore } from "../src/lib/blog/seo.ts";

let passed = 0;
let failed = 0;

function ok(condition, label, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

const site = resolveSite("ese");

/** A clean draft: long enough, linked, keyworded, and CTA'd. */
function cleanDraft(overrides = {}) {
  const body = [
    "Tribal environmental staff asking how grant eligibility works usually need two",
    "answers at once: whether a programme is open to a Nation directly, and what a",
    "complete application looks like. This post covers both, and points at where the",
    "determination actually gets made.",
    "",
    "## Who can apply for grant funding",
    "",
    "Grant eligibility is set by the programme, not by us, and the programme's own",
    "notice is the only place it is settled. What we can do is read that notice with",
    "you and say plainly whether the work you have in mind fits it. Our",
    "[grant development work](/services/grant-development) starts there, not with",
    "a template.",
    "",
    "Some programmes are open to Native Nations governments directly. Others route",
    "through a consortium, a state agency, or a pass-through recipient, which changes",
    "who signs and who reports. That distinction is worth settling before anybody",
    "writes a narrative, because it decides the whole shape of the submission.",
    "",
    "## What a complete application looks like",
    "",
    "A narrative that answers the notice in the notice's own order. A budget whose",
    "lines a reviewer can tie to that narrative. Letters that say something specific.",
    "And a plan for the reporting the award will require, written before the award",
    "rather than after it.",
    "",
    "Where the work runs into rules rather than paperwork, our",
    "[policy support work](/services/policy-support-and-sovereignty) covers the part",
    "that is about how the law applies in your area, not about the form itself.",
    "",
    "## Where grant eligibility is finally decided",
    "",
    "By the programme officer, against the notice. Anything we tell you is a reading",
    "of a document that they administer, which is why our answers point back to that",
    "document instead of standing in for it. If you want a second reader on a filing",
    "you are looking at now, that is a conversation rather than an engagement.",
    "",
    "What we will not do is tell you a programme is open to you when the notice is",
    "ambiguous and the officer has not been asked. An answer that turns out to be",
    "wrong costs a submission cycle, and a cycle is a year. Saying so plainly at the",
    "start is worth more than confidence, and it is the part of this work that a",
    "template cannot do for you. Bring the paperwork, bring the timeline you are",
    "working to, and we will read it with you rather than around you.",
    "",
    "[Talk to us about this](/#contact)",
  ].join("\n");

  return {
    title: "How grant eligibility works for Native Nations",
    slug: "how-grant-eligibility-works",
    excerpt:
      "Whether a funding programme is open to a Nation directly, what a complete application looks like, and where grant eligibility is actually decided.",
    content: body,
    seoTitle: "",
    seoDescription: "",
    focusKeyword: "grant eligibility",
    coverImageUrl: "https://example.supabase.co/storage/v1/object/public/blog-images/covers/x-abc123.webp",
    coverImageAlt: "A river valley at dawn, with no people in frame.",
    ...overrides,
  };
}

const emptyCorpus = {
  site,
  existingPosts: [],
  publishedBlogSlugs: [],
  publishedNewsSlugs: [],
};

function idsWithStatus(report, status) {
  return report.checks.filter((c) => c.status === status).map((c) => c.id);
}

function statusOf(report, id) {
  return report.checks.find((c) => c.id === id)?.status;
}

/* --------------------------------------------------- 1. the clean base case */

section("1. A clean draft stays quiet");

const clean = buildSeoReport(cleanDraft(), emptyCorpus);

ok(
  clean.blocking.length === 0,
  "Nothing blocking on a clean draft",
  clean.blocking.map((c) => `${c.id}: ${c.detail.slice(0, 60)}`).join(" | "),
);
ok(clean.clean === true, "report.clean is true when nothing fails");
ok(clean.score >= 70, "Score is respectable", `${clean.score}/100`);
ok(
  clean.score === seoScore(clean.checks),
  "The score comes from the app's own scorer, not a second one",
);

for (const id of [
  "internal-links-valid",
  "repetition",
  "cta-present",
  "raw-html",
  "fabrication-risk",
]) {
  ok(statusOf(clean, id) === "pass", `Quiet on a clean draft: ${id}`, statusOf(clean, id));
}
ok(
  statusOf(clean, "anchor-form") === undefined,
  "anchor-form does not appear at all when there are no bare fragments",
);
ok(
  statusOf(clean, "placeholder-contact") === undefined,
  "placeholder-contact does not appear when there is no mailto",
);

section("1b. The app engine's own checks still come through");

for (const id of ["title", "description", "slug", "cover", "length", "headings", "links", "keyword"]) {
  ok(
    clean.checks.some((c) => c.id === id),
    `Passed through from src/lib/blog/seo.ts: ${id}`,
  );
}
ok(
  clean.checks.every((c) => typeof c.detail === "string" && c.detail.length > 0),
  "Every finding uses `detail` and it is never empty",
);

/* ------------------------------------------------------ 2. duplicate topics */

section("2. Duplicate topic");

const withEmpty = buildSeoReport(cleanDraft(), emptyCorpus);
ok(
  statusOf(withEmpty, "duplicate-topic") === "skip",
  "An empty archive is `skip`, not `pass` — the check did not run",
  statusOf(withEmpty, "duplicate-topic"),
);

const corpusWithNear = {
  ...emptyCorpus,
  existingPosts: [
    {
      id: "1",
      title: "How grant eligibility works for Native Nations",
      slug: "grant-eligibility-for-native-nations",
      status: "published",
      category: "blog",
      published_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
};
const nearDupe = buildSeoReport(cleanDraft(), corpusWithNear);
ok(
  statusOf(nearDupe, "duplicate-topic") === "fail",
  "A near-identical title fails",
  statusOf(nearDupe, "duplicate-topic"),
);
ok(
  nearDupe.checks
    .find((c) => c.id === "duplicate-topic")
    .detail.includes("grant-eligibility-for-native-nations"),
  "And it names the existing post",
);

const corpusWithSameSlug = {
  ...emptyCorpus,
  existingPosts: [
    {
      id: "2",
      title: "Something else entirely",
      slug: "how-grant-eligibility-works",
      status: "draft",
      category: "blog",
      published_at: null,
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
};
ok(
  statusOf(buildSeoReport(cleanDraft(), corpusWithSameSlug), "duplicate-topic") === "fail",
  "A taken slug fails even when the title is unrelated",
);

const corpusUnrelated = {
  ...emptyCorpus,
  existingPosts: [
    {
      id: "3",
      title: "Reading a wetland delineation report",
      slug: "reading-a-wetland-delineation-report",
      status: "published",
      category: "blog",
      published_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
};
ok(
  statusOf(buildSeoReport(cleanDraft(), corpusUnrelated), "duplicate-topic") === "pass",
  "An unrelated archive passes",
);

/* ---------------------------------------------------------- 3. link checks */

section("3. Internal links");

const brokenLink = buildSeoReport(
  cleanDraft({ content: `${cleanDraft().content}\n\nSee our [services](/services).` }),
  emptyCorpus,
);
ok(
  statusOf(brokenLink, "internal-links-valid") === "fail",
  "/services fails — there is no index route above the five pages",
);

const madeUpLink = buildSeoReport(
  cleanDraft({ content: `${cleanDraft().content}\n\nSee [our team](/team).` }),
  emptyCorpus,
);
ok(statusOf(madeUpLink, "internal-links-valid") === "fail", "An invented path fails");

const noLinks = buildSeoReport(
  cleanDraft({ content: cleanDraft().content.replace(/\[([^\]]+)\]\(\/[^)]+\)/g, "$1") }),
  emptyCorpus,
);
ok(
  statusOf(noLinks, "internal-links-valid") === "warn",
  "No internal links at all is a warn, not a fail",
  statusOf(noLinks, "internal-links-valid"),
);

const publishedPostLink = buildSeoReport(
  cleanDraft({ content: `${cleanDraft().content}\n\nSee [the earlier post](/blog/an-earlier-post).` }),
  { ...emptyCorpus, publishedBlogSlugs: ["an-earlier-post"] },
);
ok(
  statusOf(publishedPostLink, "internal-links-valid") === "pass",
  "A link to a published post resolves",
);

const unpublishedPostLink = buildSeoReport(
  cleanDraft({ content: `${cleanDraft().content}\n\nSee [a draft](/blog/not-published-yet).` }),
  emptyCorpus,
);
ok(
  statusOf(unpublishedPostLink, "internal-links-valid") === "fail",
  "A link to a slug that is not published fails",
);

section("3b. Anchor form");

const bareAnchor = buildSeoReport(
  cleanDraft({ content: cleanDraft().content.replace("(/#contact)", "(#contact)") }),
  emptyCorpus,
);
ok(
  statusOf(bareAnchor, "anchor-form") === "fail",
  "A bare #contact fails — from a post it scrolls nowhere",
);
ok(
  bareAnchor.checks.find((c) => c.id === "anchor-form").detail.includes("/#contact"),
  "And the message gives the corrected form",
);

section("3c. The placeholder contact address");

for (const [href, why] of [
  ["mailto:replace-before-launch@example.com", "the literal placeholder"],
  ["mailto:hello@ese.example", "any mailto at all"],
]) {
  const report = buildSeoReport(
    cleanDraft({ content: `${cleanDraft().content}\n\n[Email us](${href})` }),
    emptyCorpus,
  );
  ok(statusOf(report, "placeholder-contact") === "fail", `Refused: ${why}`);
}

section("3d. External links are not validated as routes");

const external = buildSeoReport(
  cleanDraft({ content: `${cleanDraft().content}\n\nSee [the notice](https://www.epa.gov/some/notice).` }),
  emptyCorpus,
);
ok(
  statusOf(external, "internal-links-valid") === "pass",
  "An external link neither passes nor fails route validation",
);

const imageNotALink = extractLinks("![a cover](https://x/y.webp) and [a link](/blog)");
ok(
  imageNotALink.length === 1 && imageNotALink[0].href === "/blog",
  "An image is not counted as a link",
  String(imageNotALink.length),
);

/* ------------------------------------------------------------ 4. body depth */

section("4. Body depth is promoted to blocking");

const thin = buildSeoReport(
  cleanDraft({ content: "## A heading\n\nA short note with [a link](/blog) and little else to say." }),
  emptyCorpus,
);
ok(
  statusOf(thin, "length") === "fail",
  "Under 300 words is a fail for a generated draft, not a warn",
  statusOf(thin, "length"),
);
ok(
  thin.checks.filter((c) => c.id === "length").length === 1,
  "Promoted in place — one finding about body length, not two",
);
ok(
  thin.checks.find((c) => c.id === "length").detail.includes("300-word floor"),
  "And it says how many more words are needed",
);
ok(statusOf(clean, "length") === "pass", "A long enough body still passes");

/* ------------------------------------------------------------ 5. repetition */

section("5. Repetition");

const repetitive = buildSeoReport(
  cleanDraft({
    content: `${cleanDraft().content}\n\n${"Sovereignty matters for sovereignty because sovereignty is sovereignty and sovereignty means sovereignty. ".repeat(6)}`,
  }),
  emptyCorpus,
);
ok(statusOf(repetitive, "repetition") === "warn", "An overused word warns");

const parroted = buildSeoReport(
  cleanDraft({
    content: `${cleanDraft().content}\n\nThe programme notice is the only place. The programme notice is the only place. The programme notice is the only place.`,
  }),
  emptyCorpus,
);
ok(statusOf(parroted, "repetition") === "warn", "A phrase repeated three times warns");

/* ------------------------------------------------------------------ 6. CTA */

section("6. Call to action");

const noCta = buildSeoReport(
  cleanDraft({ content: cleanDraft().content.replace("[Talk to us about this](/#contact)", "") }),
  emptyCorpus,
);
ok(statusOf(noCta, "cta-present") === "warn", "A missing CTA warns");
ok(statusOf(clean, "cta-present") === "pass", "A real CTA passes");

/* ------------------------------------------------------------- 7. raw HTML */

section("7. Raw HTML");

const withHtml = buildSeoReport(
  cleanDraft({ content: `${cleanDraft().content}\n\n<div class="callout"><p>Important</p></div>` }),
  emptyCorpus,
);
ok(statusOf(withHtml, "raw-html") === "warn", "Raw HTML warns");
ok(
  withHtml.checks.find((c) => c.id === "raw-html").detail.includes("rehype-raw"),
  "And it explains that the tags are discarded at render",
);

const mathNotHtml = buildSeoReport(
  cleanDraft({ content: `${cleanDraft().content}\n\nValues < 4 ppt are common, and 5 > 4.` }),
  emptyCorpus,
);
ok(
  statusOf(mathNotHtml, "raw-html") === "pass",
  "A less-than in prose is not mistaken for markup",
);

/* -------------------------------------------------- 8. fabrication risk */

section("8. Unverifiable specifics");

for (const [snippet, why] of [
  ["The programme awarded $4,500,000 last year.", "a currency amount"],
  ["Roughly 62% of Nations reported the same problem.", "a percentage"],
  ["Applications are due by March 14, 2027.", "a date given as a deadline"],
  ["We worked with the Standing Pine Nation on this.", "an organisation not in ESE's copy"],
]) {
  const report = buildSeoReport(
    cleanDraft({ content: `${cleanDraft().content}\n\n${snippet}` }),
    emptyCorpus,
  );
  ok(statusOf(report, "fabrication-risk") === "warn", `Flagged: ${why}`, snippet.slice(0, 40));
}

ok(
  statusOf(clean, "fabrication-risk") === "pass",
  "A draft with no invented specifics is quiet",
);
ok(
  buildSeoReport(
    cleanDraft({ content: `${cleanDraft().content}\n\nWe serve Native Nations governments and Tribal consortia.` }),
    emptyCorpus,
  ).checks.find((c) => c.id === "fabrication-risk").status === "pass",
  "ESE's own audiences are not flagged as invented organisations",
);

/* ------------------------------------------------------- 9. origin warning */

section("9. Placeholder origin");

ok(
  statusOf(clean, "placeholder-origin") === "warn",
  "While SITE_ORIGIN is example.com, the canonical warning fires",
);
ok(
  buildSeoReport(cleanDraft(), {
    ...emptyCorpus,
    site: { ...site, origin: "https://ese.example.org" },
  }).checks.find((c) => c.id === "placeholder-origin").status === "pass",
  "With a real origin it passes",
);

/* --------------------------------------------------- 10. blocking split */

section("10. Blocking versus recommended");

const messy = buildSeoReport(
  cleanDraft({
    content:
      "## Only heading\n\nToo short, [broken](/services), and [bare](#contact), with $1,000,000 invented.",
  }),
  corpusWithNear,
);

ok(messy.blocking.length >= 4, `Several blocking findings`, String(messy.blocking.length));
ok(messy.recommended.length >= 1, `And some recommended`, String(messy.recommended.length));
ok(messy.clean === false, "report.clean is false");
ok(
  messy.blocking.every((c) => c.status === "fail"),
  "Everything in `blocking` is a fail",
);
ok(
  messy.recommended.every((c) => c.status === "warn"),
  "Everything in `recommended` is a warn",
);
ok(
  messy.blocking.length + messy.recommended.length <= messy.checks.length,
  "The two sets are subsets of the whole",
);

section("10b. The rendered summary");

const rendered = renderSeoReport(messy, cleanDraft({ content: "x" }));
ok(rendered.includes("BLOCKING"), "Rendered report has a blocking section");
ok(rendered.includes("RECOMMENDED"), "Rendered report has a recommended section");
ok(rendered.includes("SEO score:"), "Rendered report leads with the score");
ok(
  renderSeoReport(clean, cleanDraft()).includes("BLOCKING: none."),
  "A clean draft renders as blocking-none",
);

/* -------------------------------------------------- 11. link suggestions */

section("11. Internal link suggestions");

const draftText = cleanDraft().content.replace(/\[([^\]]+)\]\(\/[^)]+\)/g, "$1");
const suggestions = suggestInternalLinks(draftText, {
  targets: site.linkTargets,
  publishedBlogSlugs: [],
  publishedNewsSlugs: [],
  knownMissing: site.knownMissingPaths,
  posts: [],
});

ok(suggestions.length > 0, `Some links are suggested`, String(suggestions.length));
ok(suggestions.length <= 4, "At most four", String(suggestions.length));
ok(
  suggestions.every((s) => draftText.includes(s.anchor)),
  "Every anchor phrase is verbatim from the draft",
  suggestions.map((s) => `“${s.anchor}”`).join(" "),
);
ok(
  suggestions.every((s) => site.linkTargets.some((t) => t.path === s.path) || s.path.startsWith("/blog/")),
  "Every suggested path is a real route",
);
ok(
  suggestions.every((s) => !s.path.startsWith("/#")),
  "Homepage anchors are not suggested as body links",
);
ok(
  suggestions.every((s) => s.why.length > 0),
  "Each suggestion says why",
);

const alreadyLinked = suggestInternalLinks(cleanDraft().content, {
  targets: site.linkTargets,
  publishedBlogSlugs: [],
  publishedNewsSlugs: [],
  knownMissing: site.knownMissingPaths,
  posts: [],
});
ok(
  !alreadyLinked.some((s) => s.path === "/services/grant-development"),
  "A path the draft already links to is not suggested again",
);

/* -------------------------------------------------- 12. purity */

section("12. check_seo mutates nothing");

const frozenInput = Object.freeze(cleanDraft());
const frozenCorpus = Object.freeze({ ...emptyCorpus, existingPosts: Object.freeze([]) });
let mutated = false;
try {
  buildSeoReport(frozenInput, frozenCorpus);
} catch (error) {
  mutated = true;
  console.log(`        (threw: ${error.message.slice(0, 80)})`);
}
ok(!mutated, "Runs against frozen input and a frozen corpus");

const before = JSON.stringify(cleanDraft());
const subject = cleanDraft();
buildSeoReport(subject, emptyCorpus);
ok(JSON.stringify(subject) === before, "The input object is unchanged afterwards");

const verdictsTwice = validateInternalLinks(cleanDraft().content, {
  targets: site.linkTargets,
  publishedBlogSlugs: [],
  publishedNewsSlugs: [],
  knownMissing: site.knownMissingPaths,
});
ok(
  JSON.stringify(verdictsTwice) ===
    JSON.stringify(
      validateInternalLinks(cleanDraft().content, {
        targets: site.linkTargets,
        publishedBlogSlugs: [],
        publishedNewsSlugs: [],
        knownMissing: site.knownMissingPaths,
      }),
    ),
  "Validation is deterministic",
);

/* ------------------------------------------------------------------ summary */

console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed > 0) {
  console.log(`${failed} FAILED — see above.`);
  process.exit(1);
}
