import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/ui/Arrow";
import { PostArticle } from "@/components/blog/PostArticle";
import { getPublishedPost, getSitemapPosts } from "@/lib/blog/queries";
import { BlogPostingJsonLd } from "@/components/blog/BlogPostingJsonLd";
import {
  BLOG_PATH,
  FALLBACK_OG_IMAGE,
  absoluteUrl,
  postUrl,
} from "@/lib/blog/config";

type PageProps = {
  /** Next 15 hands params in as a promise. */
  params: Promise<{ slug: string }>;
};

/** See the note on the blog index — same reasoning, same hour. */
export const revalidate = 3600;

/**
 * Prerender the posts that are live at build time.
 *
 * `dynamicParams` stays at its default, so a slug that is not in this list — a
 * post published after the build, or one whose date has since passed — is still
 * rendered on first request and cached from then on. This only moves that first
 * render earlier for the posts we already know about.
 *
 * Returns an empty array when Supabase is unconfigured, which keeps `next build`
 * working on a checkout with no `.env.local`.
 */
export async function generateStaticParams() {
  const posts = await getSitemapPosts();
  return posts
    .filter((post) => post.category === "blog")
    .map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  // Nothing published under this slug. Kept `noindex` so a 404 body served with
  // a stray 200 from a misconfigured host still does not get indexed.
  if (!post) {
    return { title: "Post not found", robots: { index: false, follow: false } };
  }

  const description = post.seo_description ?? post.excerpt;
  const canonical = `${BLOG_PATH}/${post.slug}`;

  // OG and Twitter fall back to the site-wide image, because a card with no
  // image is materially worse than a card with a generic one. JSON-LD does not
  // fall back — see the note there.
  const ogImage = post.cover_image_url ?? absoluteUrl(FALLBACK_OG_IMAGE);

  return {
    /**
     * `seo_title` is capped at 60 characters precisely so it can *be* the title
     * tag. Letting the root layout's `%s | ESE` template append
     * more characters would push a carefully-sized title past where Google
     * truncates, so an explicit SEO title is absolute. A post with none falls
     * back to its headline and keeps the template.
     */
    title: post.seo_title ? { absolute: post.seo_title } : post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.seo_title ?? post.title,
      description,
      url: canonical,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      images: [
        {
          url: ogImage,
          ...(post.cover_image_alt ? { alt: post.cover_image_alt } : {}),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seo_title ?? post.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  /**
   * A draft, a future-dated post, and a slug that never existed all land here and
   * all get the same genuine 404 — status code included, not a soft-hidden page.
   *
   * Two reasons this is not a "not authorized" screen. Hiding a page from
   * crawlers with a robots directive is a request, not a control; and a 403 on an
   * unpublished slug confirms to a stranger that a post by that name exists,
   * which is exactly the thing an unpublished post should not reveal.
   */
  if (!post) notFound();

  return (
    <>
      <BlogPostingJsonLd post={post} />

      <PostArticle post={post} />

      <nav className="post__return" aria-label="Blog navigation">
        <Link className="text-link" href={BLOG_PATH}>
          <span>All blog posts</span>
          <Arrow direction="left" />
        </Link>
        <p className="post__permalink">{postUrl(post.slug)}</p>
      </nav>
    </>
  );
}
