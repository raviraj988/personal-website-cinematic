# Admin auth + SEO authoring — plan

## What already exists

Worth stating first, because most of this brief is built:

| Asked for | Status |
|---|---|
| Admin login | **Exists** — `/admin/login`, `signInAction`, `getUser()`-based |
| Create/edit/publish posts | **Exists** — full editor, drafts, scheduling, preview, delete |
| SEO fields | **Exists** — `seo_title` (60), `seo_description` (160), slug, excerpt, cover + required alt |
| SEO output | **Exists** — `BlogPosting` JSON-LD, canonical, OG, Twitter, sitemap, old-slug cache flush |
| Access control | **Exists** — RLS, `requireAdmin`/`requireOwner`, owner-managed `/admin/people` |
| Sign-up | **Missing, and deliberately so** |
| Change password | **Missing** — README lists it as a known gap |
| Forgot password | **Missing** — needs email, which this project has never sent |
| Google sign-in | **Missing** |

So this is four additions and one enhancement, not a new console.

---

## 1. The central decision: authentication ≠ authorization

The existing model separates *having an account* from *being allowed in*. A row in
`profiles` is what grants access, and `0001` says in as many words that it is
"never created by sign-up".

**Adding sign-up and Google does not weaken that**, provided neither creates a
`profiles` row. A new account — by email or by Google — lands on
`/admin/no-access` ("awaiting approval") and can see nothing. An owner approves it
from `/admin/people`, exactly as today.

So sign-up is really *request access*, and that is how the page will read.

**The trade-off, stated plainly:** anyone on the internet can then create an Auth
account in the project. They get zero access, but `auth.users` becomes a surface
strangers can write rows to. Supabase rate-limits it, and the profile gate makes
it harmless in authorization terms — but if you would rather nobody can even
create an account, say so and sign-up becomes invite-only instead. I am building
the open version because "admin can sign up" is what was asked for.

---

## 2. Forgot password — blocked on SMTP, and it will fail silently

**Supabase's built-in mailer allows 2 emails per hour, project-wide, and on
current projects only delivers to members of your Supabase organisation.**

A reset email to anyone outside your team therefore reaches nobody, with no
error anywhere. This is the single most important thing in this document:
**password reset does not work until custom SMTP is configured** in
Authentication → Emails → SMTP Settings. The code ships working; the feature does
not function without that.

### The fragment trap

The default recovery template links to Supabase's `/auth/v1/verify`, which
redirects with the tokens in a **URL fragment** (`#access_token=…`). A fragment is
never sent to the server, so a server-side callback receives nothing at all and
the flow appears broken for reasons invisible in logs.

**Fix, and it is a dashboard change, not a code change** — set the recovery
template to:

```
{{ .SiteURL }}/admin/auth/callback?token_hash={{ .TokenHash }}&type=recovery
```

`token_hash` is a query parameter, reaches the server, and is exchanged with
`verifyOtp`. Documented in the README as part of this change.

---

## 3. Change password — two traps

**`updateUser({ password })` does not ask for the current password.** Without a
re-check, a stolen session cookie is enough for full account takeover. So the
action verifies the current password first — using a *throwaway* client with
`persistSession: false`, so the verification does not rotate the live session's
cookies and sign the user out of their own password change.

**The recovery bypass.** A reset link legitimately sets a password with no current
one. If the action simply allows "current password *or* recovery", then anyone
holding a session cookie can claim recovery and skip the check — which is the
bypass the re-check existed to prevent.

Fix: the callback route, on a verified `type=recovery` exchange, sets a
short-lived **httpOnly** cookie (`ese_pw_recovery`, 15 min). Only that cookie
authorises a no-current-password change, and the action deletes it immediately
after use so the window cannot be replayed.

---

## 4. Google sign-in

- Dashboard: enable the Google provider, add client ID/secret, and register
  `<origin>/admin/auth/callback` as the redirect URL.
- Code: one `GET` route handler exchanging the PKCE code for a session. Route
  handlers are uncached by default, so no cache directives are needed.
- Same landing rule as everything else: profile → `/admin`, no profile →
  `/admin/no-access`.

**Open-redirect guard.** The callback takes a `next` parameter. It is validated to
be a same-origin *relative* path (`/…`, and not `//host`) before redirecting, or a
crafted link turns our own callback into a redirector to an attacker's page.

---

## 5. SEO authoring

The *output* is already correct. What is missing is guidance while writing, so
this adds two things to the editor and one column.

**SERP preview** — renders the title, URL, and description as a search result,
truncated where Google truncates, so an over-long title is visible rather than
theoretical.

**Live checklist**, computed from the draft as it is typed:

- title length in the 30–60 range
- description length in the 70–160 range
- slug present, lowercase, not absurdly long, not a stop-word soup
- excerpt present
- cover image **and** alt text
- at least one `##` heading in the body
- body word count over a floor
- at least one link
- focus keyword present in title, description, slug, first paragraph, a heading

**One additive column**, `posts.focus_keyword`, so the keyword checks have
something to check against. Additive is explicitly permitted by `0001`'s contract
note; nullable with no default, so the external drafting tool is unaffected.

The scoring lives in `src/lib/blog/seo.ts` as **pure functions with no
`server-only` import**, so it is runnable from a plain Node process and gets a
test script — same arrangement as `lib/blog/validation.ts`.

---

## 6. Files

**New**
```
supabase/migrations/0003_focus_keyword.sql
src/app/admin/auth/callback/route.ts        OAuth + recovery exchange
src/app/admin/auth-actions.ts               signup, reset, change password
src/app/admin/signup/page.tsx
src/app/admin/forgot-password/page.tsx
src/app/admin/reset-password/page.tsx
src/app/admin/(console)/account/page.tsx
src/components/admin/SignupForm.tsx
src/components/admin/ForgotPasswordForm.tsx
src/components/admin/ResetPasswordForm.tsx
src/components/admin/ChangePasswordForm.tsx
src/components/admin/GoogleButton.tsx
src/components/admin/SeoPanel.tsx
src/lib/blog/password.ts                    pure rules, testable
src/lib/blog/seo.ts                         pure scoring, testable
scripts/test-password.mjs
scripts/test-seo.mjs
```

**Modified** — `LoginForm` (Google + links), `PostEditor` (SEO panel, keyword),
`validation.ts`, `actions.ts`, `database.types.ts`, console layout nav,
`admin.css`, `README.md`.

**Unchanged** — RLS, the wire contract, the public site, News & Updates.

## 7. Constraints carried through

- Every Server Action re-checks authorization; a layout is not a boundary.
- `"use server"` modules export only async functions — types and constants live
  in sibling modules or the import would fail at the *call site*.
- `getUser()`, never `getSession()`.
- Password rules enforced in the browser, the action, and (length) by Supabase.
