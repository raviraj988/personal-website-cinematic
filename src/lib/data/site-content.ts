import type {
  ApproachStep,
  AreaOfWork,
  CallToAction,
  ImageContent,
  NavigationItem,
  SectionVisibility,
  WorkEntry,
} from "./types";

/**
 * Editable seed content — spec §32.
 *
 * All copy here is provisional and awaiting Laura's approval. Nothing in this
 * file asserts a client name, credential, affiliation, award, testimonial, or
 * an exact number of years of experience.
 *
 * Links currently point at sections of the landing page. When the remaining
 * routes are built, swap the `href` values for real paths.
 */

export const site = {
  name: "Laura McKelvey",
  /** Small line beneath the wordmark; keep short and factual. */
  role: "Environmental & Community Practice",
  /** Spec §23 — homepage title remains editable. */
  homepageTitle:
    "Laura McKelvey | Environmental Justice, Engagement, and Public-Interest Work",
  metaDescription:
    "Laura McKelvey works across communities, policy, and public systems — supporting environmental justice, community engagement, facilitation, and practical public-interest work.",
  /** Set to the production domain before release. */
  canonicalBase: "https://example.com",
  footerDescription:
    "An environmental professional working alongside communities, tribal organizations, nonprofits, and public agencies on environmental justice, engagement, and practical public-interest work.",
} as const;

export const primaryNavigation: NavigationItem[] = [
  { label: "About", href: "#about" },
  { label: "Areas of Work", href: "#areas-of-work" },
  { label: "Selected Work", href: "#selected-work" },
  { label: "Resources", href: "#selected-work" },
  { label: "Contact", href: "#contact" },
];

export const headerCta: CallToAction = {
  label: "Get in touch",
  href: "#contact",
};

/** Spec §27 — sections can be switched off rather than rendered empty. */
export const sectionVisibility: SectionVisibility = {
  personalIntroduction: true,
  areasOfWork: true,
  approach: true,
  statement: true,
  selectedWork: true,
  // No approved collaborator profiles yet — spec §8.6, §12.
  collaborators: false,
  // No approved tool entries yet — spec §8.7.
  tools: false,
  contact: true,
};

/* ------------------------------------------------------------------ hero */

export const hero = {
  eyebrow: "Environmental and public-interest practice",
  headline: "Working across communities, policy, and public systems.",
  supportingCopy:
    "Laura McKelvey brings decades of experience to environmental justice, community engagement, facilitation, and practical public-interest work.",
  primaryCta: { label: "Learn about Laura", href: "#about" } as CallToAction,
  secondaryCta: { label: "Explore her work", href: "#selected-work" } as CallToAction,
  /** Who Laura works alongside. Short and factual; edit or remove freely. */
  audience: {
    label: "Working alongside",
    text: "Communities and tribal organizations, nonprofits and advocacy groups, and public agencies.",
  },
  image: {
    src: "/images/hero-waterfront.jpg",
    alt: "People walking along a gravel path beside a shoreline, with restored plantings in the foreground and a city skyline in the distance.",
    width: 1800,
    height: 921,
    credit: "Design placeholder image — replace before publication.",
    isPlaceholder: true,
  } satisfies ImageContent,
};

/* --------------------------------------------------- personal introduction */

export const personalIntroduction = {
  eyebrow: "About Laura",
  heading: "Experience grounded in listening, collaboration, and action",
  paragraphs: [
    "I work with communities, tribal organizations, nonprofits, and public agencies on environmental questions that affect daily life — air and water, land use, permitting, and the public processes that shape decisions.",
    "Much of my work begins with listening. Understanding local context, existing relationships, and the history of a place usually matters more than any single technical document. From there, I help organize what is known, identify what is missing, and make the path to a decision clearer for everyone involved.",
    "I also spend time on the practical side of participation: preparing plain-language materials, facilitating conversations where people can be heard, and translating between community priorities and institutional requirements.",
  ],
  actions: [
    { label: "Read the full biography", href: "#about" },
    { label: "Download résumé (PDF)", href: "#about" },
  ] satisfies CallToAction[],
  portrait: {
    src: "/images/portrait-placeholder.jpg",
    alt: "Placeholder portrait of a woman seated outdoors near a wooded shoreline, looking toward the middle distance.",
    width: 1000,
    height: 1250,
    caption:
      "Placeholder portrait. This is a generated design image and is not a photograph of Laura McKelvey.",
    isPlaceholder: true,
  } satisfies ImageContent,
};

