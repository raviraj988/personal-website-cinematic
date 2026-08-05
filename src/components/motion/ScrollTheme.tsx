"use client";

import { useEffect } from "react";
import { onScrollFrame } from "@/lib/scroll";

export function ScrollTheme() {
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-theme]"),
    );
    if (!sections.length) return;

    const stop = onScrollFrame(() => {
      const marker = window.innerHeight * 0.46;
      const active =
        sections.find((section) => {
          const rect = section.getBoundingClientRect();
          return rect.top <= marker && rect.bottom > marker;
        }) ?? sections[0];

      document.documentElement.dataset.scrollTheme =
        active.dataset.scrollTheme ?? "cream";
    });

    return () => {
      stop();
      delete document.documentElement.dataset.scrollTheme;
    };
  }, []);

  return null;
}
