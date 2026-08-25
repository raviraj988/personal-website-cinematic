import type { Metadata } from "next";

import { CoverDrop } from "@/components/admin/CoverDrop";

export const metadata: Metadata = {
  title: "Upload a cover",
  // The URL is a single-use credential. An indexed copy would be both useless
  // (it expires) and a small disclosure of how the flow works.
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ ticket: string }> };

/**
 * The human end of the out-of-band cover handoff.
 *
 * This page exists because the bridge cannot be assumed to work from the model's
 * side. A remote client is told to POST the image to its upload URL, but whether
 * it *can* make an arbitrary HTTP request depends entirely on the client — and
 * when it cannot, the alternative should not be "give up and use a title card".
 * Opening the same URL in a browser turns the ticket into a drop target, and the
 * flow completes with one drag.
 *
 * Deliberately not gated behind `/admin`: the person completing the upload may not
 * be signed in on this device, and the ticket already is the credential. It is
 * single-use, expires in fifteen minutes, and cannot choose where the object
 * lands — the storage path was fixed when an authenticated tool call minted it.
 * Adding a session check here would break the one case the page exists for while
 * adding no authority the ticket does not already carry.
 *
 * The page never reveals whether the ticket is valid. It renders the same for a
 * live ticket, an expired one, and a fabricated one; only an upload attempt gets
 * a real answer. That keeps it from being an oracle for live tickets.
 */
export default async function CoverUploadPage({ params }: PageProps) {
  const { ticket } = await params;

  return (
    <main id="main-content" className="drop">
      <div className="drop__panel">
        <p className="drop__eyebrow">ESE &middot; blog cover</p>
        <h1>Drop the generated image</h1>
        <p className="drop__lede">
          Your assistant wrote the article and made a cover for it. Drop that image
          file here and it becomes the post&rsquo;s cover — resized to 1200&times;630,
          converted to WebP, and stripped of metadata.
        </p>

        <CoverDrop ticket={ticket} />

        <ul className="drop__facts">
          <li>PNG, JPEG, or WebP. Up to 5&nbsp;MB.</li>
          <li>One upload per link, and the link expires 15 minutes after it was made.</li>
          <li>
            Nothing is published. The cover attaches to a <strong>draft</strong>,
            which stays in the console until a person publishes it.
          </li>
        </ul>
      </div>
    </main>
  );
}
