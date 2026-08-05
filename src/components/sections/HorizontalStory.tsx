"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { areaSlides } from "@/lib/data/cinematic-content";

export function HorizontalStory() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((index: number) => {
    const next = (index + areaSlides.length) % areaSlides.length;
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * next, behavior: "smooth" });
    setActive(next);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.3 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setTimeout(() => goTo(active + 1), 4800);
    return () => window.clearTimeout(timer);
  }, [active, goTo, inView, paused]);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    if (next !== active) setActive(next);
  };

  return (
    <section ref={sectionRef} className="story" aria-labelledby="story-title" data-scroll-theme="forest">
      <h2 id="story-title" className="visually-hidden">
        Explore areas of work
      </h2>
      <div
        ref={trackRef}
        className="story__track"
        onScroll={onScroll}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") goTo(active + 1);
          if (event.key === "ArrowLeft") goTo(active - 1);
        }}
        tabIndex={0}
        aria-label="Areas of work stories"
      >
        {areaSlides.map((slide, index) => (
          <article
            key={slide.title}
            className="story__slide"
            aria-label={`${index + 1} of ${areaSlides.length}: ${slide.title}`}
          >
            <Image src={slide.image} alt={slide.alt} fill sizes="100vw" />
            <div className="story__scrim" />
            <div className="story__panel">
              <p className="story__counter">
                <span>0{index + 1}</span> / 0{areaSlides.length}
              </p>
              <h3>{slide.title}</h3>
              <p>{slide.description}</p>
              <a href="#contact" className="text-link text-link--dark">
                Start a conversation <span aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="story__controls">
        <button type="button" onClick={() => goTo(active - 1)}>
          <span aria-hidden="true">←</span> Previous
        </button>
        <ol aria-label="Choose an area of work">
          {areaSlides.map((slide, index) => (
            <li key={slide.title}>
              <button
                type="button"
                aria-current={active === index ? "true" : undefined}
                onClick={() => goTo(index)}
              >
                {slide.title}
              </button>
            </li>
          ))}
        </ol>
        <button
          className="story__autoplay"
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={() => goTo(active + 1)}>
          Next <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
