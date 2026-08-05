# Laura McKelvey Personal Website  
## Frontend Design and Implementation Specification

**Document status:** Draft for implementation  
**Product type:** Personal professional website  
**Primary subject:** Laura McKelvey  
**Frontend framework:** Next.js App Router with TypeScript  
**Design direction:** Editorial, environmental, community-centered, calm, and credible

---

## 1. Purpose

Build a polished public-facing personal website for Laura McKelvey that presents her professional experience, areas of work, selected projects, publications, resources, and professional relationships.

This is Laura’s personal professional website. It must not be positioned as a consulting company, agency, or multidisciplinary firm.

The website should help visitors:

- Understand who Laura is.
- Learn about her experience and professional approach.
- Explore the subjects and issues on which she works.
- Review selected projects, publications, presentations, and resources.
- Learn about associates or collaborators when relevant.
- Contact Laura regarding professional opportunities, questions, or collaboration.
- Request a conversation or project estimate when appropriate.

The website must avoid implying that Laura operates a large organization or employs a permanent team unless that information is later confirmed.

---

## 2. Product Positioning

### 2.1 Core identity

The site should present Laura as:

- An experienced environmental professional.
- A thoughtful facilitator and collaborator.
- A practitioner working across communities, policy, and public systems.
- A resource for environmental-justice and community-engagement work.
- An individual with a network of associates and collaborators where appropriate.
- A credible source of practical research, guidance, and public-interest resources.

### 2.2 Voice

Use first-person language where it creates warmth and authenticity.

Examples:

- “Where I focus my work”
- “My approach”
- “Selected work”
- “Resources I have developed or contributed to”
- “Let’s connect”

Third-person language may be used in biographies, metadata, structured data, or formal profile sections.

### 2.3 Language to avoid

Do not use unconfirmed or overly corporate language such as:

- “Our firm”
- “Our consultants”
- “Industry-leading”
- “Best-in-class”
- “Our clients”
- “Our proprietary process”
- “Award-winning”
- “Unmatched expertise”
- “Full-service agency”

Do not describe Laura’s work as legal, medical, engineering, or certified scientific advice unless the relevant qualifications are explicitly confirmed.

---

## 3. Intended Audiences

The frontend should be understandable and useful to:

- Community organizations
- Tribal organizations
- Environmental-justice communities
- Government agencies
- Nonprofit organizations
- Advocacy organizations
- Researchers and journalists
- Public-policy professionals
- Potential collaborators
- Grant-making organizations
- Experienced associates and contractors
- Members of the public

Language must be professional but readable without specialized environmental or regulatory knowledge.

---

## 4. Design Principles

### 4.1 Desired character

The design should feel:

- Experienced
- Human
- Calm
- Grounded
- Trustworthy
- Environmentally connected
- Community-centered
- Public-interest oriented
- Practical
- Thoughtful
- Personal rather than corporate

### 4.2 Visual direction

Use:

- Editorial layouts
- Strong serif headings
- Highly readable sans-serif body text
- Generous whitespace
- Authentic environmental and community photography
- Fine borders
- Subtle botanical details where appropriate
- Restrained color
- Clear visual hierarchy
- Minimal, purposeful animation

Avoid:

- SaaS landing-page conventions
- Technology-dashboard styling
- Glassmorphism
- Bright gradients
- Glowing buttons
- Excessive shadows
- Large collections of rounded cards
- Abstract 3D illustrations
- Animated backgrounds
- Carousels
- Autoplay video
- Artificial urgency
- Promotional counters
- Invented testimonials or client logos

---

## 5. Visual System

### 5.1 Provisional color palette

All colors must be implemented as editable design tokens.

| Token | Provisional value | Purpose |
|---|---:|---|
| Forest 900 | `#173D2A` | Primary headings, dark backgrounds |
| Forest 700 | `#28563A` | Primary buttons and interactive elements |
| Moss 500 | `#718265` | Supporting natural accent |
| Cream 50 | `#FAF7EF` | Main page background |
| Warm White | `#FFFDF8` | Cards and elevated content |
| Clay 600 | `#B85F3D` | Eyebrows, links, secondary accents |
| Charcoal 900 | `#252724` | Body text |
| Charcoal 600 | `#5B605A` | Secondary text |
| Sand 200 | `#E6DED0` | Borders and dividers |
| Error 700 | `#A32929` | Errors |
| Success 700 | `#317044` | Success states |

