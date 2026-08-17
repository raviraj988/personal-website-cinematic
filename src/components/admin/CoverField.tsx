"use client";

import { useId, useRef, useState, useTransition } from "react";
import { uploadCoverAction } from "@/app/admin/actions";
import { FIELD_LIMITS } from "@/lib/blog/validation";
import { CharacterCount } from "./CharacterCount";

type CoverFieldProps = {
  url: string;
  alt: string;
  onChange: (next: { url: string; alt: string }) => void;
  error?: string;
};

/**
 * Cover image: upload, preview, alt text, remove.
 *
 * The file input is not part of the post form's payload — it has no `name`, and
 * the upload happens on selection through a Server Action call. Two reasons: HTML
 * cannot nest a second form inside the editor's form, and posting a 5 MB image
 * alongside every draft save would make saving a typo fix slow and fragile.
 *
 * What *is* in the form payload is the resulting public URL and the alt text, as
 * `coverImageUrl` and `coverImageAlt`.
 */
export function CoverField({ url, alt, onChange, error }: CoverFieldProps) {
  const [pending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const altId = useId();
  const fileId = useId();

  function handleFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);

    const body = new FormData();
    body.set("file", file);

    startTransition(async () => {
      const result = await uploadCoverAction(body);

      // Let the same file be retried after a failure: without this, selecting the
      // identical file again fires no change event.
      if (fileRef.current) fileRef.current.value = "";

      if (!result.ok) {
        setUploadError(result.error);
        return;
      }

      // Keep any alt text already written — re-uploading a cropped version of the
      // same picture should not throw away the description of it.
      onChange({ url: result.url, alt });
    });
  }

  return (
    <fieldset className="admin-fieldset">
      <legend>Cover image</legend>

      {url ? (
        <div className="admin-cover">
          {/* A plain <img>: this is an admin preview of a file that was uploaded
              a second ago, so there is nothing to gain from putting it through
              the image optimiser. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt || "Cover image, no alt text yet"} />
          <div className="admin-cover__meta">
            <p className="admin-cover__url">{url}</p>
            <button
              className="admin-button admin-button--quiet"
              type="button"
              onClick={() => onChange({ url: "", alt: "" })}
            >
              Remove cover
            </button>
          </div>
        </div>
      ) : (
        <p className="admin-hint">
          No cover image. Posts without one fall back to the site-wide preview
          image when shared.
        </p>
      )}

      <input type="hidden" name="coverImageUrl" value={url} />

      <div className="admin-field">
        <label htmlFor={fileId}>
          {url ? "Replace the image" : "Upload an image"}
        </label>
        <input
          id={fileId}
          ref={fileRef}
          type="file"
          // A hint for the file picker only. The real decision is made on the
          // server by reading the file's magic bytes, because `accept` is a
          // suggestion and the declared MIME type is client-supplied.
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <p className="admin-hint">
          JPEG, PNG, or WebP, up to 5 MB. SVG is not accepted.
        </p>
      </div>

      {pending ? <p className="admin-notice">Uploading…</p> : null}

      {uploadError ? (
        <p className="admin-notice admin-notice--error" role="alert">
          {uploadError}
        </p>
      ) : null}

      {url ? (
        <div className="admin-field">
          <label htmlFor={altId}>
            Alt text <span className="admin-required">required with a cover</span>
          </label>
          <textarea
            id={altId}
            name="coverImageAlt"
            rows={2}
            value={alt}
            maxLength={FIELD_LIMITS.coverImageAlt.max}
            onChange={(event) => onChange({ url, alt: event.target.value })}
            aria-describedby={`${altId}-help`}
          />
          <div className="admin-field__foot">
            <p className="admin-hint" id={`${altId}-help`}>
              Describe what the image shows for someone who cannot see it. The
              database refuses a cover without alt text.
            </p>
            <CharacterCount value={alt} max={FIELD_LIMITS.coverImageAlt.max} />
          </div>
          {error ? (
            <p className="admin-field__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        // Keeps the field present in the payload when there is no cover, so the
        // server sees an explicit empty value rather than a missing key.
        <input type="hidden" name="coverImageAlt" value="" />
      )}
    </fieldset>
  );
}
