/**
 * The SEO report: the app's own engine, plus the checks it cannot run.
 *
 * ## `src/lib/blog/seo.ts` is wrapped, not replaced
 *
 * The admin editor renders `runSeoChecks` live on every keystroke and
 * `scripts/test-seo.mjs` asserts its exact statuses, so a second engine here
 * would mean a draft that scores well in the tool and differently in the console
 * an editor is looking at. Everything below either passes a finding through or
 * adds one — nothing in the app engine is reimplemented, and nothing in this file
 * edits it.
 *
 * ## What this layer adds, and why it belongs here rather than there
 *
 * The editor sees one post. It cannot know whether the topic already exists,
 * whether a link resolves, or whether a figure was invented, because it has no
 * corpus and no route list. This layer has both — passed in as arguments, never
 * fetched — so the checks that need them live here.
 *
 * ## Advisory versus blocking
 *
 * The app engine is deliberately all-advisory: its header says a CMS that refuses
 * to publish over a heuristic is a CMS people route around. That reasoning holds
 * for a human editor and does not transfer to a generator. A model has no
 * judgement to override the checklist *with*, and a dead internal link or an
 * invented statistic is not a matter of taste. So findings here are split into
 * `blocking` (`fail`) and `recommended` (`warn`), and `create_draft` reports the
 * blocking set on what it actually saved.
 *
 * `detail`, not `message`: one name for one thing, matching `SeoCheck`.
 */
import {
  runSeoChecks,
  seoScore,
  bodyWordCount,
  effectiveTitle,
  effectiveDescription,
  BODY_MIN_WORDS,
  type SeoCheck,
  type SeoInput,
  type CheckStatus,
} from "../src/lib/blog/seo";
import { validateInternalLinks, extractLinks, type LinkCorpus } from "./internal-links";
import type { RegisteredSite } from "./site";
import type { PostListItem } from "./ports";

export type SeoReport = {
  score: number;
  checks: SeoCheck[];
  blocking: SeoCheck[];
  recommended: SeoCheck[];
  /** True when nothing is `fail`. What `create_draft` reports on. */
  clean: boolean;
};

export type ReportCorpus = {
  site: RegisteredSite;
  existingPosts: PostListItem[];
  publishedBlogSlugs: string[];
  publishedNewsSlugs: string[];
};

function check(
  id: string,
  label: string,
  status: CheckStatus,
  detail: string,
): SeoCheck {
  return { id, label, status, detail };
}

/* ------------------------------------------------------------ topic overlap */

function normaliseTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/[\s-]+/)
      .filter((word) => word.length > 2),
  );
}

/** Jaccard overlap. Symmetric, and insensitive to how long either title is. */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

const DUPLICATE_FAIL = 0.6;
const DUPLICATE_WARN = 0.35;

function duplicateTopic(input: SeoInput, corpus: ReportCorpus): SeoCheck {
  const label = "Duplicate topic";

  // `skip`, not `pass`. With no posts to compare against, this check has not
  // been satisfied — it has not run. Scoring an empty archive as a pass would
  // inflate every early draft's score, and the archive is empty right now, so
  // that would be every draft.
  if (corpus.existingPosts.length === 0) {
    return check(
      "duplicate-topic",
      label,
      "skip",
      "No existing posts to compare against yet.",
    );
  }

  const mine = normaliseTokens(`${input.title} ${input.slug.replace(/-/g, " ")}`);

  let worst: { post: PostListItem; score: number } | null = null;
  for (const post of corpus.existingPosts) {
    if (post.slug === input.slug.trim()) {
      return check(
        "duplicate-topic",
        label,
        "fail",
        `The slug “${post.slug}” is already taken by “${post.title}”. Choose another, or edit that post instead.`,
      );
    }
    const score = overlap(mine, normaliseTokens(`${post.title} ${post.slug.replace(/-/g, " ")}`));
    if (!worst || score > worst.score) worst = { post, score };
  }

  if (!worst) return check("duplicate-topic", label, "skip", "Nothing to compare.");

  const percent = Math.round(worst.score * 100);

  if (worst.score >= DUPLICATE_FAIL) {
    return check(
      "duplicate-topic",
      label,
      "fail",
      `${percent}% title overlap with “${worst.post.title}” (/${worst.post.slug}). Two posts competing for the same query split whatever ranking either would have had — extend that post instead.`,
    );
  }

  if (worst.score >= DUPLICATE_WARN) {
    return check(
      "duplicate-topic",
      label,
      "warn",
      `${percent}% title overlap with “${worst.post.title}” (/${worst.post.slug}). Close enough to check the angle is genuinely different, and to link between them.`,
    );
  }

  return check(
    "duplicate-topic",
    label,
    "pass",
    `Closest existing post is “${worst.post.title}” at ${percent}%.`,
  );
}

