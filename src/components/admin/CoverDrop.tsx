"use client";

import { useCallback, useRef, useState } from "react";

/**
 * The drop target on the cover-upload page.
 *
 * Posts the file straight to `/api/cover-upload/<ticket>` as multipart, so the
 * bytes go to the same endpoint a scripted client would use — one code path, not a
 * second upload route that exists only for browsers.
 *
 * A client component because it needs the File object. Everything security-related
 * lives on the server: the ticket is claimed there, the type is decided from magic
 * bytes there, and the storage path was fixed before this page ever loaded. Nothing
 * here is trusted, which is why an `accept` attribute is a convenience rather than
 * a control.
 */

type State =
  | { kind: "idle" }
  | { kind: "sending"; name: string }
  | { kind: "done"; url: string; alt: string; width: number; height: number }
  | { kind: "error"; message: string; hint?: string };

const ACCEPT = "image/png,image/jpeg,image/webp";

export function CoverDrop({ ticket }: { ticket: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const send = useCallback(
    async (file: File) => {
      setState({ kind: "sending", name: file.name });

      const body = new FormData();
      body.set("file", file);

      try {
        const response = await fetch(`/api/cover-upload/${encodeURIComponent(ticket)}`, {
          method: "POST",
          body,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.ok) {
          setState({
            kind: "error",
            // The server's message is written for a person; showing it beats
            // replacing it with a generic failure.
            message: payload?.error ?? `The upload failed (HTTP ${response.status}).`,
            hint: payload?.hint,
          });
          return;
        }

        setState({
          kind: "done",
          url: payload.url,
          alt: payload.alt,
          width: payload.width ?? 1200,
          height: payload.height ?? 630,
        });
      } catch {
        setState({
          kind: "error",
          message: "The upload could not be sent. Check your connection and try again.",
        });
      }
    },
    [ticket],
  );

  const pick = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) void send(file);
    },
    [send],
  );

  if (state.kind === "done") {
    return (
      <div className="drop__done">
        <p className="drop__ok">Cover attached</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- the URL is on a
            storage origin that next/image is not configured for, and this is a
            one-off confirmation view rather than page content. */}
        <img className="drop__preview" src={state.url} alt={state.alt} width={state.width} height={state.height} />
        <p className="drop__alt">{state.alt}</p>
        <p className="drop__hint">
          Tell your assistant it is done — it will call <code>upload_cover_image</code>
          {" "}with the same ticket to pick this up, then finish the draft.
        </p>
      </div>
    );
  }

  const sending = state.kind === "sending";

  return (
    <div className="drop__zone-wrap">
      <div
        className={`drop__zone${over ? " is-over" : ""}${sending ? " is-busy" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (!sending) pick(event.dataTransfer.files);
        }}
      >
        <input
          ref={input}
          id="cover-file"
          className="drop__input"
          type="file"
          accept={ACCEPT}
          disabled={sending}
          onChange={(event) => pick(event.target.files)}
        />
        <label className="drop__label" htmlFor="cover-file">
          {sending ? `Uploading ${state.name}…` : "Drop the image here, or choose a file"}
        </label>
        <p className="drop__types">PNG, JPEG, or WebP &middot; up to 5 MB</p>
      </div>

      {state.kind === "error" ? (
        <p className="drop__error" role="alert">
          {state.message}
          {state.hint ? <span className="drop__error-hint">{state.hint}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
