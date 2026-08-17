"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { onScrollFrame, viewportProgress, watchReducedMotion } from "@/lib/scroll";

type ParallaxImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  zoom?: "in" | "out";
  /**
   * How far the image travels and scales.
   *
   * `full` peaks at 1.46x, which was built for full-bleed photography with
   * pixels to spare. The supplied archive has none — most sources are 480px on
   * their long edge — and scaling one of those by 1.46 resolves visible
   * softness that the same image, held near 1x, does not show. `soft` keeps the
   * motion legible while staying inside what the source can support, and is the
   * right default for anything drawn from `public/images/ese/`.
   */
  intensity?: "full" | "soft";
};

export function ParallaxImage({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "100vw",
  zoom = "out",
  intensity = "full",
}: ParallaxImageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let stopScroll: (() => void) | undefined;

    const soft = intensity === "soft";
    const travel = soft ? 26 : 70;
    const drift = soft ? -0.04 : -0.1;

    const update = () => {
      const rect = wrapper.getBoundingClientRect();
      const progress = viewportProgress(rect);
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      const shift = Math.max(-travel, Math.min(travel, center * drift));
      const scale = soft
        ? zoom === "out"
          ? 1.12 - progress * 0.1
          : 1.0 + progress * 0.09
        : zoom === "out"
          ? 1.46 - progress * 0.36
          : 1.02 + progress * 0.3;
      wrapper.style.setProperty("--parallax-y", `${shift}px`);
      wrapper.style.setProperty("--scroll-scale", scale.toFixed(4));
      wrapper.style.setProperty("--scroll-progress", progress.toFixed(4));
    };

    // Re-evaluated whenever the preference changes, not just at mount.
    const stopMotionWatch = watchReducedMotion((reduced) => {
      if (reduced) {
        stopScroll?.();
        stopScroll = undefined;
        wrapper.style.removeProperty("--parallax-y");
        wrapper.style.removeProperty("--scroll-scale");
        wrapper.style.removeProperty("--scroll-progress");
        return;
      }
      stopScroll ??= onScrollFrame(update);
    });

    return () => {
      stopMotionWatch();
      stopScroll?.();
    };
  }, [zoom, intensity]);

  return (
    <div
      ref={wrapperRef}
      className={`parallax-media parallax-media--zoom-${zoom} parallax-media--${intensity} ${className}`.trim()}
    >
      <Image src={src} alt={alt} fill priority={priority} sizes={sizes} />
    </div>
  );
}