The final palette must be tested for WCAG 2.2 AA contrast.

### 5.2 Typography

Use an editorial serif for headings and a clear sans-serif for body content.

Provisional pairing:

- Headings: Source Serif 4, Lora, Newsreader, or a comparable optimized serif.
- Body and interface: Inter, Source Sans 3, or a comparable accessible sans-serif.

Requirements:

- Use `next/font`.
- Self-host through Next.js where licensing permits.
- Limit the number of font families and weights.
- Maintain comfortable line lengths of approximately 55–75 characters.
- Body text should generally be at least 16px.
- Long-form content should use 18px where practical.
- Avoid thin font weights.
- Support 200% text zoom without lost content or functionality.

### 5.3 Type scale

Suggested desktop sizes:

- Display heading: 64px–72px
- Page heading: 48px–56px
- Section heading: 36px–44px
- Card heading: 22px–28px
- Introductory text: 20px–22px
- Body: 16px–18px
- Metadata: 14px–16px

Use responsive `clamp()` values so headings scale naturally on smaller screens.

### 5.4 Spacing

Use an eight-point-oriented spacing system:

`4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128`

Typical vertical section spacing:

- Mobile: 64px
- Tablet: 80px
- Desktop: 96px–128px

### 5.5 Containers

Implement reusable widths:

- Reading container: approximately 720px
- Content container: approximately 1120px
- Wide container: approximately 1320px

Side padding:

- Mobile: 20px
- Tablet: 32px
- Desktop: 48px

### 5.6 Shape and elevation

- Use square or lightly rounded corners.
- Default radius: 2px–6px.
- Avoid pill shapes except for compact tags and statuses.
- Prefer borders and spacing over shadows.
- When necessary, use a very subtle shadow.

---

## 6. Global Page Structure

Each public page should use this structure:

1. Skip link
2. Site header
3. Main content
4. Optional closing contact invitation
5. Site footer

The main-content element must use a stable target such as:

`<main id="main-content">`

---

## 7. Header

### 7.1 Desktop header

The header should contain:

- Text-based identity: “Laura McKelvey”
- About
- Areas of Work
- Selected Work
- Resources
- Contact

“Tools” may be included when there are approved public entries. It should not receive unnecessary prominence while all tools are unavailable.

### 7.2 Header behavior

- Start with a warm-white or cream background.
- Use a fine bottom border.
- The header may become sticky after scrolling.
- Sticky behavior must not obscure anchor targets.
- Do not apply dramatic shrinking or animated transformations.
- Indicate the current page with more than color alone.
- Ensure every interactive target is at least approximately 44×44 CSS pixels.

### 7.3 Mobile navigation

Use a clearly labeled menu button.

Requirements:

- Correct `aria-expanded` and `aria-controls`.
- Keyboard accessible.
- Focus moved into the menu when opened.
- Focus contained while the menu is presented as a modal.
- Escape closes the menu.
- Closing returns focus to the menu button.
- Background scrolling is prevented while open.
- Navigation remains usable at 200% zoom.
- No hover-only interactions.

---

## 8. Landing Page

### 8.1 Hero

#### Content

- Laura McKelvey wordmark remains visible in the header.
- Editable headline.
- Editable supporting paragraph.
- Primary CTA: “Learn about Laura”
- Secondary CTA: “Explore her work”
- Environmental or community-centered image.

Provisional headline:

> Working across communities, policy, and public systems.

Provisional supporting copy:

> Laura McKelvey brings decades of experience to environmental justice, community engagement, facilitation, and practical public-interest work.

“Decades of experience” is provisional and editable. Do not hard-code an exact number until confirmed.

#### Layout

Desktop:

- Two-column layout.
- Text occupies approximately 45%.
- Image occupies approximately 55%.
- Hero image may extend to the right edge of the wide container.
- CTA buttons appear below supporting copy.

Mobile:

- Text appears first.
- Image appears below the actions.
- Buttons stack or wrap without becoming cramped.
- No content should be embedded as text inside the image.

#### Image direction

Use an authentic environmental or community-centered scene such as:

- A public trail or waterfront
- A neighborhood near natural or industrial systems
- A community workshop
- Planning materials
- People walking through an environmental landscape

The photograph must not imply that depicted people are Laura’s clients or project participants.

