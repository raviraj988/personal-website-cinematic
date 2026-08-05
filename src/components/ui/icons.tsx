import type { SVGProps } from "react";
import type { IconName } from "@/lib/data/types";

/**
 * Restrained line icons drawn inline — spec §25 rules out large UI libraries,
 * and inline SVG keeps them free of network cost.
 *
 * All icons are decorative: the adjacent heading carries the meaning, so each
 * is marked `aria-hidden`.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** A leaf on a stem — environmental work. */
function LeafIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20c0-7 4.5-13 15-14 1 9.5-5 15-11 15H4Z" />
      <path d="M4 20C8 15.5 12 12.5 17 10.5" />
    </Svg>
  );
}

/** Three figures — community engagement. */
function PeopleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="7.5" r="2.75" />
      <path d="M6.5 20c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5" />
      <path d="M4.5 15.5A3.4 3.4 0 0 1 6 9.2" />
      <path d="M19.5 15.5A3.4 3.4 0 0 0 18 9.2" />
    </Svg>
  );
}

/** A document with ruled lines — policy and public process. */
function DocumentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </Svg>
  );
}

/** A table with seats — facilitation and planning. */
function TableIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="9.5" width="17" height="5" rx="1" />
      <path d="M7 9.5V6.5M17 9.5V6.5M7 17.5v-3M17 17.5v-3" />
      <path d="M12 9.5v5" />
    </Svg>
  );
}

/** A compass rose — orientation, strategy. */
function CompassIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15 9-2.2 5-3.8 1.9L11.2 11z" />
    </Svg>
  );
}

/** Stacked layers — research and analysis. */
function LayersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 3.5 8.5 4.2L12 12 3.5 7.7z" />
      <path d="m3.5 12.2 8.5 4.3 8.5-4.3" />
      <path d="m3.5 16.5 8.5 4.3 8.5-4.3" />
    </Svg>
  );
}

const iconMap: Record<IconName, (props: IconProps) => React.ReactElement> = {
  leaf: LeafIcon,
  people: PeopleIcon,
  document: DocumentIcon,
  table: TableIcon,
  compass: CompassIcon,
  layers: LayersIcon,
};

export function Icon({ name, ...props }: { name: IconName } & IconProps) {
  const Component = iconMap[name];
  return <Component {...props} />;
}

/** Small arrow used inside descriptive links. Decorative. */
export function ArrowIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg
      className="text-link__arrow"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d="M2.5 8h11" />
      <path d="m9.5 4 4 4-4 4" />
    </svg>
  );
}

/**
 * A single leaf followed by a hairline, used sparingly as a section ornament —
 * spec §4.2 ("subtle botanical details where appropriate"). Purely decorative.
 */
export function LeafOrnament({
  inverse = false,
  className,
}: {
  inverse?: boolean;
  className?: string;
}) {
  const classes = ["ornament", inverse ? "ornament--inverse" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} aria-hidden="true">
      <svg
        width="21"
        height="26"
        viewBox="0 0 16 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinejoin="round"
        focusable="false"
      >
        <path d="M8 1.2c6.8 4.4 7.8 11.6 0 17.6C.2 12.8 1.2 5.6 8 1.2Z" />
        <path d="M8 4.4v11.6" strokeLinecap="round" />
      </svg>
      <span className="ornament__rule" />
    </div>
  );
}
