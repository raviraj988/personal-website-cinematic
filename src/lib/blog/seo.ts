/**
 * SEO scoring for the post editor.
 *
 * Pure functions over a plain object, with no `server-only`, no Supabase, and no
 * React import — so `scripts/test-seo.mjs` can assert every rule in a plain node
 * process. Same arrangement as `lib/blog/validation.ts` and for the same reason.
 *
 * These are **advisory**. Nothing here blocks a publish: an editor who has read
 * the checklist and decided a 24-character title is right is not wrong, and a CMS
 * that refuses to publish over a heuristic is a CMS people route around. The
 * checks that genuinely must hold — alt text on a cover, a valid slug, a
 * non-empty body — are enforced in `validation.ts` and by CHECK constraints.
 */

/** Google truncates around here. Not a hard limit, which is why these advise. */
export const TITLE_RANGE = { min: 30, max: 60 } as const;
export const DESCRIPTION_RANGE = { min: 70, max: 160 } as const;
export const SLUG_MAX_WORDS = 8;
export const BODY_MIN_WORDS = 300;

export type SeoInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
};

export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export type SeoCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  /** Shown under the label. Says what to do, not merely what is wrong. */
  detail: string;
};

/** What actually goes in the `<title>` — the SEO field, else the headline. */
export function effectiveTitle(input: SeoInput): string {
  return input.seoTitle.trim() || input.title.trim();
}

/** What actually goes in the meta description — the SEO field, else the excerpt. */
export function effectiveDescription(input: SeoInput): string {
  return input.seoDescription.trim() || input.excerpt.trim();
}

/**
 * Words in the body, with fenced code blocks removed.
 *
 * A post that embeds a 200-line config file is not a 2,000-word article, and
 * counting it as one turns the length check into noise. Mirrors the same
 * exclusion `reading-time.ts` makes.
 */
export function bodyWordCount(content: string): number {
  const prose = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, " ");
  const words = prose.trim().match(/\S+/g);
  return words ? words.length : 0;
}

/** Case- and punctuation-insensitive containment, so "PFAS," matches "pfas". */
function contains(haystack: string, needle: string): boolean {
  if (!needle.trim()) return false;
  const normalise = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  return normalise(haystack).includes(normalise(needle));
}

/** The first non-empty, non-heading paragraph of the body. */
export function firstParagraph(content: string): string {
  for (const block of content.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("```")) continue;
    return trimmed;
  }
  return "";
}

function rangeCheck(
  id: string,
  label: string,
  value: string,
  range: { min: number; max: number },
  emptyAdvice: string,
): SeoCheck {
  const length = value.trim().length;

  if (length === 0) return { id, label, status: "fail", detail: emptyAdvice };
  if (length > range.max) {
    return {
      id,
      label,
      status: "fail",
      detail: `${length} characters — over ${range.max}, so it will be cut off. Trim ${length - range.max}.`,
    };
  }
  if (length < range.min) {
    return {
      id,
      label,
      status: "warn",
      detail: `${length} characters — room for ${range.min - length} more before ${range.min}.`,
    };
  }
  return { id, label, status: "pass", detail: `${length} characters.` };
}

