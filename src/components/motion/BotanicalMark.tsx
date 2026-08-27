/**
 * An original botanical line mark, used only in the ambient section backdrops
 * behind `AmbientLayer`. Decorative everywhere it appears, so always
 * presentational.
 *
 * This is scenery, not identity. ESE's actual marks live in
 * `src/components/brand/` and are the only thing that should ever stand in for
 * the organisation — this leaf is a texture in a background wash.
 *
 * A second `sprout` variant used to open the site in `PageIntro`, drawn with a
 * stroke-dash animation. It was standing in for a logo the repository did not
 * have; the real emblem does that job now, and the sprout is gone with it.
 */
export function BotanicalMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 74" role="presentation" className={className}>
      <path d="M24 3C9 21 3 40 11 55c4 8 9 13 13 15 4-2 9-7 13-15 8-15 2-34-13-52Z" />
      <path d="M24 13v56" />
    </svg>
  );
}
