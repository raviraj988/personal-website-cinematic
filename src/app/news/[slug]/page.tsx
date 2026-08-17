import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/ui/Arrow";
import { PostArticle } from "@/components/blog/PostArticle";
import { BlogPostingJsonLd } from "@/components/blog/BlogPostingJsonLd";
import { getPublishedPost, getSitemapPosts } from "@/lib/blog/queries";
import { NEWS_PATH } from "@/lib/news/config";
import { FALLBACK_OG_IMAGE, absoluteUrl } from "@/lib/blog/config";

type PageProps = {
  /** Next 15 hands params in as a promise. */
  params: Promise<{ slug: string }>;
};

/** See the note on the news index — same reasoning, same hour. */
export const revalidate = 3600;

/**
 * Prerender the news items live at build time.
 *
 * `dynamicParams` stays at its default, so an item published after the build is
 * still rendered on first request and cached from then on.
 */
export async function generateStaticParams() {
  const posts = await getSitemapPosts();
  return posts
    .filter((post) => post.category === "news")
    .map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug, "news");

  if (!post) {
    return { title: "Update not found", robots: { index: false, follow: false } };
  }

  const description = post.seo_description ?? post.excerpt;
  const canonical = `${NEWS_PATH}/${post.slug}`;
  const ogImage = post.cover_image_url ?? absoluteUrl(FALLBACK_OG_IMAGE);

  return {
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

export default async function NewsItemPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedPost(slug, "news");

  /**
   * A draft, a future-dated item, a slug that never existed, and a slug that
   * belongs to a *blog* post all land here and all get the same genuine 404.
   * The last case matters: slugs are unique table-wide, so `/news/<a-blog-slug>`
   * would otherwise resolve and give one article two canonical addresses.
   */
  if (!post) notFound();

  return (
    <>
      <BlogPostingJsonLd post={post} path={`${NEWS_PATH}/${post.slug}`} />

      <PostArticle post={post} />

      <nav className="post__return" aria-label="News navigation">
        <Link className="text-link" href={NEWS_PATH}>
          <span>All news &amp; updates</span>
          <Arrow direction="left" />
        </Link>
        <p className="post__permalink">{absoluteUrl(`${NEWS_PATH}/${post.slug}`)}</p>
      </nav>
    </>
  );
}