/* ------------------------------------------------------------ link validity */

function linkChecks(input: SeoInput, corpus: ReportCorpus): SeoCheck[] {
  const linkCorpus: LinkCorpus = {
    targets: corpus.site.linkTargets,
    publishedBlogSlugs: corpus.publishedBlogSlugs,
    publishedNewsSlugs: corpus.publishedNewsSlugs,
    knownMissing: corpus.site.knownMissingPaths,
  };

  const verdicts = validateInternalLinks(input.content, linkCorpus);
  const out: SeoCheck[] = [];

  const broken = verdicts.filter(
    (v) => v.status === "unknown-path" || v.status === "known-missing",
  );
  const bare = verdicts.filter((v) => v.status === "bare-fragment");
  const placeholder = verdicts.filter((v) => v.status === "placeholder-contact");
  const good = verdicts.filter((v) => v.status === "ok");

  out.push(
    broken.length > 0
      ? check(
          "internal-links-valid",
          "Internal links resolve",
          "fail",
          `${broken.length} link${broken.length === 1 ? "" : "s"} point nowhere: ${broken
            .map((v) =>
              v.status === "unknown-path" && v.suggestion
                ? `${v.href} (did you mean ${v.suggestion}?)`
                : v.href,
            )
            .join(", ")}. There is no catch-all route, so each of these is a 404.`,
        )
      : good.length > 0
        ? check(
            "internal-links-valid",
            "Internal links resolve",
            "pass",
            `${good.length} internal link${good.length === 1 ? "" : "s"}, all real routes.`,
          )
        : check(
            "internal-links-valid",
            "Internal links resolve",
            "warn",
            "No internal links. Two to four, with descriptive anchors, give the reader somewhere to go and the archive some structure.",
          ),
  );

  if (bare.length > 0) {
    out.push(
      check(
        "anchor-form",
        "Anchor link form",
        "fail",
        `${bare.map((v) => v.href).join(", ")} — a bare fragment resolves against the post, not the homepage, so it scrolls nowhere. Write ${bare
          .map((v) => `/${v.href}`)
          .join(", ")} instead.`,
      ),
    );
  }

  if (placeholder.length > 0) {
    out.push(
      check(
        "placeholder-contact",
        "Contact address",
        "fail",
        `${placeholder.map((v) => v.href).join(", ")} — ESE's public email is still the placeholder from ese-content.ts. Link to /#contact instead of an address.`,
      ),
    );
  }

  return out;
}

/* -------------------------------------------------------------- repetition */

const REPETITION_STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "their", "your",
  "our", "are", "was", "were", "will", "can", "has", "have", "had", "been",
  "more", "most", "other", "than", "then", "them", "these", "those", "some",
  "such", "only", "also", "about", "which", "while", "each", "both", "under",
  "between", "through", "they", "you", "not", "all", "any", "its", "but",
]);

function repetition(input: SeoInput): SeoCheck {
  const label = "Repetitive wording";
  const words = input.content
    .replace(/```[\s\S]*?```/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !REPETITION_STOPWORDS.has(word));

  if (words.length < 50) {
    return check("repetition", label, "skip", "Too short to judge repetition.");
  }

  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);

  // Scaled to length, with a floor generous enough not to punish a post for
  // being about its own subject.
  //
  // The floor matters more than the rate. Ordinary keyword density is 1–2%, so a
  // 300-word post using its focus keyword six or seven times is doing exactly
  // what it should — a floor of six would flag every well-optimised post ever
  // written. What this is looking for is the tic: a word at 4% and above, which
  // reads as padding rather than as subject matter.
  const threshold = Math.max(8, Math.ceil(words.length * 0.04));
  const overused = [...counts.entries()]
    .filter(([, count]) => count > threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const phrases = repeatedPhrases(input.content);

  if (overused.length === 0 && phrases.length === 0) {
    return check("repetition", label, "pass", "No word or phrase is overused.");
  }

  const parts: string[] = [];
  if (overused.length > 0) {
    parts.push(
      `Overused for a ${words.length}-word body: ${overused
        .map(([word, count]) => `“${word}” ×${count}`)
        .join(", ")}`,
    );
  }
  if (phrases.length > 0) {
    parts.push(`Repeated verbatim: ${phrases.map((p) => `“${p.phrase}” ×${p.count}`).join(", ")}`);
  }

  return check("repetition", label, "warn", `${parts.join(". ")}.`);
}

