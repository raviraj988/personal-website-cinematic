"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cinematicNavigation } from "@/lib/data/cinematic-content";
import { onScrollFrame } from "@/lib/scroll";

export function CinematicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      onScrollFrame(() => {
        setScrolled(window.scrollY > window.innerHeight * 0.72);
      }),
    [],
  );

  useEffect(() => {
    document.body.dataset.menuOpen = String(open);
    if (!open) return;

    const menu = menuRef.current;
    const focusable = menu?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <header
        className={`cinematic-header${scrolled || open ? " cinematic-header--solid" : ""}`}
      >
        <a className="cinematic-header__brand" href="#top" aria-label="Laura McKelvey, home">
          <span>Laura McKelvey</span>
          <small>Environmental &amp; Community Practice</small>
        </a>

        <nav className="cinematic-header__desktop" aria-label="Primary navigation">
          {cinematicNavigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <button
          ref={triggerRef}
          className="menu-trigger"
          type="button"
          aria-expanded={open}
          aria-controls="cinematic-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="visually-hidden">{open ? "Close menu" : "Open menu"}</span>
          <span className="menu-trigger__label" aria-hidden="true">
            {open ? "Close" : "Menu"}
          </span>
          <span className="menu-trigger__icon" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </header>

      <div
        id="cinematic-menu"
        ref={menuRef}
        className={`fullscreen-menu${open ? " fullscreen-menu--open" : ""}`}
        aria-hidden={!open}
      >
        <div className="fullscreen-menu__inner">
          <p>Navigate</p>
          <nav aria-label="Menu navigation">
            {cinematicNavigation.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                style={{ "--menu-index": index } as CSSProperties}
                tabIndex={open ? 0 : -1}
              >
                <span>0{index + 1}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <p className="fullscreen-menu__foot">
            Listening carefully. Making complexity clearer. Supporting practical action.
          </p>
        </div>
      </div>
    </>
  );
}
