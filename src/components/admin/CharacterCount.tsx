"use client";

/**
 * Live character count against a field's limit.
 *
 * The limits come from `FIELD_LIMITS`, the same module the Server Action
 * validates with and a mirror of the database's CHECK constraints — so the number
 * an author is watching is the number that will actually be enforced.
 *
 * `aria-live="polite"` only once the count is over, not on every keystroke:
 * announcing "38 of 60" after each character typed makes a field unusable with a
 * screen reader.
 */
export function CharacterCount({ value, max }: { value: string; max: number }) {
  const used = value.length;
  const over = used > max;
  const close = !over && used > max * 0.9;

  return (
    <p
      className={`admin-count${over ? " admin-count--over" : ""}${
        close ? " admin-count--close" : ""
      }`}
      {...(over ? { "aria-live": "polite" as const } : {})}
    >
      {used} / {max}
      {over ? ` — ${used - max} over` : ""}
    </p>
  );
}
