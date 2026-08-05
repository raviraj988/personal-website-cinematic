/**
 * Content types for the public site.
 *
 * Spec §28: the frontend renders content from structured fields rather than
 * hard-coded page copy. These shapes are what a CMS would eventually supply;
 * for now they are satisfied by the editable seed content in `site-content.ts`.
 */

export type ImageContent = {
  /** Path under /public, or an absolute media URL later on. */
  src: string;
  /** Editable alternative text. Empty string marks a decorative image. */
  alt: string;
  width: number;
  height: number;
  /** Displayed credit line, when the licence requires one. */
  credit?: string;
  /** Shown beneath the image when useful. */
  caption?: string;
  /** True while the asset is a design placeholder — spec §20.3. */
  isPlaceholder?: boolean;
};

export type NavigationItem = {
  label: string;
  href: string;
};

export type CallToAction = {
  label: string;
  href: string;
};

export type IconName =
  | "leaf"
  | "people"
  | "document"
  | "table"
  | "compass"
  | "layers";

export type AreaOfWork = {
  slug: string;
  title: string;
  description: string;
  icon: IconName;
  href: string;
  /** Visible link text; kept short. */
  linkLabel: string;
  /** Appended for assistive technology so link names stay distinct. */
  linkQualifier: string;
  /** Omitted rather than shown as zero — spec §8.3. */
  relatedWorkCount?: number;
};

export type ApproachStep = {
  title: string;
  description: string;
};

export type WorkContentType =
  | "Project"
  | "Case Study"
  | "Report"
  | "Guide"
  | "Article"
  | "Presentation"
  | "External Resource";

export type WorkEntry = {
  slug: string;
  contentType: WorkContentType;
  title: string;
  summary: string;
  /** Free-form, e.g. "2023" or "2021–2023". Optional. */
  date?: string;
  /** General location only — never a precise address. */
  location?: string;
  image?: ImageContent;
  action: CallToAction;
  featured?: boolean;
};

export type SectionVisibility = {
  personalIntroduction: boolean;
  areasOfWork: boolean;
  approach: boolean;
  statement: boolean;
  selectedWork: boolean;
  collaborators: boolean;
  tools: boolean;
  contact: boolean;
};