/* --------------------------------------------------------- areas of work */

export const areasOfWorkSection = {
  eyebrow: "Areas of work",
  heading: "Where I focus my work",
  lede: "Four subjects make up most of my work. They overlap more often than not, and a project usually draws on several at once.",
};

export const areasOfWork: AreaOfWork[] = [
  {
    slug: "environmental-justice",
    title: "Environmental Justice",
    description:
      "Supporting communities that carry a disproportionate share of environmental burden, and helping make their concerns legible inside formal processes.",
    icon: "leaf",
    href: "#areas-of-work",
    linkLabel: "How I contribute",
    linkQualifier: "to environmental justice work",
    relatedWorkCount: 4,
  },
  {
    slug: "community-engagement",
    title: "Community Engagement",
    description:
      "Designing participation that respects people’s time — clear materials, accessible meetings, and honest reporting back on what was heard.",
    icon: "people",
    href: "#areas-of-work",
    linkLabel: "How I contribute",
    linkQualifier: "to community engagement work",
    relatedWorkCount: 6,
  },
  {
    slug: "policy-and-public-processes",
    title: "Policy and Public Processes",
    description:
      "Helping organizations navigate comment periods, permitting steps, and agency processes without losing sight of the people affected.",
    icon: "document",
    href: "#areas-of-work",
    linkLabel: "How I contribute",
    linkQualifier: "to policy and public processes",
    relatedWorkCount: 3,
  },
  {
    slug: "facilitation-and-planning",
    title: "Facilitation and Planning",
    description:
      "Facilitating working groups and planning sessions where disagreement is expected, so that groups can still reach practical next steps.",
    icon: "table",
    href: "#areas-of-work",
    linkLabel: "How I contribute",
    linkQualifier: "to facilitation and planning work",
    relatedWorkCount: 5,
  },
];

/* --------------------------------------------------------------- approach */

export const approach = {
  eyebrow: "My approach",
  heading: "From context to practical action",
  lede: "An adaptable way of working rather than a fixed method. The sequence shifts to fit the community, the timeline, and the decision at hand.",
  steps: [
    {
      title: "Listen and understand the local context",
      description:
        "Learn the history, relationships, and concerns already present before proposing anything.",
    },
    {
      title: "Organize available information",
      description:
        "Gather documents, data, and prior commitments into something a group can actually review together.",
    },
    {
      title: "Identify responsibilities, gaps, and resources",
      description:
        "Clarify who decides what, where authority is unclear, and which resources are realistically available.",
    },
    {
      title: "Support meaningful participation",
      description:
        "Create conditions where people can take part on their own terms and see how input is used.",
    },
    {
      title: "Develop practical recommendations and next steps",
      description:
        "Close with options a community or agency can carry forward without outside help.",
    },
  ] satisfies ApproachStep[],
};

/* -------------------------------------------------------- statement band */

export const statement = {
  eyebrow: "Working principle",
  quote:
    "Communities already know what they are living with. My job is to help make that knowledge count inside the processes that decide what happens next.",
  attribution:
    "Provisional statement, pending Laura’s review. Replace with approved language before publication.",
  image: {
    src: "/images/restored-wetland.jpg",
    alt: "",
    width: 1800,
    height: 963,
    isPlaceholder: true,
  } satisfies ImageContent,
};

/* ----------------------------------------------- selected work & resources */

