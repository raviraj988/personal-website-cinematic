"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { navigation, site } from "@/lib/data/ese-content";
import { onScrollFrame } from "@/lib/scroll";

/**
 * `solid` forces the opaque state from the first pixel. The transparent-then-
 * solid transition exists so the header can sit over the landing page's
 * full-viewport photographic hero; a page that opens on type instead — a blog
 * post, the journal index — has nothing for white-on-transparent text to sit on,
 * and would render an invisible header until you scrolled.
 */
export function CinematicHeader({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (solid) return;
    return onScrollFrame(() => {
      setScrolled(window.scrollY > window.innerHeight * 0.72);
    });
  }, [solid]);

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
        className={`cinematic-header${solid || scrolled || open ? " cinematic-header--solid" : ""}`}
      >
        <a
          className="cinematic-header__brand"
          href="/"
          aria-label={`${site.name}, home`}
        >
          {/* The abbreviation is the wordmark; the full name is the subtitle.
              "Environment Sovereignty & Equity" set at wordmark size wraps to two
              lines in the header's fixed 12rem column at every breakpoint. */}
          <span>{site.shortName}</span>
          <small>{site.name}</small>
        </a>

        <nav className="cinematic-header__desktop" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        {/*
          Console entry points.

          These reach the ESE admin console, not a member area — the public site
          has no accounts. "Sign up" creates credentials and grants nothing until
          an owner approves the account, which is why it is labelled by what it
          leads to rather than as a call to join anything.
        */}
        <div className="header-auth">
          <a className="header-auth__link" href="/admin/login">
            Log in
          </a>
          <a className="header-auth__button" href="/admin/signup">
            Sign up
          </a>
        </div>

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
            {navigation.map((item, index) => (
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
          <div className="fullscreen-menu__auth">
            <a href="/admin/login" onClick={closeMenu} tabIndex={open ? 0 : -1}>
              Log in
            </a>
            <a href="/admin/signup" onClick={closeMenu} tabIndex={open ? 0 : -1}>
              Sign up
            </a>
          </div>

          <p className="fullscreen-menu__foot">
            Listening carefully. Making complexity clearer. Supporting practical action.
          </p>
        </div>
      </div>
    </>
  );
}