/** Any 5-word run appearing three or more times. */
function repeatedPhrases(content: string): { phrase: string; count: number }[] {
  const tokens = content
    .replace(/```[\s\S]*?```/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  const counts = new Map<string, number>();
  for (let i = 0; i + 5 <= tokens.length; i += 1) {
    const phrase = tokens.slice(i, i + 5).join(" ");
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([phrase, count]) => ({ phrase, count }));
}

/* --------------------------------------------------------------------- CTA */

function ctaPresent(input: SeoInput, corpus: ReportCorpus): SeoCheck {
  const label = "Call to action";
  const hrefs = new Set(corpus.site.callsToAction.map((cta) => cta.href));
  const found = extractLinks(input.content).filter((link) => hrefs.has(link.href));

  return found.length > 0
    ? check("cta-present", label, "pass", `Ends on ${found.map((f) => f.href).join(", ")}.`)
    : check(
        "cta-present",
        label,
        "warn",
        `No ESE call to action. Close with one of: ${[...hrefs].join(", ")}.`,
      );
}

/* ---------------------------------------------------------------- raw HTML */

function rawHtml(input: SeoInput): SeoCheck {
  const label = "Raw HTML in the body";
  // Block-level and embed tags only. A `<` in prose ("values < 4 ppt") is
  // common in this subject matter and is not markup.
  const tags = input.content.match(
    /<\/?(?:div|p|span|iframe|script|style|table|section|figure|img|br|hr|a|em|strong|h[1-6])\b[^>]*>/gi,
  );

  if (!tags) return check("raw-html", label, "pass", "Markdown only.");

  const distinct = [...new Set(tags.map((tag) => tag.toLowerCase()))].slice(0, 4);

  return check(
    "raw-html",
    label,
    "warn",
    `${tags.length} HTML tag${tags.length === 1 ? "" : "s"} (${distinct.join(", ")}). rehype-raw is deliberately not installed, so these are discarded at render — whatever they contain will simply be missing from the page. Use Markdown.`,
  );
}

/* -------------------------------------------------------- fabrication risk */

/**
 * Sentences carrying a specific this server cannot verify.
 *
 * Advisory by design, and phrased as a prompt to check rather than an assertion
 * of falsity — the tool has no way to know whether "40 CFR 141" is right. It is
 * here because the cost of a wrong specific in this subject matter is borne by
 * the reader: a Tribal environmental office may act on a funding deadline or an
 * eligibility rule, and "probably fine" is not good enough for that.
 *
 * Organisation-shaped proper nouns are matched against `ese-content.ts` so the
 * things ESE actually says about itself do not get flagged forever.
 */
function fabricationRisk(input: SeoInput, corpus: ReportCorpus): SeoCheck {
  const label = "Unverifiable specifics";

  const known = `${corpus.site.name} ${corpus.site.shortName} ${corpus.site.mission} ${corpus.site.positioning} ${corpus.site.services
    .map((s) => `${s.title} ${s.description}`)
    .join(" ")} ${corpus.site.audience.join(" ")}`.toLowerCase();

  const sentences = input.content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#+.*$/gm, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const flagged: string[] = [];

  for (const sentence of sentences) {
    const reasons: string[] = [];

    if (/\$\s?[\d,]+|\b\d+(?:\.\d+)?\s?(?:million|billion|percent)\b|\b\d{1,3}%/i.test(sentence)) {
      reasons.push("a figure");
    }
    if (/\b(?:by|before|after|deadline of)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}?,?\s?\d{4}\b/i.test(sentence)) {
      reasons.push("a date presented as a deadline");
    }

    const orgs = sentence.match(
      /\b(?:[A-Z][a-z]+\s){1,4}(?:Tribe|Nation|Nations|Agency|Department|Council|Consortium|Authority|Foundation|Institute|Program|Programme|Office|Bureau|Commission)\b/g,
    );
    const unknownOrgs = (orgs ?? []).filter((org) => !known.includes(org.toLowerCase().trim()));
    if (unknownOrgs.length > 0) {
      reasons.push(`an organisation not in ESE's own copy (${unknownOrgs[0].trim()})`);
    }

    if (reasons.length > 0) {
      flagged.push(`${reasons.join(" and ")} — “${truncate(sentence, 110)}”`);
    }
  }

  if (flagged.length === 0) {
    return check(
      "fabrication-risk",
      label,
      "pass",
      "No unverifiable figures, deadlines, or named organisations.",
    );
  }

  return check(
    "fabrication-risk",
    label,
    "warn",
    `${flagged.length} sentence${flagged.length === 1 ? "" : "s"} to verify against a source before publishing, or to cut:\n${flagged
      .slice(0, 6)
      .map((f) => `    · ${f}`)
      .join("\n")}`,
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/* ----------------------------------------------------------- origin warning */

function placeholderOrigin(corpus: ReportCorpus): SeoCheck {
  const label = "Canonical domain";
  return corpus.site.origin.includes("example.com")
    ? check(
        "placeholder-origin",
        label,
        "warn",
        `SITE_ORIGIN is still ${corpus.site.origin}, so every canonical, sitemap entry, and JSON-LD @id this draft produces is fictional. Internal link paths are still checked for real; only the origin is a placeholder. Set site.canonicalBase in ese-content.ts before launch.`,
      )
    : check("placeholder-origin", label, "pass", corpus.site.origin);
}

/* --------------------------------------------------------------- promotions */

/**
 * Raise the app engine's body-length `warn` to a `fail` below the floor.
 *
 * The engine is right to advise rather than block for a human — "short posts can
 * rank" is true, and an editor may know their 200-word note is the right length.
 * A generator has no such knowledge, and a thin post is the single most common
 * way generated writing fails. Promoted rather than added as a second finding, so
 * there is one row about body length rather than two that disagree.
 */
function promoteBodyLength(checks: SeoCheck[], input: SeoInput): SeoCheck[] {
  const words = bodyWordCount(input.content);
  if (words === 0 || words >= BODY_MIN_WORDS) return checks;

  return checks.map((entry) =>
    entry.id === "length"
      ? {
          ...entry,
          status: "fail" as const,
          detail: `${words} words — under the ${BODY_MIN_WORDS}-word floor for a generated draft. Add ${BODY_MIN_WORDS - words} more, or fold this into an existing post.`,
        }
      : entry,
  );
}

/* ------------------------------------------------------------------- report */

export function buildSeoReport(input: SeoInput, corpus: ReportCorpus): SeoReport {
  const checks: SeoCheck[] = [
    // The app's own engine first, so the order matches what the editor sees.
    ...promoteBodyLength(runSeoChecks(input), input),
    duplicateTopic(input, corpus),
    ...linkChecks(input, corpus),
    repetition(input),
    ctaPresent(input, corpus),
    rawHtml(input),
    fabricationRisk(input, corpus),
    placeholderOrigin(corpus),
  ];

  const blocking = checks.filter((entry) => entry.status === "fail");
  const recommended = checks.filter((entry) => entry.status === "warn");

  return {
    // The app's own scorer, so a number here means the same as a number there.
    score: seoScore(checks),
    checks,
    blocking,
    recommended,
    clean: blocking.length === 0,
  };
}

/** A one-screen summary for a tool response. */
export function renderSeoReport(report: SeoReport, input: SeoInput): string {
  const lines: string[] = [];

  lines.push(`SEO score: ${report.score}/100`);
  lines.push(`Search title:  ${effectiveTitle(input)}`);
  lines.push(`Description:   ${effectiveDescription(input)}`);
  lines.push("");

  if (report.blocking.length === 0) {
    lines.push("BLOCKING: none.");
  } else {
    lines.push(`BLOCKING — fix these before create_draft (${report.blocking.length}):`);
    for (const entry of report.blocking) lines.push(`  ✗ ${entry.label}: ${entry.detail}`);
  }

  lines.push("");
  if (report.recommended.length === 0) {
    lines.push("RECOMMENDED: none.");
  } else {
    lines.push(`RECOMMENDED — worth fixing (${report.recommended.length}):`);
    for (const entry of report.recommended) lines.push(`  ! ${entry.label}: ${entry.detail}`);
  }

  const rest = report.checks.filter((c) => c.status === "pass" || c.status === "skip");
  if (rest.length > 0) {
    lines.push("");
    lines.push("PASSING:");
    for (const entry of rest) {
      lines.push(`  ${entry.status === "skip" ? "–" : "✓"} ${entry.label}: ${entry.detail}`);
    }
  }

  return lines.join("\n");
}
