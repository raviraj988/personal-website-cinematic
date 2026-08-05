/**
 * Original botanical line marks. Decorative everywhere they appear, so always
 * presentational.
 *
 * `sprout` is the opening-sequence mark, drawn with a stroke-dash animation.
 * `leaf` is the quieter form used in ambient section backdrops — the sprout
 * path closes into a heart silhouette when it sits still, which reads wrong for
 * an environmental practice.
 */
export function BotanicalMark({
  className,
  variant = "sprout",
}: {
  className?: string;
  variant?: "sprout" | "leaf";
}) {
  if (variant === "leaf") {
    return (
      <svg viewBox="0 0 48 74" role="presentation" className={className}>
        <path d="M24 3C9 21 3 40 11 55c4 8 9 13 13 15 4-2 9-7 13-15 8-15 2-34-13-52Z" />
        <path d="M24 13v56" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 68 90" role="presentation" className={className}>
      <path d="M34 84C32 58 17 47 8 30C2 18 7 5 18 7c10 2 14 14 16 25 2-11 6-23 16-25 11-2 16 11 10 23-9 17-24 28-26 54Z" />
    </svg>
  );
}
