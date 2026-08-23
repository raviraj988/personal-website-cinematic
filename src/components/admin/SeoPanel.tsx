"use client";

import { SITE_ORIGIN } from "@/lib/blog/config";
import {
  effectiveDescription,
  effectiveTitle,
  runSeoChecks,
  seoScore,
  type SeoInput,
} from "@/lib/blog/seo";

/**
 * Search preview and live checklist.
 *
 * Everything here is derived from the draft on each keystroke — nothing is
 * stored, and nothing blocks a publish. The checks are advice; the rules that
 * genuinely must hold are in `validation.ts` and in CHECK constraints.
 *
 * The preview matters more than the score. "58 characters" is abstract; seeing
 * your headline cut off mid-word is not.
 */
export function SeoPanel({ input, basePath }: { input: SeoInput; basePath: string }) {
  const checks = runSeoChecks(input);
  const score = seoScore(checks);

  const title = effectiveTitle(input);
  const description = effectiveDescription(input);

  const band = score >= 80 ? "good" : score >= 55 ? "fair" : "poor";

  /** Where the post will actually live, shown the way a result renders it. */
  const displayUrl = `${SITE_ORIGIN.replace(/^https?:\/\//, "")}${basePath}/${input.slug || "…"}`;

  return (
    <section className="seo-panel" aria-labelledby="seo-heading">
      <div className="seo-panel__head">
        <h2 id="seo-heading" className="admin-section__heading">
          Search appearance
        </h2>
        <p className={`seo-score seo-score--${band}`}>
          <strong>{score}</strong>
          <span>/ 100</span>
        </p>
      </div>

      {/* A search result, approximately. Truncated where Google truncates so an
          over-long title is visible rather than described. */}
      <div className="serp-preview">
        <p className="serp-preview__url">{displayUrl}</p>
        <p className="serp-preview__title">
          {title || "Your headline will appear here"}
        </p>
        <p className="serp-preview__description">
          {description ||
            "Your excerpt or SEO description will appear here. Google shows roughly 155 characters."}
        </p>
      </div>

      <ul className="seo-checks">
        {checks.map((check) => (
          <li key={check.id} className={`seo-check seo-check--${check.status}`}>
            <span className="seo-check__mark" aria-hidden="true" />
            <div>
              <p className="seo-check__label">
                {check.label}
                <span className="visually-hidden">
                  {`: ${
                    check.status === "pass"
                      ? "passing"
                      : check.status === "warn"
                        ? "could be improved"
                        : check.status === "fail"
                          ? "needs attention"
                          : "not set"
                  }`}
                </span>
              </p>
              <p className="seo-check__detail">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="admin-hint">
        Advisory only — nothing here prevents publishing.
      </p>
    </section>
  );
}