### 8.2 Personal introduction

Heading:

> Experience grounded in listening, collaboration, and action

The section should introduce Laura’s values and way of working.

Desktop layout:

- Portrait on one side.
- Copy on the other.
- Balanced editorial composition.

Mobile layout:

- Portrait above copy.
- Do not crop the face or essential context.

Content should support:

- Short introduction
- Two or three paragraphs
- Link to full biography
- Optional résumé/CV download

The generated portrait is only a placeholder. Use an approved photograph of Laura before release.

### 8.3 Areas of work

Use personal terminology instead of “Our Services.”

Preferred heading:

> Where I focus my work

Initial cards:

1. Environmental Justice
2. Community Engagement
3. Policy and Public Processes
4. Facilitation and Planning

Additional subjects may include:

- Research and Analysis
- Permitting and Regulatory Support
- Grant and Program Support
- Strategic Planning
- Collaborative Governance

Each card should include:

- Small icon or restrained illustration
- Title
- Short description
- Descriptive link
- Optional related-work count when meaningful

Cards must:

- Remain balanced with one to eight entries.
- Not show empty placeholder entries.
- Use semantic headings.
- Not make the entire card an ambiguous nested interactive region.
- Avoid decorative motion.

### 8.4 Approach

Include an optional section explaining how Laura works.

Suggested heading:

> From context to practical action

Editable provisional steps:

1. Listen and understand the local context.
2. Organize available information.
3. Identify responsibilities, gaps, and resources.
4. Support meaningful participation.
5. Develop practical recommendations and next steps.

Present this as an adaptable professional approach, not a rigid proprietary method.

Desktop:

- Horizontal numbered sequence or editorial grid.

Mobile:

- Vertical sequence with clear numbering.

### 8.5 Selected work and resources

Preferred heading:

> Recent work and helpful resources

Support a mixed editorial grid containing:

- Projects
- Case studies
- Reports
- Guides
- Articles
- Presentations
- External resources

Each item should show:

- Content-type label
- Title
- Short summary
- Image or document thumbnail when available
- Date if useful
- Clear action such as “Read more,” “View resource,” or “Download PDF”

The section should look intentional with one, two, or three entries.

Never show an empty grid. When no content is published, either hide the section or show a carefully written editorial introduction without empty controls.

### 8.6 Collaborators preview

Use this section only when approved profiles exist.

Preferred framing:

> People I collaborate with

Explain that Laura may work with experienced associates and subject-matter specialists when a project benefits from additional expertise.

Do not imply employment, partnership, or organizational affiliation unless confirmed.

### 8.7 Tools preview

Show only approved tool concepts.

Each tool must have a visible status:

- Available
- Beta
- In Development
- Coming Soon
- Archived

Only entries marked “Available” may display an action that opens the tool.

Unavailable entries must not show “Launch,” “Try,” “Start,” or similar language.

### 8.8 Closing contact section

Preferred heading:

> Let’s connect

Use a calm invitation, not a sales funnel.

Example copy:

> I’m open to conversations about collaboration, new ideas, and opportunities to support communities and public-interest work.

Primary CTA:

- “Get in touch”

Optional secondary CTA:

- “Learn about my work”

The contact section can use a dark forest background with accessible cream text and an approved landscape image.

---

## 9. About Page

The About page should support:

- Page introduction
- Approved portrait
- Short professional overview
- Full biography
- Environmental-justice philosophy
- Experience working with communities and public institutions
- Facilitation and collaboration approach
- Qualifications and affiliations
- Résumé or CV download
- Related work
- Contact invitation

Suggested section sequence:

1. Introduction
2. Professional journey
3. Values and approach
4. Areas of experience
5. Qualifications and affiliations
6. Résumé/CV
7. Contact invitation

Do not publish an exact career duration, qualifications, certifications, affiliations, or organizational relationships until verified.

---

## 10. Areas of Work

### 10.1 Listing page

Use `/areas-of-work` as the preferred public URL. `/services` may redirect to it if the existing system already uses service records.

The listing page should include:

- Introductory heading and text
- Published areas arranged by display order
- Optional related-work links
- Contact invitation

### 10.2 Detail pages

Preferred URL:

`/areas-of-work/[slug]`

Each page should support:

- Title
- Short description
- Full description
- Issues Laura can help address
- Typical contributions or deliverables
- Relevant audiences
- Related projects
- Related resources
- Optional image
- Contact CTA
- Breadcrumbs

