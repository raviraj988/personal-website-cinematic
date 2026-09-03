import manifest from "../../../public/images/ese/manifest.json";

/**
 * Site content for Environment Sovereignty & Equity.
 *
 * The brand and the business is ESE. Laura McKelvey is the driving force behind
 * it and appears among its people — see the `people` export — but the site speaks
 * in ESE's plural voice throughout, and ESE is the entity every page is about.
 *
 * Copy in the `ese` export is transcribed from
 * `ref_docs/ESE Website language_CM Notes1.docx` and is authoritative. Where the
 * source document is incomplete, the gap is marked `TODO(ese)` and rendered as
 * an honest empty state rather than filled with invented text. Two edits were
 * made to the source: "help you in identify funding" drops the stray "in", and
 * the EJ GIS tool's unfinished "(Josh fill out)" note is not published.
 *
 * `people` carries names and roles but no biographies: nothing in the source
 * material is one, and a bio is not something to compose on somebody's behalf.
 */

export type EseImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** Resolves a prepared image by slug, carrying its real emitted dimensions. */
function image(slug: keyof typeof manifest, alt: string): EseImage {
  const { width, height } = manifest[slug];
  return { src: `/images/ese/${slug}.webp`, alt, width, height };
}

/**
 * A photograph from `public/images/` — the set carried over from `main`.
 *
 * Two pools feed this site and they are not interchangeable.
 *
 * `image()` above resolves the **real** ESE archive. Those photographs were
 * re-exported at 1050–1600px on the long edge (2000px for `approach-roots`), which
 * is enough for every contained slot on the page, so every figure, card, and
 * portrait now uses real ESE photography.
 *
 * `wideImage()` resolves photographs this repository's own README documents as
 * **generated design placeholders** — they depict nothing real. Exactly two
 * remain in use, both full-bleed section backgrounds at 1672px and 2000px wide,
 * because nothing in the ESE archive reaches the 2560px a viewport-width
 * background needs. Keeping them is a deliberate, temporary decision.
 *
 * The rule that decides between the pools: **anywhere a person is visible, the
 * photograph must be real.** ESE serves Native Nations and marginalized
 * communities; illustrating that work with generated images of people would
 * misrepresent both those communities and ESE's record, on the website of the
 * organization serving them. A generated river makes no such claim, so
 * landscapes and places may come from this pool.
 *
 * TODO(ese): replace both with real ESE photography at 2560px wide, and delete
 * this helper. See `ref_docs/IMAGE_BRIEF.md`.
 */
function wideImage(
  file: string,
  alt: string,
  width: number,
  height: number,
): EseImage {
  return { src: `/images/${file}`, alt, width, height };
}

/* ------------------------------------------------------------------- site */

export const site = {
  name: "Environment Sovereignty & Equity",
  /* Read by the MCP server's site descriptor (`mcp/site.ts`), not by any page —
     the header rendered this until it gained the logo. Pages that need the
     abbreviation use `ese.abbreviation`. */
  shortName: "ESE",
  role: "Environmental consulting for Native Nations and communities",
  homepageTitle:
    "Environment Sovereignty & Equity | Environmental Consulting for Native Nations",
  metaDescription:
    "Environment Sovereignty & Equity (ESE) supports Native Nations and marginalized communities through a network of environmental engineers, consultants, and Tribal advocates — policy, grants, technical implementation, resilience planning, and communications.",
  /**
   * THE REAL DOMAIN. This was `https://example.com`, and it was not a harmless
   * placeholder: every absolute URL on the site is built from it, so production
   * was serving a canonical link, a sitemap, structured data, a robots.txt
   * sitemap pointer and an `og:image` that all pointed at a domain ESE does not
   * own. The og:image 404s, which is why link previews fell back to scraping
   * whatever image they found on the page instead of the card.
   *
   * Set `NEXT_PUBLIC_SITE_URL` to move the site to a custom domain without
   * touching this file; the fallback is the current production alias.
   */
  canonicalBase:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "https://personal-website-cinematic.vercel.app",
  footerDescription:
    "The bridge between underserved communities and the government agencies, non-profits, and resources that can help them solve real environmental problems.",
} as const;

