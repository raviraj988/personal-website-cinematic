"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Arrow } from "@/components/ui/Arrow";

type PinnedItem = {
  slug: string;
  title: string;
  description: string;
  image: { src: string; alt: string };
};

type PinnedStackProps = {
  items: PinnedItem[];
  hrefBase: string;
};

/** Below this the stack is an ordinary vertical list — see the CSS note. */
const PIN_QUERY = "(min-width: 60rem)";

/**
 * A pinned scroll stack: the section parks, and its panels advance under a fixed
 * viewport as the reader scrolls through a track several screens tall.
 *
 * THE SHAPE, WHICH IS THE WHOLE TRICK
 * -----------------------------------
 *   `.pinned-stack`           the TRACK. `height: calc(count * 100vh)`. It is
 *                             tall so that there is scroll distance to spend;
 *                             nothing is ever drawn in it.
 *   `.pinned-stack__viewport` `position: sticky; top: 0; height: 100vh`. Parks
 *                             for exactly as long as the track is passing.
 *   `.pinned-stack__panel`    absolutely stacked, one per item.
 *
 * No GSAP `pin: true`. ScrollTrigger's own pinning works by cloning the element
 * into a pin-spacer and taking it out of flow, which fights a `sticky` layout and
 * — more importantly here — breaks the `data-scroll-theme` observer this site
 * uses to recolour the header, because the themed section stops being where the
 * observer thinks it is. CSS sticky gives the identical result, costs nothing,
 * degrades to a plain scroll if JS never runs, and leaves ScrollTrigger doing the
 * one job it is genuinely better at: telling us how far through the track we are.
 *
 * WHY THE INDEX IS STEPPED, NOT SCRUBBED
 * --------------------------------------
 * Progress is continuous but the panel index is rounded, and the crossfade is a
 * CSS transition rather than a scrubbed tween. A directly-scrubbed opacity means
 * that whenever the reader stops — which is most of the time — they are parked on
 * a blend of two panels, reading two headings through each other. Stepping means
 * every resting state is a real, single panel.
 *
 * ACCESSIBILITY
 * -------------
 * It stays an `<ol>` of `<li>`s. The panels are stacked with `position: absolute`
 * rather than swapped in and out of the DOM, and no panel is ever
 * `display: none`, so the list is complete and in order for a screen reader and
 * for find-in-page no matter where the scroll happens to be. Only the visual
 * layer is scroll-dependent.
 */
export function PinnedStack({ items, hrefBase }: PinnedStackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    gsap.registerPlugin(ScrollTrigger);

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia(PIN_QUERY);
    let trigger: ScrollTrigger | undefined;

    const start = () => {
      if (trigger) return;
      trigger = ScrollTrigger.create({
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          /* `self.progress` runs 0 to 1 across the track. Multiplying by the
             count and flooring gives equal-length bands per panel; the clamp is
             for progress === 1 exactly, which would otherwise index past the
             end for one frame at the bottom of the track. */
          const index = Math.min(items.length - 1, Math.floor(self.progress * items.length));
          setActive(index);
        },
      });
    };

    const stop = () => {
      trigger?.kill();
      trigger = undefined;
      setActive(0);
    };

    /* Torn down below 60rem as well as under reduced motion. The CSS drops the
       track height and un-sticks the viewport at that width, so the panels are a
       normal stacked list — and a ScrollTrigger still driving `active` against a
       track that is no longer taller than its content would hide every panel but
       one. */
    const apply = () => (motion.matches || !wide.matches ? stop() : start());

    apply();
    motion.addEventListener("change", apply);
    wide.addEventListener("change", apply);
    return () => {
      motion.removeEventListener("change", apply);
      wide.removeEventListener("change", apply);
      stop();
    };
  }, [items.length]);

  return (
    <div
      className="pinned-stack"
      ref={trackRef}
      style={{ "--panel-count": items.length } as React.CSSProperties}
    >
      <ol className="pinned-stack__viewport">
        {items.map((item, index) => (
          <li
            className="pinned-stack__panel"
            /* `resting` rather than an absent attribute so the CSS can style
               both states explicitly and neither depends on specificity order. */
            data-state={index === active ? "active" : "resting"}
            data-direction={index < active ? "behind" : "ahead"}
            key={item.slug}
          >
            <div className="pinned-stack__media photo-frame">
              <Image
                src={item.image.src}
                alt={item.image.alt}
                fill
                sizes="(min-width: 60rem) 52vw, 92vw"
              />
            </div>

            <div className="pinned-stack__body">
              <span className="pinned-stack__number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Link className="button pinned-stack__cta" href={`${hrefBase}/${item.slug}`}>
                Learn more
                <span className="visually-hidden">{` about ${item.title}`}</span>
                <Arrow />
              </Link>
            </div>
          </li>
        ))}
      </ol>

      {/* The progress index, echoing the filmstrip under `ScrollGallery`.
          Decorative — it restates scroll position, which is not information a
          non-sighted reader is missing. */}
      <div className="pinned-stack__ticks" aria-hidden="true">
        {items.map((item, index) => (
          <span
            className="pinned-stack__tick"
            data-state={index === active ? "active" : "resting"}
            key={item.slug}
          />
        ))}
      </div>
    </div>
  );
}
