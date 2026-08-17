"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteNewsletterAction,
  publishNewsletterAction,
  unpublishNewsletterAction,
  type NewsletterFormState,
} from "@/app/admin/newsletter-actions";

const INITIAL: NewsletterFormState = { ok: false };

function ActionButton({
  label,
  pendingLabel,
  variant,
}: {
  label: string;
  pendingLabel: string;
  variant: "primary" | "quiet";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`admin-button admin-button--${variant}`}
      type="submit"
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Publish and unpublish an issue.
 *
 * Two single-purpose forms rather than a toggle, so the button always says what
 * it is about to do — same reasoning as `PublishControls`.
 *
 * Unlike a post, an issue has no publication timestamp to preserve: its
 * `issue_date` is the date printed on the issue and is set by hand in the
 * editor, so publishing and unpublishing only move `status`.
 */
export function NewsletterPublishControls({
  id,
  status,
}: {
  id: string;
  status: "draft" | "published";
}) {
  if (status === "published") {
    return (
      <form action={unpublishNewsletterAction} className="admin-publish">
        <input type="hidden" name="id" value={id} />
        <ActionButton label="Unpublish" pendingLabel="Unpublishing…" variant="quiet" />
        <p className="admin-hint">
          Removes the issue from /news. The issue itself stays where it is
          hosted — anyone holding its link can still open it.
        </p>
      </form>
    );
  }

  return (
    <form action={publishNewsletterAction} className="admin-publish">
      <input type="hidden" name="id" value={id} />
      <ActionButton label="Publish" pendingLabel="Publishing…" variant="primary" />
      <p className="admin-hint">
        Lists the issue on /news and in the landing page&apos;s news block
        immediately.
      </p>
    </form>
  );
}

function DeleteButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="admin-button admin-button--danger"
      type="submit"
      disabled={!enabled || pending}
    >
      {pending ? "Deleting…" : "Delete this issue permanently"}
    </button>
  );
}

/**
 * Deletion, gated on typing the issue's own slug — a confirm dialog is answered
 * by reflex, transcribing the slug requires having read which issue is on
 * screen. The disabled button is a convenience; the Server Action re-compares
 * the typed value against the row before deleting.
 */
export function DeleteNewsletterForm({ id, slug }: { id: string; slug: string }) {
  const [state, formAction] = useActionState(deleteNewsletterAction, INITIAL);
  const [typed, setTyped] = useState("");

  const matches = typed.trim() === slug;

  return (
    <form className="admin-danger" action={formAction}>
      <h2>Delete</h2>
      <p className="admin-hint">
        This cannot be undone. It removes the listing only — the issue itself
        stays wherever it is hosted.
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