Use language such as “How I can contribute” instead of corporate service-sales language.

---

## 11. Selected Work

### 11.1 Listing page

Preferred URL:

`/work`

Support:

- Projects
- Case studies
- Publications
- Selected professional contributions

Only show filters when enough published entries exist to make filtering useful.

### 11.2 Work cards

Each card may include:

- Image
- Content type
- Title
- Summary
- Date or date range
- General location
- Relevant focus areas

Client or partner information must remain optional.

### 11.3 Detail pages

Preferred URL:

`/work/[slug]`

Support:

- Title
- Summary
- Context or challenge
- Laura’s role
- Approach
- Activities
- Outcomes, when verified
- Images
- Documents
- External links
- Related areas of work
- Related resources

Allow anonymized publication. Omitted fields must not leave blank headings or awkward gaps.

---

## 12. Collaborators

Preferred public terminology:

- “Collaborators”
- “Associates and collaborators”
- “People I work with”

Avoid “Our team” unless the organizational relationship is confirmed.

Preferred URL:

`/collaborators`

Profile cards and detail views may include:

- Name
- Professional role
- Biography
- Expertise
- Confirmed credentials
- Selected experience
- Headshot
- Résumé/CV
- Professional link

Do not display personal email addresses by default.

If there are no published collaborator profiles, remove the navigation item and page preview rather than showing an empty directory.

---

## 13. Resources

### 13.1 Resource library

Preferred URL:

`/resources`

Support:

- Reports
- Guides
- Presentations
- Fact sheets
- Articles
- Policy documents
- Templates
- External links
- Videos

### 13.2 Search and filtering

Provide:

- Keyword search
- Resource-type filter
- Topic/category filter

Rules:

- Do not show filters that have no available values.
- Provide a clear “Reset filters” action.
- Preserve filter state in URL parameters.
- Announce updated result counts to assistive technologies.
- Provide a useful no-results state.

### 13.3 Resource cards

Show:

- Type
- Title
- Description
- Publication date
- Author when confirmed
- File format
- File size when available
- Accessibility note
- Download or external-link indicator

External links must be clearly identified. If opening a new tab, communicate that behavior accessibly.

---

## 14. Tools

Preferred URL:

`/tools`

This release only needs a content-driven listing of approved tools and concepts.

Each entry should show:

- Name
- Description
- Intended audience
- Geographic coverage where relevant
- Status
- Related resources

Behavior:

- Available: may show “Open tool.”
- Beta: may show an action only if a real working destination exists.
- In Development: informational display only.
- Coming Soon: informational display only.
- Archived: no primary action.

Do not build unfinished assessment, jurisdiction-navigation, permitting, or agency-matching workflows in the frontend.

---

## 15. Contact Page

Preferred URL:

`/contact`

### 15.1 Introduction

Explain:

- Why someone might contact Laura.
- What information helps Laura understand an inquiry.
- That submitting the form does not establish a contractual or professional relationship.
- How submitted information will be handled, with a link to the privacy policy.

### 15.2 Fields

- Name
- Organization
- Email
- Phone, optional
- Location
- Organization type
- Reason for inquiry
- Area of work
- Project or question summary
- Desired timeline
- Approximate budget range, optional
- Preferred contact method
- Consent checkbox

### 15.3 Inquiry reasons

- General Question
- Request a Conversation
- Request an Estimate
- Community Engagement Support
- Environmental Policy Support
- Facilitation Request
- Permitting or Regulatory Support
- Collaboration Inquiry
- Other

### 15.4 Frontend validation

Implement:

- Validation on submit
- Optional validation after a field has been touched
- Inline error messages
- Error summary above the form
- Links from the error summary to invalid controls
- Persistent entered values after validation failure
- Programmatic focus on the error summary
- Required fields identified in text
- No color-only error communication

### 15.5 Submission states

- Ready
- Submitting
- Success
- Validation error
- Server error
- Rate-limited
- Suspected spam

Disable duplicate submission while a request is pending, but do not rely on the disabled state as the only protection.

Analytics must record only a generic start or success event. Never include entered field values.

---

## 16. Footer

The footer should contain:

- Laura McKelvey
- Short editable professional description
- Main navigation
- Privacy Policy
- Accessibility Statement
- Optional Terms of Use
- Copyright
- Approved professional links
- Approved contact details

