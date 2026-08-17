import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SITE_ORIGIN } from "@/lib/blog/config";

/**
 * The Markdown renderer for post bodies.
 *
 * One component, used by the live post page, the admin preview route, and the
 * editor's live preview — so what an author sees while typing is what ships.
 *
 * ## Post bodies are untrusted input
 *
 * Some of these rows are written by an external AI drafting tool, and all of
 * them arrive over PostgREST rather than from a code review. So:
 *
 * - **`rehype-raw` is deliberately not installed.** Without it, `remark-rehype`
 *   discards raw HTML nodes instead of parsing them, which makes stored XSS a
 *   non-event rather than a one-insert problem. Do not add it to "let authors
 *   drop in an embed" — that is exactly the door this keeps shut.
 * - URL sanitising is react-markdown's default `urlTransform`, which permits
 *   http, https, mailto, tel, and relative URLs and drops everything else,
 *   `javascript:` included. It is not overridden here, because every override of
 *   it is a chance to weaken it.
 *
 * ## Heading levels
 *
 * A stray `#` in the body is rendered as `<h2>`. The page already has exactly one
 * `<h1>` — the post title — and a second one breaks both the document outline and
 * the site's one-`h1` guarantee. Downgrading rather than dropping keeps the
 * author's intent visible instead of silently swallowing their heading.
 */
export function PostBody({ content }: { content: string }) {
  return (
    <div className="post-body">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Stray top-level heading → h2, so heading order cannot break.
          h1: ({ children, ...props }) => <h2 {...props}>{children}</h2>,

          a: ({ href, children, ...props }) => {
            const external = isExternal(href);
            return (
              <a
                href={href}
                {...props}
                {...(external
                  ? {
                      // nofollow because we do not vouch for links a drafting
                      // tool chose; noopener/noreferrer because a new tab that
                      // can reach back into `window.opener` is a real hazard.
                      rel: "nofollow noopener noreferrer",
                      target: "_blank",
                    }
                  : {})}
              >
                {children}
              </a>
            );
          },

          // Body images are plain <img>: Markdown carries no intrinsic
          // dimensions, so next/image would either need a guess or force a
          // layout shift. Lazy and async so they cost nothing above the fold.
          img: ({ src, alt, ...props }) =>
            typeof src === "string" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                decoding="async"
                {...props}
              />
            ) : null,

          // A wide GFM table and a long code listing are the two things in a
          // post body that can push the document sideways. The site guarantees
          // zero horizontal overflow at every tested width, so each gets its own
          // scroll container instead of scrolling the page.
          table: ({ children, ...props }) => (
            <div className="post-body__scroller" role="region" tabIndex={0}>
              <table {...props}>{children}</table>
            </div>
          ),
          pre: ({ children, ...props }) => (
            <pre className="post-body__pre" tabIndex={0} {...props}>
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

/** A link is external when it has a host and that host is not ours. */
function isExternal(href: string | undefined): boolean {
  if (!href) return false;
  try {
    return new URL(href, SITE_ORIGIN).origin !== new URL(SITE_ORIGIN).origin;
  } catch {
    // Unparseable against a known base — treat as internal, since it cannot be
    // a working outbound link anyway.
    return false;
  }
}
