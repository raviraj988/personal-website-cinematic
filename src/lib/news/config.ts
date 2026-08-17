/**
 * News & Updates configuration.
 *
 * Kept free of `server-only` imports so the values here can be read from a
 * plain Node process — the same reason `lib/blog/config.ts` stays importable.
 */

/** News index path. */
export const NEWS_PATH = "/news";

/** How many news items and newsletter issues the index shows. */
export const NEWS_INDEX_LIMIT = 24;
export const NEWSLETTER_INDEX_LIMIT = 24;

/** How many items the landing-page teaser shows. */
export const NEWS_TEASER_LIMIT = 3;

/** Canonical URL for a news item. */
export function newsUrl(slug: string): string {
  return `${NEWS_PATH}/${slug}`;
}

/**
 * The newsletter signup provider.
 *
 * TODO(ese): no provider has been chosen yet. Set `NEWSLETTER_SIGNUP_ACTION` to
 * the provider's form endpoint (Mailchimp, Buttondown, and Resend all expose
 * one) and the form in `NewsletterSignup` starts working with no other change.
 *
 * While this is null the component renders a plain mailto invitation instead of
 * a form. That is deliberate: a subscribe box that silently discards addresses
 * is worse than no subscribe box, and an email provider — not this application —
 * is what will own consent, double opt-in, and unsubscribe.
 */
export const NEWSLETTER_SIGNUP_ACTION: string | null = null;

/** Field name the chosen provider expects for the email address. */
export const NEWSLETTER_EMAIL_FIELD = "email";