export function runSeoChecks(input: SeoInput): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const keyword = input.focusKeyword.trim();

  checks.push(
    rangeCheck(
      "title",
      "Search title length",
      effectiveTitle(input),
      TITLE_RANGE,
      "Add a headline, or an SEO title to override it.",
    ),
  );

  checks.push(
    rangeCheck(
      "description",
      "Meta description length",
      effectiveDescription(input),
      DESCRIPTION_RANGE,
      "Add an excerpt, or an SEO description to override it.",
    ),
  );

  /* ------------------------------------------------------------------ slug */
  const slug = input.slug.trim();
  const slugWords = slug ? slug.split("-").filter(Boolean).length : 0;
  checks.push({
    id: "slug",
    label: "URL slug",
    ...(slug.length === 0
      ? { status: "fail" as const, detail: "The post has no URL yet." }
      : slugWords > SLUG_MAX_WORDS
        ? {
            status: "warn" as const,
            detail: `${slugWords} words. Short URLs read better in results — aim for ${SLUG_MAX_WORDS} or fewer.`,
          }
        : { status: "pass" as const, detail: `/${slug}` }),
  });

  /* ----------------------------------------------------------------- cover */
  checks.push({
    id: "cover",
    label: "Cover image and alt text",
    ...(!input.coverImageUrl
      ? {
          status: "warn" as const,
          detail: "No cover. Link previews will fall back to the site-wide image.",
        }
      : !input.coverImageAlt?.trim()
        ? {
            status: "fail" as const,
            detail: "The cover has no alt text. The database will refuse to save this.",
          }
        : { status: "pass" as const, detail: "Cover set, with alt text." }),
  });

  /* --------------------------------------------------------------- content */
  const words = bodyWordCount(input.content);
  checks.push({
    id: "length",
    label: "Body length",
    ...(words === 0
      ? { status: "fail" as const, detail: "The post has no body yet." }
      : words < BODY_MIN_WORDS
        ? {
            status: "warn" as const,
            detail: `${words} words. Short posts can rank, but ${BODY_MIN_WORDS}+ gives more to match on.`,
          }
        : { status: "pass" as const, detail: `${words} words.` }),
  });

  const headings = input.content.match(/^##\s+\S/gm)?.length ?? 0;
  checks.push({
    id: "headings",
    label: "Subheadings",
    ...(headings === 0
      ? {
          status: "warn" as const,
          detail: "No `##` subheadings. They structure the page for readers and for crawlers.",
        }
      : { status: "pass" as const, detail: `${headings} subheading${headings === 1 ? "" : "s"}.` }),
  });

  const links = input.content.match(/\[[^\]]+\]\([^)]+\)/g)?.length ?? 0;
  checks.push({
    id: "links",
    label: "Links",
    ...(links === 0
      ? { status: "warn" as const, detail: "No links. Cite sources or point to related work." }
      : { status: "pass" as const, detail: `${links} link${links === 1 ? "" : "s"}.` }),
  });

  /* --------------------------------------------------------- focus keyword */
  if (!keyword) {
    checks.push({
      id: "keyword",
      label: "Focus keyword",
      status: "skip",
      detail: "Optional. Set one to check where it appears.",
    });
    return checks;
  }

  const placements: { where: string; hit: boolean }[] = [
    { where: "the title", hit: contains(effectiveTitle(input), keyword) },
    { where: "the description", hit: contains(effectiveDescription(input), keyword) },
    { where: "the slug", hit: contains(slug.replace(/-/g, " "), keyword) },
    { where: "the opening paragraph", hit: contains(firstParagraph(input.content), keyword) },
    { where: "a subheading", hit: contains((input.content.match(/^##.*/gm) ?? []).join(" "), keyword) },
  ];

  const missing = placements.filter((p) => !p.hit).map((p) => p.where);

  checks.push({
    id: "keyword",
    label: `Focus keyword: “${keyword}”`,
    ...(missing.length === 0
      ? { status: "pass" as const, detail: "Appears in the title, description, slug, opening, and a subheading." }
      : missing.length >= 4
        ? { status: "fail" as const, detail: `Missing from ${missing.join(", ")}.` }
        : { status: "warn" as const, detail: `Missing from ${missing.join(", ")}.` }),
  });

  return checks;
}

/**
 * A 0–100 summary.
 *
 * `skip` is excluded from the denominator rather than counted as a pass — an
 * unset optional field should neither reward nor punish. A warn is half credit,
 * because a short title is a weaker problem than a missing one.
 */
export function seoScore(checks: SeoCheck[]): number {
  const scored = checks.filter((c) => c.status !== "skip");
  if (scored.length === 0) return 0;
  const earned = scored.reduce(
    (sum, c) => sum + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0),
    0,
  );
  return Math.round((earned / scored.length) * 100);
}
