type IconName =
  | "layers"
  | "bridge"
  | "network"
  | "target"
  | "seal"
  | "flask"
  | "return"
  | "ask"
  | "consortium"
  | "enterprise"
  | "institution"
  | "households";

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
  /* Three bodies overlapping — a consortium is separate nations sharing a
     boundary, not one body with branches. */
  consortium: (
    <>
      <circle cx="8.5" cy="9" r="4.6" />
      <circle cx="15.5" cy="9" r="4.6" />
      <circle cx="12" cy="15.5" r="4.6" />
    </>
  ),
  /* Rising measures on a baseline — an enterprise, drawn as what it does rather
     than as a building, since a tribal enterprise is not always premises. */
  enterprise: (
    <>
      <path d="M3 20.5h18" />
      <path d="M6.5 20.5v-5M12 20.5v-9.5M17.5 20.5v-14" />
      <path d="M14.6 6.2h3.4v3.4" />
    </>
  ),
  /* Pediment and columns — the one shape that reads as a public agency at
     16px without a label. */
  institution: (
    <>
      <path d="M3.2 9.2 12 4l8.8 5.2" />
      <path d="M4.5 20.5h15" />
      <path d="M6.8 11.4v7.2M12 11.4v7.2M17.2 11.4v7.2" />
    </>
  ),
  /* Roofs side by side — a community read as the households in it. */
  households: (
    <>
      <path d="M2.5 12.2 7 8.4l4.5 3.8" />
      <path d="M4.2 13.6v6.2h5.6v-6.2" />
      <path d="M12.8 14.6 16.5 11.4l4 3.2" />
      <path d="M14.3 15.8v4h4.4v-4" />
    </>
  ),
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
