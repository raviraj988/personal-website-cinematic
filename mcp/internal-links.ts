/**
 * Link extraction, validation, and suggestion — all pure.
 *
 * ## Why an unknown internal path is a hard failure
 *
 * The site has no catch-all route. `/services` is the case that proves it: there
 * are five `/services/<slug>` pages and nothing above them, so a link a model
 * emits by analogy with every other site on earth is a 404 rather than a
 * redirect. Since the tool knows the whole route list, and the whole point of
 * this pass is to catch what the single-post editor checklist cannot, an unknown
 * site-relative path is a `fail` and not a `warn`.
 *
 * ## Corpora arrive as arguments
 *
 * Nothing here reads the database. The published slugs and the route list are
 * parameters, which is what makes `check_seo` provably non-mutating and lets the
 * whole check suite run with the `posts` table empty.
 */
import type { LinkTarget } from "./site";

/** A Markdown link, as written. */
export type ExtractedLink = {
  /** The anchor text between the brackets. */
  text: string;
  /** The href, verbatim. */
  href: string;
  external: boolean;
};

/**
 * Markdown inline links, images excluded.
 *
 * The leading `(?<!!)` is what drops images: `![alt](url)` and `[text](url)`
 * differ only by that `!`, and counting a cover illustration as an internal link
 * would let a post satisfy the two-link floor without linking to anything.
 */
const LINK_RE = /(?<!!)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function extractLinks(content: string): ExtractedLink[] {
  const out: ExtractedLink[] = [];
  for (const match of content.matchAll(LINK_RE)) {
    const text = match[1].trim();
    const href = match[2].trim();
    out.push({ text, href, external: isExternalHref(href) });
  }
  return out;
}

/**
 * Mirrors what `PostBody` treats as external, and therefore renders `nofollow`.
 *
 * A `mailto:` counts as external here so it is not validated as a route — it is
 * refused separately, because ESE's public address is still a placeholder.
 */
export function isExternalHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}

export type LinkVerdict =
  | { href: string; text: string; status: "ok"; resolvedTo: string }
  | { href: string; text: string; status: "unknown-path"; suggestion: string | null }
  | { href: string; text: string; status: "known-missing" }
  | { href: string; text: string; status: "bare-fragment" }
  | { href: string; text: string; status: "placeholder-contact" };

export type LinkCorpus = {
  /** The real routes and anchors, from the site registry. */
  targets: LinkTarget[];
  /** Slugs of published posts, so post-to-post links validate. */
  publishedBlogSlugs: string[];
  publishedNewsSlugs: string[];
  /** Paths a writer reaches for that do not exist. */
  knownMissing: string[];
};

/**
 * Validate every site-relative link in a body.
 *
 * External links are not returned: this server does not vouch for them, they
 * render `nofollow`, and reaching out to check one would turn a pure function
 * into a network call.
 */
export function validateInternalLinks(
  content: string,
  corpus: LinkCorpus,
): LinkVerdict[] {
  const known = new Set(corpus.targets.map((t) => t.path));
  const verdicts: LinkVerdict[] = [];

  for (const link of extractLinks(content)) {
    const { href, text } = link;

    if (/^mailto:/i.test(href) || href.includes("@example.com")) {
      verdicts.push({ href, text, status: "placeholder-contact" });
      continue;
    }

    if (link.external) continue;

    // A bare `#section` resolves against whatever page the link is *on*. In a
    // post body that is the post, which has none of the homepage's sections, so
    // it scrolls nowhere. Several of ESE's own CTA hrefs are written this way
    // because they render on the homepage, which is exactly why this is easy to
    // copy in by mistake.
    if (href.startsWith("#")) {
      verdicts.push({ href, text, status: "bare-fragment" });
      continue;
    }

    if (!href.startsWith("/")) {
      // A relative path like `services/grants`. Next resolves it against the
      // current URL, so from `/blog/a-post` it becomes `/blog/services/grants`.
      verdicts.push({ href, text, status: "unknown-path", suggestion: `/${href}` });
      continue;
    }

    const [pathOnly] = href.split("?");
    const normalised = normalisePath(pathOnly);

    if (known.has(normalised) || known.has(href)) {
      verdicts.push({ href, text, status: "ok", resolvedTo: normalised });
      continue;
    }

    const blogMatch = /^\/blog\/([^/]+)$/.exec(normalised);
    if (blogMatch && corpus.publishedBlogSlugs.includes(blogMatch[1])) {
      verdicts.push({ href, text, status: "ok", resolvedTo: normalised });
      continue;
    }

    const newsMatch = /^\/news\/([^/]+)$/.exec(normalised);
    if (newsMatch && corpus.publishedNewsSlugs.includes(newsMatch[1])) {
      verdicts.push({ href, text, status: "ok", resolvedTo: normalised });
      continue;
    }

    if (corpus.knownMissing.includes(normalised)) {
      verdicts.push({ href, text, status: "known-missing" });
      continue;
    }

    verdicts.push({
      href,
      text,
      status: "unknown-path",
      suggestion: nearestTarget(normalised, [...known]),
    });
  }

  return verdicts;
}

