"use client";

import { useEffect, useRef } from "react";
import { onScrollFrame } from "@/lib/scroll";

/**
 * Hairline reading-progress rule pinned above the header.
 *
 * Decorative reinforcement of position, never the only signal for anything
 * (spec §8), so it is hidden from assistive technology. It intentionally keeps
 * working under reduced motion: it reflects scroll position rather than
 * animating on its own.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    return onScrollFrame(() => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      node.style.setProperty(
        "--page-progress",
        Math.max(0, Math.min(1, progress)).toFixed(4),
      );
    });
  }, []);

  return <div ref={ref} className="scroll-progress" aria-hidden="true" />;
}
