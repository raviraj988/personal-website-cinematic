"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { PostBody } from "@/components/blog/PostBody";
import { CharacterCount } from "./CharacterCount";
import { CoverField } from "./CoverField";
import {
  createPostAction,
  updatePostAction,
  type PostFormState,
} from "@/app/admin/actions";
import { FIELD_LIMITS, slugify } from "@/lib/blog/validation";
import { readingTimeLabel } from "@/lib/blog/reading-time";
import type { PostCategory, PostRow } from "@/lib/supabase/database.types";

const INITIAL: PostFormState = { ok: false };

type PostEditorProps =
  | { mode: "create"; post?: undefined }
  | { mode: "edit"; post: PostRow };

function SaveButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();

  return (
    <button className="admin-button admin-button--primary" type="submit" disabled={pending}>
      {pending
        ? "Saving…"
        : mode === "create"
          ? "Create draft"
          : "Save changes"}
    </button>
  );
}

export function PostEditor(props: PostEditorProps) {
  const { mode } = props;
  const post = props.mode === "edit" ? props.post : undefined;

  const [state, formAction] = useActionState(
    mode === "create" ? createPostAction : updatePostAction,
    INITIAL,
  );

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [category, setCategory] = useState<PostCategory>(post?.category ?? "blog");
  const [content, setContent] = useState(post?.content ?? "");
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seo_description ?? "");
  const [cover, setCover] = useState({
    url: post?.cover_image_url ?? "",
    alt: post?.cover_image_alt ?? "",
  });

  /**
   * Whether the author has taken the slug over.
   *
   * On a **new** post the slug tracks the title, which is what everybody wants
   * while naming a piece. Once it has been edited by hand it stops following, so a
   * deliberate slug is never overwritten by a later title tweak.
   *
   * On an **existing** post the slug never follows the title at all. Renaming a
   * published article would silently change its URL, break every inbound link, and
   * strand the old address — the seed value here is `true` for that reason, not as
   * an optimisation.
   */
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const [tab, setTab] = useState<"write" | "preview">("write");

  const errors = state.errors ?? {};

  function handleTitleChange(next: string) {
    setTitle(next);
    if (!slugTouched) setSlug(slugify(next));
  }

  return (
    <form className="admin-form" action={formAction} noValidate>
      {mode === "edit" ? <input type="hidden" name="id" value={post!.id} /> : null}

      {state.message ? (
        <p
          className={`admin-notice ${
            state.ok ? "admin-notice--success" : "admin-notice--error"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <div className="admin-field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          value={title}
          maxLength={FIELD_LIMITS.title.max}
          onChange={(event) => handleTitleChange(event.target.value)}
          required
        />
        <div className="admin-field__foot">
          <span />
          <CharacterCount value={title} max={FIELD_LIMITS.title.max} />
        </div>
        {errors.title ? (
          <p className="admin-field__error" role="alert">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="admin-field">
        <label htmlFor="slug">URL slug</label>
        <input
          id="slug"
          name="slug"
          type="text"
          value={slug}
          maxLength={FIELD_LIMITS.slug.max}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          spellCheck={false}
          required
        />
        <div className="admin-field__foot">
          <p className="admin-hint">
            /blog/<strong>{slug || "…"}</strong>
            {mode === "edit"
              ? " — changing this changes the post's public address."
              : ""}
          </p>
          <CharacterCount value={slug} max={FIELD_LIMITS.slug.max} />
        </div>
        {errors.slug ? (
          <p className="admin-field__error" role="alert">
            {errors.slug}
          </p>
        ) : null}
      </div>

      <div className="admin-field">
        <label htmlFor="excerpt">Excerpt</label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={3}
          value={excerpt}
          maxLength={FIELD_LIMITS.excerpt.max}
          onChange={(event) => setExcerpt(event.target.value)}
          required
        />
        <div className="admin-field__foot">
          <p className="admin-hint">
            Shown on the index and used as the meta description when no SEO
            description is set.
          </p>
          <CharacterCount value={excerpt} max={FIELD_LIMITS.excerpt.max} />
        </div>
        {errors.excerpt ? (
          <p className="admin-field__error" role="alert">
            {errors.excerpt}
          </p>
        ) : null}
      </div>

      {/*
        Which index this appears on, and therefore which URL it gets. Changing it
        on a published post moves the piece: the action flushes both the old and
        the new index and article paths, so the old URL stops serving it.
      */}
      <div className="admin-field">
        <label htmlFor="category">Publish to</label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value as PostCategory)}
        >
          <option value="blog">Blog — field notes and reflections</option>
          <option value="news">News &amp; Updates — announcements</option>
        </select>
        <div className="admin-field__foot">
          <p className="admin-hint">
            {category === "news"
              ? "Publishes to /news and appears in the landing page's news block."
              : "Publishes to /blog."}
          </p>
        </div>
        {errors.category ? (
          <p className="admin-field__error" role="alert">
            {errors.category}
          </p>
        ) : null}
      </div>

      <CoverField
        url={cover.url}
        alt={cover.alt}
        onChange={setCover}
        error={errors.coverImageAlt}
      />

      {/* --------------------------------------------------------------- body */}

      <div className="admin-field admin-field--body">
        <div className="admin-tabs" role="tablist" aria-label="Post body view">
          <button
            type="button"
            role="tab"
            id="tab-write"
            aria-selected={tab === "write"}
            aria-controls="panel-write"
            className={`admin-tab${tab === "write" ? " admin-tab--active" : ""}`}
            onClick={() => setTab("write")}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            id="tab-preview"
            aria-selected={tab === "preview"}
            aria-controls="panel-preview"
            className={`admin-tab${tab === "preview" ? " admin-tab--active" : ""}`}
            onClick={() => setTab("preview")}
          >
            Preview
          </button>
          <p className="admin-tabs__meta">
            Markdown with GFM tables and strikethrough · {readingTimeLabel(content)}
          </p>
        </div>

        {/* The textarea stays mounted while previewing. Unmounting it would lose
            the cursor position and the undo history, and would drop the field
            from the form payload if the author saved from the preview tab. */}
        <div
          id="panel-write"
          role="tabpanel"
          aria-labelledby="tab-write"
          hidden={tab !== "write"}
        >
          <label className="visually-hidden" htmlFor="content">
            Post body, in Markdown
          </label>
          <textarea
            id="content"
            name="content"
            className="admin-textarea admin-textarea--body"
            rows={26}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            spellCheck
            required
          />
        </div>

        <div
          id="panel-preview"
          role="tabpanel"
          aria-labelledby="tab-preview"
          hidden={tab !== "preview"}
        >
          {/* The same `PostBody` the live page and the preview route render, so
              what is on screen here is what ships — including raw HTML being
              dropped rather than rendered. */}
          <div className="admin-preview">
            {content.trim() ? (
              <PostBody content={content} />
            ) : (
              <p className="admin-hint">Nothing to preview yet.</p>
            )}
          </div>
        </div>

        {errors.content ? (
          <p className="admin-field__error" role="alert">
            {errors.content}
          </p>
        ) : null}
      </div>

      {/* ---------------------------------------------------------------- seo */}

      <fieldset className="admin-fieldset">
        <legend>Search and social</legend>
        <p className="admin-hint">
          Both are optional. Left empty, the title and excerpt are used.
        </p>

        <div className="admin-field">
          <label htmlFor="seoTitle">SEO title</label>
          <input
            id="seoTitle"
            name="seoTitle"
            type="text"
            value={seoTitle}
            maxLength={FIELD_LIMITS.seoTitle.max}
            onChange={(event) => setSeoTitle(event.target.value)}
          />
          <div className="admin-field__foot">
            <p className="admin-hint">
              Used as the exact title tag, with no site name appended.
            </p>
            <CharacterCount value={seoTitle} max={FIELD_LIMITS.seoTitle.max} />
          </div>
          {errors.seoTitle ? (
            <p className="admin-field__error" role="alert">
              {errors.seoTitle}
            </p>
          ) : null}
        </div>

        <div className="admin-field">
          <label htmlFor="seoDescription">SEO description</label>
          <textarea
            id="seoDescription"
            name="seoDescription"
            rows={2}
            value={seoDescription}
            maxLength={FIELD_LIMITS.seoDescription.max}
            onChange={(event) => setSeoDescription(event.target.value)}
          />
          <div className="admin-field__foot">
            <span />
            <CharacterCount
              value={seoDescription}
              max={FIELD_LIMITS.seoDescription.max}
            />
          </div>
          {errors.seoDescription ? (
            <p className="admin-field__error" role="alert">
              {errors.seoDescription}
            </p>
          ) : null}
        </div>
      </fieldset>

      <div className="admin-actions admin-actions--sticky">
        <SaveButton mode={mode} />
        {mode === "create" ? (
          <p className="admin-hint">
            Saved as a draft. Publishing is a separate step.
          </p>
        ) : null}
      </div>
    </form>
  );
}
