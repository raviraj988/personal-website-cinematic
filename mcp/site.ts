/**
 * The site registry. One entry: ESE.
 *
 * ## Isolation is structural, not conventional
 *
 * This server was modelled on one built for a different organisation, and the
 * thing most likely to go wrong is a draft landing in the wrong database. The
 * defence is that there is nothing to misdirect it *to*: the registry holds one
 * site, no code path reads a `SITE_<KEY>_*` style credential, and credentials
 * come from this repository's own `.env.local` and nowhere else. A second
 * ESE-adjacent site gets its own deployment rather than a second row here.
 *
 * Every mutating tool still takes a required `site` argument and echoes the
 * resolved value back. With one registered site that is redundant today, which is
 * exactly when it is cheap to establish — a misdirected call is visible in the
 * transcript rather than discovered in the database.
 *
 * ## Everything here is derived, not restated
 *
 * The brand, the five service areas, the audiences, and the calls to action are
 * read from `src/lib/data/ese-content.ts`, which is the authoritative copy for
 * the whole site. Retyping any of it here would create a second source that
 * drifts — and `ese-content.ts` marks its own gaps `TODO(ese)`, so a copy would
 * also lose the record of what is still unconfirmed.
 */
import { site as brand, ese, contact, navigation, people } from "../src/lib/data/ese-content";
import { SITE_ORIGIN, BLOG_PATH, SEARCH_ENGINE_INDEXING } from "../src/lib/blog/config";
import { NEWS_PATH } from "../src/lib/news/config";
import { readEnvOr } from "./lib";

export type ServiceArea = {
  slug: string;
  path: string;
  title: string;
  description: string;
};

export type CallToAction = { label: string; href: string };

export type LinkTarget = {
  path: string;
  label: string;
  /** Why a draft would link here. Real copy, not a restatement of the label. */
  context: string;
};

export type RegisteredSite = {
  key: string;
  name: string;
  shortName: string;
  role: string;
  origin: string;
  indexingEnabled: boolean;
  audience: string[];
  positioning: string;
  mission: string;
  services: ServiceArea[];
  callsToAction: CallToAction[];
  preferredTerminology: string[];
  topicsToAvoid: string[];
  linkTargets: LinkTarget[];
  knownMissingPaths: string[];
};

/**
 * Anchors that exist on the homepage but are not in `navigation`.
 *
 * `navigation` carries four of the seven (`/#about`, `/#services`,
 * `/#who-we-are`, `/#contact`). The other three are rendered as section ids and
 * genuinely work — `hero.secondaryCta.href` is `#who-we-serve`, so ESE's own hero
 * links to one of them. Validating against `navigation` alone would fail a link
 * the site itself uses.
 */
const EXTRA_HOMEPAGE_ANCHORS = ["who-we-serve", "people", "top"] as const;

/**
 * Paths a writer will reach for that do not exist.
 *
 * `/services` is the one that matters: there are five `/services/<slug>` pages
 * and no index above them. ESE has no catch-all route, so this is a hard 404
 * rather than a redirect — worth failing a draft over, because the alternative is
 * a published post with a dead link in it.
 */
const KNOWN_MISSING_PATHS = ["/services", "/blog/index", "/contact", "/about"];

/**
 * Normalise a call-to-action href for use inside a post body.
 *
 * `ese-content.ts` carries two forms, both correct where they are used:
 * `ese.servicePage.contactCta` is `/#contact` (it renders on a service page and
 * must cross to the homepage) while `hero.primaryCta` is a bare `#services` (it
 * renders *on* the homepage, where a bare fragment is right). A post body is
 * never the homepage, so only the first form works — a bare `#services` in a post
 * scrolls to nothing.
 */
function crossPageHref(href: string): string {
  return href.startsWith("#") ? `/${href}` : href;
}

