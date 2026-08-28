"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VideoBackdropProps = {
  /** Clip ids, in play order. Each resolves to `/video/<id>-wide.mp4` and `-tall.mp4`. */
  clips: string[];
  /**
   * Playback rate. This is the slow motion — see the note on why it is not baked
   * into the files in `scripts/build-section-videos.mjs`.
   *
   * Below about 0.4 the masters' 30fps drops under ~12 unique frames a second and
   * moving water starts to strobe. 0.5 is the useful floor.
   */
  rate?: number;
  /** Seconds of overlap between one clip and the next. */
  crossfade?: number;
  /**
   * Attach the first clip's source immediately instead of waiting for the
   * section to scroll into view.
   *
   * For the hero only. The lazy default is what makes several of these
   * affordable on one page, but the hero is above the fold — waiting for an
   * IntersectionObserver callback there means the first thing a visitor sees is
   * the poster, then a visible swap to video a beat later.
   */
  eager?: boolean;
  /**
   * Which rendition to serve.
   *
   * `auto` (the default) is the full-bleed behaviour: a 9:16 cut on phones, a
   * 16:9 cut on everything else, chosen by `<source media>` before any JS runs.
   *
   * `wide` is the mirror of `tall`: it pins to the landscape rendition at every
   * width, for a 16:9 master shown whole. On a phone the `auto` behaviour would
   * hand over the 9:16 cut, which for a 2560x1440 source means an 810px-wide
   * slice — 68% of the picture gone. If the clip must never be cropped, there is
   * no width at which that file is the right answer.
   *
   * `tall` pins it to the portrait rendition at every width. That is for a video
   * rendered in a PORTRAIT FRAME rather than as a section ground — there the
   * viewport's shape is irrelevant, the frame's shape is what matters, and
   * serving a 16:9 cut to a 9:16 box would letterbox it or crop it twice.
   */
  orientation?: "auto" | "tall" | "wide";
  className?: string;
};

const CLIP_BASE = "/video";

/**
 * A section-filling video ground that cycles through several clips in slow
 * motion, for copy to sit on top of.
 *
 * THE THREE THINGS THAT KEEP THIS FROM BEING A PERFORMANCE DISASTER
 * -----------------------------------------------------------------
 * Several autoplaying background videos on one page is normally a bad idea. It is
 * affordable here only because of these, and removing any one of them undoes it:
 *
 *   1. NOTHING LOADS UNTIL IT IS NEEDED. A clip's `src` is not attached until it
 *      is either playing or the next one due. A reader who never reaches this
 *      section downloads zero bytes of it — which is the whole reason a page can
 *      carry three of these.
 *   2. OFFSCREEN MEANS PAUSED. An IntersectionObserver pauses everything the
 *      moment the section leaves the viewport. Decoding video nobody is looking
 *      at is pure battery cost, and on a phone it is the difference between a
 *      warm handset and a normal one.
 *   3. AT MOST TWO DECODE AT ONCE, and only during the dissolve. iOS in
 *      particular caps concurrent video decoders, and exceeding it does not
 *      degrade — later videos simply refuse to play.
 *
 * WHY THE SWITCH IS ON `timeupdate` AND NOT `ended`
 * -------------------------------------------------
 * The clips have to overlap for the dissolve to hide the cut. Waiting for `ended`
 * means the outgoing clip has already frozen on its last frame before the
 * incoming one starts, so every transition shows a held frame — the exact
 * artefact the dissolve exists to prevent. Switching `crossfade` seconds early
 * means the two are genuinely playing across each other.
 *
 * Note the rate is applied to the CLOCK too: at 0.5x, one second of remaining
 * media time takes two real seconds, so the lead-in has to be scaled or the
 * dissolve starts twice as early as intended.
 */
