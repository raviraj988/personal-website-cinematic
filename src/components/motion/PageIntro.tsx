"use client";

import { useEffect, useState } from "react";
import { BotanicalMark } from "./BotanicalMark";
import { site } from "@/lib/data/ese-content";

const SESSION_KEY = "ese-intro-seen";

export function PageIntro() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.motion = "ready";
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const seen = window.sessionStorage.getItem(SESSION_KEY);

    if (reduceMotion || seen) {
      setVisible(false);
      return;
    }

    document.body.dataset.intro = "active";
    const exitTimer = window.setTimeout(() => setLeaving(true), 760);
    const removeTimer = window.setTimeout(() => {
      setVisible(false);
      delete document.body.dataset.intro;
      window.sessionStorage.setItem(SESSION_KEY, "true");
    }, 1380);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
      delete document.body.dataset.intro;
      delete document.documentElement.dataset.motion;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`page-intro${leaving ? " page-intro--leaving" : ""}`}
      aria-hidden="true"
    >
      <div className="page-intro__mark">
        <BotanicalMark />
      </div>
      <p>{site.name}</p>
    </div>
  );
}
