import Link from "next/link";
import { headerCta, primaryNavigation, site } from "@/lib/data/site-content";
import { MobileNavigation } from "./MobileNavigation";

/**
 * Site header — spec §7. Server-rendered; only the mobile drawer ships JS.
 *
 * `currentPath` is passed down so the active item can be marked with
 * `aria-current` plus a weight change and a rule — never colour alone.
 */
export function SiteHeader({ currentPath }: { currentPath?: string }) {
  return (
    <header className="site-header">
      <div className="container container--wide site-header__inner">
        <Link href="/" className="wordmark">
          <span className="wordmark__name">{site.name}</span>
          <span className="wordmark__role">{site.role}</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary">
          <ul className="desktop-nav__list">
            {primaryNavigation.map((item) => (
              <li key={`${item.label}-${item.href}`}>
                <Link
                  href={item.href}
                  className="nav-link"
                  aria-current={currentPath === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={headerCta.href}
                className="button button--secondary desktop-nav__cta"
              >
                {headerCta.label}
              </Link>
            </li>
          </ul>
        </nav>

        <MobileNavigation
          items={primaryNavigation}
          cta={headerCta}
          currentPath={currentPath}
        />
      </div>
    </header>
  );
}
