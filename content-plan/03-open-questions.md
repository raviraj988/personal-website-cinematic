# Open questions

Everything the website needs that the source document does not supply. Each item
says what is on the page in the meantime, so nothing here is silently blank.

Ordered by how much it matters before launch.

---

## 1. The people in the network — **blocks a whole section**

The document says ESE is *"a network of environmental engineers, consultants,
sustainability organizers, and Tribal and community-focused advocates"* and names
nobody. The only name anywhere in the material is a "Josh", in an unfinished note.

Laura McKelvey is on the page as founder because that came from you directly, not
from the document. Her title is inferred from "the driving force behind the
business" and should be confirmed.

**Needed, per person:** name · role or title · one or two sentences · whether they
want a photograph published.

**Currently on the page:** a compact founder credit — portrait, name, role. No
biography, because a biography is not something to compose on somebody's behalf.
The statement block is built and will render as soon as copy exists.

**Note on the portrait:** `IMG_0244.JPG` is the only professional portrait in the
supplied archive, and the archive named nobody. Confirm it is Laura before launch.

---

## 2. Contact address — **blocks launch**

Currently `replace-before-launch@example.com`. Every contact link on the site
points at it.

Also unconfirmed: the practical line above the address — *"Tell us about your
community, the decision you are working toward, and the kind of support that would
help."* It is not from the document. Keep, change, or cut it.

---

## 3. Production domain — **blocks launch and all SEO**

`site.canonicalBase` in `src/lib/data/ese-content.ts` is `https://example.com`.
Every canonical tag, sitemap URL, Open Graph URL, and JSON-LD `@id` resolves
against it. A sitemap full of `example.com` is worse than no sitemap.

**Also:** the site is `noindex, nofollow` until `SEARCH_ENGINE_INDEXING` is set to
`true` in `src/lib/blog/config.ts`. Both should change together.

---

## 4. Which mission statement is canonical

The document ends with two, one after the other, with no indication of which is
final:

**A.** *To empower Indigenous and Justice communities by providing
culturally-informed, technically sound, and sovereignty-respecting environmental
consultations that support self-determination, resilience, and sustainability.*

**B.** *To support communities in navigating environmental issues, including
environmental consulting, collaborative problem-solving, resilience, and
sustainability.*

**Currently on the page:** both — A as the mission, B beneath it as a plainer
restatement. This uses all approved copy and invents nothing, but it does mean the
page states its mission twice. If A is the real one, B should probably go.

---

## 5. The EJ GIS tool description

The document's entry ends mid-sentence:

> EJ GIS Cumulative Impact Tool – This tool will help communities develop their own
> Cumulative Impact analysis, drawing from EPA, NASA …. **(Josh fill out)**

**Currently on the page:** only the confirmed part, generalised to *"drawing on
federal environmental and earth-observation data"* so it reads as a finished
sentence. The fragment and the note are not published.

---

## 6. Newsletter provider

The signup form is built against a swappable endpoint but no provider has been
chosen, so `NEWSLETTER_SIGNUP_ACTION` in `src/lib/news/config.ts` is `null` and the
component renders a plain email invitation instead of a form.

Set that constant to the provider's form endpoint — Mailchimp, Buttondown, and
Resend all expose one — and the form starts working with no other change. Consent,
double opt-in, and unsubscribe should belong to the provider, not to this
application.

---

## 7. Scholarship program detail

The document mentions the ESE Scholarship Program once and says to ask about it. No
eligibility, amounts, process, or deadlines.

**Currently on the page:** the paragraph as written, with a CTA pointing at
contact — which matches what the document actually invites. If the program has
detail worth publishing, it could be a page of its own; it is one of ESE's
strongest differentiators.

---

## 8. Photography for the two full-bleed backgrounds

The hero and the contact footer are the last two **generated placeholder** images
on the site — `cinematic-river-valley.jpg` and `contact-river-sunset.jpg`. They
depict nothing real, and the repository README flags them as not for publication.

They remain because a viewport-width background needs roughly 2560px and the ESE
archive tops out at 1600px. Every other image on the site is now a real ESE
photograph.

**Needed:** one landscape at 2560×1440 and one at 2560×1200. Full detail in
`ref_docs/IMAGE_BRIEF.md`.

---

## Answered, recorded here so it is not re-litigated

- **ESE is the brand.** Laura is the driving force behind it, one of several
  people, not the subject of the site. The site speaks in ESE's plural voice.
- **Photographs render in their own colour.** An earlier build put every image
  through a grayscale-and-green-tint treatment; that is gone.
- **Nothing is upscaled beyond its source.** The prepared set is 1050–2000px from
  the re-exported originals.
- **"How we work" was removed.** Its heading, lede, and five steps came from the
  previous personal site and appeared nowhere in the ESE document.
