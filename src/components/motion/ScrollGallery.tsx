"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { onScrollFrame, watchReducedMotion } from "@/lib/scroll";

type GalleryImage = { src: string; alt: string };

type ScrollGalleryProps = {
  images: GalleryImage[];
  sizes?: string;
  className?: string;
};

/**
 * A stack of photographs that changes as the section scrolls past.
 *
 * Two things move, and they are deliberately different in kind:
 *
 *   - the STACK cross-dissolves from one photograph to the next, stepped, at
 *     fixed points in the section's travel;
 *   - the IMAGE inside the frame drifts continuously against that travel.
 *
 * The step is what makes the change legible — a continuously-blended stack sits
 * at a muddy 50/50 of two pictures whenever the reader stops scrolling, which is
 * most of the time. The drift is what stops the stepped version reading as a
 * slideshow: between swaps there is still something alive in the frame.
 *
 * ON THE PAIRING — the swap is driven by the section's scroll position and is
 * NOT synchronised to the audience list beside it. That is a correctness
 * requirement, not a simplification. Three of these photographs are public-domain
 * USGS images (see `public/images/ese/COMMUNITY_IMAGE_SOURCES.md`), which state
 * that they "must not be presented as ESE clients or ESE-led work". Advancing an
 * image in lockstep with a row reading "Tribal consortia" would caption a real
 * photograph of real people with a claim about who they are. Decoupled, the
 * gallery says only what it is: photographs of the kind of rooms and fields this
 * list describes.
 *
 * Every layer stays in the DOM with its own alt text rather than being swapped
 * in and out, so a screen reader gets all four descriptions regardless of scroll
 * position — which is also what makes the reduced-motion path below safe.
 */
export function ScrollGallery({ images, sizes = "100vw", className = "" }: ScrollGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    const frame = frameRef.current;
    if (!track || !frame) return;

    let stopScroll: (() => void) | undefined;

    const update = () => {
      /* The TRACK is measured, never the frame. The frame is `position: sticky`,
         so once it parks its rect stops moving relative to the viewport and any
         progress read from it flatlines exactly when the gallery should be
         working hardest. The track is the frame's full-height, non-sticky
         parent and travels normally. */
      const rect = track.getBoundingClientRect();
      const travel = window.innerHeight + rect.height;
      const raw = (window.innerHeight - rect.top) / travel;

      /* Held at both ends. Raw viewport progress spends its first and last
         fifth with the section barely on screen, so a straight mapping burns
         two of four photographs on a section the reader cannot see yet. */
      const progress = Math.max(0, Math.min(1, (raw - 0.18) / 0.64));
      setActive(Math.min(images.length - 1, Math.floor(progress * images.length)));

      /* Drift is applied to the image inside the frame, not to the frame, which
         is sticky — translating a parked element fights the parking. */
      const centre = rect.top + rect.height / 2 - window.innerHeight / 2;
      const shift = Math.max(-20, Math.min(20, centre * -0.035));
      frame.style.setProperty("--gallery-drift", `${shift.toFixed(2)}px`);
    };

    const stopMotionWatch = watchReducedMotion((reduced) => {
      if (reduced) {
        stopScroll?.();
        stopScroll = undefined;
        frame.style.removeProperty("--gallery-drift");
        /* Rests on the first photograph. The other three are still in the DOM
           and still described, so nothing becomes unreachable — they simply
           stop being animated onto the screen. */
        setActive(0);
        return;
      }
      stopScroll ??= onScrollFrame(update);
    });

    return () => {
      stopMotionWatch();
      stopScroll?.();
    };
  }, [images.length]);

  return (
    <div className={`scroll-gallery ${className}`.trim()} ref={trackRef}>
      <div className="scroll-gallery__frame" ref={frameRef}>
        <figure className="scroll-gallery__stack photo-frame photo-frame--plate">
          {images.map((photo, index) => (
            <div
              className="scroll-gallery__layer"
              data-state={index === active ? "active" : "resting"}
              key={photo.src}
            >
              <Image src={photo.src} alt={photo.alt} fill sizes={sizes} />
            </div>
          ))}
        </figure>

        {/* A filmstrip index, so the swap reads as one of a set rather than as
            the picture glitching. Decorative: it restates the scroll position,
            which is not information a non-sighted reader is missing. */}
        <div className="scroll-gallery__ticks" aria-hidden="true">
          {images.map((photo, index) => (
            <span
              className="scroll-gallery__tick"
              data-state={index === active ? "active" : "resting"}
              key={photo.src}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
