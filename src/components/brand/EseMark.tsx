import Image from "next/image";

/**
 * ESE's marks, as the artwork ESE supplied.
 *
 * THIS USED TO BE TRACED SVG. `mark-paths.ts` carried the outline as vector
 * paths and painted the shield's three bands as three FLAT colours from
 * `--ese-band-*`. The real artwork does not have flat bands: every one of them
 * is a gradient — the sunrise runs red through orange into gold, the water is a
 * teal graduation, the leaf a green one. A flat fill cannot express that, so the
 * site was rendering a recognisable but visibly wrong version of the logo, most
 * obviously in the sunrise band, which appeared as plain yellow.
 *
 * Correctness beats the advantages the trace had (perfect scaling, `currentColor`
 * theming, a few KB). These are the supplied PNGs, resized and encoded to WebP —
 * 27-34KB each — and they are the same files ESE has in their brand folder.
 *
 * TWO TONES, BOTH RENDERED. The header sits over the hero and then turns solid
 * and light as the page scrolls, so which version is correct changes at runtime.
 * Both ship and CSS chooses, which keeps the swap free of JavaScript and instant.
 */

type MarkProps = {
  className?: string;
  /**
   * Accessible name. Omit it where the logo sits beside text that already says
   * the name — then both images are decorative and the mark is hidden.
   */
  label?: string;
  /**
   * Loads eagerly. For the header and the opening curtain, both of which paint
   * before anything else.
   *
   * Only the DEFAULT-VISIBLE tone takes it. The other variant is `display: none`
   * until a light ground calls for it, and preloading an image that is not going
   * to be shown spends the same priority the visible one needs.
   */
  priority?: boolean;
};

/** The primary lockup: emblem plus wordmark, 2.86:1 once trimmed to its ink. */
export function EseLogo({ className, label, priority }: MarkProps) {
  return (
    <span className={`ese-mark ese-mark--lockup ${className ?? ""}`.trim()}>
      <Image
        className="ese-mark__art ese-mark__art--on-dark"
        src="/brand/ese-logo-light.webp"
        alt={label ?? ""}
        width={900}
        height={315}
        priority={priority}
        aria-hidden={label ? undefined : true}
      />
      <Image
        className="ese-mark__art ese-mark__art--on-light"
        src="/brand/ese-logo-dark.webp"
        alt=""
        width={900}
        height={315}
                aria-hidden
      />
    </span>
  );
}

/**
 * The emblem alone, 1:1 — for the places the wordmark would be redundant or
 * unreadable: beside a heading that already says the name, or small.
 */
export function EseEmblem({ className, label, priority }: MarkProps) {
  return (
    <span className={`ese-mark ese-mark--emblem ${className ?? ""}`.trim()}>
      <Image
        className="ese-mark__art ese-mark__art--on-dark"
        src="/brand/ese-emblem-light.webp"
        alt={label ?? ""}
        width={520}
        height={517}
        priority={priority}
        aria-hidden={label ? undefined : true}
      />
      <Image
        className="ese-mark__art ese-mark__art--on-light"
        src="/brand/ese-emblem-dark.webp"
        alt=""
        width={520}
        height={517}
                aria-hidden
      />
    </span>
  );
}
