import Link from "next/link";

type Variant = "primary" | "secondary" | "on-inverse" | "ghost-inverse";

/**
 * Anchor-styled button. Real `<button>` elements are only used for controls
 * that act on the page (see MobileNavigation), never for navigation.
 */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const classes = ["button", `button--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
