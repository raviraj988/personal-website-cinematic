type IconName =
  | "layers"
  | "bridge"
  | "network"
  | "target"
  | "seal"
  | "flask"
  | "return"
  | "ask";

/**
 * The small line icons on the statement cards.
 *
 * Inline SVG rather than an icon package: eight glyphs at ~200 bytes each is
 * smaller than any dependency that could supply them, and it means the stroke
 * weight is chosen here rather than inherited from someone else's grid.
 *
 * They are drawn on a 24 unit box at 1.5 stroke, `currentColor`, no fill — the
 * same restraint the rest of the site's marks use. `aria-hidden` on every one:
 * each sits beside a heading that already says what the card is, so announcing
 * the glyph would just repeat it.
 */
const PATHS: Record<IconName, React.ReactNode> = {
  /* Stacked planes — accumulated expertise. */
  layers: (
    <>
      <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
      <path d="M3 12.5 12 17l9-4.5" />
      <path d="M3 17 12 21.5 21 17" />
    </>
  ),
  /* A span with two piers. */
  bridge: (
    <>
      <path d="M2 9c4.5 0 7 3.5 10 3.5S18 9 22 9" />
      <path d="M2 9v9M22 9v9M8.5 11.6V18M15.5 11.6V18" />
    </>
  ),
  /* Nodes joined to a centre — a network rather than a hierarchy. */
  network: (
    <>
      <circle cx="12" cy="12" r="2.6" />
      <circle cx="4.5" cy="5.5" r="2" />
      <circle cx="19.5" cy="5.5" r="2" />
      <circle cx="4.5" cy="18.5" r="2" />
      <circle cx="19.5" cy="18.5" r="2" />
      <path d="m6.1 7.1 3.9 3.3M17.9 7.1 14 10.4M6.1 16.9 10 13.6M17.9 16.9 14 13.6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  /* A document with a seal — a filing. */
  seal: (
    <>
      <path d="M6 3h7l5 5v6.5" />
      <path d="M13 3v5h5" />
      <path d="M6 3v18h5" />
      <circle cx="17" cy="18" r="3.2" />
      <path d="M17 14.8V21.2" />
    </>
  ),
  flask: (
    <>
      <path d="M9.5 3v6.2L4.6 17.4A2 2 0 0 0 6.3 20.5h11.4a2 2 0 0 0 1.7-3.1L14.5 9.2V3" />
      <path d="M8.5 3h7" />
      <path d="M7.2 14.5h9.6" />
    </>
  ),
  /* A closed loop — value returning. */
  return: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.9-6.4" />
      <path d="M20.7 3.8v5.1h-5.1" />
    </>
  ),
  ask: (
    <>
      <path d="M20.5 12.4a7.6 7.6 0 0 1-8.2 7.6L6 21.5l1.6-5.2a7.6 7.6 0 1 1 12.9-3.9Z" />
      <path d="M12.2 14.2v-.4c0-1.3 1.5-1.7 1.5-3a1.7 1.7 0 0 0-3.3-.4" />
      <path d="M12.2 16.8h.01" />
    </>
  ),
};

export function CardIcon({ name }: { name: IconName }) {
  return (
    <svg
      className="card-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
