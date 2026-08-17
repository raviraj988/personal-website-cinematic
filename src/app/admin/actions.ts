"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin, requireOwner } from "@/lib/blog/auth";
import { getPostForAdmin } from "@/lib/blog/queries";
import { BLOG_PATH } from "@/lib/blog/config";
import { NEWS_PATH } from "@/lib/news/config";
import { checkCoverSize, sniffImage } from "@/lib/blog/image";
import { reencodeCover } from "@/lib/blog/image-server";
import {
  emptyToNull,
  hasErrors,
  validatePost,
  type FieldErrors,
  type PostFormValues,
} from "@/lib/blog/validation";
import type { PostCategory, ProfileRole } from "@/lib/supabase/database.types";

/**
 * Every export in this file re-checks authorization as its first act.
 *
 * A Server Action is a public HTTP endpoint. Next gives it an obscure id rather
 * than a readable path, but obscurity is not a boundary — the id is in the client
 * bundle, and anyone can POST to it with a hand-written body. The admin layout
 * runs when a *page* renders; it does not run when one of these is invoked. So
 * the gate is here, in every one of them, and RLS is behind that.
 */

export type PostFormState = {
  ok: boolean;
  message?: string;
  errors?: FieldErrors;
};

/* ------------------------------------------------------------------ helpers */

function readPostForm(formData: FormData): PostFormValues {
  return {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    content: String(formData.get("content") ?? ""),
    // Defaulted rather than required, so a form posted without the field — the
    // external drafting tool, or an older cached client bundle — still lands on
    // the blog rather than failing validation.
    category: String(formData.get("category") ?? "blog"),
    coverImageUrl: emptyToNull(String(formData.get("coverImageUrl") ?? "")),
    coverImageAlt: emptyToNull(String(formData.get("coverImageAlt") ?? "")),
    seoTitle: emptyToNull(String(formData.get("seoTitle") ?? "")),
    seoDescription: emptyToNull(String(formData.get("seoDescription") ?? "")),
  };
}

/** Where a post of this category is published. */
function basePathFor(category: PostCategory): string {
  return category === "news" ? NEWS_PATH : BLOG_PATH;
}

/**
 * Flush every cached surface a post appears on.
 *
 * `previous` is the part that is easy to forget and expensive to miss: after a
 * slug change the old URL is still in the route cache, so without this it keeps
 * serving the post's previous content — indefinitely, to anyone holding the old
 * link, including crawlers.
 *
 * Moving a post *between* categories has the same problem one level up. The old
 * index and the old article URL both have to be flushed, or the piece stays
 * visible on the index it just left.
 */
function revalidatePost(
  slug: string,
  category: PostCategory,
  previous?: { slug: string; category: PostCategory } | null,
) {
  const base = basePathFor(category);
  revalidatePath(base);
  revalidatePath(`${base}/${slug}`);

  if (previous) {
    const previousBase = basePathFor(previous.category);
    if (previousBase !== base) revalidatePath(previousBase);
    if (previousBase !== base || previous.slug !== slug) {
      revalidatePath(`${previousBase}/${previous.slug}`);
    }
  }

  // The landing page carries the three most recent news entries.
  if (category === "news" || previous?.category === "news") revalidatePath("/");

  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
}

/**
 * Turn a Postgres error into something an author can act on.
 *
 * The unique violation on `slug` is the one a person hits by accident, so it gets
 * routed back to the field that caused it instead of appearing as a form-level
 * failure with a constraint name in it.
 */
function describeDbError(message: string, code?: string): PostFormState {
  if (code === "23505" || message.includes("posts_slug_key")) {
    return {
      ok: false,
      errors: { slug: "Another post already uses this slug. Choose a different one." },
    };
  }

  return { ok: false, message: `The database refused the change: ${message}` };
}

/* ------------------------------------------------------------------- create */

export async function createPostAction(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const { user } = await requireAdmin();

  const values = readPostForm(formData);
  const errors = validatePost(values);
  if (hasErrors(errors)) {
    return { ok: false, errors, message: "Nothing was saved — see the fields below." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: values.title.trim(),
      slug: values.slug.trim(),
      excerpt: values.excerpt.trim(),
      content: values.content,
      category: values.category as PostCategory,
      cover_image_url: values.coverImageUrl,
      cover_image_alt: values.coverImageAlt,
      seo_title: values.seoTitle,
      seo_description: values.seoDescription,
      author_id: user.id,
      // New posts start as drafts and are attributed to a person. Publishing is a
      // separate, deliberate action.
      status: "draft",
      source: "human",
      published_at: null,
    })
    .select("id")
    .single();

  if (error) return describeDbError(error.message, error.code);

  revalidatePath("/admin");
  redirect(`/admin/posts/${data.id}?created=1`);
}

/* ------------------------------------------------------------------- update */

