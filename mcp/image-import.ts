/**
 * Importing a cover from a URL somebody else chose.
 *
 * ## This is the SSRF surface, and the "somebody else" is a language model
 *
 * `generate_cover_image` accepts an `imageUrl` and fetches it **from this
 * process**, which sits on a developer's machine or a CI runner with whatever
 * network access that host has. A server-side fetch of an attacker-influenced URL
 * is the textbook SSRF primitive, and the standard target is cloud instance
 * metadata at `http://169.254.169.254/`, which on many providers returns
 * credentials to anything that asks. A model that has read a poisoned web page or
 * a poisoned topic brief is exactly the sort of caller that would pass such a URL
 * along without malice.
 *
 * So the guard is structured around one rule: **decide on the resolved IP
 * addresses, not on the hostname.** A hostname allowlist is not a defence —
 * `metadata.attacker.example` can have an A record of `169.254.169.254`, and
 * nothing about the string reveals that. `dns.lookup` first, then a verdict on
 * every address it returned.
 *
 * ## The residual hole, stated rather than papered over
 *
 * This resolves, then fetches, and the fetch resolves again. Between the two, DNS
 * can change its answer — classic rebinding — so a determined attacker with
 * control of a nameserver can still get one request through to an address this
 * would have refused. Closing that properly means resolving once and connecting
 * to the pinned IP with the original hostname in the `Host` header and SNI, which
 * `fetch` does not expose.
 *
 * It is left open deliberately, because of what the request can actually
 * accomplish: no redirects are followed, the response is capped at a few
 * megabytes, and the bytes are then required to pass magic-byte sniffing and a
 * sharp decode. A metadata endpoint returns JSON, which fails both. The
 * information available to an attacker is therefore "did this fetch succeed",
 * which is a much smaller prize than "here is the response body". Worth knowing
 * about; not worth a hand-rolled HTTP client.
 *
 * ## And it falls forward
 *
 * Every rejection here returns a reason and the pipeline moves on to generation.
 * Being strict costs a caller nothing except a cover they did not need to supply.
 */
import { lookup } from "node:dns/promises";
import { COVER_MAX_BYTES } from "../src/lib/blog/image";
import type { ImageFetcher } from "./ports";

const FETCH_TIMEOUT_MS = 12_000;

/** A resolved address, in the shape `dns.lookup(host, { all: true })` returns. */
export type ResolvedAddress = { address: string; family: number };

/**
 * Is every one of these addresses safe to fetch from?
 *
 * Pure, exported, and separately tested. The whole point of splitting it out is
 * that the interesting logic — which ranges are refused — can be asserted over a
 * table of literal addresses without touching DNS or the network.
 *
 * Deny-by-default: an address this cannot parse is refused rather than allowed.
 */
export function isPublicAddress(
  addresses: ResolvedAddress[],
): { ok: true } | { ok: false; reason: string } {
  if (addresses.length === 0) {
    return { ok: false, reason: "The hostname did not resolve." };
  }

  for (const entry of addresses) {
    const verdict = classify(entry.address);
    if (verdict) {
      return {
        ok: false,
        // The category, not the address. Echoing the resolved IP back turns this
        // into a DNS oracle for internal names.
        reason: `The URL resolves to ${verdict}, which this server will not fetch.`,
      };
    }
  }

  return { ok: true };
}

/** The reason an address is refused, or null when it is fine. */
function classify(address: string): string | null {
  const value = address.toLowerCase().trim();

  // IPv6-mapped IPv4 (`::ffff:169.254.169.254`) would otherwise slip past the v4
  // checks entirely by not looking like a v4 address.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(value);
  if (mapped) return classify(mapped[1]);

  if (value.includes(":")) return classifyV6(value);
  return classifyV4(value);
}

function classifyV4(address: string): string | null {
  const parts = address.split(".");
  if (parts.length !== 4) return "an address this server could not parse";

  const octets = parts.map((part) => Number(part));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return "an address this server could not parse";
  }

  const [a, b] = octets;

  if (a === 0) return "the unspecified range";
  if (a === 10) return "a private network (10/8)";
  if (a === 127) return "loopback";
  if (a === 100 && b >= 64 && b <= 127) return "carrier-grade NAT (100.64/10)";
  if (a === 169 && b === 254) return "link-local — cloud instance metadata lives here";
  if (a === 172 && b >= 16 && b <= 31) return "a private network (172.16/12)";
  if (a === 192 && b === 168) return "a private network (192.168/16)";
  if (a === 192 && b === 0) return "a reserved range (192.0.0/24 and 192.0.2/24)";
  if (a === 198 && (b === 18 || b === 19)) return "a benchmarking range (198.18/15)";
  if (a === 198 && b === 51) return "a documentation range (198.51.100/24)";
  if (a === 203 && b === 0) return "a documentation range (203.0.113/24)";
  if (a >= 224 && a <= 239) return "multicast";
  if (a >= 240) return "a reserved range (240/4 and broadcast)";

  return null;
}

