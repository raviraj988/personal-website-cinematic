"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/blog/auth";
import { emptyToNull } from "@/lib/blog/validation";
import { getNewsletterForAdmin } from "@/lib/news/queries";
import { NEWS_PATH } from "@/lib/news/config";
import {
  hasNewsletterErrors,
  validateNewsletter,
  type NewsletterFieldErrors,
  type NewsletterFormValues,
} from "@/lib/news/validation";

/**
 * Newsletter issue actions.
 *
 * Every export re-checks authorization as its first act, for the reason spelled
 * out at the top of `actions.ts`: a Server Action is a public HTTP endpoint, and
 * the admin layout's gate runs when a page renders, not when one of these is
 * invoked.
 *
 * This file is separate from `actions.ts` rather than appended to it because
 * that module is already 500 lines of post and profile handling, and issues
 * share none of its cover-upload or provenance logic.
 *
 * Note this module exports only async functions. `"use server"` makes a file
 * that exports anything else unresolvable *from the client*, with an error that
 * blames the import site — so the types above are imported, never re-exported.
 */

export type NewsletterFormState = {
  ok: boolean;
  message?: string;
  errors?: NewsletterFieldErrors;
};

function readForm(formData: FormData): NewsletterFormValues {
  return {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    externalUrl: String(formData.get("externalUrl") ?? ""),
    issueDate: String(formData.get("issueDate") ?? ""),
    coverImageUrl: emptyToNull(String(formData.get("coverImageUrl") ?? "")),
    coverImageAlt: emptyToNull(String(formData.get("coverImageAlt") ?? "")),
  };
}

/**
 * Issues have no page of their own on this site — each one links out — so there
 * is no per-issue path to flush. The index and the landing page's news block are
 * the two surfaces that change.
 */
function revalidateNewsletters() {
  revalidatePath(NEWS_PATH);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/newsletters");
}

function describeDbError(message: string, code?: string): NewsletterFormState {
  if (code === "23505" || message.includes("newsletters_slug_key")) {
    return {
      ok: false,
      errors: { slug: "Another issue already uses this slug. Choose a different one." },
    };
  }
  return { ok: false, message: `The database refused the change: ${message}` };
}

export async function createNewsletterAction(
  _prev: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  await requireAdmin();

  const values = readForm(formData);
  const errors = validateNewsletter(values);
  if (hasNewsletterErrors(errors)) {
    return { ok: false, errors, message: "Nothing was saved — see the fields below." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("newsletters")
    .insert({
      title: values.title.trim(),
      slug: values.slug.trim(),
      description: values.description.trim(),
      external_url: values.externalUrl.trim(),
      issue_date: values.issueDate.trim(),
      cover_image_url: values.coverImageUrl,
      cover_image_alt: values.coverImageAlt,
      // New issues start as drafts. Publishing is a separate, deliberate action.
      status: "draft",
    })
    .select("id")
    .single();

  if (error) return describeDbError(error.message, error.code);

  revalidatePath("/admin/newsletters");
  redirect(`/admin/newsletters/${data.id}?created=1`);
}

export async function updateNewsletterAction(
  _prev: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing issue id." };

  const existing = await getNewsletterForAdmin(id);
  if (!existing) return { ok: false, message: "That issue no longer exists." };

  const values = readForm(formData);
  const errors = validateNewsletter(values);
  if (hasNewsletterErrors(errors)) {
    return { ok: false, errors, message: "Nothing was saved — see the fields below." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("newsletters")
    .update({
      title: values.title.trim(),
      slug: values.slug.trim(),
      description: values.description.trim(),
      external_url: values.externalUrl.trim(),
      issue_date: values.issueDate.trim(),
      cover_image_url: values.coverImageUrl,
      cover_image_alt: values.coverImageAlt,
    })
    .eq("id", id);

  if (error) return describeDbError(error.message, error.code);

  revalidateNewsletters();
  revalidatePath(`/admin/newsletters/${id}`);

  return { ok: true, message: "Saved." };
}

export async function publishNewsletterAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const issue = await getNewsletterForAdmin(id);
  if (!issue) redirect("/admin/newsletters?error=missing");

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletters")
    .update({ status: "published" })
    .eq("id", id);

  if (error) {
    redirect(`/admin/newsletters/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateNewsletters();
  revalidatePath(`/admin/newsletters/${id}`);
  redirect(`/admin/newsletters/${id}?published=1`);
}

export async function unpublishNewsletterAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const issue = await getNewsletterForAdmin(id);
  if (!issue) redirect("/admin/newsletters?error=missing");

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletters")
    .update({ status: "draft" })
    .eq("id", id);

  if (error) {
    redirect(`/admin/newsletters/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateNewsletters();
  revalidatePath(`/admin/newsletters/${id}`);
  redirect(`/admin/newsletters/${id}?unpublished=1`);
}

export async function deleteNewsletterAction(
  _prev: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const typed = String(formData.get("confirmSlug") ?? "").trim();

  const issue = await getNewsletterForAdmin(id);
  if (!issue) return { ok: false, message: "That issue no longer exists." };

  // Typing the slug is the confirmation — a yes/no dialog is muscle memory.
  if (typed !== issue.slug) {
    return {
      ok: false,
      message: `That does not match. Type “${issue.slug}” exactly to delete this issue.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("newsletters").delete().eq("id", id);

  if (error) return { ok: false, message: `Could not delete: ${error.message}` };

  revalidateNewsletters();
  redirect("/admin/newsletters?deleted=1");
}