/**
 * ESE's own brand language, from the kit in `ref_docs/brand/`.
 *
 * Distinct from the `site` export above, which is metadata. This is copy the
 * organisation had written for it and had set in type, so it is quotable as-is
 * rather than paraphrased.
 *
 * The tagline is carried as three separate lines because that is how every
 * lockup in the kit sets it — three stacked clauses, one verb each, not a
 * sentence that happens to wrap. It renders as live text rather than as the
 * kit's `tagline-lockup` artwork: the artwork is outlined type, and a mission
 * statement is worth having selectable and indexed.
 */
export const brand = {
  tagline: ["Protect the environment", "Empower people", "Connect resources"],
} as const;

/**
 * Every item is a ROUTE, not an anchor.
 *
 * Three of these used to be `/#about`, `/#services` and `/#who-we-are` — links
 * that scrolled the landing page rather than going anywhere.
 *
 * "Who we are" is no longer among them: it merged into "About", because the two
 * were halves of one answer and each item's page told you to read the other. That made the
 * navigation a table of contents for one page: nothing could be linked to,
 * shared, or found by a search engine as its own thing, and returning to a
 * section meant loading the whole landing page and jumping.
 *
 * The landing page keeps those sections and now carries a button from each into
 * its full page, so the two are a summary and a destination rather than a
 * duplicate.
 */
export const navigation = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "News", href: "/news" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
] as const;

/* ------------------------------------------------------------ hero */

export const hero = {
  eyebrow: "Environment Sovereignty & Equity",
  /**
   * Both lines are the source document's own sentences from "What is ESE",
   * lightly trimmed for a headline. The previous headline — "The communities
   * facing environmental harm are the ones who can end it" — was a rewrite of
   * the document's "most critical lever" sentence rather than the document, so it
   * asserted a sharper claim than ESE actually made.
   */
  heading: "Supporting Native Nations and other marginalized communities through expertise and experience.",
  lede: "We believe that the communities facing environmental harm are the most critical lever in addressing the harms that impact their homes.",
  /** Full-bleed behind the headline — see `wideImage`. */
  image: wideImage(
    "cinematic-river-valley.jpg",
    "A broad river curving through a mountain valley with wetlands and a distant footbridge in early morning light.",
    1672,
    941,
  ),
  primaryCta: { label: "What ESE does", href: "#services" },
  secondaryCta: { label: "Who we serve", href: "#who-we-serve" },
};

/**
 * Laura McKelvey — the driving force behind ESE.
 *
 * "Founder" is no longer an inference. It was read off "the driving force behind
 * the business", and the brand kit's business-card mockups set it in type:
 * "Laura McKelvey / FOUNDER". Same source confirms the "McKelvey" spelling for
 * her — see the surnames note below, which is still open for Joshua.
 *
 * TODO(ese): confirm the portrait is her — it is the one professional portrait in
 * the supplied archive, but the archive named nobody. `main`'s
 * `laura-mckelvey-portrait.jpg` is deliberately not used here: it is a generated
 * placeholder, and a synthetic face under a real person's name is not something
 * this site should ship.
 */