Do not display placeholder phone numbers, email addresses, social profiles, or office locations.

---

## 17. Legal and Utility Pages

Implement:

- `/privacy`
- `/accessibility`
- Optional `/terms`
- Custom 404 page

Legal language requiring review must be visibly marked as draft in the content-management interface, but not with alarming development labels on the public site.

The 404 page should:

- Explain that the page was not found.
- Link to the homepage.
- Link to Areas of Work, Selected Work, Resources, and Contact.
- Use the same visual language as the rest of the website.

---

## 18. Frontend Component Architecture

### 18.1 Global components

- `SiteHeader`
- `DesktopNavigation`
- `MobileNavigation`
- `SiteFooter`
- `SkipLink`
- `AnalyticsScript`
- `StructuredData`
- `Breadcrumbs`

### 18.2 Layout components

- `Container`
- `Section`
- `Stack`
- `Cluster`
- `Grid`
- `SplitLayout`
- `ReadingColumn`
- `PageHeader`

### 18.3 Content components

- `Hero`
- `PersonalIntroduction`
- `AreasOfWorkGrid`
- `ApproachSteps`
- `SelectedWorkGrid`
- `CollaboratorsPreview`
- `ResourcesPreview`
- `ToolsPreview`
- `ContactInvitation`
- `RichText`
- `ImageWithCredit`
- `DownloadLink`

### 18.4 Card components

- `AreaOfWorkCard`
- `WorkCard`
- `ResourceCard`
- `CollaboratorCard`
- `ToolCard`

### 18.5 Interface components

- `Button`
- `TextLink`
- `Badge`
- `StatusBadge`
- `Tag`
- `Alert`
- `EmptyState`
- `Skeleton`
- `Pagination`
- `SearchField`
- `FilterSelect`
- `Dialog`
- `Drawer`

### 18.6 Form components

- `FormField`
- `TextInput`
- `TextArea`
- `Select`
- `Checkbox`
- `RadioGroup`
- `FieldError`
- `ErrorSummary`
- `SubmitButton`
- `FormSuccess`

Components should be composable and content-driven. Do not put page-specific database requests inside generic visual components.

---

## 19. Responsive Behavior

### Mobile: 320px–767px

- Single-column layout by default.
- Minimum 20px side padding.
- Hero copy above image.
- Stacked CTAs where necessary.
- Mobile navigation replaces desktop navigation.
- Cards use one column.
- Horizontal sequences become vertical.
- Tables are avoided on public pages.
- Images preserve meaningful focal points.
- No horizontal scrolling at 320px width.

### Tablet: 768px–1023px

- Two-column grids where content remains readable.
- Hero may use an asymmetric split.
- Cards may use two columns.
- Maintain generous spacing.

### Desktop: 1024px–1439px

- Full editorial layouts.
- Two-column hero and introduction.
- Three- or four-column card grids where appropriate.
- Wide content container.

### Wide desktop: 1440px and above

- Cap text and content widths.
- Increase outer whitespace rather than stretching lines.
- Avoid oversized text that overwhelms the page.

---

## 20. Images and Media

### 20.1 Requirements

Every meaningful image must support:

- Editable alternative text
- Credit
- Source
- Licensing information
- Focal-point positioning
- Caption when useful

Decorative images must use empty alternative text.

### 20.2 Image treatment

- Use `next/image`.
- Supply correct responsive `sizes`.
- Use modern formats through the Next.js image pipeline.
- Avoid oversized source files.
- Reserve dimensions to prevent layout shift.
- Prioritize only the principal above-the-fold image.
- Lazy-load below-the-fold images.
- Maintain natural skin tones and authentic environments.
- Avoid aggressive color grading.

### 20.3 Placeholder warning

All generated images in the design concept—including the portrait—are design placeholders. They must not be published as representations of Laura, her work, or communities with which she has worked.

---

## 21. Motion and Interaction

Motion should be subtle and functional.

Permitted:

- Short navigation transitions
- Gentle hover color changes
- Small image-scale effect on linked cards
- Drawer entrance and exit
- Focus and validation transitions

Timing:

- Approximately 120–240 milliseconds
- Standard ease-out curves

When `prefers-reduced-motion: reduce` is active:

- Remove nonessential transitions.
- Remove smooth scrolling.
- Avoid transform-based entrance effects.
- Preserve immediate visibility and functionality.

