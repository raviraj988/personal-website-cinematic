"use client";

import { useEffect, useRef } from "react";

type HeroVideoProps = {
  desktop: string;
  mobile: string;
  poster: string;
  className?: string;
};

/**
 * The hero's moving background.
 *
 * The two `<source>` elements are ordered widest-first and separated by a `media`
 * query, which is the only mechanism that stops a phone downloading the desktop
 * encode: the browser picks ONE source, before any JS runs, and never fetches the
 * others. Ordering matters — the first matching source wins, so the constrained
 * query has to come first.
 *
 * `poster` is doing real work here rather than being a nicety. It is the video's
 * own first frame, so the swap from poster to playback is invisible, and it is
 * what every path below falls back to:
 *
 *   - reduced motion: the video is never told to play, so the poster is the hero;
 *   - a rejected autoplay promise (low-power mode on iOS refuses even muted
 *     autoplay): same outcome, no error, no empty black box;
 *   - a slow connection: the poster is a 150KB JPEG against a 1.3MB encode.
 *
 * `muted` and `playsInline` are both load-bearing for autoplay, not stylistic —
 * every current browser refuses to autoplay an unmuted video, and without
 * `playsinline` iOS Safari takes the video fullscreen the moment it plays.
 */
export function HeroVideo({ desktop, mobile, poster, className = "" }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      if (query.matches) {
        video.pause();
        /* Back to frame 0 so what is frozen on screen matches the poster rather
           than whatever arbitrary frame the pause landed on. */
        video.currentTime = 0;
        return;
      }
      /* The promise rejects rather than throws when a browser declines to
         autoplay. Swallowing it deliberately: the poster is already the correct
         thing to be looking at, so there is nothing to recover from and nothing
         to tell the user. */
      void video.play().catch(() => {});
    };

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return (
    <video
      ref={videoRef}
      className={`hero-video ${className}`.trim()}
      poster={poster}
      preload="metadata"
      muted
      loop
      playsInline
      /* No `autoPlay`: playback is started from the effect above so the
         reduced-motion preference is consulted first. Marking it autoplay here
         would start the video before React ever runs and the preference would
         only ever be able to stop something already moving. */
      aria-hidden="true"
      tabIndex={-1}
    >
      <source media="(max-width: 48rem)" src={mobile} type="video/mp4" />
      <source src={desktop} type="video/mp4" />
    </video>
  );
}
