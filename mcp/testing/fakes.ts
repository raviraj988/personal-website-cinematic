/**
 * Fakes for the two injected boundaries.
 *
 * ## Why these are `.ts` when the tests that use them are `.mjs`
 *
 * The assertions live in `scripts/test-mcp-*.mjs`, matching how every other suite
 * in this repository is written. But an untypechecked fake is a fake that can
 * drift from the interface it stands in for — and the failure mode is a green test
 * suite proving something about a shape the real code no longer has. Keeping the
 * fakes here, in TypeScript, means `npm run typecheck` fails the moment
 * `ImageProvider` or `BlogStore` changes and a fake does not.
 *
 * ## No fake makes a network call, and none can
 *
 * That is the point of the file. `openai` is imported by exactly one module in
 * this server, and nothing here or in `cover-source.ts` imports that module — so
 * a test cannot reach a paid endpoint even by accident.
 *
 * Every fake records its calls, because "the provider was **not** called" is the
 * single most important assertion in the cover matrix: when an explicit
 * `imageUrl` succeeds, generation must not happen, and only a call count can show
 * that.
 */
import sharp from "sharp";

import type {
  BlogStore,
  DraftInput,
  ImageFetcher,
  ImageProvider,
  ImageRequest,
  ImageResult,
  LinkablePost,
  PostListItem,
} from "../ports";
import type { CoverMime } from "../../src/lib/blog/image";

/* ------------------------------------------------------------- test images */

/**
 * A real, decodable image of arbitrary size.
 *
 * Generated with sharp rather than checked in as a fixture so a test can ask for
 * a portrait, a square, or something absurdly large without carrying binaries in
 * the repository — and so the normaliser is exercised against genuine encoded
 * bytes rather than a handcrafted header.
 */
export async function testImage(
  width = 1600,
  height = 900,
  format: "png" | "jpeg" | "webp" = "png",
): Promise<Uint8Array> {
  const base = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 24, g: 61, b: 42 },
    },
  });

  const buffer =
    format === "png"
      ? await base.png().toBuffer()
      : format === "webp"
        ? await base.webp().toBuffer()
        : await base.jpeg().toBuffer();

  return new Uint8Array(buffer);
}

/** Bytes that pass magic-byte sniffing and then fail to decode. */
export function truncatedPng(): Uint8Array {
  const header = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return new Uint8Array([...header, ...new Array(64).fill(0x00)]);
}

/** An SVG, which must be refused by name rather than falling through. */
export function svgBytes(): Uint8Array {
  return new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
  );
}

/* ---------------------------------------------------------- image providers */

export type RecordingProvider = ImageProvider & {
  calls: ImageRequest[];
  callCount: () => number;
};

function recording(id: string, respond: () => Promise<ImageResult>): RecordingProvider {
  const calls: ImageRequest[] = [];
  return {
    id,
    calls,
    callCount: () => calls.length,
    async generate(request) {
      calls.push(request);
      return respond();
    },
  };
}

/** Generation succeeds, returning a real decodable image. */
export function workingProvider(width = 1536, height = 1024): RecordingProvider {
  return recording("fake-working", async () => ({
    ok: true,
    bytes: await testImage(width, height, "png"),
  }));
}

/** No API key. Must fall back, never error. */
export function absentKeyProvider(): RecordingProvider {
  return recording("fake-absent-key", async () => ({ ok: false, kind: "no-key" }));
}

export function timeoutProvider(): RecordingProvider {
  return recording("fake-timeout", async () => ({ ok: false, kind: "timeout" }));
}

export function erroringProvider(detail = "429 rate limited"): RecordingProvider {
  return recording("fake-error", async () => ({
    ok: false,
    kind: "provider-error",
    detail,
  }));
}

export function emptyProvider(): RecordingProvider {
  return recording("fake-empty", async () => ({ ok: false, kind: "empty" }));
}

/** Returns bytes that sniff as PNG and then will not decode. */
export function corruptProvider(): RecordingProvider {
  return recording("fake-corrupt", async () => ({ ok: true, bytes: truncatedPng() }));
}