Do not animate content merely because it enters the viewport.

---

## 22. Accessibility Requirements

Target WCAG 2.2 AA.

Implement and test:

- Semantic HTML
- Skip navigation
- Landmark structure
- Logical heading hierarchy
- Keyboard navigation
- Visible focus indicators
- Accessible mobile navigation
- Accessible dialogs and drawers
- Accessible form labels
- Error associations
- Error summaries
- Alternative text
- Image credits where required
- Descriptive link text
- Sufficient contrast
- Reduced-motion support
- 200% and 400% zoom behavior
- Reflow at 320 CSS pixels
- Minimum target sizes
- No color-only communication
- Captions or transcripts for video
- Correct language attribute
- Meaningful page titles
- Status announcements through appropriate live regions

Automated tools should supplement—not replace—keyboard and screen-reader testing.

---

## 23. SEO and Social Presentation

Each page must support:

- Page title
- Meta description
- Canonical URL
- Open Graph title
- Open Graph description
- Social image
- Robots directive
- Structured data where appropriate

Generate:

- XML sitemap
- Robots configuration
- Breadcrumb structured data
- Website structured data
- Person structured data for Laura
- CreativeWork or Article data for applicable resources
- Service structured data only where the content accurately represents a professional service

Do not include unconfirmed ratings, reviews, awards, address, credentials, or affiliations.

Preferred title pattern:

`Page Title | Laura McKelvey`

Homepage title:

`Laura McKelvey | Environmental Justice, Engagement, and Public-Interest Work`

The exact homepage title remains editable.

---

## 24. Analytics

Use privacy-conscious analytics.

Permitted events:

- Page view
- Contact-form start
- Contact-form successful submission
- Estimate-request submission
- Resource download
- Outbound-link click
- Available-tool visit
- Interest in an unavailable tool

Never send:

- Names
- Email addresses
- Phone numbers
- Organization names
- Location entries
- Project descriptions
- Budget information
- Form-field values

Event properties must use predefined non-personal categories.

---

## 25. Performance Requirements

Targets:

- Lighthouse performance score of 90 or better on representative pages
- Lighthouse accessibility score of 95 or better
- No avoidable layout shift
- Fast largest-contentful-paint on mobile
- Minimal client-side JavaScript
- Server Components by default

Implementation expectations:

- Use Client Components only for navigation, filters, forms, dialogs, and necessary interactions.
- Avoid large UI libraries.
- Optimize and subset fonts.
- Limit font weights.
- Use responsive images.
- Cache published content appropriately.
- Avoid loading analytics until permitted by the selected privacy approach.
- Do not preload below-the-fold media.
- Use loading states only when data cannot be rendered on the server.

---

## 26. Frontend Security and Privacy

- Never expose draft content in public page data.
- Do not place secrets in browser bundles.
- Do not expose private media URLs.
- Sanitize and safely render rich text.
- Do not use raw HTML unless it has passed an approved sanitization process.
- Include security headers through the Next.js configuration.
- Do not place personal data in URLs.
- Do not store contact-form content in browser analytics, local storage, or session replay.
- Apply safe external-link handling.
- Validate uploaded media metadata in the administration interface.
- Do not disclose personal email addresses unless explicitly approved.

---

## 27. Content States

Every dynamic section must support:

- Loading
- Published content
- Empty content
- Error
- Unavailable content

Public empty-state behavior:

- No projects: hide featured-work sections or display a short approved introduction.
- No collaborators: hide collaborator navigation and preview.
- No resources: show a simple “Resources will be added here” message only if the page must remain public.
- No tools: explain that tools are planned without presenting fake actions.
- No search results: show the active query, reset action, and useful navigation.
- Missing image: use a neutral designed fallback without broken-image icons.

Do not render empty headings, controls, wrappers, or grids.

---

## 28. Content Management Expectations Affecting the Frontend

The frontend must render content from structured fields rather than hard-coded page copy.

Administrators should be able to control:

- Navigation labels and order
- Homepage headline and introduction
- Hero image and alternative text
- Section visibility
- Areas-of-work ordering
- Featured work
- Featured resources
- Collaborator visibility
- Tool statuses
- Contact copy
- Footer content
- SEO metadata
- Publication status

Draft, archived, inactive, and soft-deleted records must not appear publicly.

