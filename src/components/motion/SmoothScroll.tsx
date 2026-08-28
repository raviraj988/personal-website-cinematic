"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

/**
 * Smooth scrolling, and the one place GSAP and Lenis are wired together.
 *
 * Mounted once from the root layout. Every other scroll-driven component on the
 * site assumes this has run.
 *
 * WHY THIS DOES NOT BREAK `lib/scroll.ts`
 * ---------------------------------------
 * The site already has a hand-rolled scroll system — one rAF pass shared by every
 * parallax image and every scrubbed heading — and it subscribes
 * to the native `scroll` event on `window`. That keeps working, because Lenis in
 * its default configuration does not fake the scroll position: it drives the real
 * document with `window.scrollTo` on each frame, so real scroll events still fire
 * and every existing subscriber sees them. Nothing in `lib/scroll.ts` had to
 * change, and the two systems are not competing for the same frame — Lenis runs
 * off GSAP's ticker, `lib/scroll.ts` off its own rAF, and both read a scroll
 * position that is genuinely the document's.
 *
 * REDUCED MOTION IS A TEARDOWN, NOT A SETTING
 * -------------------------------------------
 * Smooth scrolling is the single most intrusive thing on this page for anyone
 * who gets motion sick, and it is also the thing a user cannot escape by looking
 * away — it changes what their own scroll wheel does. So the preference does not
 * soften it, it destroys the instance outright and hands scrolling back to the
 * browser. The watcher stays live, so toggling the OS setting takes effect
 * without a reload.
 */
export function SmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;
    let tick: ((time: number) => void) | undefined;

    const start = () => {
      if (lenis) return;

      lenis = new Lenis({
        /* 1.05 is a little under Lenis's default 1.2. The default overshoots on a
           page this long — the momentum keeps running after the wheel stops and
           section boundaries sail past, which on an editorial layout reads as
           the page being slippery rather than weighty. */
        duration: 1.05,
        /* Touch devices are left alone entirely. Mobile browsers have their own
           tuned inertia and a rubber-band at the extents; layering a JS easing
           on top fights both and is the usual cause of "scrolling feels laggy on
           my phone" with libraries like this. */
        smoothWheel: true,
        syncTouch: false,
      });

      /* ScrollTrigger has to recompute on Lenis's frame, not the browser's.
         Without this every pinned section lags the content by a frame or two,
         which is exactly the tearing that makes pinning look broken. */
      lenis.on("scroll", ScrollTrigger.update);

      tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      /* GSAP drops its own delta smoothing when an external loop drives it;
         leaving it on double-smooths the input and adds perceptible latency. */
      gsap.ticker.lagSmoothing(0);
    };

    const stop = () => {
      if (tick) gsap.ticker.remove(tick);
      tick = undefined;
      lenis?.destroy();
      lenis = undefined;
      ScrollTrigger.refresh();
    };

    const apply = () => (query.matches ? stop() : start());

    apply();
    query.addEventListener("change", apply);

    return () => {
      query.removeEventListener("change", apply);
      stop();
    };
  }, []);

  return null;
}
