import { Arrow } from "@/components/ui/Arrow";
import { navigation, ese, site } from "@/lib/data/ese-content";

/**
 * Compact footer for the blog.
 *
 * The landing page's footer is a full-bleed photographic contact section; that
 * would outweigh a short post. This keeps the same dark forest ground, serif
 * wordmark, and hairline rule, and drops the imagery.
 */
export function BlogFooter() {
  return (
    <footer className="blog-footer">
      <div className="blog-footer__inner">
        <div>
          <p className="cinematic-footer__name">{ese.abbreviation}</p>
          <p>{site.name}</p>
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
