import Link from "next/link";
import { ArrowIcon } from "./icons";

/**
 * A descriptive text link. `children` must read sensibly out of context —
 * spec §22 requires descriptive link text, so "Read more" alone is avoided in
 * favour of a full phrase plus a visually hidden qualifier where needed.
 */
export function TextLink({
  href,
  children,
  withArrow = true,
  className,
}: {
  href: string;
  children: React.ReactNode;
  withArrow?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className ? `text-link ${className}` : "text-link"}
    >
      <span>{children}</span>
      {withArrow ? <ArrowIcon /> : null}
    </Link>
  );
}
