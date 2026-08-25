/**
 * Where a cover comes from when the *server* is producing it, in priority order.
 *
 *   1. `imageUrl`, if one was supplied — import it.
 *   2. Generated artwork — the default when nothing was supplied.
 *   3. The ESE-branded typographic card — the last resort only.
 *
 * ## This is now the fallback, not the main road
 *
 * `mcp/cover-upload.ts` is the preferred path: the client draws the cover with the
 * article in front of it and hands over the file. This module exists for clients
 * that cannot draw, and for the case where that upload failed. So the full order
 * across both modules is:
 *
 *   1. `upload_cover_image` — client-generated artwork.
 *   2. this file's steps 1–2 — imported or server-generated artwork.
 *   3. this file's step 3 — the branded card.
 *
 * The third must never be the *normal* result of omitting `imageUrl`. A run of
 * drafts coming back `composed-brand-cover` means generation is broken, and the
 * response says so via `attemptedSource` and `reason` rather than quietly
 * shipping a title card.
 *
 * ## Everything is injected
 *
 * Both boundaries — the image provider and the URL fetcher — arrive as `CoverDeps`
 * so the whole matrix is one function over a table of fakes. That is what makes
 * "no test ever makes a paid request" a structural property rather than a
 * discipline: nothing in this file imports `openai`, so no test that imports this
 * file can reach it.
 *
 * ## Only an upload failure is an error
 *
 * Every generation and import failure falls through to the next source. Storage
 * is different: without a URL there is nothing to attach to the draft either way,
 * so an upload failure is returned as a failure. Even then it does not block
 * `create_draft` — `cover_image_url` is nullable and a coverless draft is valid.
 */
import type { CoverDeps, ImageFailure } from "./ports";
import type { RegisteredSite } from "./site";
import { normaliseCover } from "./cover-normalise";
import { composeBrandCover, brandCoverAlt } from "./cover-brand";
import { COVER } from "./brand";

export const IMAGE_TIMEOUT_MS = 90_000;

export type CoverRequest = {
  site: RegisteredSite;
  title: string;
  /** The topic line for the branded card, and subject context for the prompt. */
  eyebrow: string;
  slug: string;
  /** Supplied by the caller: import this instead of generating. */
  imageUrl?: string;
  /** Extra subject direction. Never relaxes the prohibitions below. */
  imagePrompt?: string;
  /** Alt text for imported or generated artwork. Ignored on the branded card. */
  imageAlt?: string;
  model: string;
  quality: string;
};

export type CoverSource = "imported-image" | "generated-image" | "composed-brand-cover";

export type CoverOutcome =
  | {
      ok: true;
      source: CoverSource;
      url: string;
      path: string;
      alt: string;
      width: number;
      height: number;
      format: "webp";
      fellBackToBrandCover: boolean;
      /** Set when an earlier, higher-priority source failed. */
      attemptedSource?: CoverSource;
      reason?: string;
      /** Set when an explicit `imageUrl` failed but generation rescued it. */
      warning?: string;
    }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ prompts */

/**
 * The prohibitions, as prose the model reads.
 *
 * The Indigenous-representation clause is the one that matters most here and is
 * not a matter of taste. ESE serves Native Nations, and `ese-content.ts` already
 * carries the site's own rule on this: *"anywhere a person is visible, the
 * photograph must be real,"* because illustrating this work with generated people
 * "would misrepresent both those communities and ESE's record, on the website of
 * the organization serving them." A generated river makes no such claim; a
 * generated person in regalia makes several, all of them false. So the ban is
 * broader than "no real people" — it covers the whole visual-trope space, because
 * a generic "Native American" illustration is exactly what an image model reaches
 * for when told the subject is Tribal environmental work.
 */
const PROHIBITIONS = [
  "no text, letters, numbers, captions, or lettering of any kind",
  "no logos, wordmarks, emblems, or anything resembling a real organisation's identity",
  "no watermarks or signatures",
  "no charts, graphs, dashboards, maps with data, or anything implying a specific statistic or outcome",
  "no recognisable real people and no portraits",
  "no depictions of identifiable Indigenous people, regalia, ceremony, dancing, drums, feathers, headdresses, tipis, totems, sacred sites, or any generic 'Native American' visual motif",
  "no science fiction, cyberpunk, neon, holograms, or futuristic technology",
  "no stock-photo clichés: no handshakes, no rising arrows, no lightbulbs, no jigsaw pieces, no globes held in hands",
  "no aerial drone-shot cliché of a winding road through forest",
];

const SUBJECTS = [
  "land, water, and weather at human scale",
  "working infrastructure: a monitoring station, a culvert, a well head, a treatment plant, a boardwalk over wetland",
  "documentary interiors: an empty meeting room set up for a hearing, a table with paperwork and a jug of water",
  "fieldwork traces without people: a sampling kit on a riverbank, survey markers, a parked truck at a site gate",
];