export const people = {
  eyebrow: "The people",
  /**
   * Not "Who you would be working with", which was the heading here and read as
   * a careers page — that phrasing addresses a candidate, and this section
   * addresses a client. The replacement is the source document's own claim about
   * the network ("decades' worth of technical expertise"), which describes the
   * people without sounding like it is recruiting them.
   */
  heading: "Decades of technical expertise",
  /** The document's own sentence about the network, used as this group's lede. */
  /**
   * TODO(ese): DRAFTED, NOT TRANSCRIBED — needs Laura's approval before launch.
   *
   * Everything else in this file comes from `ESE Website language_CM Notes1.docx`.
   * This does not: it was written to replace a line that was a verbatim duplicate
   * of `ese.whoWeAre.body[1]`, so the same sentence was appearing twice on the
   * landing page, once at 02 and again at 03.
   *
   * It is deliberately conservative. It restates only what the source document
   * already establishes — that ESE is a network, and that people are drawn onto a
   * project by what it needs — and adds no claim about size, tenure, credentials
   * or past engagements, none of which the source supports.
   */
  lede: "ESE is a network rather than a firm. Each project draws on the people whose expertise it actually calls for, so the team you work with is assembled around your community's questions — technical, regulatory and practical — rather than handed down from a fixed roster.",
  cta: { label: "Read full biographies", href: "/people" },

  /**
   * TODO(ese): biographies.
   *
   * `bio` is empty for both and rendered as a stated gap rather than filled in.
   * Nothing in the source document is a biography, and inventing one for a named
   * real person is the one thing this site must not do. Send two or three
   * sentences each and they drop straight in — the card and the `/people` page
   * both render `bio` the moment it is non-empty.
   *
   * The surnames are settled. Both are "McKelvey": the brand kit's business cards
   * confirmed Laura's, and Joshua's was confirmed directly. The source document
   * had supplied "McKelvie" for him, one letter off, and that spelling is gone
   * from the repository — it was a typo, not a second family name.
   *
   * TODO(ese): Joshua's role. The source document's only trace of him is the note
   * "(Josh fill out)" beside the EJ GIS Cumulative Impact Tool, which suggests he
   * works on it — but a suggestion is not a job title.
   */
  members: [
    {
      slug: "laura-mckelvey",
      name: "Laura McKelvey",
      role: "Founder",
      /**
       * Her own sentence, verbatim, from the practice copy supplied for this
       * site — not a biography composed on her behalf. It stays in first person
       * for that reason: turning it into third person would make it a summary
       * somebody wrote about her, which is exactly the thing there is no source
       * for.
       */
      summary:
        "I work with communities, tribal organizations, nonprofits, and public agencies on environmental questions that affect daily life — air and water, land use, permitting, and the public processes that shape decisions.",
      bio: [] as string[],
      portrait: image("portrait-laura", "Portrait of Laura McKelvey outdoors."),
    },
    {
      slug: "joshua-mckelvey",
      name: "Joshua McKelvey",
      /** TODO(ese): replace with his actual title. */
      role: "",
      /**
       * TODO(ese): nothing was supplied about Joshua — the source document's only
       * trace of him is "(Josh fill out)" beside the EJ GIS tool. The card renders
       * a stated gap rather than a sentence invented to fill the space.
       */
      summary: "",
      bio: [] as string[],
      /** No portrait supplied; the card falls back to a monogram. */
      portrait: null,
    },
  ],
};

/* -------------------------------------------------------------------- ESE */

