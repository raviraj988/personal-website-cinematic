/**
 * Guards for the two strings that become paths.
 *
 * A storage object key and a slug both end up in a URL, and both arrive from a
 * model. `uploadCover` writes into a public bucket with the service-role key, so
 * a caller who controls the object key controls where in that bucket the write
 * lands — which is why the path is derived from a *validated* slug here rather
 * than from anything the caller passed.
 */
import { SLUG_PATTERN, FIELD_LIMITS, slugify } from "../src/lib/blog/validation";

/**
 * Characters that must never reach a storage key, checked by hand rather than
 * left to `SLUG_PATTERN` alone.
 *
 * `SLUG_PATTERN` already excludes every one of these — it permits only
 * `[a-z0-9]` and single hyphens. This is the second, independent check, kept
 * explicit so that a future widening of the slug rules (an underscore, say, or a
 * non-ASCII letter) cannot silently become a path-traversal primitive. The two
 * checks disagreeing is the point.
 */
const FORBIDDEN = ["/", "\\", "..", "\0"];

export type SlugCheck =
  | { ok: true; slug: string }
  | { ok: false; error: string; suggestion: string | null };

/**
 * Validate a slug for use in a path.
 *
 * Returns a `slugify` suggestion when the input is merely badly shaped, because
 * "that slug is invalid" and "here is the slug you meant" cost the same to
 * compute and only one of them saves a round trip.
 */
export function checkSlugShape(input: string): SlugCheck {
  const slug = input.trim();

  if (slug.length === 0) {
    return { ok: false, error: "A slug is required.", suggestion: null };
  }

  if (slug.length > FIELD_LIMITS.slug.max) {
    return {
      ok: false,
      error: `Slug must be ${FIELD_LIMITS.slug.max} characters or fewer (currently ${slug.length}).`,
      suggestion: slugify(slug) || null,
    };
  }

  for (const bad of FORBIDDEN) {
    if (slug.includes(bad)) {
      return {
        ok: false,
        error: `A slug may not contain ${JSON.stringify(bad)}.`,
        suggestion: slugify(slug) || null,
      };
    }
  }

  if (slug.startsWith(".")) {
    return {
      ok: false,
      error: "A slug may not start with a dot.",
      suggestion: slugify(slug) || null,
    };
  }

  if (!SLUG_PATTERN.test(slug)) {
    const suggestion = slugify(slug);
    return {
      ok: false,
      error:
        "Slug must be lowercase letters, digits, and single hyphens between them — no leading, trailing, or doubled hyphens.",
      suggestion: suggestion.length > 0 && suggestion !== slug ? suggestion : null,
    };
  }

  return { ok: true, slug };
}

/**
 * Where a cover lands in the `blog-images` bucket.
 *
 * The `covers/` prefix matches what the migration's comment describes and what
 * the admin console already writes. The random suffix is not for uniqueness
 * alone — re-running a cover generation for the same slug must not silently
 * overwrite the cover a human already reviewed.
 */
export function coverObjectPath(
  validatedSlug: string,
  ext: "jpg" | "png" | "webp",
  suffix: string,
): string {
  const check = checkSlugShape(validatedSlug);
  if (!check.ok) {
    // Reached only by a caller that skipped validation, which is a bug here
    // rather than bad input from the client.
    throw new Error(`Refusing to build a storage path from an invalid slug.`);
  }
  if (!/^[a-z0-9]{4,12}$/.test(suffix)) {
    throw new Error("Cover path suffix must be 4–12 lowercase alphanumerics.");
  }
  return `covers/${check.slug}-${suffix}.${ext}`;
}

/** A short, path-safe suffix. Not a security boundary — just collision avoidance. */
export function randomSuffix(): string {
  return Math.floor(Math.random() * 0xfffffff)
    .toString(36)
    .padStart(6, "0")
    .slice(0, 6);
}
