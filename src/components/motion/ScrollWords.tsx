"use client";

import { useEffect, useRef, type ElementType } from "react";
import { onScrollFrame, watchReducedMotion } from "@/lib/scroll";

type ScrollWordsProps = {
  text: string;
  /** `h1` was added for the standalone pages, whose main heading is scrubbed in
   *  exactly like a section heading but must be the page's only h1. */
  as?: "p" | "h1" | "h2" | "h3";
  className?: string;
  id?: string;
};

export function ScrollWords({
  text,
  as = "p",
  className = "",
  id,
}: ScrollWordsProps) {
  const Tag = as as ElementType;
  const rootRef = useRef<HTMLElement>(null);
  const words = text.split(/\s+/);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const wordNodes = Array.from(
      root.querySelectorAll<HTMLElement>(".scroll-words__word"),
    );
    let stopScroll: (() => void) | undefined;

    const update = () => {
      const rect = root.getBoundingClientRect();
      const start = window.innerHeight * 0.9;
      const range = Math.max(window.innerHeight * 0.72, rect.height * 1.15);
      const progress = Math.max(0, Math.min(1, (start - rect.top) / range));

      wordNodes.forEach((word, index) => {
        const staggerStart = (index / Math.max(1, wordNodes.length - 1)) * 0.66;
        const local = Math.max(0, Math.min(1, (progress - staggerStart) / 0.22));
        const eased = 1 - Math.pow(1 - local, 3);
        word.style.opacity = String(0.12 + eased * 0.88);
        word.style.transform = `translate3d(0, ${(1 - eased) * 0.55}em, 0)`;
      });
    };

    const stopMotionWatch = watchReducedMotion((reduced) => {
      if (reduced) {
        stopScroll?.();
        stopScroll = undefined;
        delete root.dataset.scrub;
        wordNodes.forEach((word) => {
          word.style.opacity = "1";
          word.style.transform = "none";
        });
        return;
      }
      root.dataset.scrub = "ready";
      stopScroll ??= onScrollFrame(update);
    });

    return () => {
      stopMotionWatch();
      stopScroll?.();
    };
  }, [text]);

  return (
    <Tag
      ref={rootRef as never}
      id={id}
      className={`scroll-words ${className}`.trim()}
      aria-label={text}
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`} aria-hidden="true">
          <span className="scroll-words__word">{word}</span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
