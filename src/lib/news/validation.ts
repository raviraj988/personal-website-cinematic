/**
 * Field rules for a newsletter issue, in one module shared by the browser and
 * the server — same three-copy arrangement as `lib/blog/validation.ts`, and the
 * same reasoning. The `input` attributes give feedback and stop nothing; this
 * module stops a hand-written POST; the CHECK constraints in
 * `supabase/migrations/0002_news_and_newsletters.sql` stop everything.
 *
 * No `server-only` import here: this has to stay runnable from a plain Node
 * process so the rules can be tested without a React render.
 */

/** Mirrors the CHECK constraints in 0002. */
export const NEWSLETTER_LIMITS = {
  title: { min: 1, max: 160 },
  slug: { min: 1, max: 160 },
  description: { min: 1, max: 320 },
  externalUrl: { min: 1, max: 2048 },
  coverImageAlt: { min: 1, max: 320 },
} as const;

/** Mirrors `newsletters_slug_format`. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Mirrors `newsletters_issue_date` being a plain `date`. */
export const ISSUE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type NewsletterFormValues = {
  title: string;
  slug: string;
  description: string;
  externalUrl: string;
  issueDate: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
};

export type NewsletterFieldErrors = Partial<
  Record<keyof NewsletterFormValues, string>
>;

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

/**
 * Is this a URL we are willing to put in an `href`?
 *
 * https only, and parsed rather than pattern-matched. `javascript:` and `data:`
 * are the reason — this value is admin-supplied and rendered straight into a
 * link, so "starts with http" is not a sufficient check when
 * `https:@evil.example` and friends exist. `new URL` gives an authoritative
 * protocol and rejects anything unparseable outright.
 */
export function isSafeExternalUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "https:" && url.hostname.length > 0;
}

export function validateNewsletter(
  values: NewsletterFormValues,
): NewsletterFieldErrors {
  const errors: NewsletterFieldErrors = {};

  const title = lengthError("Title", values.title.trim(), NEWSLETTER_LIMITS.title);
  if (title) errors.title = title;

  const slugValue = values.slug.trim();
  const slug = lengthError("Slug", slugValue, NEWSLETTER_LIMITS.slug);
  if (slug) {
    errors.slug = slug;
  } else if (!SLUG_PATTERN.test(slugValue)) {
    errors.slug =
      "Slug must be lowercase letters, digits, and single hyphens between them — no leading, trailing, or doubled hyphens.";
  }

  const description = lengthError(
    "Description",
    values.description.trim(),
    NEWSLETTER_LIMITS.description,
  );
  if (description) errors.description = description;

  const urlValue = values.externalUrl.trim();
  const url = lengthError("Issue link", urlValue, NEWSLETTER_LIMITS.externalUrl);
  if (url) {
    errors.externalUrl = url;
  } else if (!isSafeExternalUrl(urlValue)) {
    errors.externalUrl =
      "The issue link must be a full https:// URL — for example the public view link for a Canva design or a hosted PDF.";
  }

  if (!ISSUE_DATE_PATTERN.test(values.issueDate.trim())) {
    errors.issueDate = "Issue date is required, as YYYY-MM-DD.";
  }

  // Mirrors `newsletters_cover_alt_required`.
  if (values.coverImageUrl && !values.coverImageAlt) {
    errors.coverImageAlt =
      "A cover image needs alt text. Describe what the image shows for someone who cannot see it.";
  }

  if (
    values.coverImageAlt &&
    values.coverImageAlt.length > NEWSLETTER_LIMITS.coverImageAlt.max
  ) {
    errors.coverImageAlt = `Alt text must be ${NEWSLETTER_LIMITS.coverImageAlt.max} characters or fewer (currently ${values.coverImageAlt.length}).`;
  }

  return errors;
}

export function hasNewsletterErrors(errors: NewsletterFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
