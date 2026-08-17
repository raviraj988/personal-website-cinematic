# Blog, news, and site metadata

Provenance codes are defined in `README.md`.

Both index pages are **functional surfaces** — they label ESE's own writing rather
than make claims about ESE — so most copy here is **[S]** or **[C]**. The
constraint that still applies: no invented voice. The previous `/blog` heading,
"Field notes and working reflections", was carried over from the personal site and
is exactly the kind of borrowed register this replaces.

---

## `/blog`

| Field | Copy | |
|---|---|---|
| Metadata title | Blog | **[S]** |
| Meta description | Notes and analysis from ESE's network on environmental policy, sovereignty, grants, and technical practice. | **[C]** |
| Eyebrow | Blog | **[S]** |
| H1 | Blog | **[S]** |
| Lede | Notes and analysis from ESE's network on environmental policy, sovereignty, grants, and technical practice. | **[C]** |

**On the lede.** The four subjects are ESE's own service areas, so the page
promises only what the organization says it does. It does not describe a tone, a
cadence, or a point of view that nobody has committed to.

**Empty state** — **[S]**:

> No posts published yet. Writing from the network will appear here.

Replaces "No posts yet. The first entries will appear here once they are
published.", which explained the software's behaviour rather than telling a reader
what the page is for.

**Post cap.** The index shows the 24 most recent posts, with a line stating so
when the cap is reached — **[S]**:

> Showing the 24 most recent posts.

---

## `/news`

| Field | Copy | |
|---|---|---|
| Metadata title | News & Updates | **[S]** |
| Meta description | Announcements, newsletter issues, and updates from ESE's work with Native Nations and community partners. | **[C]** |
| Eyebrow | News & updates | **[S]** |
| H1 | News & Updates | **[S]** |
| Lede | Announcements, newsletter issues, and updates from ESE's work with Native Nations and community partners. | **[C]** |

"Native Nations and community partners" is the document's own description of who
ESE works with.

**Empty state** — **[S]**:

> Nothing published yet. Announcements and newsletter issues will appear here.

**Newsletter signup.** No provider has been chosen, so the component renders a
plain invitation to email rather than a form. A subscribe box that silently
discards addresses is worse than no subscribe box, and consent, double opt-in, and
unsubscribe belong to an email provider rather than to this application. See
`03-open-questions.md`.

---

## Post and issue pages

`/blog/[slug]` and `/news/[slug]` render entirely from the database — title,
excerpt, body, cover image, publication date. There is no fixed copy to plan.

Two standing rules apply to what authors write, enforced in the admin console:

- **Excerpt** is required and capped at 320 characters. It is the card summary on
  the index *and* the meta description when no SEO description is set, so it has
  to read as a sentence, not a truncated first line.
- **Cover images require alt text.** The database refuses the combination of an
  image with no description.

---

## Site metadata

| Field | Copy | |
|---|---|---|
| Site name | Environment Sovereignty & Equity | **[V]** |
| Short name | ESE | **[V]** |
| Homepage title | Environment Sovereignty & Equity \| Environmental consulting for Native Nations and communities | **[C]** |
| Meta description | ESE supports Native Nations and marginalized communities through a network of environmental engineers, consultants, and Tribal advocates — policy and sovereignty, grants, technical implementation, climate resilience, and communications. | **[C]** |
| Title template | `%s \| ESE` | **[S]** |

The meta description is built from the document's "Who We Are" list and the five
Service Areas titles. It fits inside the 160 characters search engines display
without being cut mid-word.

### Structured data

The graph describes ESE as the primary entity:

- `Organization` — name, alternate name "ESE", url. Nothing else is asserted: no
  logo, address, founding date, or employee count, because none is supplied.
- `Person` — Laura McKelvey, linked as the Organization's `founder`.
- `WebSite` — `about` → the Organization.
- Each `BlogPosting` links `publisher` → the Organization by `@id`.

### Not yet public

The site ships `noindex, nofollow` until `SEARCH_ENGINE_INDEXING` is flipped in
`src/lib/blog/config.ts`. All SEO machinery is built and wired behind that one
boolean, and `/admin` stays disallowed either way.

`site.canonicalBase` is still `https://example.com`. Every canonical tag, sitemap
URL, and JSON-LD `@id` resolves against it. See `03-open-questions.md`.
