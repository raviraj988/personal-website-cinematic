import { EseLogo } from "@/components/brand/EseMark";
import { Arrow } from "@/components/ui/Arrow";
import { navigation, site } from "@/lib/data/ese-content";

/**
 * Compact footer for the blog.
 *
 * The landing page's footer is a full-bleed photographic contact section; that
 * would outweigh a short post. This keeps the same dark forest ground, logo, and
 * hairline rule, and drops the imagery.
 */
export function BlogFooter() {
  return (
    <footer className="blog-footer">
      <div className="blog-footer__inner">
        <div>
          <EseLogo className="cinematic-footer__logo" label={site.name} />
        </div>

        <nav aria-label="Footer navigation">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="cinematic-footer__legal">
          <p>All copy and photography are provisional design content.</p>
          <a href="/#contact">
            Get in touch <Arrow />
          </a>
        </div>
      </div>
    </footer>
  );
}
