/**
 * Date formatting for the blog.
 *
 * Pinned to UTC on purpose. `Intl.DateTimeFormat` otherwise uses the runtime's
 * zone, which is the server's during SSR and the reader's during hydration — and
 * a post published near midnight then renders one date in the HTML and a
 * different one after hydration, which React reports as a hydration mismatch.
 */
const LONG_DATE = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "August 12, 2026". Returns null for a null timestamp so callers can omit. */
export function formatPostDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return LONG_DATE.format(date);
}

/** "Aug 12, 2026", for dense admin tables. */
export function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return SHORT_DATE.format(date);
}

/** The `datetime` attribute for a `<time>` element. */
export function machineDate(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Is this timestamp in the future? Used to label scheduled posts in admin. */
export function isFuture(iso: string | null): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}
