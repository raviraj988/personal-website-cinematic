/**
 * The OpenAI image provider. The only module in this server that imports `openai`.
 *
 * That isolation is deliberate and worth preserving: `cover-source.ts` holds the
 * priority matrix and depends on the `ImageProvider` interface instead of on this
 * file, so no test that exercises the matrix can reach a paid endpoint. If a
 * second module ever imports `openai`, that property is gone.
 *
 * ## Every call costs money, so nothing here retries
 *
 * `maxRetries: 0` is the important line. The SDK's default is two retries, which
 * means a request that was already failing — a bad prompt, a content refusal, a
 * model that does not exist — is billed three times before the error surfaces. An
 * explicit timeout is passed for the same reason: the default is generous, and a
 * hung request holds a paid slot open.
 *
 * ## This function never throws
 *
 * `ImageProvider.generate` is documented as returning failure rather than
 * throwing, and `cover-source.ts` relies on it: every failure here must become
 * the branded fallback, not an exception that loses the draft. So the whole body
 * is wrapped, and the catch classifies rather than rethrows.
 *
 * ## What is not returned
 *
 * No key, no headers, no base64, no raw provider object. Provider messages are
 * flattened and truncated by `sanitizeProviderMessage` before they go anywhere,
 * because an image API's error text routinely quotes the prompt back — and the
 * prompt is long, multi-line, and would otherwise land in a transcript.
 */
import OpenAI from "openai";

import type { ImageProvider, ImageRequest, ImageResult } from "./ports";
import { readEnv, readEnvOr, sanitizeProviderMessage, note } from "./lib";

export const DEFAULT_IMAGE_MODEL = "gpt-image-2";
export const DEFAULT_IMAGE_QUALITY = "medium";

/**
 * A hard stop on paid calls, independent of whether a key happens to be present.
 *
 * Belt and braces behind the structural isolation described above: if some future
 * test does end up importing this module, setting `MCP_NO_PAID_CALLS=1` in its
 * environment turns every call into a `no-key` failure rather than a charge.
 */
function paidCallsBlocked(): boolean {
  return readEnv("MCP_NO_PAID_CALLS") === "1";
}

export function imageModel(): string {
  return readEnvOr("OPENAI_IMAGE_MODEL", DEFAULT_IMAGE_MODEL);
}

export function imageQuality(): string {
  return readEnvOr("OPENAI_IMAGE_QUALITY", DEFAULT_IMAGE_QUALITY);
}

/**
 * The size the API is actually asked for.
 *
 * The Image API accepts a fixed set of sizes and 1200×630 is not among them, so
 * asking for the target directly would be an error. The nearest wide option is
 * requested and `cover-normalise.ts` crops it to 1200×630 — which it would have
 * to do anyway, since the caller may also have supplied an arbitrary URL.
 */
function apiSize(): "1536x1024" {
  return "1536x1024";
}

/** Decode the API's base64 payload. Returns null rather than throwing on junk. */
function decodeBase64(payload: string): Uint8Array | null {
  try {
    const buffer = Buffer.from(payload, "base64");
    return buffer.byteLength > 0 ? new Uint8Array(buffer) : null;
  } catch {
    return null;
  }
}

export function createOpenAiImageProvider(): ImageProvider {
  let client: OpenAI | null = null;

  return {
    id: "openai",

    async generate(request: ImageRequest): Promise<ImageResult> {
      if (paidCallsBlocked()) {
        note("MCP_NO_PAID_CALLS=1 — refusing to call the image API.");
        return { ok: false, kind: "no-key" };
      }

      const key = readEnv("OPENAI_API_KEY");
      if (!key) {
        // Not an error. A repository with no image key still drafts posts; it
        // just gets the branded cover. Saying so on stderr makes the fallback
        // legible instead of mysterious.
        note("OPENAI_API_KEY is not set — the branded cover will be used instead.");
        return { ok: false, kind: "no-key" };
      }

      try {
        client ??= new OpenAI({
          apiKey: key,
          // See the header: the default retries bill for a request that already
          // failed.
          maxRetries: 0,
          timeout: request.timeoutMs,
        });

        const response = await client.images.generate({
          model: request.model,
          prompt: request.prompt,
          size: apiSize(),
          quality: request.quality as "low" | "medium" | "high" | "auto",
          // Exactly one. Each additional image is another charge.
          n: 1,
        });

        const payload = response.data?.[0]?.b64_json;
        if (!payload) {
          return { ok: false, kind: "empty" };
        }

        const bytes = decodeBase64(payload);
        if (!bytes) {
          return { ok: false, kind: "decode" };
        }

        return { ok: true, bytes };
      } catch (error) {
        // The SDK signals a timeout as APIConnectionTimeoutError; the name check
        // also catches an AbortError from the underlying fetch.
        const name = error instanceof Error ? error.name : "";
        if (/timeout/i.test(name) || name === "AbortError") {
          return { ok: false, kind: "timeout" };
        }

        return {
          ok: false,
          kind: "provider-error",
          detail: sanitizeProviderMessage(error),
        };
      }
    },
  };
}
