"use client";

import { useEffect, useRef } from "react";
import { onScrollFrame, viewportProgress, watchReducedMotion } from "@/lib/scroll";

/**
 * Scroll-linked drift for decorative background type. Rendered only via
 * `BackgroundText`, which decides whether drift is wanted at all.
 */
export function DriftingBackgroundText({
  text,
  className,
  drift,
}: {
  text: string;
  className: string;
  drift: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let stopScroll: (() => void) | undefined;

    const update = () => {
      const progress = viewportProgress(node.getBoundingClientRect());
      // Centre the travel so the word passes through its authored position.
      node.style.setProperty("--bg-word-y", `${(0.5 - progress) * drift}px`);
    };

    const stopMotionWatch = watchReducedMotion((reduced) => {
      if (reduced) {
        stopScroll?.();
        stopScroll = undefined;
        node.style.removeProperty("--bg-word-y");
        return;
      }
      stopScroll ??= onScrollFrame(update);
    });

    return () => {
      stopMotionWatch();
      stopScroll?.();
    };
  }, [drift]);

  return (
    <span ref={ref} className={className} aria-hidden="true">
      {text}
    </span>
  );
}
