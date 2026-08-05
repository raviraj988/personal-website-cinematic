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
};

export function ParallaxImage({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "100vw",
  zoom = "out",
}: ParallaxImageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let stopScroll: (() => void) | undefined;

    const update = () => {
      const rect = wrapper.getBoundingClientRect();
      const progress = viewportProgress(rect);
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      const shift = Math.max(-70, Math.min(70, center * -0.1));
      const scale = zoom === "out" ? 1.46 - progress * 0.36 : 1.02 + progress * 0.3;
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
  }, [zoom]);

  return (
    <div
      ref={wrapperRef}
      className={`parallax-media parallax-media--zoom-${zoom} ${className}`.trim()}
    >
      <Image src={src} alt={alt} fill priority={priority} sizes={sizes} />
    </div>
  );
}
