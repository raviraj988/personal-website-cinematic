/**
 * Where the real implementations get wired to the interfaces.
 *
 * This is the only module that knows both halves: it imports the Supabase
 * adapter and the OpenAI provider, and hands them to code that only ever sees
 * `BlogStore` and `ImageProvider`. Keeping the wiring in one small file is what
 * lets every other module be tested with fakes.
 *
 * Resolved lazily and memoised, never at module scope — see the note at the top
 * of `mcp/lib.ts`. Constructing a Supabase client at import time would turn a
 * missing environment variable into an unreportable module-evaluation throw.
 */
import type { BlogStore, CoverDeps, ImageFetcher, ImageProvider } from "./ports";
import { supabaseStore } from "./adapters/supabase";
import { createOpenAiImageProvider, imageModel, imageQuality } from "./image-generate";
import { httpsImageFetcher } from "./image-import";

export type ServerDeps = {
  store: BlogStore;
  provider: ImageProvider;
  fetcher: ImageFetcher;
  model: string;
  quality: string;
};

let cached: ServerDeps | null = null;

export function getDeps(): ServerDeps {
  if (cached) return cached;

  cached = {
    store: supabaseStore,
    provider: createOpenAiImageProvider(),
    fetcher: httpsImageFetcher,
    model: imageModel(),
    quality: imageQuality(),
  };
  return cached;
}

/** The narrowed slice the cover pipeline gets — it cannot insert a row. */
export function coverDeps(deps: ServerDeps): CoverDeps {
  return {
    provider: deps.provider,
    fetcher: deps.fetcher,
    store: { uploadCover: deps.store.uploadCover },
  };
}