export function buildImagePrompt(request: CoverRequest): string {
  const { site, title, eyebrow, imagePrompt } = request;

  return [
    `A restrained documentary editorial illustration for an article titled "${title}".`,
    `Topic: ${eyebrow}. Context: ${site.role}.`,
    ``,
    `Subject matter — choose one and commit to it:`,
    ...SUBJECTS.map((subject) => `  - ${subject}`),
    ``,
    imagePrompt ? `Additional direction from the editor: ${imagePrompt}` : "",
    imagePrompt ? `` : "",
    `Treatment: muted, natural light. A deep-green and cream palette, the colour of`,
    `temperate forest and paper. Composition calm and horizontal, with open space —`,
    `this is a wide banner, not a poster. Photographic or restrained gouache, never`,
    `glossy 3D render and never illustration-with-a-mascot.`,
    ``,
    `If any human figure appears at all it must be distant, incidental, turned away,`,
    `and not ethnically characterised. Prefer no people.`,
    ``,
    `Hard constraints, all of which override the direction above:`,
    ...PROHIBITIONS.map((rule) => `  - ${rule}`),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Alt text, derived rather than asked for.
 *
 * The image model is never asked to describe its own output. It would describe
 * what it *intended* to draw, which is a different thing from what it drew, and
 * confidently wrong alt text is worse than a plain factual sentence for exactly
 * the readers who depend on it. A caller-supplied `imageAlt` wins because a
 * person looked at the picture.
 */
function altForArtwork(request: CoverRequest): string {
  const supplied = request.imageAlt?.trim();
  if (supplied) return supplied;
  return `Editorial illustration representing “${request.title}”.`;
}

function describeFailure(failure: ImageFailure): string {
  switch (failure.kind) {
    case "no-key":
      return "OPENAI_API_KEY is not set, so no artwork could be generated.";
    case "timeout":
      return "The image provider timed out.";
    case "provider-error":
      return `The image provider failed: ${failure.detail}`;
    case "empty":
      return "The image provider returned no image.";
    case "decode":
      return "The image provider returned data that could not be decoded as an image.";
  }
}

/* -------------------------------------------------------------- the matrix */

export async function resolveCover(
  request: CoverRequest,
  deps: CoverDeps,
): Promise<CoverOutcome> {
  const attempts: { source: CoverSource; reason: string }[] = [];

  /* --------------------------------------------------------- 1. explicit URL */

  if (request.imageUrl && request.imageUrl.trim().length > 0) {
    const fetched = await deps.fetcher.fetch(request.imageUrl.trim());

    if (fetched.ok) {
      const normalised = await normaliseCover(fetched.bytes);
      if (normalised.ok) {
        return upload(request, deps, normalised.cover, "imported-image", altForArtwork(request), {});
      }
      attempts.push({ source: "imported-image", reason: normalised.reason });
    } else {
      attempts.push({ source: "imported-image", reason: fetched.reason });
    }
  }

  /* ---------------------------------------------------------- 2. generation */

  const generated = await deps.provider.generate({
    prompt: buildImagePrompt(request),
    model: request.model,
    quality: request.quality,
    size: `${COVER.width}x${COVER.height}`,
    timeoutMs: IMAGE_TIMEOUT_MS,
  });

  if (generated.ok) {
    const normalised = await normaliseCover(generated.bytes);
    if (normalised.ok) {
      const importFailure = attempts.find((a) => a.source === "imported-image");
      return upload(
        request,
        deps,
        normalised.cover,
        "generated-image",
        altForArtwork(request),
        importFailure
          ? {
              warning: `The supplied imageUrl was unusable (${importFailure.reason}) so artwork was generated instead.`,
            }
          : {},
      );
    }
    attempts.push({ source: "generated-image", reason: normalised.reason });
  } else {
    attempts.push({ source: "generated-image", reason: describeFailure(generated) });
  }

  /* ------------------------------------------------------- 3. branded card */

  const brandInput = {
    title: request.title,
    eyebrow: request.eyebrow || request.site.shortName,
    wordmark: request.site.name,
  };

  const branded = await composeBrandCover(brandInput);
  if (!branded.ok) {
    return {
      ok: false,
      error: `Every cover source failed. ${attempts
        .map((a) => `${a.source}: ${a.reason}`)
        .join(" ")} Branded fallback: ${branded.reason}`,
    };
  }

  const last = attempts[attempts.length - 1];
  return upload(
    request,
    deps,
    branded.cover,
    "composed-brand-cover",
    // Not `altForArtwork`: a caller-supplied alt describes artwork that was
    // never produced, so on this path it describes the wrong image.
    brandCoverAlt(brandInput),
    {
      attemptedSource: last?.source,
      reason: attempts.map((a) => a.reason).join(" "),
    },
  );
}

async function upload(
  request: CoverRequest,
  deps: CoverDeps,
  cover: { bytes: Uint8Array; width: number; height: number; ext: "webp"; contentType: "image/webp" },
  source: CoverSource,
  alt: string,
  extra: { attemptedSource?: CoverSource; reason?: string; warning?: string },
): Promise<CoverOutcome> {
  try {
    const { url, path } = await deps.store.uploadCover(cover.bytes, request.slug, {
      ext: cover.ext,
      contentType: cover.contentType,
    });

    return {
      ok: true,
      source,
      url,
      path,
      alt,
      width: cover.width,
      height: cover.height,
      format: "webp",
      fellBackToBrandCover: source === "composed-brand-cover",
      ...extra,
    };
  } catch (error) {
    // The one failure that is an error rather than a fallback: with no storage
    // there is no URL to attach whichever source produced the bytes.
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The cover could not be stored.",
    };
  }
}
