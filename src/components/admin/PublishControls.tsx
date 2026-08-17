"use client";

import { useFormStatus } from "react-dom";
import { publishPostAction, unpublishPostAction } from "@/app/admin/actions";
import { formatPostDate } from "@/lib/blog/format";

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
 * Publish and unpublish.
 *
 * Kept as two separate single-purpose forms rather than one toggle, so the button
 * always says what it is about to do. The wording about the publication date is
 * there because the behaviour is deliberate and non-obvious: the timestamp is
 * stamped once, on the first publish, and survives an unpublish.
 */
export function PublishControls({
  id,
  status,
  publishedAt,
}: {
  id: string;
  status: "draft" | "published";
  publishedAt: string | null;
}) {
  const firstPublish = publishedAt === null;

  if (status === "published") {
    return (
      <form action={unpublishPostAction} className="admin-publish">
        <input type="hidden" name="id" value={id} />
        <ActionButton
          label="Unpublish"
          pendingLabel="Unpublishing…"
          variant="quiet"
        />
        <p className="admin-hint">
          Takes the post off the blog and returns its URL to a 404. The
          publication date
          {publishedAt ? ` (${formatPostDate(publishedAt)})` : ""} is kept, so
          republishing does not re-date it.
        </p>
      </form>
    );
  }

  return (
    <form action={publishPostAction} className="admin-publish">
      <input type="hidden" name="id" value={id} />
      <ActionButton label="Publish" pendingLabel="Publishing…" variant="primary" />
      <p className="admin-hint">
        {firstPublish
          ? "Goes live immediately and is stamped with today's date."
          : `Goes live immediately, keeping its original publication date${
              publishedAt ? ` of ${formatPostDate(publishedAt)}` : ""
            }.`}
      </p>
    </form>
  );
}
