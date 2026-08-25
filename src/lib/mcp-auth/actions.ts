"use server";

import { redirect } from "next/navigation";

import { getViewer } from "@/lib/blog/auth";
import { isMcpOAuthEnabled, type Scope } from "./config";
import {
  buildRedirect,
  readAuthorizeParams,
  validateAuthorizeRequest,
} from "./authorize-request";
import { issueAuthorizationCode } from "./store";

/**
 * Consent decisions for the OAuth authorization endpoint.
 *
 * A Server Action is a public HTTP endpoint, so this re-runs the full check the
 * page ran: OAuth enabled, caller is a signed-in administrator, and the
 * authorization request is valid for the named client. None of that is inherited
 * from having rendered the consent screen.
 */

/** The consent form posts the original query string back, verbatim. */
function paramsFrom(formData: FormData): URLSearchParams {
  const raw = formData.get("oauth_request");
  return new URLSearchParams(typeof raw === "string" ? raw : "");
}

export async function approveAuthorizationAction(formData: FormData): Promise<void> {
  if (!isMcpOAuthEnabled()) redirect("/");

  // Authorization, re-checked. This is the gate that makes open dynamic client
  // registration safe: only an administrator can turn a registered client into
  // one holding a usable grant.
  //
  // `getViewer` rather than `requireAdmin`, because `requireAdmin` redirects to
  // the login form — correct for a page, wrong here. A POST that arrives without
  // a session is not a person who needs a form, and bouncing it to `/admin/login`
  // would drop the authorization request and report success-shaped navigation for
  // a request that granted nothing.
  const viewer = await getViewer();
  if (!viewer?.profile) {
    redirect("/oauth/authorize/error?message=Sign+in+as+an+administrator+first.");
  }

  const params = readAuthorizeParams(paramsFrom(formData));
  const validation = await validateAuthorizeRequest(params);

  // Re-validated rather than trusted from the form, so a crafted POST cannot
  // approve a redirect_uri that was never registered.
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

  // Scopes come from the ticked boxes, intersected with what this request may
  // grant. Re-derived here rather than trusted from the form, so a crafted POST
  // cannot widen the grant beyond what the consent screen could offer.
  const chosen = formData
    .getAll("scope")
    .filter((value): value is string => typeof value === "string")
    .filter((value): value is Scope => (validation.selectable as string[]).includes(value));

  const granted = [...new Set(chosen)];

  if (granted.length === 0) {
    redirect(
      buildRedirect(validation.params.redirectUri, {
        error: "invalid_scope",
        error_description: "No permissions were granted.",
        state: validation.params.state,
      }),
    );
  }

  const code = await issueAuthorizationCode({
    clientId: validation.client.client_id,
    userId: viewer.profile.id,
    redirectUri: validation.params.redirectUri,
    codeChallenge: validation.params.codeChallenge,
    scopes: granted,
    resource: validation.params.resource,
  });

  // `redirect()` throws a control-flow signal internally, so it must never sit
  // inside a try/catch — the same note `src/app/admin/actions.ts` makes.
  redirect(
    buildRedirect(validation.params.redirectUri, {
      code,
      state: validation.params.state,
    }),
  );
}

export async function denyAuthorizationAction(formData: FormData): Promise<void> {
  if (!isMcpOAuthEnabled()) redirect("/");

  const params = readAuthorizeParams(paramsFrom(formData));
  const validation = await validateAuthorizeRequest(params);

  // A denial needs no session check. It grants nothing, and reporting
  // `access_denied` to the client is the correct outcome either way.
  if (validation.kind === "fatal") {
    redirect(`/oauth/authorize/error?message=${encodeURIComponent(validation.message)}`);
  }

  const redirectUri =
    validation.kind === "ok" ? validation.params.redirectUri : validation.redirectUri;
  const state = validation.kind === "ok" ? validation.params.state : validation.state;

  redirect(
    buildRedirect(redirectUri, {
      error: "access_denied",
      error_description: "The administrator declined the request.",
      state,
    }),
  );
}