export async function updatePostAction(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing post id." };

  const existing = await getPostForAdmin(id);
  if (!existing) return { ok: false, message: "That post no longer exists." };

  const values = readPostForm(formData);
  const errors = validatePost(values);
  if (hasErrors(errors)) {
    return { ok: false, errors, message: "Nothing was saved — see the fields below." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("posts")
    .update({
      title: values.title.trim(),
      slug: values.slug.trim(),
      excerpt: values.excerpt.trim(),
      content: values.content,
      category: values.category as PostCategory,
      cover_image_url: values.coverImageUrl,
      cover_image_alt: values.coverImageAlt,
      seo_title: values.seoTitle,
      seo_description: values.seoDescription,
      // `source` and `published_at` are deliberately absent. Provenance is not
      // rewritten because a human edited the draft — an AI-assisted post stays
      // labelled as one — and the publication date belongs to the publish action.
    })
    .eq("id", id);

  if (error) return describeDbError(error.message, error.code);

  const nextCategory = values.category as PostCategory;
  revalidatePost(values.slug.trim(), nextCategory, {
    slug: existing.slug,
    category: existing.category,
  });
  revalidatePath(`/admin/posts/${id}`);

  const renamed = existing.slug !== values.slug.trim();
  const moved = existing.category !== nextCategory;
  const previousUrl = `${basePathFor(existing.category)}/${existing.slug}`;

  return {
    ok: true,
    message:
      renamed || moved
        ? `Saved. This post now lives at ${basePathFor(nextCategory)}/${values.slug.trim()}, so ${previousUrl} was flushed from the cache as well.`
        : "Saved.",
  };
}

/* ------------------------------------------------------------------ publish */

export async function publishPostAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const post = await getPostForAdmin(id);
  if (!post) redirect("/admin?error=missing");

  const supabase = await createClient();

  /**
   * `published_at` is stamped on the **first** publish and never again.
   *
   * Re-stamping it would silently re-date an article every time somebody fixed a
   * typo, and would move it back to the top of the index. Unpublishing keeps the
   * timestamp for the same reason, so a post pulled down for an hour comes back
   * with the date it was actually published.
   */
  const { error } = await supabase
    .from("posts")
    .update({
      status: "published",
      published_at: post.published_at ?? new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect(`/admin/posts/${id}?error=${encodeURIComponent(error.message)}`);

  revalidatePost(post.slug, post.category);
  revalidatePath(`/admin/posts/${id}`);
  redirect(`/admin/posts/${id}?published=1`);
}

export async function unpublishPostAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const post = await getPostForAdmin(id);
  if (!post) redirect("/admin?error=missing");

  const supabase = await createClient();

  // `published_at` is intentionally left as it is — see the note above.
  const { error } = await supabase
    .from("posts")
    .update({ status: "draft" })
    .eq("id", id);

  if (error) redirect(`/admin/posts/${id}?error=${encodeURIComponent(error.message)}`);

  revalidatePost(post.slug, post.category);
  revalidatePath(`/admin/posts/${id}`);
  redirect(`/admin/posts/${id}?unpublished=1`);
}

/* ------------------------------------------------------------------- delete */

export async function deletePostAction(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const typed = String(formData.get("confirmSlug") ?? "").trim();

  const post = await getPostForAdmin(id);
  if (!post) return { ok: false, message: "That post no longer exists." };

  // Typing the slug is the confirmation. A yes/no dialog is muscle memory; this
  // requires the person to have read which post they are on.
  if (typed !== post.slug) {
    return {
      ok: false,
      message: `That does not match. Type “${post.slug}” exactly to delete this post.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) return { ok: false, message: `Could not delete: ${error.message}` };

  revalidatePost(post.slug, post.category);
  redirect("/admin?deleted=1");
}

/* -------------------------------------------------------------- cover image */

export type UploadResult =
  | { ok: true; url: string; alt: string }
  | { ok: false; error: string };

/**
 * Upload a cover image.
 *
 * Called directly from a Client Component rather than as a form action, because
 * the editor form cannot nest a second form and the result has to flow back into
 * the editor's state.
 *
 * The write itself goes through the **request-scoped** client, not the
 * service-role one: the `admins upload blog images` storage policy already
 * permits it, so there is no reason to step outside RLS.
 */
export async function uploadCoverAction(formData: FormData): Promise<UploadResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file was received." };

  const size = checkCoverSize(file.size);
  if (!size.ok) return { ok: false, error: size.error };

  const buffer = new Uint8Array(await file.arrayBuffer());

  // Type comes from the file's own bytes. `file.type` and `file.name` are both
  // client-supplied and are not consulted.
  const sniffed = sniffImage(buffer);
  if (!sniffed.ok) return { ok: false, error: sniffed.error };

  // Decoded and re-emitted rather than stored as received — this is what strips
  // EXIF (including GPS), discards anything appended past the image data, and
  // bounds the dimensions. See the note in `image-server.ts`.
  const encoded = await reencodeCover(buffer, sniffed.mime);
  if (!encoded.ok) return { ok: false, error: encoded.error };

  const supabase = await createClient();
  const path = `covers/${crypto.randomUUID()}.${encoded.extension}`;

  const { error } = await supabase.storage
    .from("blog-images")
    .upload(path, encoded.data, {
      // The type we actually produced, so what the CDN serves matches the bytes.
      contentType: encoded.mime,
      upsert: false,
    });

  if (error) return { ok: false, error: `Upload failed: ${error.message}` };

  const { data } = supabase.storage.from("blog-images").getPublicUrl(path);

  return {
    ok: true,
    url: data.publicUrl,
    // Alt text is the author's job; the upload just clears the field for them.
    alt: "",
  };
}

/* --------------------------------------------------------------------- auth */

export type SignInState = { ok: boolean; message?: string };

/**
 * Email and password sign-in.
 *
 * Runs as a Server Action rather than a browser call so the password is posted
 * once to our own origin and the session cookie is written server-side, with the
 * `httpOnly` and `sameSite` attributes the SSR client sets. Nothing about the
 * credential ever passes through client JavaScript.
 *
 * The failure message is deliberately the same for a wrong password, an unknown
 * address, and an unconfirmed account. Distinguishing them turns this form into an
 * oracle for which email addresses have accounts.
 */
export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, message: "Enter your email address and password." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: "Those details did not match an account." };
  }

  // Whether this account has a `profiles` row is decided by the page we land on.
  // Signing in and being admitted are two different things.
  redirect("/admin");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* ------------------------------------------------------------------- people */

export type PeopleFormState = { ok: boolean; message?: string };

/**
 * Grant console access by creating or updating a `profiles` row.
 *
 * Owner-only, enforced here and again by the `profiles_owner_*` policies. Note
 * that this uses the request-scoped client: granting access is a `profiles`
 * write, which an owner is already allowed to make. The service-role key is not
 * needed and so is not used.
 */
export async function grantAccessAction(
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  await requireOwner();

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as ProfileRole;
  const displayName = emptyToNull(String(formData.get("displayName") ?? ""));

  if (!userId) return { ok: false, message: "Missing account id." };
  if (role !== "owner" && role !== "admin") {
    return { ok: false, message: "Role must be owner or admin." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, role, display_name: displayName }, { onConflict: "id" });

  if (error) return { ok: false, message: `Could not grant access: ${error.message}` };

  revalidatePath("/admin/people");
  return { ok: true, message: `Access granted as ${role}.` };
}

/**
 * Revoke console access by deleting the `profiles` row. The Auth account itself
 * is left alone — this removes admission, not the person.
 */
export async function revokeAccessAction(
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const { user } = await requireOwner();

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { ok: false, message: "Missing account id." };

  if (userId === user.id) {
    return {
      ok: false,
      message: "You cannot revoke your own access. Ask another owner to do it.",
    };
  }

  const supabase = await createClient();

  /**
   * Refuse to remove the last owner.
   *
   * The external drafting tool attributes every post it creates to the oldest
   * owner and fails outright when there is none — so an empty owner list breaks
   * the integration silently, from the outside, with no error on this side. RLS
   * cannot express "at least one row must survive", so the check lives here.
   */
  const { data: owners } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "owner");

  const remainingOwners = (owners ?? []).filter((owner) => owner.id !== userId);
  const removingAnOwner = (owners ?? []).some((owner) => owner.id === userId);

  if (removingAnOwner && remainingOwners.length === 0) {
    return {
      ok: false,
      message:
        "That is the only owner. The external drafting tool attributes new drafts to the oldest owner and fails without one, so grant another owner before removing this one.",
    };
  }

  const { error } = await supabase.from("profiles").delete().eq("id", userId);

  if (error) return { ok: false, message: `Could not revoke access: ${error.message}` };

  revalidatePath("/admin/people");
  return { ok: true, message: "Access revoked. The sign-in account still exists." };
}

/**
 * Create a sign-in account.
 *
 * This is one of exactly two places the service-role key is used, because the
 * Admin API is the only way to create a confirmed account and the publishable key
 * cannot reach it. There is no public sign-up route; this is it, and it is
 * owner-only.
 *
 * Creating the account does **not** grant access. That is a second, separate
 * `profiles` write, so an account can exist without admission.
 */
export async function createAccountAction(
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  await requireOwner();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email.includes("@")) return { ok: false, message: "Enter a valid email address." };
  if (password.length < 12) {
    return {
      ok: false,
      message: "Use a password of at least 12 characters. This account can publish.",
    };
  }

  const admin = createServiceClient();

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    // Confirmed on creation: an owner vouching for the address is the
    // verification, and there is no self-service sign-up to protect against.
    email_confirm: true,
  });

  if (error) return { ok: false, message: `Could not create the account: ${error.message}` };

  revalidatePath("/admin/people");
  return {
    ok: true,
    message: `Account created for ${email}. It has no access yet — grant a role below.`,
  };
}
