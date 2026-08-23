/**
 * SEO checks, asserted without a database or a React render.
 *
 *   npm run test:seo
 */

import assert from "node:assert/strict";
import {
  BODY_MIN_WORDS,
  bodyWordCount,
  effectiveDescription,
  effectiveTitle,
  firstParagraph,
  runSeoChecks,
  seoScore,
} from "../src/lib/blog/seo.ts";

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const base = {
  title: "A plain-language guide to public comment periods",
  slug: "plain-language-guide-public-comment",
  excerpt:
    "What a comment period can change, how the record works, and how to prepare a contribution that will actually be read by the people deciding.",
  content: [
    "Public comment periods are one of the few points where a community can put something on the record.",
    "",
    "## What a comment period can change",
    "",
    "More than people expect, and less than they hope. See [the EPA guidance](https://example.gov/guidance).",
    "",
    Array.from({ length: 320 }, () => "word").join(" "),
  ].join("\n"),
  seoTitle: "",
  seoDescription: "",
  focusKeyword: "",
  coverImageUrl: "/covers/guide.webp",
  coverImageAlt: "A printed comment form on a desk.",
};

const byId = (checks, id) => checks.find((c) => c.id === id);

console.log("seo checks\n");

test("falls back from SEO fields to the headline and excerpt", () => {
  assert.equal(effectiveTitle(base), base.title);
  assert.equal(effectiveDescription(base), base.excerpt);
  assert.equal(effectiveTitle({ ...base, seoTitle: "Override" }), "Override");
  assert.equal(
    effectiveDescription({ ...base, seoDescription: "Override" }),
    "Override",
  );
});

test("word count excludes fenced code", () => {
  const withCode = "one two three\n\n```\n" + "code ".repeat(200) + "\n```";
  assert.equal(bodyWordCount(withCode), 3);
});

test("first paragraph skips headings and fences", () => {
  assert.equal(
    firstParagraph("## Heading\n\nThe real opening line."),
    "The real opening line.",
  );
});

test("a well-formed post passes the structural checks", () => {
  const checks = runSeoChecks(base);
  for (const id of ["title", "description", "slug", "cover", "length", "headings", "links"]) {
    assert.equal(byId(checks, id).status, "pass", `${id} should pass`);
  }
});

test("an over-long title fails rather than warns", () => {
  const checks = runSeoChecks({ ...base, seoTitle: "x".repeat(75) });
  assert.equal(byId(checks, "title").status, "fail");
});

test("a short title warns rather than fails", () => {
  const checks = runSeoChecks({ ...base, seoTitle: "Short one" });
  assert.equal(byId(checks, "title").status, "warn");
});

test("a cover with no alt text fails — the database refuses it too", () => {
  const checks = runSeoChecks({ ...base, coverImageAlt: "" });
  assert.equal(byId(checks, "cover").status, "fail");
});

test("no cover at all is only a warning", () => {
  const checks = runSeoChecks({ ...base, coverImageUrl: null, coverImageAlt: null });
  assert.equal(byId(checks, "cover").status, "warn");
});

test("a thin body warns", () => {
  const checks = runSeoChecks({ ...base, content: "Three words here." });
  assert.equal(byId(checks, "length").status, "warn");
  assert.ok(BODY_MIN_WORDS > 3);
});

test("an unset focus keyword is skipped, not failed", () => {
  const checks = runSeoChecks(base);
  assert.equal(byId(checks, "keyword").status, "skip");
});

test("keyword matching ignores case and punctuation", () => {
  const checks = runSeoChecks({ ...base, focusKeyword: "Public Comment" });
  // Present in title, slug, opening line, and the subheading; absent from the
  // excerpt is not the case here — the excerpt says "comment period".
  assert.notEqual(byId(checks, "keyword").status, "fail");
});

test("a keyword that appears nowhere fails", () => {
  const checks = runSeoChecks({ ...base, focusKeyword: "quantum tunnelling" });
  assert.equal(byId(checks, "keyword").status, "fail");
});

test("skipped checks do not count toward the score", () => {
  const withKeyword = runSeoChecks({ ...base, focusKeyword: "public comment" });
  const without = runSeoChecks(base);
  assert.ok(seoScore(without) > 0 && seoScore(without) <= 100);
  assert.ok(seoScore(withKeyword) > 0 && seoScore(withKeyword) <= 100);
});

test("an empty draft scores low", () => {
  const empty = runSeoChecks({
    title: "", slug: "", excerpt: "", content: "",
    seoTitle: "", seoDescription: "", focusKeyword: "",
    coverImageUrl: null, coverImageAlt: null,
  });
  assert.ok(seoScore(empty) < 30, `expected a low score, got ${seoScore(empty)}`);
});

console.log(`\n${passed} passed`);
