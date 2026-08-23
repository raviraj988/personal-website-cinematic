/**
 * Field rules for a post, in one module shared by the browser and the server.
 *
 * These are the second and third of three copies. The first is the `maxLength`
 * and `required` attributes on the inputs, which give immediate feedback and
 * stop nothing. The second is this module, called from the Server Action, which
 * stops a hand-written POST. The third is the CHECK constraints in
 * `supabase/migrations/0001_blog_and_admin.sql`, which stop everything —
 * including a bug in this file and including the external drafting tool.
 *
 * Keeping the browser and server copies in one file means the two cannot drift.
 * The database copy is intentionally duplicated in SQL: it has to be enforceable
 * without this code in the path at all.
 */

/**
 * Mirrors the CHECK constraints, and drives the character counters.
 *
 * One exception, called out so nobody assumes otherwise: `coverImageAlt` has no
 * length constraint in the database — the contract only requires it to be
 * non-empty when a cover is set. The 320 here is an editorial cap, not a mirror,
 * and it is the one limit in this object the database will not enforce for you.
 */
export const FIELD_LIMITS = {
  title: { min: 1, max: 160 },
  slug: { min: 1, max: 160 },
  excerpt: { min: 1, max: 320 },
  seoTitle: { min: 0, max: 60 },
  seoDescription: { min: 0, max: 160 },
  coverImageAlt: { min: 1, max: 320 },
  /** Mirrors `posts_focus_keyword_length` from 0003. */
  focusKeyword: { min: 0, max: 120 },
} as const;

/** Mirrors `posts_slug_format`. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Mirrors `posts_category_check`. */
export const POST_CATEGORIES = ["blog", "news"] as const;
export type PostCategoryValue = (typeof POST_CATEGORIES)[number];

export function isPostCategory(value: string): value is PostCategoryValue {
  return (POST_CATEGORIES as readonly string[]).includes(value);
}

export type PostFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  focusKeyword: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type FieldErrors = Partial<Record<keyof PostFormValues, string>>;

/**
 * Turn a title into a slug candidate.
 *
 * Only ever used to *suggest* a slug for a new post. Editing a title later must
 * not rewrite a slug that is already published and already linked to.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    // Strip the combining marks that NFKD just split off, so "Ångström"
    // becomes "angstrom" rather than "a-ngstro-m".
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, FIELD_LIMITS.slug.max)
    // A trailing hyphen can reappear after the slice.
    .replace(/-+$/g, "");
}

function lengthError(
  label: string,
  value: string,
  limits: { min: number; max: number },
): string | undefined {
  const length = value.length;
  if (limits.min > 0 && length === 0) return `${label} is required.`;
  if (length > limits.max) {
    return `${label} must be ${limits.max} characters or fewer (currently ${length}).`;
  }
  return undefined;
}

/** Empty string means "not set" on an optional column, which is stored as NULL. */
export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validate a whole post. Returns one message per bad field, so the editor can
 * show every problem at once instead of one per round trip.
 */
export function validatePost(values: PostFormValues): FieldErrors {
  const errors: FieldErrors = {};

  const title = lengthError("Title", values.title.trim(), FIELD_LIMITS.title);
  if (title) errors.title = title;

  const slugValue = values.slug.trim();
  const slug = lengthError("Slug", slugValue, FIELD_LIMITS.slug);
  if (slug) {
    errors.slug = slug;
  } else if (!SLUG_PATTERN.test(slugValue)) {
    errors.slug =
      "Slug must be lowercase letters, digits, and single hyphens between them — no leading, trailing, or doubled hyphens.";
  }

  const excerpt = lengthError("Excerpt", values.excerpt.trim(), FIELD_LIMITS.excerpt);
  if (excerpt) errors.excerpt = excerpt;

  // Mirrors `posts_content_present`: whitespace is not content.
  if (values.content.trim().length === 0) errors.content = "The post body is required.";

  // Mirrors `posts_category_check`. Reachable by a hand-written POST even though
  // the editor only ever offers the two valid values.
  if (!isPostCategory(values.category)) {
    errors.category = "Choose either the blog or news & updates.";
  }

  if (values.seoTitle && values.seoTitle.length > FIELD_LIMITS.seoTitle.max) {
    errors.seoTitle = `SEO title must be ${FIELD_LIMITS.seoTitle.max} characters or fewer (currently ${values.seoTitle.length}).`;
  }

  if (
    values.seoDescription &&
    values.seoDescription.length > FIELD_LIMITS.seoDescription.max
  ) {
    errors.seoDescription = `SEO description must be ${FIELD_LIMITS.seoDescription.max} characters or fewer (currently ${values.seoDescription.length}).`;
  }

  // Mirrors `posts_cover_alt_required`. A cover with no alt text is refused
  // rather than published with an empty attribute.
  if (values.coverImageUrl && !values.coverImageAlt) {
    errors.coverImageAlt =
      "A cover image needs alt text. Describe what the image shows for someone who cannot see it.";
  }

  if (
    values.focusKeyword &&
    values.focusKeyword.length > FIELD_LIMITS.focusKeyword.max
  ) {
    errors.focusKeyword = `Focus keyword must be ${FIELD_LIMITS.focusKeyword.max} characters or fewer (currently ${values.focusKeyword.length}).`;
  }

  if (
    values.coverImageAlt &&
    values.coverImageAlt.length > FIELD_LIMITS.coverImageAlt.max
  ) {
    errors.coverImageAlt = `Alt text must be ${FIELD_LIMITS.coverImageAlt.max} characters or fewer (currently ${values.coverImageAlt.length}).`;
  }

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