export const ese = {
  name: "Environment Sovereignty & Equity",
  abbreviation: "ESE",

  intro: {
    eyebrow: "What is ESE",
    heading: "The bridge between underserved communities and the resources that can help",
    paragraphs: [
      "At Environment Sovereignty & Equity (ESE) we're here to support Native Nations and other marginalized communities through expertise and experience. We believe that the communities facing environmental harm are the most critical lever in addressing the harms that impact their homes.",
      "At ESE, we've assembled a network of partners and experts with decades' worth of technical expertise to help communities across the country find resources to fix local environmental issues. We are the bridge between underserved communities and the appropriate government agencies, non-profits, and other resources to work together and solve real problems.",
    ],
    /**
     * TODO(ese): this alt text is wrong, and so are the dimensions.
     *
     * The file is a photograph of land managers standing in high-desert scrub
     * (see `COMMUNITY_IMAGE_SOURCES.md`); the sentence below describes an alpine
     * lake, and belongs to a generated placeholder this replaced. The declared
     * 1672x941 is the placeholder's size too — the real file is 1600x1200, so
     * the intrinsic ratio handed to the layout is wrong by a third.
     *
     * `scholarship.image` below has the identical problem. Both are left as
     * found: correcting them changes what two other sections say about
     * photographs of identifiable people, which is a copy decision rather than a
     * layout one. Flagged here so it is not mistaken for intent.
     */
    /**
     * TODO(ese): DRAFTED HEADINGS, NOT TRANSCRIBED — need approval.
     *
     * The BODY of every card on this site is still the source document's own
     * sentence, verbatim. These are only the short headings the cards show before
     * you hover, paired positionally with the sentences above. Keeping them as a
     * parallel list rather than duplicating the prose into card objects means the
     * sentence has exactly one home and cannot drift from its heading.
     */
    cardHeadings: ["Expertise and experience", "The bridge"],
    /* The glyph each card shows in place of a number — see `CardIcon`. Paired
       positionally with `cardHeadings` above, and chosen to restate the heading
       rather than decorate it. */
    cardIcons: ["layers", "bridge"] as const,
    image: wideImage(
      "ese/community-hopi-navajo-restoration.webp",
      "A still alpine lake below granite ridges, with pines along the near shore in late light.",
      1672,
      941,
    ),
  },

  /**
   * The source document offers two mission statements with no indication of
   * which is final. Both are kept — the first as the mission proper, the second
   * as the supporting line, since it reads as the plainer restatement.
   * TODO(ese): confirm which is authoritative.
   */
  mission: {
    eyebrow: "Our mission",
    statement:
      "To empower Indigenous and Justice communities by providing culturally-informed, technically sound, and sovereignty-respecting environmental consultations that support self-determination, resilience, and sustainability.",
    supporting:
      "To support communities in navigating environmental issues, including environmental consulting, collaborative problem-solving, resilience, and sustainability.",
    /**
     * Fills the whole screen behind the mission, under a forest scrim.
     *
     * Decorative — `alt=""` — because the mission text beside it carries the
     * meaning and the scrim reduces the frame to green texture. That scrim is
     * also why 1672px is enough for a full-viewport background here, where the
     * hero would want 2560px: it removes most of the detail resolution buys.
     */
    image: wideImage(
      "mountain-valley-river-sunset.webp",
      "",
      1280,
      720,
    ),
  },

  whoWeAre: {
    eyebrow: "Who we are",
    /**
     * The document's own list, compressed to seven words so it works at 63px.
     * "sustainability organizers" folds into "organizers" and "Tribal and
     * community-focused advocates" into "Tribal advocates"; the four roles that
     * survive are the four the document names first.
     *
     * The body then elaborates the heading rather than restating it — it says what
     * having a network of those people actually means for a project.
     */
    heading: "Environmental engineers, consultants, organizers, and Tribal advocates",
    /**
     * Both of the document's sentences for this section, in full.
     *
     * The heading is a seven-word compression of the first, so the two share the
     * run "environmental engineers, consultants". That is normally the signal that
     * a heading is restating its body — here it is the opposite: the full sentence
     * restores "sustainability" and "Tribal and community-focused", which the
     * heading had to drop to fit, and the second sentence says what the network
     * means in practice.
     *
     * TODO(ese): this is the whole of "Who We Are" in the source document — two
     * sentences. If this section should carry more, it needs copy that does not
     * exist yet; nothing else in the document belongs here without being taken
     * from another section.
     */
    body: [
      "We're a network of environmental engineers, consultants, sustainability organizers, and Tribal and community-focused advocates.",
      "Each person brings their specialized experience to a project to meet the needs of your community or Tribe.",
    ],
    /**
     * TODO(ese): DRAFTED HEADINGS, NOT TRANSCRIBED — need approval.
     *
     * The BODY of every card on this site is still the source document's own
     * sentence, verbatim. These are only the short headings the cards show before
     * you hover, paired positionally with the sentences above. Keeping them as a
     * parallel list rather than duplicating the prose into card objects means the
     * sentence has exactly one home and cannot drift from its heading.
     */
    /**
     * TODO(ese): DRAFTED, NOT TRANSCRIBED — needs approval.
     *
     * A short line above this section's cards. The source document has no
     * introductory sentence here; every sentence it does have is now the body of
     * a card, so a lede could only be written or left absent.
     */
    lede: "ESE is assembled, not staffed. Who joins a project depends on what the project needs.",
    cardHeadings: ["A network, not a firm", "Matched to the project"],
    /* The glyph each card shows in place of a number — see `CardIcon`. Paired
       positionally with `cardHeadings` above, and chosen to restate the heading
       rather than decorate it. */
    cardIcons: ["network", "target"] as const,
    image: image(
      "working-session",
      "A small working group around a conference table, reviewing material together.",
    ),
  },

  whoWeServe: {
    eyebrow: "Who we serve",
    /** The document's own six audiences, compressed. It adds no category. */
    heading: "Native Nations, agencies, communities, and the organizations that serve them",
    /**
     * A National Tribal conference floor — the room this list describes, rather
     * than a metaphor for it. Governments, consortia, enterprises and community
     * organisations are all in an audience like this one.
     *
     * Moved here from "Who we are" because the two sections wanted opposite
     * things from the same picture: a hall full of delegates is a constituency,
     * not a team. `working-session` went the other way for the same reason.
     */
    image: image(
      "conference-session",
      "A conference hall with attendees seated at round tables facing two projection screens.",
    ),
    /**
     * TODO(ese): DRAFTED, NOT TRANSCRIBED — needs approval, as above.
     *
     * The source document lists these six audiences by name and says nothing
     * further about any of them. `intro` and every `description` below were
     * written for this site.
     *
     * They are deliberately DEFINITIONAL rather than promissory: each line says
     * what that kind of body IS, not what ESE has done for one or will do for
     * yours. That distinction matters — a description like "we secure funding for
     * Tribal consortia" would be a claim about ESE's record that nothing in the
     * source supports, while "groups of Tribes working together on shared
     * environmental priorities" is just what the words mean.
     */
    intro:
      "Environmental responsibility rarely sits with a single body. ESE works across the governments, agencies, enterprises and community organizations that share the same land, water and air — and with the communities living with the results.",
    audiences: [
      {
        name: "Native Nations governments",
        description:
          "Tribal governments exercising environmental authority over their own lands.",
      },
      {
        name: "Tribal consortia",
        description:
          "Groups of Tribes working together on shared environmental priorities.",
      },
      {
        name: "Tribal enterprises",
        description:
          "Tribally owned operations balancing commercial activity with environmental responsibility.",
      },
      {
        name: "Federal and state agencies and grant programs",
        description:
          "Public bodies administering environmental programs and the funding behind them.",
      },
      {
        name: "Individual communities",
        description:
          "Neighborhoods and towns living with environmental conditions that affect daily life.",
      },
      {
        name: "Community-based organizations",
        description:
          "Local organizations advocating for the places and people they belong to.",
      },
    ],
  },

  scholarship: {
    eyebrow: "Scholarship program",
    /**
     * The heading states the principle; the body states the mechanism. The old
     * heading was the body's own opening sentence — all 13 words of it, verbatim,
     * directly above itself.
     */
    heading: "Access shouldn't depend on what a community can afford",
    body: "ESE's profits go back to supporting communities who might not be able to afford in-depth consultation and technical assistance. Please ask us about our ESE Scholarship Program to learn how we can support your community.",
    /**
     * A restored wetland: what support of this kind is ultimately for. The
     * street scene that was here moved to Sustainability, where the exposure it
     * shows is the literal subject of the card.
     */
    image: wideImage(
      "ese/community-tribal-field-training.webp",
      "People walking a shoreline path at golden hour, with restored plantings beside them and a city skyline across the water.",
      1800,
      921,
    ),
    /**
     * TODO(ese): DRAFTED HEADINGS, NOT TRANSCRIBED — need approval.
     *
     * The BODY of every card on this site is still the source document's own
     * sentence, verbatim. These are only the short headings the cards show before
     * you hover, paired positionally with the sentences above. Keeping them as a
     * parallel list rather than duplicating the prose into card objects means the
     * sentence has exactly one home and cannot drift from its heading.
     */
    /**
     * TODO(ese): DRAFTED, NOT TRANSCRIBED — needs approval.
     *
     * A short line above this section's cards. The source document has no
     * introductory sentence here; every sentence it does have is now the body of
     * a card, so a lede could only be written or left absent.
     */
    lede: "Cost should not decide which communities get technical help.",
    cardHeadings: ["Profits go back", "Ask about the program"],
    /* The glyph each card shows in place of a number — see `CardIcon`. Paired
       positionally with `cardHeadings` above, and chosen to restate the heading
       rather than decorate it. */
    cardIcons: ["return", "ask"] as const,
    cta: { label: "Ask about the scholarship program", href: "#contact" },
  },

  becomePartner: {
    eyebrow: "Become a partner",
    /** Names the audience; the body then qualifies it. The old heading restated
     *  three-quarters of the sentence directly beneath it. */
    heading: "For environmental professionals and facilitators",
    body: "If you are an environmental professional or facilitator and have worked in place-based community problem-solving and would like to work with us, contact us.",
    /**
     * A community planning session: a large map on the table, notebooks, a
     * laptop, one person pointing something out to the rest. The card asks for
     * professionals "who have worked in place-based community problem-solving",
     * and this is that work in progress — a horizon, which was here, was an
     * invitation to nothing in particular.
     */
    image: wideImage(
      "ese-community-led-planning.webp",
      "Seven people around a table studying a large printed map together, with notebooks and a laptop open beside it.",
      1672,
      941,
    ),
    cta: { label: "Get in touch", href: "#contact" },
  },

  services: {
    eyebrow: "Service areas",
    /** A count of what the document lists. The removed lede claimed "most
     *  projects draw on more than one", which the document does not say. */
    heading: "Five areas of support",
    /**
     * TODO(ese): DRAFTED, NOT TRANSCRIBED — needs approval.
     *
     * `.section-heading-row` is a three-column grid, so this renders BESIDE the
     * heading, not above the cards. That slot wants the heading's complement,
     * and what was here restated it: "Five areas of support" sat 1.5rem from
     * "Five areas of support, offered singly or together…". It also carried a
     * claim the source does not make — the same "projects draw on more than
     * one" idea already struck from `heading` above.
     *
     * So: the heading says how many, this says which. Nothing but the five
     * `items` titles, in their order, which adds no claim at all.
     */
    lede: "Policy and sovereignty, grant development, technical implementation, climate resilience planning, and communications.",
    items: [
      {
        slug: "policy-support-and-sovereignty",
        covers: [
          "Understanding federal and state rules",
          "Crafting environmental policy",
          "Enforcing sovereignty",
          "Translating legal language into plain terms",
          "Building a plan to work within those systems",
        ],
        title: "Policy Support & Sovereignty Services",
        /**
         * TODO(ese): DRAFTED, NOT TRANSCRIBED — needs approval.
         *
         * The one line the card shows before you hover; the full `description`
         * below is transcribed and appears on hover and on the service's own
         * page. Each summary is compressed from this service's own `covers`
         * list, so it names only work the source document already lists.
         *
         * Written rather than taken as `description`'s first sentence, because
         * those run from 26 to 222 characters across the five and would give the
         * row five cards of wildly different heights.
         */
        summary: "Federal and state rules, environmental policy, and enforcing sovereignty.",
        description:
          "We help Native Nations and underserved communities understand federal and state rules, craft environmental policy, and enforce sovereignty. We cut through the legalese to help you understand how the law works in your area and its impact on your community. Then we'll help you craft a plan to work within those systems and solve problems effectively.",
        image: wideImage(
          "public-process-chamber.jpg",
          "A public hearing room prepared for a meeting, with a panel table, microphones, and handouts on the chairs.",
          1200,
          800,
        ),
      },
      {
        slug: "grant-development",
        covers: [
          "Identifying funding",
          "Writing proposals",
          "Developing budgets",
          "Developing work plans",
          "Grant implementation, as needed",
        ],
        title: "Grant Development",
        /**
         * TODO(ese): DRAFTED, NOT TRANSCRIBED — needs approval.
         *
         * The one line the card shows before you hover; the full `description`
         * below is transcribed and appears on hover and on the service's own
         * page. Each summary is compressed from this service's own `covers`
         * list, so it names only work the source document already lists.
         *
         * Written rather than taken as `description`'s first sentence, because
         * those run from 26 to 222 characters across the five and would give the
         * row five cards of wildly different heights.
         */
        summary: "Identifying funding, writing proposals, and developing budgets.",
        description:
          "Need money? Not a problem. We can help you identify funding, write proposals, develop budgets, and work plans. As needed, we can even help with grant implementation.",
        image: wideImage(
          "planning-resources.jpg",
          "A topographic map, open field notebooks, and planning materials laid out on a desk.",
          1200,
          800,
        ),
      },
      {
        slug: "project-implementation",
        covers: [
          "Environmental cleanup",
          "Renewable energy",
          "Water systems",
          "Carbon offset work",
          "Air quality program development and implementation",
          "Reviewing permits",
          "Cumulative impacts assessments for affected communities",
        ],
        title: "Project Implementation (Technical)",
        /**
         * TODO(ese): DRAFTED, NOT TRANSCRIBED — needs approval.
         *
         * The one line the card shows before you hover; the full `description`
         * below is transcribed and appears on hover and on the service's own
         * page. Each summary is compressed from this service's own `covers`
         * list, so it names only work the source document already lists.
         *
         * Written rather than taken as `description`'s first sentence, because
         * those run from 26 to 222 characters across the five and would give the
         * row five cards of wildly different heights.
         */
        summary: "Technical support from environmental cleanup to renewable energy and water systems.",
        description:
          "ESE partners can help with a wide array of technical support, including environmental cleanup, renewable energy, water systems, carbon offset work, air quality program development and implementation, and reviewing permits. We can also help conduct cumulative impacts assessments for affected communities.",
        image: wideImage(
          "environmental-fieldwork.jpg",
          "Water sampling beside a stream: gloved hands writing in a notebook, with sample bottles on the rock.",
          1200,
          800,
        ),
      },
      {
        slug: "sustainability-and-climate-resilience",
        covers: [
          "Strategic plans",
          "Vulnerability assessments",
          "Energy audits",
          "Climate adaptation plans",
          "Climate mitigation plans",
        ],
        title: "Sustainability & Climate Resilience Planning",
        /**
         * TODO(ese): DRAFTED, NOT TRANSCRIBED — needs approval.
         *
         * The one line the card shows before you hover; the full `description`
         * below is transcribed and appears on hover and on the service's own
         * page. Each summary is compressed from this service's own `covers`
         * list, so it names only work the source document already lists.
         *
         * Written rather than taken as `description`'s first sentence, because
         * those run from 26 to 222 characters across the five and would give the
         * row five cards of wildly different heights.
         */
        summary: "Strategic plans, vulnerability assessments, and energy audits.",
        description:
          "We can help you develop strategic plans, conduct vulnerability assessments, energy audits, and climate adaptation and mitigation plans.",
        /**
         * A real ESE photograph, and the hillside community that was here has
         * moved to the mission band — the same frame in both places reads as an
         * error. A cypress standing in water is the closest thing in the archive
         * to what adaptation planning is about: something rooted in the condition
         * it has to survive.
         */
        /**
         * Houses on a riverbank with a refinery on the far shore — homes between
         * a floodplain and heavy industry. That is the *subject* of a
         * vulnerability assessment, which is the first thing this card lists.
         *
         * It replaces a restored wetland, which showed a good outcome with
         * nobody exposed to it; adaptation planning starts from exposure.
         */
        image: wideImage(
          "environmental-justice-neighborhood.jpg",
          "A residential street of houses and mature trees beside a river, with refinery stacks on the far bank.",
          1200,
          800,
        ),
      },
      {
        slug: "communications-support",
        covers: [
          "Communicating initiatives to Tribal members",
          "Reaching youth",
          "Briefing elected leaders",
          "PR support",
          "Advertising",
          "Marketing",
          "Other outreach strategies",
        ],
        title: "Communications Support",
        /**
         * TODO(ese): DRAFTED, NOT TRANSCRIBED — needs approval.
         *
         * The one line the card shows before you hover; the full `description`
         * below is transcribed and appears on hover and on the service's own
         * page. Each summary is compressed from this service's own `covers`
         * list, so it names only work the source document already lists.
         *
         * Written rather than taken as `description`'s first sentence, because
         * those run from 26 to 222 characters across the five and would give the
         * row five cards of wildly different heights.
         */
        /* 52 characters against 62-83 for the other four, which is why this
           card read thin next to them. Extended to 90 using the second half of
           its own `covers` — PR support, advertising, marketing — so it still
           names only work the source document lists, and the row now runs
           62-90 instead of 52-83. */
        summary:
          "Reaching Tribal members, youth, and elected leaders through PR, advertising, and marketing.",
        description:
          "Good work needs a good message. We help tribal programs communicate initiatives to members, youth, and elected leaders. Through PR support, advertising, marketing, and other outreach strategies, we can help you get the word out.",
        image: wideImage(
          "community-tools-mapping.jpg",
          "Printed maps, sticky notes, and a tablet showing a mapping tool, arranged on a desk.",
          1200,
          800,
        ),
      },
    ],
  },

  /**
   * Blocks shared by every service page at /services/[slug].
   *
   * `covers` on each service above is the document's own prose list, pulled out
   * as a list — extraction, not invention. A reader scanning for "cumulative
   * impacts assessment" will not find it inside a paragraph.
   *
   * `awaiting` is rendered as a stated gap. How a project runs and what a client
   * receives are not in the source document and are not inferable, and a service
   * page that invents a process is a claim about a real business that a real
   * client may act on. See content-plan/04-service-pages.md.
   */
  servicePage: {
    eyebrow: "Service area",
    coversHeading: "What this covers",
    audienceHeading: "Who this is for",
    scholarshipNote:
      "ESE's profits go back to supporting communities who might not be able to afford in-depth consultation and technical assistance.",
    scholarshipCta: { label: "About the scholarship programme", href: "/#contact" },
    awaitingHeading: "How a project runs",
    awaiting:
      "How a project runs, and what you receive at the end of it, will be published here.",
    contactCta: { label: "Talk to us about this", href: "/#contact" },
    backCta: { label: "All service areas", href: "/#services" },
  },

  caseStudy: {
    eyebrow: "Case study",
    label: "PFAS Degradation",
    heading: "Developing a new process to degrade PFAS in water systems",
    body: "ESE is partnering with Bioremediation Resource Recovery Systems, LLC, to develop a new innovative process to degrade PFAS in water and wastewater systems. This process is covered by a provisional patent. Bench testing and field trials are underway; stay tuned for deployment opportunities.",
    /**
     * TODO(ese): DRAFTED HEADINGS, NOT TRANSCRIBED — need approval.
     *
     * The BODY of every card on this site is still the source document's own
     * sentence, verbatim. These are only the short headings the cards show before
     * you hover, paired positionally with the sentences above. Keeping them as a
     * parallel list rather than duplicating the prose into card objects means the
     * sentence has exactly one home and cannot drift from its heading.
     */
    cardHeadings: ["Provisional patent", "In field trials"],
    /* The glyph each card shows in place of a number — see `CardIcon`. Paired
       positionally with `cardHeadings` above, and chosen to restate the heading
       rather than decorate it. */
    cardIcons: ["seal", "flask"] as const,
    status: "Bench testing and field trials underway",
    /**
     * `case-study-water` was a soft snapshot of a river bank with ducks on it —
     * not what a technical case study about degrading PFAS in water and
     * wastewater systems should be illustrated with. This is clean water running
     * over rock, at 2000px wide.
     */
    /**
     * A field team sampling a stream — bottles, a sample case, notes on a
     * clipboard, someone drawing water at the edge. The card is about degrading
     * PFAS in water systems, and this is the monitoring that bookends that work.
     * It replaces a picture of moving water, which showed the medium but not the
     * method.
     */
    image: wideImage(
      "ese-community-water-monitoring.webp",
      "A field team sampling a stream: one person drawing water at the edge, another recording readings, sample bottles and a case on the bank.",
      1280,
      720,
    ),
  },

  tools: {
    eyebrow: "Tools and resources",
    /** The document's own words for this section are exactly "Coming soon". */
    heading: "Coming soon",
    /**
     * TODO(ese): DRAFTED, NOT TRANSCRIBED — needs approval.
     *
     * Renders beside the heading, as in `services` above. What was here said
     * "in development" next to a heading reading "Coming soon", above two cards
     * each carrying an "In development" status — the same fact three times and
     * nothing else.
     *
     * Naming the two tools instead. "For communities to use themselves" is the
     * one characterisation, and both descriptions support it: Tribes "develop
     * language … independently, with guidance provided by the tool", and
     * communities "develop their own cumulative impact analysis".
     */
    lede: "A Treatment as a State guide for the Clean Air Act, and a cumulative impact tool — both designed for communities to use themselves.",
    items: [
      {
        title: "TAS for Tribes implementing the Clean Air Act (CAA)",
        description:
          "An online guide to help Tribes through the decision process of whether Treatment as a State is appropriate for their Tribe, and if so for which sections of the Clean Air Act. The final product will be a partially populated TAS application. Tribes will develop language on jurisdiction, government structure, and authority independently, with guidance provided by the tool.",
      },
      {
        title: "EJ GIS Cumulative Impact Tool",
        /**
         * TODO(ese): the source document leaves this description unfinished —
         * "drawing from EPA, NASA …. (Josh fill out)". Publishing the fragment
         * would look like a mistake, so only the confirmed part is shown.
         */
        description:
          "A tool to help communities develop their own cumulative impact analysis, drawing on federal environmental and earth-observation data.",
      },
    ],
  },
};