function classifyV6(address: string): string | null {
  const value = address.replace(/^\[|\]$/g, "");

  if (value === "::" || value === "::0") return "the unspecified address";
  if (value === "::1") return "IPv6 loopback";

  const head = value.split(":")[0] ?? "";
  const leading = parseInt(head || "0", 16);

  // fc00::/7 — unique local. fe80::/10 — link-local.
  if (!Number.isNaN(leading)) {
    if ((leading & 0xfe00) === 0xfc00) return "an IPv6 unique-local address (fc00::/7)";
    if ((leading & 0xffc0) === 0xfe80) return "an IPv6 link-local address (fe80::/10)";
    if ((leading & 0xff00) === 0xff00) return "IPv6 multicast";
  }

  // 64:ff9b::/96 wraps a v4 address, so the v4 rules must apply to it.
  const embedded = /(\d+\.\d+\.\d+\.\d+)$/.exec(value);
  if (embedded) return classifyV4(embedded[1]);

  return null;
}

export type ImportOutcome =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: string };

/**
 * Fetch a cover from a URL, with the guard applied.
 *
 * The checks run in cheapest-first order so an obviously bad URL costs no DNS
 * query and no socket.
 */
export async function importImage(rawUrl: string): Promise<ImportOutcome> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "That is not a valid URL." };
  }

  // HTTPS only. Plain HTTP would let anything on the path swap the image, and
  // `file:`, `gopher:` and friends are how a fetch becomes a local file read.
  if (url.protocol !== "https:") {
    return {
      ok: false,
      reason: `Only https: URLs can be imported (got ${url.protocol.replace(":", "") || "no scheme"}).`,
    };
  }

  if (url.username || url.password) {
    return { ok: false, reason: "A URL with embedded credentials will not be fetched." };
  }

  let resolved: ResolvedAddress[];
  try {
    resolved = await lookup(url.hostname, { all: true });
  } catch {
    return { ok: false, reason: "That hostname did not resolve." };
  }

  const verdict = isPublicAddress(resolved);
  if (!verdict.ok) return verdict;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      // Manual, and then refused. Following a redirect would re-run the whole
      // fetch against a new URL that never went through the guard above — which
      // is the simplest way to defeat an address check.
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: "image/jpeg,image/png,image/webp" },
    });

    if (response.status >= 300 && response.status < 400) {
      return {
        ok: false,
        reason: `The URL redirects (${response.status}). Redirects are not followed — supply the final URL.`,
      };
    }

    if (!response.ok) {
      return { ok: false, reason: `The URL returned HTTP ${response.status}.` };
    }

    // Advisory: a declared length over the cap saves reading the body at all. A
    // missing or lying header is handled by the streaming cap below, which is
    // the check that actually holds.
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > COVER_MAX_BYTES) {
      return { ok: false, reason: `The image declares ${declared} bytes, over the 5 MB limit.` };
    }

    const bytes = await readCapped(response, COVER_MAX_BYTES);
    if (!bytes.ok) return bytes;

    // Note what is *not* consulted: the URL's extension and the response's
    // Content-Type. Both are supplied by the same party that supplied the bytes.
    // Sniffing happens in `normaliseCover`, on the bytes themselves.
    return { ok: true, bytes: bytes.bytes };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, reason: `The URL did not respond within ${FETCH_TIMEOUT_MS / 1000}s.` };
    }
    return { ok: false, reason: "The URL could not be fetched." };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read the body, stopping at the cap.
 *
 * Streamed rather than `arrayBuffer()`: the point of a limit is not to discover
 * afterwards that 900 MB arrived. This aborts as soon as the cap is crossed.
 */
async function readCapped(
  response: Response,
  cap: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; reason: string }> {
  const reader = response.body?.getReader();
  if (!reader) return { ok: false, reason: "The response had no body." };

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > cap) {
      await reader.cancel();
      return { ok: false, reason: "The image is over the 5 MB limit." };
    }
    chunks.push(value);
  }

  if (total === 0) return { ok: false, reason: "The URL returned an empty body." };

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes: out };
}

/** The real fetcher, as an `ImageFetcher`. */
export const httpsImageFetcher: ImageFetcher = {
  fetch: importImage,
};
