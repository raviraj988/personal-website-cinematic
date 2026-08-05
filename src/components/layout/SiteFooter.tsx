import Link from "next/link";
import {
  approvedContactDetails,
  footerNavigationGroups,
  site,
} from "@/lib/data/site-content";

/**
 * Site footer — spec §16.
 *
 * Contact details render only when approved entries exist; no placeholder
 * phone numbers, email addresses, social profiles, or office locations.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container container--wide">
        <div className="site-footer__grid">
          <div className="site-footer__about">
            <p className="wordmark__name">{site.name}</p>
            <p className="site-footer__description">{site.footerDescription}</p>
          </div>

          <div className="site-footer__nav-groups">
            {footerNavigationGroups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="footer-group__title">{group.title}</h2>
                <ul>
                  {group.items.map((item) => (
                    <li key={`${group.title}-${item.label}`}>
                      <Link href={item.href} className="footer-link">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            {approvedContactDetails.length > 0 ? (
              <div>
                <h2 className="footer-group__title">Contact</h2>
                <ul>
                  {approvedContactDetails.map((detail) => (
                    <li key={detail.label}>
                      <a href={detail.href} className="footer-link">
                        {detail.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="site-footer__base">
          <p>
            © {year} {site.name}
          </p>
          <p>Built to WCAG 2.2 AA targets.</p>
        </div>

        <p className="site-footer__note">
          Design preview. All photography on this page is generated placeholder
          imagery and does not depict Laura McKelvey, her work, or communities
          she has worked with. Copy is provisional and awaiting approval.
        </p>
      </div>
    </footer>
  );
}
