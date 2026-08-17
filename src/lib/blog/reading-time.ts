import { READING_WORDS_PER_MINUTE } from "./config";

/**
 * Reading time, computed from the Markdown at render time.
 *
 * Not stored on the row. A stored estimate is wrong the moment somebody edits
 * the body, and nothing about it is expensive enough to be worth caching — this
 * is a regex pass over a few thousand characters.
 *
 * Code blocks are removed before counting. Nobody reads a fenced block at prose
 * speed, and a post with a long listing otherwise claims a reading time several
 * times its real one.
 */
export function readingTimeMinutes(markdown: string): number {
  const prose = markdown
    // Fenced code blocks, ``` or ~~~, including the unterminated final fence a
    // half-finished draft can leave behind.
    .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]*\1[^\n]*$|$)/gm, " ")
    // Indented code blocks: four spaces or a tab at the start of a line.
    .replace(/^(?: {4}|\t).*$/gm, " ")
    // Inline code.
    .replace(/`[^`\n]*`/g, " ")
    // Images: the alt text is not body copy.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    // Links: keep the label, drop the URL.
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Bare URLs and autolinks.
    .replace(/<[^>\s]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    // Table pipes, heading hashes, blockquote markers, emphasis, list bullets.
    .replace(/[|>#*_~]+/g, " ")
    .replace(/^[ \t]*[-+]\s+/gm, " ");

  const words = prose.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

  // Floor of one minute: "0 min read" reads as an error, not as a short post.
  return Math.max(1, Math.round(words / READING_WORDS_PER_MINUTE));
}

/** "4 min read" — the string the templates actually print. */
export function readingTimeLabel(markdown: string): string {
  return `${readingTimeMinutes(markdown)} min read`;
}
