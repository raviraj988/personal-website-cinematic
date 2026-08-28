"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * The opening curtain — two halves that part upward and downward off the page.
 *
 * THE ONE RULE THIS COMPONENT HAS TO OBEY
 * ---------------------------------------
 * A full-screen fixed overlay that fails to leave is a site that never loads.
 * That is a worse outcome than having no intro at all, so removal is guaranteed
 * three separate ways and only the nicest of them involves animation:
 *
 *   1. GSAP's timeline removes it on complete — the intended path.
 *   2. A hard timeout removes it regardless of whether the timeline ever ran, so
 *      a throw anywhere inside GSAP cannot strand the curtain.
 *   3. `globals.css` hides it outright under `prefers-reduced-motion` and inside
 *      `<noscript>`, neither of which depends on this file executing at all.
 *
 * The cover is rendered in the server HTML rather than mounted on the client,
 * because a curtain that appears one frame after the page has already painted is
 * not a curtain — it is a flash of content followed by a cover-up.
 */
export function LoadingCover() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    /* Note there is deliberately NO scroll lock while the curtain is up.
       Locking would mean an unlock that must run, and an unlock that must run is
       another way to strand the page — a frozen document is a worse failure than
       a reader scrolling behind a curtain that is about to leave anyway. */
    const remove = () => {
      root.style.display = "none";
    };

    /* Belt and braces (2). Long enough that it never pre-empts the real
       timeline, short enough that a stuck curtain is a blink, not a bug. */
    const failsafe = window.setTimeout(remove, 2600);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.clearTimeout(failsafe);
      remove();
      return;
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        window.clearTimeout(failsafe);
        remove();
      },
    });

    timeline
      /* The mark holds alone for a beat before anything moves. Without the hold
         the curtain is already leaving as the eye arrives and the whole gesture
         reads as a stutter. */
      .to(root.querySelector("[data-cover-mark]"), {
        opacity: 1,
        duration: 0.55,
        ease: "power2.out",
      })
      .to(root.querySelector("[data-cover-mark]"), {
        opacity: 0,
        duration: 0.35,
        ease: "power1.in",
      }, "+=0.25")
      /* The two halves leave together, in opposite directions. `yPercent` is a
         composited transform — animating `height` here would relayout the whole
         document on every frame of the intro, which is the worst possible moment
         to be doing layout. */
      .to(root.querySelector("[data-cover-half='top']"), {
        yPercent: -100,
        duration: 0.9,
        ease: "power3.inOut",
      }, "<")
      .to(root.querySelector("[data-cover-half='bottom']"), {
        yPercent: 100,
        duration: 0.9,
        ease: "power3.inOut",
      }, "<");

    return () => {
      window.clearTimeout(failsafe);
      timeline.kill();
    };
  }, []);

  return (
    <div className="loading-cover" ref={rootRef} aria-hidden="true">
      <div className="loading-cover__half" data-cover-half="top" />
      <div className="loading-cover__half" data-cover-half="bottom" />
      <div className="loading-cover__mark" data-cover-mark>
        <span>Environment Sovereignty &amp; Equity</span>
      </div>
    </div>
  );
}