export function VideoBackdrop({
  clips,
  rate = 0.5,
  crossfade = 1.4,
  eager = false,
  orientation = "auto",
  className = "",
}: VideoBackdropProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(0);
  /* Which clips have had their `src` attached. Starts as clip 0 only. */
  const [loaded, setLoaded] = useState<number[]>([0]);
  const visibleRef = useRef(false);
  const reducedRef = useRef(false);

  const next = useCallback((index: number) => (index + 1) % clips.length, [clips.length]);

  /* Attaching a clip is a state change rather than a direct `src` write so React
     stays the only thing that owns the attribute — a hand-written `src` would be
     clobbered on the next render. */
  const ensureLoaded = useCallback((index: number) => {
    setLoaded((current) => (current.includes(index) ? current : [...current, index]));
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const pauseAll = () => {
      for (const video of videoRefs.current) video?.pause();
    };

    const playActive = () => {
      if (reducedRef.current || !visibleRef.current) return;
      const video = videoRefs.current[active];
      if (!video) return;
      video.playbackRate = rate;
      void video.play().catch(() => {});
    };

    const applyMotion = () => {
      reducedRef.current = motion.matches;
      if (motion.matches) {
        pauseAll();
        /* Parked on the first frame, which is also the poster, so the section
           reads as a still photograph rather than a stalled video. */
        const video = videoRefs.current[active];
        if (video) video.currentTime = 0;
      } else {
        playActive();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          /* The follow-on clip is fetched only once the section is actually on
             screen, so a reader who scrolls straight past pays for one clip
             rather than all of them. */
          ensureLoaded(next(active));
          playActive();
        } else {
          pauseAll();
        }
      },
      /* Started slightly before the section arrives so the first frame is
         decoded by the time it is looked at, but not so early that scrolling
         past the page bottom preloads everything. */
      { rootMargin: "20% 0px", threshold: 0.01 },
    );

    observer.observe(root);
    applyMotion();
    motion.addEventListener("change", applyMotion);

    return () => {
      observer.disconnect();
      motion.removeEventListener("change", applyMotion);
      pauseAll();
    };
  }, [active, rate, ensureLoaded, next]);

  /* The advance. Separate from the effect above so changing `active` does not
     tear down and rebuild the observer. */
  const handleTimeUpdate = useCallback(
    (index: number) => () => {
      if (index !== active || clips.length < 2) return;
      const video = videoRefs.current[index];
      if (!video?.duration || Number.isNaN(video.duration)) return;

      /* Scaled by `rate`: remaining MEDIA seconds are not remaining REAL
         seconds once the clip is playing at half speed. */
      const remaining = (video.duration - video.currentTime) / Math.max(rate, 0.01);
      if (remaining > crossfade) return;

      const upcoming = next(index);
      ensureLoaded(upcoming);
      const incoming = videoRefs.current[upcoming];
      if (incoming) {
        incoming.currentTime = 0;
        incoming.playbackRate = rate;
        void incoming.play().catch(() => {});
      }
      setActive(upcoming);
    },
    [active, clips.length, crossfade, ensureLoaded, next, rate],
  );

  return (
    <div className={`video-backdrop ${className}`.trim()} ref={rootRef} aria-hidden="true">
      {clips.map((clip, index) => (
        <video
          key={clip}
          ref={(node) => {
            videoRefs.current[index] = node;
          }}
          className="video-backdrop__layer"
          data-state={index === active ? "active" : "resting"}
          poster={`${CLIP_BASE}/${clip}-poster.jpg`}
          preload={eager && index === 0 ? "auto" : "none"}
          muted
          loop={clips.length === 1}
          playsInline
          tabIndex={-1}
          onTimeUpdate={handleTimeUpdate(index)}
          style={{ transitionDuration: `${crossfade}s` }}
        >
          {/* Only rendered once the clip is due — an unattached `<source>` means
              the browser has nothing to fetch. This is guarantee (1) above. */}
          {loaded.includes(index) ? (
            orientation !== "auto" ? (
              /* One source, no media query — the frame is portrait everywhere, so
                 there is no width at which the 16:9 cut would be the right file.
                 The encoder is told not to build one for these clips at all. */
              <source src={`${CLIP_BASE}/${clip}-${orientation}.mp4`} type="video/mp4" />
            ) : (
              <>
                <source media="(max-width: 48rem)" src={`${CLIP_BASE}/${clip}-tall.mp4`} type="video/mp4" />
                <source src={`${CLIP_BASE}/${clip}-wide.mp4`} type="video/mp4" />
              </>
            )
          ) : null}
        </video>
      ))}
    </div>
  );
}