/** Returns an SVG, which the sniffer must refuse. */
export function svgProvider(): RecordingProvider {
  return recording("fake-svg", async () => ({ ok: true, bytes: svgBytes() }));
}

/**
 * A provider that throws instead of returning a failure.
 *
 * `ImageProvider.generate` is documented as never throwing, so this exists to
 * prove the pipeline is not relying on that promise being kept — a provider that
 * throws is a bug, and a bug should not take a draft down with it.
 */
export function throwingProvider(): RecordingProvider {
  return recording("fake-throwing", async () => {
    throw new Error("the provider threw instead of returning a failure");
  });
}

/* ------------------------------------------------------------ image fetchers */

export type RecordingFetcher = ImageFetcher & {
  urls: string[];
  callCount: () => number;
};

function recordingFetcher(
  respond: (url: string) => Promise<{ ok: true; bytes: Uint8Array } | { ok: false; reason: string }>,
): RecordingFetcher {
  const urls: string[] = [];
  return {
    urls,
    callCount: () => urls.length,
    async fetch(url) {
      urls.push(url);
      return respond(url);
    },
  };
}

export function workingFetcher(width = 2000, height = 1200): RecordingFetcher {
  return recordingFetcher(async () => ({
    ok: true,
    bytes: await testImage(width, height, "jpeg"),
  }));
}

export function failingFetcher(reason = "The URL returned HTTP 404."): RecordingFetcher {
  return recordingFetcher(async () => ({ ok: false, reason }));
}

export function corruptFetcher(): RecordingFetcher {
  return recordingFetcher(async () => ({ ok: true, bytes: truncatedPng() }));
}

/** A fetcher that must never be reached. Calling it is the failure. */
export function forbiddenFetcher(): RecordingFetcher {
  return recordingFetcher(async () => {
    throw new Error("the fetcher was called when it should not have been");
  });
}

/* ------------------------------------------------------------------- stores */

export type FakeStore = BlogStore & {
  drafts: (DraftInput & { id: string })[];
  uploads: { slug: string; bytes: number; contentType: CoverMime; path: string }[];
  uploadShouldFail: boolean;
};

/**
 * An in-memory `BlogStore`.
 *
 * Note what it does *not* have: any way to publish. It satisfies `BlogStore`,
 * and `BlogStore` has no such member, so a test cannot accidentally establish
 * that publishing works — there is nothing to call.
 */
export function fakeStore(seed: { posts?: PostListItem[]; linkable?: LinkablePost[] } = {}): FakeStore {
  const posts = [...(seed.posts ?? [])];
  const drafts: (DraftInput & { id: string })[] = [];
  const uploads: FakeStore["uploads"] = [];

  const store: FakeStore = {
    drafts,
    uploads,
    uploadShouldFail: false,

    async resolveAuthorId() {
      return "00000000-0000-4000-8000-000000000001";
    },

    async listPosts(query = {}) {
      return posts.filter(
        (post) =>
          (!query.category || post.category === query.category) &&
          (!query.status || post.status === query.status),
      );
    },

    async slugExists(slug) {
      return posts.some((post) => post.slug === slug) || drafts.some((d) => d.slug === slug);
    },

    async linkableContent() {
      return [...(seed.linkable ?? [])];
    },

    async createDraft(input) {
      if (await store.slugExists(input.slug)) {
        throw new Error(`The slug "${input.slug}" is already taken.`);
      }
      const id = `00000000-0000-4000-8000-${String(drafts.length + 1).padStart(12, "0")}`;
      drafts.push({ ...input, id });
      return { id, slug: input.slug };
    },

    async uploadCover(bytes, slug, meta) {
      if (store.uploadShouldFail) {
        throw new Error("Could not upload the cover: storage is unavailable.");
      }
      const path = `covers/${slug}-faked0.${meta.ext}`;
      uploads.push({
        slug,
        bytes: bytes.byteLength,
        contentType: meta.contentType,
        path,
      });
      return { url: `https://fake.storage.test/${path}`, path };
    },
  };

  return store;
}
