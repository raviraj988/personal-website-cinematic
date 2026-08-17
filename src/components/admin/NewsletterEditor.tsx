"use client";

import { useActionState, useState } from "react";
import { CharacterCount } from "@/components/admin/CharacterCount";
import { CoverField } from "@/components/admin/CoverField";
import {
  createNewsletterAction,
  updateNewsletterAction,
  type NewsletterFormState,
} from "@/app/admin/newsletter-actions";
import { slugify } from "@/lib/blog/validation";
import { NEWSLETTER_LIMITS } from "@/lib/news/validation";
import type { NewsletterRow } from "@/lib/supabase/database.types";

type NewsletterEditorProps =
  | { mode: "create"; issue?: undefined }
  | { mode: "edit"; issue: NewsletterRow };

const EMPTY: NewsletterFormState = { ok: false };

/**
 * Create/edit form for a newsletter issue.
 *
 * Deliberately much smaller than `PostEditor`: an issue has no body to write,
 * because the issue itself lives wherever it was designed. What is stored here
 * is only what the index card needs plus the link out.
 */
export function NewsletterEditor(props: NewsletterEditorProps) {
  const issue = props.issue;
  const action = props.mode === "create" ? createNewsletterAction : updateNewsletterAction;
  const [state, formAction, pending] = useActionState(action, EMPTY);

  const [title, setTitle] = useState(issue?.title ?? "");
  const [slug, setSlug] = useState(issue?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(props.mode === "edit");
  const [description, setDescription] = useState(issue?.description ?? "");
  const [cover, setCover] = useState({
    url: issue?.cover_image_url ?? "",
    alt: issue?.cover_image_alt ?? "",
  });

  const errors = state.errors ?? {};

  /**
   * The slug follows the title only until somebody edits it by hand. On an
   * existing issue it never follows at all — the slug is already the address the
   * issue is linked by, and retitling must not silently move it.
   */
  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  return (
    <form className="admin-form" action={formAction}>
      {props.mode === "edit" ? (
        <input type="hidden" name="id" value={props.issue.id} />
      ) : null}
      <input type="hidden" name="coverImageUrl" value={cover.url} />
      <input type="hidden" name="coverImageAlt" value={cover.alt} />

      {state.message ? (
        <p
          className={`admin-notice admin-notice--${state.ok ? "success" : "error"}`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      <div className="admin-field">
        <label htmlFor="title">Issue title</label>
        <input
          id="title"
          name="title"
          value={title}
          maxLength={NEWSLETTER_LIMITS.title.max}
          onChange={(event) => onTitleChange(event.target.value)}
          required
        />
        <div className="admin-field__foot">
          <p className="admin-hint">For example, “Spring 2026 — Tribal air quality”.</p>
          <CharacterCount value={title} max={NEWSLETTER_LIMITS.title.max} />
        </div>
        {errors.title ? (
          <p className="admin-field__error" role="alert">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="admin-field">
        <label htmlFor="slug">Slug</label>
        <input
          id="slug"
          name="slug"
          value={slug}
          maxLength={NEWSLETTER_LIMITS.slug.max}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          required
        />
        <div className="admin-field__foot">
          <p className="admin-hint">
            Used to identify the issue. It is not a public URL — issues link out.
          </p>
        </div>
        {errors.slug ? (
          <p className="admin-field__error" role="alert">
            {errors.slug}
          </p>
        ) : null}
      </div>

      <div className="admin-field">
        <label htmlFor="externalUrl">Issue link</label>
        <input
          id="externalUrl"
          name="externalUrl"
          type="url"
          inputMode="url"
          defaultValue={issue?.external_url ?? ""}
          maxLength={NEWSLETTER_LIMITS.externalUrl.max}
          placeholder="https://..."
          required
        />
        <div className="admin-field__foot">
          <p className="admin-hint">
            The public https:// link readers open. For a Canva design use the
            share/view link, not the /edit one — an edit link asks the reader to
            sign in.
          </p>
        </div>
        {errors.externalUrl ? (
          <p className="admin-field__error" role="alert">
            {errors.externalUrl}
          </p>
        ) : null}
      </div>

      <div className="admin-field">
        <label htmlFor="issueDate">Issue date</label>
        <input
          id="issueDate"
          name="issueDate"
          type="date"
          defaultValue={issue?.issue_date ?? ""}
          required
        />
        <div className="admin-field__foot">
          <p className="admin-hint">
            The date printed on the issue. Issues are ordered by this, newest
            first.
          </p>
        </div>
        {errors.issueDate ? (
          <p className="admin-field__error" role="alert">
            {errors.issueDate}
          </p>
        ) : null}
      </div>

      <div className="admin-field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={description}
          maxLength={NEWSLETTER_LIMITS.description.max}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
        <div className="admin-field__foot">
          <p className="admin-hint">A sentence or two, shown on the issue card.</p>
          <CharacterCount
            value={description}
            max={NEWSLETTER_LIMITS.description.max}
          />
        </div>
        {errors.description ? (
          <p className="admin-field__error" role="alert">
            {errors.description}
          </p>
        ) : null}
      </div>

      <CoverField
        url={cover.url}
        alt={cover.alt}
        onChange={setCover}
        error={errors.coverImageAlt}
      />

      <div className="admin-form__actions">
        <button className="admin-button admin-button--primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : props.mode === "create" ? "Create issue" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
