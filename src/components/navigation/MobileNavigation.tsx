"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { CallToAction, NavigationItem } from "@/lib/data/types";

/**
 * Mobile navigation — spec §7.3.
 *
 * Presented as a modal drawer: focus moves in on open, is contained while open,
 * Escape closes, focus returns to the trigger, and background scrolling is
 * prevented. No hover-only interactions.
 */
export function MobileNavigation({
  items,
  cta,
  currentPath,
}: {
  items: NavigationItem[];
  cta: CallToAction;
  currentPath?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const drawerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Move focus into the drawer once it is rendered.
  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  // Return focus to the trigger after closing, but not on first mount.
  const hasOpened = useRef(false);
  useEffect(() => {
    if (isOpen) {
      hasOpened.current = true;
      return;
    }
    if (hasOpened.current) triggerRef.current?.focus();
  }, [isOpen]);

  // Prevent background scrolling while the drawer is presented as a modal.
  useEffect(() => {
    if (!isOpen) return;
    const { body } = document;
    const previous = body.dataset.scrollLocked;
    body.dataset.scrollLocked = "true";
    return () => {
      if (previous === undefined) delete body.dataset.scrollLocked;
      else body.dataset.scrollLocked = previous;
    };
  }, [isOpen]);

  // Escape closes; Tab is contained within the drawer.
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusable = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  return (
    <div className="mobile-nav">
      <button
        ref={triggerRef}
        type="button"
        className="menu-button"
        aria-expanded={isOpen}
        aria-controls={drawerId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="menu-icon">
          <span />
          <span />
          <span />
        </span>
        Menu
      </button>

      {isOpen ? (
        <>
          <div className="drawer-overlay" onClick={close} aria-hidden="true" />
          <div
            id={drawerId}
            ref={drawerRef}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
          >
            <div className="container container--wide">
              <div className="drawer__head">
                <span className="wordmark__name">Laura McKelvey</span>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="drawer__close"
                  onClick={close}
                >
                  Close
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="m4 4 8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              <ul className="drawer__list">
                {items.map((item) => {
                  const isCurrent = currentPath === item.href;
                  return (
                    <li key={`${item.label}-${item.href}`}>
                      <Link
                        href={item.href}
                        className="drawer__link"
                        aria-current={isCurrent ? "page" : undefined}
                        onClick={close}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <Link
                href={cta.href}
                className="button button--primary drawer__cta"
                onClick={close}
              >
                {cta.label}
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