/** Drop a trailing slash, but never turn `/` into `""`. */
function normalisePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

/**
 * The closest real route, by shared path segments.
 *
 * Deliberately crude — this is a hint in an error message, not a redirect. A
 * wrong hint costs the reader nothing; a hint that looks authoritative enough to
 * follow blindly would.
 */
function nearestTarget(path: string, targets: string[]): string | null {
  const wanted = path.split("/").filter(Boolean);
  let best: { path: string; score: number } | null = null;

  for (const target of targets) {
    const have = target.split("/").filter(Boolean);
    let score = 0;
    for (const segment of wanted) {
      if (have.some((h) => h === segment || h.includes(segment) || segment.includes(h))) {
        score += 1;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { path: target, score };
  }

  return best?.path ?? null;
}

/* ------------------------------------------------------------- suggestions */

export type LinkSuggestion = {
  path: string;
  label: string;
  /** The phrase already in the draft that motivates the link. */
  anchor: string;
  why: string;
};

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "for", "with", "that", "this", "from",
  "into", "your", "their", "our", "are", "was", "were", "will", "can", "how",
  "what", "when", "where", "why", "who", "you", "not", "all", "any", "has",
  "have", "had", "been", "more", "most", "other", "than", "then", "them",
  "these", "those", "some", "such", "only", "own", "same", "over", "also",
  "about", "which", "while", "each", "both", "under", "between", "through",
]);

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
}

/**
 * Propose 2–4 internal links, each with an anchor phrase **taken from the
 * draft**.
 *
 * Returning a target without an anchor would push the interesting decision back
 * to the caller, which is where link spam comes from — a list of pages with no
 * reason attached invites dropping all of them in a "Related" block. An anchor
 * that already exists in the prose is a link the sentence was going to want
 * anyway.
 */
export function suggestInternalLinks(
  content: string,
  corpus: LinkCorpus & { posts?: { slug: string; title: string; excerpt: string; category: string }[] },
  limit = 4,
): LinkSuggestion[] {
  const alreadyLinked = new Set(
    validateInternalLinks(content, corpus)
      .filter((v) => v.status === "ok")
      .map((v) => (v.status === "ok" ? v.resolvedTo : "")),
  );

  const sentences = content
    .replace(/```[\s\S]*?```/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && !s.startsWith("#") && !s.startsWith("|"));

  type Candidate = LinkSuggestion & { score: number };
  const candidates: Candidate[] = [];

  const pool: { path: string; label: string; text: string }[] = [
    ...corpus.targets
      // Homepage anchors make poor body links — they land the reader on a
      // section of a page they may already have come from.
      .filter((t) => !t.path.startsWith("/#"))
      .map((t) => ({ path: t.path, label: t.label, text: `${t.label} ${t.context}` })),
    ...(corpus.posts ?? []).map((p) => ({
      path: `${p.category === "news" ? "/news" : "/blog"}/${p.slug}`,
      label: p.title,
      text: `${p.title} ${p.excerpt}`,
    })),
  ];

  for (const target of pool) {
    if (alreadyLinked.has(target.path)) continue;

    const targetWords = new Set(significantWords(target.text));
    let best: { anchor: string; score: number } | null = null;

    for (const sentence of sentences) {
      const phrase = bestPhrase(sentence, targetWords);
      if (phrase && (!best || phrase.score > best.score)) best = phrase;
    }

    if (best && best.score >= 2) {
      candidates.push({
        path: target.path,
        label: target.label,
        anchor: best.anchor,
        why: `“${best.anchor}” in the draft is what ${target.label} is about.`,
        score: best.score,
      });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...rest }) => rest);
}

/**
 * The best 2–6 word run inside one sentence for linking to a given target.
 *
 * Runs rather than single words: "grant" alone is a poor anchor, and descriptive
 * anchor text is both an accessibility requirement and the thing that makes an
 * internal link worth having.
 */
function bestPhrase(
  sentence: string,
  targetWords: Set<string>,
): { anchor: string; score: number } | null {
  const tokens = sentence.split(/\s+/);
  let best: { anchor: string; score: number } | null = null;

  for (let start = 0; start < tokens.length; start += 1) {
    for (let length = 2; length <= 6 && start + length <= tokens.length; length += 1) {
      const run = tokens.slice(start, start + length);
      const anchor = run.join(" ").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (anchor.length < 8 || anchor.length > 70) continue;

      const hits = significantWords(anchor).filter((word) =>
        targetWords.has(word),
      ).length;
      if (hits === 0) continue;

      // Density, not raw count: a six-word run that happens to contain one
      // matching word is a worse anchor than a two-word run that is entirely
      // about the target.
      const score = hits + hits / run.length;
      if (!best || score > best.score) best = { anchor, score };
    }
  }

  return best;
}