Preview mode must be authenticated and visibly distinguishable from the public site.

---

## 29. Recommended Next.js Structure

```text
src/
  app/
    (site)/
      layout.tsx
      page.tsx
      about/
        page.tsx
      areas-of-work/
        page.tsx
        [slug]/
          page.tsx
      work/
        page.tsx
        [slug]/
          page.tsx
      collaborators/
        page.tsx
        [slug]/
          page.tsx
      resources/
        page.tsx
      tools/
        page.tsx
      contact/
        page.tsx
      privacy/
        page.tsx
      accessibility/
        page.tsx
      terms/
        page.tsx
    not-found.tsx
    sitemap.ts
    robots.ts
    globals.css

  components/
    layout/
    navigation/
    sections/
    cards/
    forms/
    media/
    seo/
    ui/

  lib/
    data/
    analytics/
    validation/
    utilities/

  styles/
    tokens.css
```

Existing project conventions may be retained where they already provide an equivalent clean structure.

---

## 30. Frontend Testing

### Unit tests

Test:

- Validation schemas
- URL and slug utilities
- Analytics event sanitization
- Status-to-label mapping
- Public-content filtering
- Metadata generation

### Component tests

Test:

- Header and footer
- Mobile navigation
- Cards with omitted optional content
- Tool actions by status
- Contact-form errors
- Error summary focus behavior
- Resource filters
- Empty states

### End-to-end tests

Test:

- Desktop public navigation
- Mobile navigation using keyboard controls
- Landing-page CTAs
- Published work visibility
- Draft work invisibility
- Resource search and filtering
- Contact validation
- Successful contact submission
- Rate-limit response
- 404 page
- Canonical metadata
- Sitemap and robots output
- Keyboard-only completion of important flows

### Accessibility testing

Use:

- Automated axe checks
- Lighthouse
- Keyboard-only review
- VoiceOver on macOS and iOS
- At least one Chromium-based browser
- Text zoom and reflow testing
- Reduced-motion testing
- High-contrast or increased-contrast review where supported

---

## 31. Browser Support

Support current and previous major releases of:

- Chrome
- Safari
- Firefox
- Edge

Test:

- iOS Safari
- Android Chrome
- macOS Safari
- Chromium desktop

The site should degrade gracefully if JavaScript fails, except where JavaScript is essential for form submission or interactive filtering.

---

## 32. Content Required Before Publication

Obtain approval for:

- Laura’s preferred professional description
- Final biography
- Approved portrait
- Exact experience wording
- Final areas-of-work terminology
- Selected projects
- Project outcomes
- Client or partner names
- Qualifications
- Certifications
- Affiliations
- Résumé/CV
- Publications and resources
- Contact email
- Phone number, if displayed
- Professional links
- Image credits and permissions
- Domain name
- Privacy-policy language
- Accessibility contact method
- Analytics provider
- Tool descriptions and statuses

Until approved, use editable seed content and clearly identified media placeholders.

---

## 33. Frontend Acceptance Criteria

The frontend is complete when:

- It clearly presents Laura as an individual professional.
- It does not look or read like an agency or consulting-company website.
- All agreed public pages work on mobile and desktop.
- The landing page follows the approved editorial design direction.
- Content can be edited without source-code changes.
- Draft and archived content cannot be accessed publicly.
- Navigation is fully keyboard accessible.
- Mobile navigation works with keyboard and screen-reader controls.
- Contact validation and error recovery are accessible.
- Search and filters have useful empty states.
- Unavailable tools never appear usable.
- Images have approved alternative text and credits.
- Generated placeholder images are not published as factual representations.
- SEO metadata is configurable.
- Sitemap, robots, canonical URLs, and structured data are correct.
- Analytics contain no form values or personal information.
- Core Web Vitals are within acceptable ranges.
- Automated tests pass.
- Manual accessibility checks are documented.
- No West Oakland functionality or branding is present.
- No invented clients, qualifications, outcomes, testimonials, or professional claims are published.

---

## 34. Design Summary

The finished experience should feel like visiting the professional home of a deeply experienced, thoughtful individual. The visual system should draw from environmental landscapes, public-interest publishing, and community-centered practice.

Laura’s identity and perspective should remain the organizing center of every page. The site should communicate expertise through clarity, substance, and selected work—not through corporate scale, promotional language, or visual spectacle.