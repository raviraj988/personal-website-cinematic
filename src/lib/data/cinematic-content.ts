import { approach, areasOfWork, selectedWork } from "./site-content";

export const cinematicNavigation = [
  { label: "About", href: "#about" },
  { label: "Areas of Work", href: "#areas-of-work" },
  { label: "Approach", href: "#approach" },
  { label: "Selected Work", href: "#selected-work" },
  { label: "Resources", href: "#resources" },
  { label: "Contact", href: "#contact" },
] as const;

export const cinematicHero = {
  eyebrow: "Environmental and public-interest practice",
  heading: "Working across communities, policy, and public systems.",
  image: "/images/cinematic-river-valley.jpg",
  alt: "A broad river curving through a mountain valley with wetlands and a distant footbridge in early morning light.",
};

export const cinematicAbout = {
  eyebrow: "About Laura",
  heading: "Experience grounded in listening, collaboration, and action",
  paragraphs: [
    "I work with communities, tribal organizations, nonprofits, and public agencies on environmental questions that affect daily life — air and water, land use, permitting, and the public processes that shape decisions.",
    "Much of my work begins with listening. Understanding local context, existing relationships, and the history of a place usually matters more than any single technical document.",
    "I also spend time on the practical side of participation: preparing plain-language materials, facilitating conversations where people can be heard, and translating between community priorities and institutional requirements.",
  ],
  image: "/images/laura-mckelvey-portrait.jpg",
  alt: "Portrait of Laura McKelvey seated outdoors near a wooded shoreline.",
};

export const cinematicAreas = areasOfWork;
export const cinematicApproach = approach.steps;
export const cinematicWork = selectedWork;


export const cinematicAreaImages = [
  {
    src: "/images/environmental-justice-neighborhood.jpg",
    alt: "A tree-lined neighborhood beside a waterfront and industrial landscape.",
    note: "Place, health, and accountability",
  },
  {
    src: "/images/cinematic-community-mapping.jpg",
    alt: "Community members gathered around a table to discuss a shared map.",
    note: "Listening, access, and participation",
  },
  {
    src: "/images/public-process-chamber.jpg",
    alt: "A civic meeting room prepared for a public discussion.",
    note: "Clarity inside complex systems",
  },
  {
    src: "/images/community-tools-mapping.jpg",
    alt: "Maps, notes, and planning materials arranged for a facilitated workshop.",
    note: "Practical paths through disagreement",
  },
] as const;

export const cinematicResources = [
  {
    type: "Guide",
    year: "2024",
    title: "A plain-language guide to public comment periods",
    summary:
      "A concise orientation to what a comment period can change, how the record works, and how to prepare a contribution that can be understood and considered.",
    image: "/images/planning-resources.jpg",
    alt: "A topographic map, field notebook, leaves, and a magnifying glass on a wooden table.",
    action: "Preview the guide",
  },
  {
    type: "Field note",
    year: "2024",
    title: "Questions for a community listening session",
    summary:
      "Prompts for learning what matters locally before setting an agenda, choosing a format, or proposing a solution.",
    image: "/images/community-workshop.jpg",
    alt: "People reviewing aerial maps and handwritten notes around a community hall table.",
    action: "Read the field note",
  },
  {
    type: "Practice note",
    year: "2023",
    title: "Reading the public record without losing local context",
    summary:
      "A practical framework for holding technical evidence, institutional responsibilities, and lived experience in the same conversation.",
    image: "/images/public-process-chamber.jpg",
    alt: "Rows of seats facing a table in a prepared public meeting room.",
    action: "Explore the framework",
  },
  {
    type: "Toolkit",
    year: "2024",
    title: "Mapping community priorities together",
    summary:
      "A visual workshop toolkit for recording priorities, areas of uncertainty, relationships, and possible next steps as a group.",
    image: "/images/community-tools-mapping.jpg",
    alt: "Workshop maps and planning tools prepared for a collaborative mapping session.",
    action: "View the toolkit",
  },
] as const;

export const areaSlides = [
  {
    title: "Environmental Justice",
    description:
      "Helping community knowledge carry weight inside the systems and processes that shape environmental decisions.",
    image: "/images/environmental-justice-neighborhood.jpg",
    alt: "A tree-lined neighborhood near a waterfront and industrial landscape.",
  },
  {
    title: "Community Engagement",
    description:
      "Designing participation that respects people's time, experience, and right to understand how their input is used.",
    image: "/images/community-workshop.jpg",
    alt: "People gathered around a table reviewing maps and notes.",
  },
  {
    title: "Policy and Public Processes",
    description:
      "Making complex public procedures clearer without losing sight of the people most affected by their outcomes.",
    image: "/images/public-process-chamber.jpg",
    alt: "A public meeting room prepared for a civic discussion.",
  },
  {
    title: "Facilitation and Planning",
    description:
      "Creating conditions where disagreement can be named and groups can still move toward practical next steps.",
    image: "/images/community-tools-mapping.jpg",
    alt: "Planning materials and maps arranged for a facilitated workshop.",
  },
] as const;