/* ---------------------------------------------------------------- contact */

export const contact = {
  eyebrow: "Contact",
  /**
   * "Contact us" is the document's own instruction, and the body is its "Become a
   * partner" paragraph — the only contact copy the source provides. What was here
   * before opened with "We're open to conversations about collaboration, new ideas,
   * and opportunities…", which was the previous personal site's line pluralised.
   */
  heading: "Contact us",
  copy: "If you are an environmental professional or facilitator and have worked in place-based community problem-solving and would like to work with us, contact us.",
    email: "lauradmckelvey@gmail.com",
  /**
   * Contained inside `.cinematic-footer__visual`, not a full-bleed section
   * ground — the footer's composition is back to the one on `main`.
   */
  image: wideImage(
    "contact-river-sunset.jpg",
    "A river landscape at sunset, opening toward the horizon.",
    2000,
    799,
  ),
};

export const newsTeaser = {
  eyebrow: "News & updates",
  /** Describes the feed beneath it and nothing else. This section is the blog and
   *  newsletter list, so its heading is not a claim about ESE. */
  heading: "Recent posts and newsletter issues",
  cta: { label: "All news & updates", href: "/news" },
  image: image(
    "news-shoreline",
    "A lighthouse on a headland above calm water at dawn.",
  ),
};
