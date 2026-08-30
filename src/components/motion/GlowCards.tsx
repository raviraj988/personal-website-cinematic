"use client";

import { useEffect, useRef, type ReactNode } from "react";

type GlowCardsProps = {
  children: ReactNode;
  className?: string;
};

/** How far from a card the pointer still lights it, in px beyond its edge. */
const REACH = 190;

/**
 * Proximity glow for a group of cards.
 *
 * The border lights where the pointer is, and fades up as the pointer nears the
 * card rather than snapping on at `:hover`. Cards near the cursor glow faintly,
 * the one under it glows fully — so the group reads as lit by something moving
 * across it instead of as a row of independent hover targets.
 *
 * ONE LISTENER FOR THE WHOLE GROUP, not one per card. A `pointermove` handler on
 * every card would mean N listeners and N independent state writes on a single
 * physical movement; this reads the pointer once and writes to each card from
 * that. It is also why the effect can be *proximity* at all — a per-card listener
 * only fires once the pointer is already inside the card, which is `:hover` with
 * extra steps.
 *
 * WHAT IT WRITES, and why it is CSS variables rather than classes:
 *   `--glow-x` / `--glow-y`  the pointer, in the card's own coordinate space
 *   `--glow`                 0-1, how lit this card is
 * The paint is entirely CSS. This component never touches a colour, a radius or
 * a border — it publishes where the pointer is and lets the stylesheet decide
 * what that means, so the glow can be restyled per card family without changing
 * any of this.
 *
 * Everything is written inside a rAF and only from cached rects. The rects are
 * re-measured on resize and scroll rather than per-move, because
 * `getBoundingClientRect()` on every card on every pointer event forces layout
 * and is exactly how an effect like this becomes a scroll jank bug.
 *
 * Pointer-driven, so it is inert for touch and keyboard by construction. Nothing
 * here is an affordance — the cards' own `:hover` and `:focus-within` states
 * carry the real feedback, and this only adds light.
 */
export function GlowCards({ children, className = "" }: GlowCardsProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");

    let cards: HTMLElement[] = [];
    let rects: DOMRect[] = [];
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const measure = () => {
      cards = Array.from(root.querySelectorAll<HTMLElement>("[data-glow-card]"));
      rects = cards.map((c) => c.getBoundingClientRect());
    };

    const paint = () => {
      frame = 0;
      if (!pointer) return;
      for (let i = 0; i < cards.length; i += 1) {
        const r = rects[i];
        if (!r) continue;
        /* Distance from the pointer to the card's nearest edge — 0 while the
           pointer is inside it. Clamping each axis separately is what makes this
           the true rectangle distance rather than a distance to the centre,
           which would light a wide card unevenly along its length. */
        const dx = Math.max(r.left - pointer.x, 0, pointer.x - r.right);
        const dy = Math.max(r.top - pointer.y, 0, pointer.y - r.bottom);
        const dist = Math.hypot(dx, dy);
        const strength = dist > REACH ? 0 : 1 - dist / REACH;

        cards[i].style.setProperty("--glow", strength.toFixed(3));
        /* Written even at zero strength so the highlight is already in the right
           place when the card next lights, rather than sweeping in from wherever
           the pointer last left it. */
        cards[i].style.setProperty("--glow-x", `${pointer.x - r.left}px`);
        cards[i].style.setProperty("--glow-y", `${pointer.y - r.top}px`);
      }
    };

    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    const clear = () => {
      pointer = null;
      for (const card of cards) card.style.setProperty("--glow", "0");
    };

    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", clear);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      clear();
    };

    const start = () => {
      if (motion.matches || !fine.matches) return stop();
      measure();
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", clear);
      window.addEventListener("scroll", measure, { passive: true });
      window.addEventListener("resize", measure);
    };

    start();
    motion.addEventListener("change", start);
    fine.addEventListener("change", start);
    return () => {
      motion.removeEventListener("change", start);
      fine.removeEventListener("change", start);
      stop();
    };
  }, []);

  return (
    <div className={`glow-cards ${className}`.trim()} ref={rootRef}>
      {children}
    </div>
  );
}
