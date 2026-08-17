/**
 * Field validation checks. No database, no credentials.
 *
 *   npm run test:validation
 *
 * The assertion that matters most is the last group: every slug `slugify` can
 * produce must satisfy the `posts_slug_format` CHECK constraint. If it ever
 * produces one that does not, the failure surfaces as a database error on save
 * rather than as a message next to the field.
 */
import {
  slugify,
  validatePost,
  SLUG_PATTERN,
  FIELD_LIMITS,
  emptyToNull,
  isPostCategory,
  POST_CATEGORIES,
} from "../src/lib/blog/validation.ts";

let failures = 0;
const ok = (pass, name, detail = "") => {
  if (!pass) failures += 1;
  console.log(`${pass ? "PASS " : "FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
};

const base = {
  title: "A title",
  slug: "a-title",
  excerpt: "An excerpt",
  content: "Body copy",
  category: "blog",
  coverImageUrl: null,
  coverImageAlt: null,
  seoTitle: null,
  seoDescription: null,
};

/* -------------------------------------------------------------------- slugify */

for (const [input, want] of [
  ["Hello, World!", "hello-world"],
  ["  Multiple   Spaces  ", "multiple-spaces"],
  ["Ångström & Co — 2026", "angstrom-co-2026"],
  ["--leading and trailing--", "leading-and-trailing"],
  ["C++ / C# notes", "c-c-notes"],
  ["already-fine-slug", "already-fine-slug"],
  ["ALL CAPS", "all-caps"],
  ["a".repeat(200), "a".repeat(160)],
]) {
  const got = slugify(input);
  ok(got === want, `slugify(${JSON.stringify(input.slice(0, 28))})`, got);
}

// Inputs that could plausibly produce a slug the database would reject.
const adversarial = [
  "!!!",
  "   ",
  "-",
  "é",
  "🙂 emoji only",
  "a-",
  "-a",
  "a--b",
  "...",
  "@@@ ### $$$",
  "a".repeat(159) + " b",
  "-".repeat(50),
];
const rejected = adversarial
  .map((input) => [input, slugify(input)])
  .filter(([, s]) => s !== "" && !SLUG_PATTERN.test(s));
ok(
  rejected.length === 0,
  "No input produces a slug the CHECK constraint would reject",
  `${adversarial.length} adversarial inputs`,
);

ok(
  slugify("a".repeat(200)).length <= FIELD_LIMITS.slug.max,
  "A generated slug never exceeds the column limit",
);

/* ----------------------------------------------------------------- validation */

for (const [name, pass] of [
  ["A valid post has no errors", Object.keys(validatePost(base)).length === 0],
  [
    "A cover without alt text is rejected",
    "coverImageAlt" in validatePost({ ...base, coverImageUrl: "https://x/y.png" }),
  ],
  [
    "A cover with alt text is accepted",
    !(
      "coverImageAlt" in
      validatePost({ ...base, coverImageUrl: "https://x/y.png", coverImageAlt: "A photo" })
    ),
  ],
  [
    "Whitespace-only body is rejected",
    "content" in validatePost({ ...base, content: "  \n\t " }),
  ],
  ["A slug with spaces is rejected", "slug" in validatePost({ ...base, slug: "Not A Slug" })],
  ["A doubled hyphen is rejected", "slug" in validatePost({ ...base, slug: "a--b" })],
  ["A trailing hyphen is rejected", "slug" in validatePost({ ...base, slug: "a-" })],
  ["An uppercase slug is rejected", "slug" in validatePost({ ...base, slug: "Abc" })],
  ["An empty title is rejected", "title" in validatePost({ ...base, title: "   " })],
  [
    "A 161-character title is rejected",
    "title" in validatePost({ ...base, title: "x".repeat(161) }),
  ],
  [
    "A 160-character title is accepted",
    !("title" in validatePost({ ...base, title: "x".repeat(160) })),
  ],
  [
    "A 321-character excerpt is rejected",
    "excerpt" in validatePost({ ...base, excerpt: "x".repeat(321) }),
  ],
  [
    "A 61-character SEO title is rejected",
    "seoTitle" in validatePost({ ...base, seoTitle: "x".repeat(61) }),
  ],
  [
    "A 161-character SEO description is rejected",
    "seoDescription" in validatePost({ ...base, seoDescription: "x".repeat(161) }),
  ],
  [
    "Every bad field is reported at once, not one per round trip",
    Object.keys(validatePost({ ...base, title: "", slug: "Bad Slug", excerpt: "" })).length === 3,
  ],
  // `category` is only ever a select with two options in the editor, but a
  // Server Action is a public endpoint and this value arrives in a form body.
  ["Category 'blog' is accepted", !("category" in validatePost({ ...base, category: "blog" }))],
  ["Category 'news' is accepted", !("category" in validatePost({ ...base, category: "news" }))],
  [
    "An unknown category is rejected",
    "category" in validatePost({ ...base, category: "archive" }),
  ],
  ["An empty category is rejected", "category" in validatePost({ ...base, category: "" })],
  [
    "The accepted categories match the CHECK constraint's two values",
    POST_CATEGORIES.length === 2 &&
      POST_CATEGORIES.every(isPostCategory) &&
      !isPostCategory("archive"),
  ],
]) {
  ok(pass, name);
}

/* ------------------------------------------------------------------ null-ing */

ok(emptyToNull("") === null, "Empty string becomes NULL");
ok(emptyToNull("   ") === null, "Whitespace becomes NULL");
ok(emptyToNull(undefined) === null, "Undefined becomes NULL");
ok(emptyToNull("  kept  ") === "kept", "A real value is trimmed and kept");

console.log(
  failures === 0 ? "\nAll validation checks passed." : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