function uniqueCtas(...ctas: CallToAction[]): CallToAction[] {
  const seen = new Set<string>();
  const out: CallToAction[] = [];
  for (const cta of ctas) {
    const href = crossPageHref(cta.href);
    const key = `${cta.label}::${href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: cta.label, href });
  }
  return out;
}

function buildEse(): RegisteredSite {
  const services: ServiceArea[] = ese.services.items.map((item) => ({
    slug: item.slug,
    path: `/services/${item.slug}`,
    title: item.title,
    description: item.description,
  }));

  const linkTargets: LinkTarget[] = [
    ...services.map((service) => ({
      path: service.path,
      label: service.title,
      context: service.description,
    })),
    {
      path: BLOG_PATH,
      label: "Blog",
      context: "The blog index. Link here only when pointing at the archive as a whole.",
    },
    {
      path: NEWS_PATH,
      label: newsLabel(),
      context: "News and updates, including newsletter issues published elsewhere.",
    },
    {
      path: "/people",
      label: people.heading,
      context: people.lede,
    },
    ...navigation
      .filter((entry) => entry.href.startsWith("/#"))
      .map((entry) => ({
        path: entry.href,
        label: entry.label,
        context: `The “${entry.label}” section of the homepage.`,
      })),
    ...EXTRA_HOMEPAGE_ANCHORS.map((id) => ({
      path: `/#${id}`,
      label: id.replace(/-/g, " "),
      context: `A homepage section that is rendered but not in the main navigation.`,
    })),
  ];

  return {
    key: "ese",
    name: brand.name,
    shortName: brand.shortName,
    role: brand.role,
    origin: SITE_ORIGIN,
    indexingEnabled: SEARCH_ENGINE_INDEXING,
    audience: [...ese.whoWeServe.audiences],
    positioning: ese.intro.paragraphs[0] ?? "",
    mission: ese.mission.statement,
    services,
    callsToAction: uniqueCtas(
      ese.servicePage.contactCta,
      ese.becomePartner.cta,
      ese.scholarship.cta,
      ese.servicePage.scholarshipCta,
      people.cta,
      { label: contact.heading, href: "/#contact" },
    ),
    /**
     * ESE's own words, taken from its copy rather than chosen here. "Communities"
     * over "clients" is the one worth stating explicitly: the site uses it
     * throughout, and "client" quietly reframes who the work is for.
     */
    preferredTerminology: [
      "Native Nations",
      "Tribal",
      "sovereignty",
      "self-determination",
      "marginalized communities",
      "culturally-informed",
      "communities (not “clients”)",
    ],
    topicsToAvoid: [
      "Any named client, Tribe, or Nation presented as an ESE client",
      "Grant awards, dollar figures, project outcomes, or statistics",
      "Regulatory deadlines stated as fact",
      "Staff credentials or biographies — ESE's own site leaves these empty on purpose",
      "Speaking for a Nation, or characterising a community's position",
      "Legal, regulatory, or funding-eligibility advice presented as determinative",
      "Deficit framing: communities as helpless, ESE as saviour",
    ],
    linkTargets,
    knownMissingPaths: KNOWN_MISSING_PATHS,
  };
}

/** `newsTeaser.heading` is the site's own name for `/news`. */
function newsLabel(): string {
  return "News & updates";
}

/* ----------------------------------------------------------------- resolution */

let registry: Map<string, RegisteredSite> | null = null;

/**
 * The allowlist, resolved lazily and memoised.
 *
 * Deliberately not a module-scope constant or an IIFE: reading
 * `ese-content.ts` and the environment at import time would make a
 * misconfiguration into an unreportable module-evaluation throw, which takes the
 * whole tool surface down with no error a client can display. See the note at the
 * top of `mcp/lib.ts`.
 */
function sites(): Map<string, RegisteredSite> {
  if (registry) return registry;

  const enabled = readEnvOr("ESE_SITES_ENABLED", "ese")
    .split(",")
    .map((key) => key.trim().toLowerCase())
    .filter((key) => key.length > 0);

  const all = [buildEse()];
  const map = new Map<string, RegisteredSite>();
  for (const entry of all) {
    if (enabled.includes(entry.key)) map.set(entry.key, entry);
  }

  registry = map;
  return registry;
}

export function siteKeys(): string[] {
  return [...sites().keys()].sort();
}

/**
 * Exact, case-folded lookup. No default and no fuzzy matching.
 *
 * A default site is how a draft ends up somewhere nobody chose. Fuzzy matching is
 * worse: it turns a typo into a silent success against whichever entry happened
 * to be closest.
 */
export function resolveSite(key: unknown): RegisteredSite {
  const keys = siteKeys();

  if (typeof key !== "string" || key.trim().length === 0) {
    throw new Error(
      `A site is required. Valid keys: ${keys.join(", ") || "(none enabled)"}.`,
    );
  }

  const found = sites().get(key.trim().toLowerCase());
  if (!found) {
    throw new Error(
      `Unknown site "${key.trim()}". Valid keys: ${keys.join(", ") || "(none enabled)"}.`,
    );
  }
  return found;
}
