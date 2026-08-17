import { Arrow } from "@/components/ui/Arrow";
import { contact } from "@/lib/data/ese-content";
import {
  NEWSLETTER_EMAIL_FIELD,
  NEWSLETTER_SIGNUP_ACTION,
} from "@/lib/news/config";

/**
 * Newsletter subscribe.
 *
 * Posts directly to a third-party email provider's form endpoint. Nothing is
 * written to Postgres and there is no Server Action, which is the point: the
 * provider owns double opt-in, unsubscribe links, bounce handling, and the
 * compliance that goes with holding a mailing list.
 *
 * Until a provider is chosen `NEWSLETTER_SIGNUP_ACTION` is null and this falls
 * back to a mailto invitation. A form that collects addresses and drops them is
 * worse than no form, so the input is never rendered without somewhere to send
 * it.
 */
export function NewsletterSignup() {
  if (!NEWSLETTER_SIGNUP_ACTION) {
    return (
      <div className="newsletter-signup newsletter-signup--pending">
        <p className="section-label">Subscribe</p>
        <h2>Get new issues by email</h2>
        <p>
          Email signup is being set up. In the meantime, write to us and we
          will add you to the list for the next issue.
        </p>
        <a className="text-link" href={`mailto:${contact.email}?subject=Newsletter`}>
          Ask to be added <Arrow />
        </a>
      </div>
    );
  }

  return (
    <div className="newsletter-signup">
      <p className="section-label">Subscribe</p>
      <h2>Get new issues by email</h2>
      <p>Occasional updates on ESE&apos;s work. Unsubscribe at any time.</p>

      <form
        className="newsletter-signup__form"
        action={NEWSLETTER_SIGNUP_ACTION}
        method="post"
        target="_blank"
      >
        <label className="visually-hidden" htmlFor="newsletter-email">
          Email address
        </label>
        <input
          id="newsletter-email"
          name={NEWSLETTER_EMAIL_FIELD}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
        <button type="submit">
          Subscribe <Arrow />
        </button>
      </form>
    </div>
  );
}