export const selectedWork: WorkEntry[] = [
  {
    slug: "riverfront-community-engagement",
    contentType: "Case Study",
    title:
      "Building a shared record in a riverfront neighborhood review",
    summary:
      "A long-running review where residents, a city department, and a permit applicant needed one agreed set of facts before any of them could discuss options. The work centered on translation, sequencing, and keeping the record open.",
    date: "2023",
    location: "Great Lakes region",
    featured: true,
    image: {
      src: "/images/environmental-justice-neighborhood.jpg",
      alt: "A residential street with mature trees and front gardens, a riverside path, and industrial stacks visible in the distance.",
      width: 1200,
      height: 800,
      isPlaceholder: true,
    },
    action: { label: "Read the case study", href: "#selected-work" },
  },
  {
    slug: "plain-language-participation-guide",
    contentType: "Guide",
    title: "A plain-language guide to public comment periods",
    summary:
      "A short guide explaining what a comment period is, what it can and cannot change, and how to prepare a comment that will be read.",
    date: "2024",
    image: {
      src: "/images/planning-resources.jpg",
      alt: "A wooden desk with an unfolded topographic map, field notebooks, pressed leaves, and a magnifying glass.",
      width: 1200,
      height: 800,
      isPlaceholder: true,
    },
    action: { label: "Download PDF", href: "#selected-work" },
  },
  {
    slug: "facilitating-difficult-planning-sessions",
    contentType: "Presentation",
    title: "Facilitating planning sessions when trust is low",
    summary:
      "Slides and facilitator notes from a session on running planning meetings where participants arrive with real and well-founded disagreement.",
    date: "2024",
    image: {
      src: "/images/community-workshop.jpg",
      alt: "Six people seated around a table in a community hall, studying aerial maps and handwritten notes together.",
      width: 1200,
      height: 697,
      isPlaceholder: true,
    },
    action: { label: "View resource", href: "#selected-work" },
  },
];

export const selectedWorkSection = {
  eyebrow: "Selected work",
  heading: "Recent work and helpful resources",
  lede: "A small selection of projects, writing, and materials. Entries are added as they are reviewed and approved for publication.",
  footLink: { label: "See all work and resources", href: "#selected-work" } satisfies CallToAction,
};

/* --------------------------------------------------------------- contact */

export const contactInvitation = {
  eyebrow: "Contact",
  heading: "Let’s connect",
  copy: "I’m open to conversations about collaboration, new ideas, and opportunities to support communities and public-interest work.",
  primaryCta: { label: "Get in touch", href: "#contact" } satisfies CallToAction,
  secondaryCta: {
    label: "Learn about my work",
    href: "#areas-of-work",
  } satisfies CallToAction,
  /** Short, non-committal orientation for people considering an enquiry. */
  aside: [
    {
      term: "Helpful to include",
      detail:
        "Who you are, the community or organization involved, the decision or timeline you are working toward, and what kind of support would help.",
    },
    {
      term: "What happens next",
      detail:
        "A message is a conversation, not a commitment. Getting in touch does not create a contractual or professional relationship.",
    },
  ],
  image: {
    src: "/images/contact-river-sunset.jpg",
    alt: "",
    width: 2000,
    height: 800,
    isPlaceholder: true,
  } satisfies ImageContent,
};

/* ---------------------------------------------------------------- footer */

export const footerNavigationGroups: {
  title: string;
  items: NavigationItem[];
}[] = [
  {
    title: "Site",
    items: [
      { label: "About", href: "#about" },
      { label: "Areas of Work", href: "#areas-of-work" },
      { label: "Selected Work", href: "#selected-work" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Information",
    items: [
      { label: "Privacy Policy", href: "#" },
      { label: "Accessibility Statement", href: "#" },
    ],
  },
];

/**
 * Spec §16: no placeholder phone numbers, email addresses, social profiles, or
 * office locations. This list stays empty until real details are approved.
 */
export const approvedContactDetails: { label: string; href: string }[] = [];
