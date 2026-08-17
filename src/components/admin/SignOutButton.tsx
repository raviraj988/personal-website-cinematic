"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/admin/actions";

function Button() {
  const { pending } = useFormStatus();

  return (
    <button className="admin-button admin-button--quiet" type="submit" disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

/**
 * Sign-out as a form POST rather than a link.
 *
 * A GET link that ends a session can be triggered by anything that prefetches or
 * renders a URL — a crawler, an email scanner, an over-eager browser. A form
 * submission also gets Next's Server Action protections, which a bare navigation
 * does not.
 */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button />
    </form>
  );
}
