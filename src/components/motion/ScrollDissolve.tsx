"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type ScrollDissolveProps = {
  /** CSS selector for the section to dissolve. */
  target: string;
};

/**
 * Dissolves a section away as it scrolls, instead of letting it slide off.
 *
 * A headless component — it renders nothing and attaches its effect to an element
 * elsewhere in the page. That is deliberate: the hero is server-rendered markup
 * with real links and a real `<h1>` in it, and wrapping all of that in a client
 * component to animate its edge would push the whole thing across the server
 * boundary for no benefit.
 *
 * HOW THE EFFECT WORKS
 * --------------------
 * The section is masked with a gradient three times its own height. Only the
 * bottom third is opaque at rest, so the section looks completely normal; sliding
 * the mask's POSITION as the page scrolls drags the transparent part of the
 * gradient up over the content, and the hero erodes from the bottom edge upward
 * rather than simply leaving.
 *
 * Scrubbed against scroll rather than played on a trigger — the point is that the
 * reader is driving it, and it has to run backwards just as smoothly when they
 * scroll up.
 *
 * `-webkit-mask-position` is set alongside the standard property because Safari
 * still requires the prefix for mask on many versions, and an unprefixed-only
 * mask silently does nothing there — which would leave Safari with no dissolve
 * rather than a broken one. That is the acceptable failure, but the prefix makes
 * it moot.
 */
export function ScrollDissolve({ target }: ScrollDissolveProps) {
  useEffect(() => {
    const element = document.querySelector<HTMLElement>(target);
    if (!element) return;

    gsap.registerPlugin(ScrollTrigger);

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let tween: gsap.core.Tween | undefined;

    const start = () => {
      if (tween) return;
      element.dataset.dissolve = "on";
      /* Animating a proxy object and writing the custom property by hand, rather
         than handing GSAP the `--dissolve-position` name directly. GSAP can
         animate custom properties, but it has to guess the unit, and a mask
         position that silently resolves to `0` instead of `0%` produces no
         dissolve and no error. This is explicit and cannot drift.
         0% -> 100%, not the reverse: at 0% the mask's opaque top half covers the
         section, and sliding to 100% brings its transparent edge up over the
         content. Inverting these makes the hero start invisible. */
      const proxy = { value: 0 };
      tween = gsap.to(proxy, {
        value: 100,
        ease: "none",
        onUpdate: () => {
          element.style.setProperty("--dissolve-position", `${proxy.value}%`);
        },
        scrollTrigger: {
          trigger: element,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    };

    const stop = () => {
      tween?.scrollTrigger?.kill();
      tween?.kill();
      tween = undefined;
      /* The attribute is what switches the mask on in CSS, so removing it takes
         the mask off the element entirely rather than leaving it parked at
         whatever position the scrub had reached. */
      delete element.dataset.dissolve;
      element.style.removeProperty("--dissolve-position");
    };

    const apply = () => (query.matches ? stop() : start());

    apply();
    query.addEventListener("change", apply);
    return () => {
      query.removeEventListener("change", apply);
      stop();
    };
  }, [target]);

  return null;
}
