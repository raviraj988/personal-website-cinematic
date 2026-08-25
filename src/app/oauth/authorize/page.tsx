import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getViewer, viewerName } from "@/lib/blog/auth";
import {
  SCOPE_DESCRIPTIONS,
  isMcpOAuthEnabled,
  mcpResource,
  type Scope,
} from "@/lib/mcp-auth/config";
import {
  buildRedirect,
  readAuthorizeParams,
  validateAuthorizeRequest,
} from "@/lib/mcp-auth/authorize-request";
import {
  approveAuthorizationAction,
  denyAuthorizationAction,
} from "@/lib/mcp-auth/actions";

export const metadata: Metadata = {
  title: "Authorize access",
  // A consent screen has no business in an index, and the query string it
  // carries is single-use anyway.
  robots: { index: false, follow: false },
};

// The authorization request lives entirely in the query string, and the decision
// depends on who is signed in. Nothing here is cacheable.
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Rebuilds the query string from the parsed params.
 *
 * The form posts this back so the Server Action can re-validate the *original*
 * request rather than trusting individually-submitted fields. Only the first
 * value of a repeated parameter is kept: every OAuth parameter here is
 * single-valued, and a duplicate is either a client bug or an attempt to smuggle
 * a second `redirect_uri` past validation.
 */
function toQueryString(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") search.set(key, value);
    else if (Array.isArray(value) && value.length > 0) search.set(key, value[0]);
  }
  return search.toString();
}

/**
 * The OAuth consent screen.
 *
 * This page is the entire security boundary for the remote MCP endpoint. Dynamic
 * client registration is open — it has to be, because ChatGPT registers itself —
 * so a registered client is not a trusted one. It stays powerless until an
 * administrator standing here ticks a box, and everything downstream (an access
 * token, a tool call, a draft in `/admin/posts`) descends from that click.
 *
 * The approval action re-runs every check made here. See `actions.ts`: rendering
 * this form is not what authorizes anything.
 */
export default async function AuthorizePage({ searchParams }: PageProps) {
  if (!isMcpOAuthEnabled()) notFound();

  const raw = await searchParams;
  const query = toQueryString(raw);
  const params = readAuthorizeParams(new URLSearchParams(query));

  // Signed-in *and* admitted. `getViewer` rather than `requireAdmin` so the
  // authorization request survives the round trip through the login form —
  // `requireAdmin` would redirect to `/admin/login` with no way back, stranding
  // the administrator on the dashboard while the connector waits for a redirect
  // that never comes. See `return-to.ts` for why the parameter is this narrow.
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/admin/login?next=${encodeURIComponent(`/oauth/authorize?${query}`)}`);
  }
  if (!viewer.profile) redirect("/admin/no-access");

  const validation = await validateAuthorizeRequest(params);

  // RFC 6749 §4.1.2.1: an untrusted redirect_uri must never be redirected to.
  if (validation.kind === "fatal") {
    redirect(`/oauth/authorize/error?message=${encodeURIComponent(validation.message)}`);
  }

  if (validation.kind === "redirect-error") {
    redirect(
      buildRedirect(validation.redirectUri, {
        error: validation.error,
        error_description: validation.description,
        state: validation.state,
      }),
    );
  }

  const { client, selectable, preselected } = validation;
  const clientLabel = client.client_name?.trim() || client.client_id;

  // Shown so the administrator can see *which* resource is being handed over,
  // not just which client is asking. Non-fatal if the origin is unresolvable:
  // the request already validated, so refusing to render the screen over a
  // display string would be worse than omitting it.
  let resourceLabel: string | null = null;
  try {
    resourceLabel = mcpResource();
  } catch {
    resourceLabel = null;
  }

  return (
    <main id="main-content" className="admin-gate">
      <div className="admin-gate__panel">
        <p className="section-label">Authorize</p>
        <h1>{clientLabel} wants access</h1>
        <p className="admin-gate__lede">
          An external application is asking to use the blog drafting tools on your
          behalf. You are signed in as <strong>{viewerName(viewer)}</strong>.
        </p>

        <form className="admin-form admin-form--narrow">
          <input type="hidden" name="oauth_request" value={query} />

          <fieldset className="admin-fieldset oauth-scopes">
            <legend>Permissions</legend>
            {selectable.map((scope: Scope) => (
              <label className="oauth-scope" key={scope}>
                <input
                  type="checkbox"
                  name="scope"
                  value={scope}
                  defaultChecked={preselected.includes(scope)}
                />
                <span>
                  <code>{scope}</code>
                  <small>{SCOPE_DESCRIPTIONS[scope]}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <p className="admin-hint">
            Nothing here can publish, edit, or delete. Drafts created by this
            client appear in the console for you to review, and publishing stays a
            human action.
          </p>

          <div className="admin-actions">
            {/*
              Two submits on one form, so the ticked scopes travel with an
              approval and the original request travels with a denial. `formAction`
              on each button is what routes them to different Server Actions.
            */}
            <button
              className="admin-button admin-button--primary"
              type="submit"
              formAction={approveAuthorizationAction}
            >
              Allow access
            </button>
            <button
              className="admin-button admin-button--quiet"
              type="submit"
              formAction={denyAuthorizationAction}
            >
              Deny
            </button>
          </div>
        </form>

        <dl className="oauth-detail">
          <dt>Client ID</dt>
          <dd>
            <code>{client.client_id}</code>
          </dd>
          {client.client_uri ? (
            <>
              <dt>Client site</dt>
              <dd>{client.client_uri}</dd>
            </>
          ) : null}
          <dt>Redirects to</dt>
          <dd>
            <code>{validation.params.redirectUri}</code>
          </dd>
          {resourceLabel ? (
            <>
              <dt>Resource</dt>
              <dd>
                <code>{resourceLabel}</code>
              </dd>
            </>
          ) : null}
        </dl>

        <p className="admin-hint admin-gate__foot">
          Registration is open to anyone, so a client appearing here is not
          evidence that it is trusted — this screen is the only thing that grants
          it anything. If you did not start this from a tool you control, deny it.{" "}
          <Link href="/admin">Back to the console</Link>
        </p>
      </div>
    </main>
  );
}
