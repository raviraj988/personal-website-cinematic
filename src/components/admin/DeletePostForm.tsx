"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deletePostAction, type PostFormState } from "@/app/admin/actions";

const INITIAL: PostFormState = { ok: false };

function DeleteButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="admin-button admin-button--danger"
      type="submit"
      disabled={!enabled || pending}
    >
      {pending ? "Deleting…" : "Delete this post permanently"}
    </button>
  );
}

/**
 * Deletion, gated on typing the post's own slug.
 *
 * A confirm dialog is answered by reflex; transcribing the slug requires having
 * read which post is on screen. That matters most in the case this is guarding
 * against — an admin with several drafts open, deleting from the wrong tab.
 *
 * The button being disabled until the text matches is a convenience, not the
 * control. The Server Action compares the typed value against the row's own slug
 * before it deletes anything.
 */
export function DeletePostForm({ id, slug }: { id: string; slug: string }) {
  const [state, formAction] = useActionState(deletePostAction, INITIAL);
  const [typed, setTyped] = useState("");

  const matches = typed.trim() === slug;

  return (
    <form className="admin-danger" action={formAction}>
      <h2>Delete</h2>
      <p className="admin-hint">
        This cannot be undone. Any links to <code>/blog/{slug}</code> will start
        returning 404.
      </p>

      <input type="hidden" name="id" value={id} />

      <div className="admin-field">
        <label htmlFor="confirmSlug">
          Type <code>{slug}</code> to confirm
        </label>
        <input
          id="confirmSlug"
          name="confirmSlug"
          type="text"
          value={typed}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setTyped(event.target.value)}
        />
      </div>

      {state.message ? (
        <p className="admin-notice admin-notice--error" role="alert">
          {state.message}
        </p>
      ) : null}

      <DeleteButton enabled={matches} />
    </form>
  );
}
