/**
 * Hand-written database types.
 *
 * Kept in sync with `supabase/migrations/0001_blog_and_admin.sql` by hand rather
 * than generated, so the repo has no dependency on the Supabase CLI being
 * installed and pointed at a live project. The column names here are the same
 * wire contract the migration documents: if you change one, change it in both
 * places, and expect the external drafting tool to break.
 */

export type PostStatus = "draft" | "published";
export type PostSource = "human" | "ai-assisted";
export type ProfileRole = "owner" | "admin";
/** Added in 0002. Splits the journal from News & Updates. */
export type PostCategory = "blog" | "news";
export type NewsletterStatus = "draft" | "published";

export type PostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  author_id: string;
  status: PostStatus;
  source: PostSource;
  category: PostCategory;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type PostInsert = Omit<
  PostRow,
  "id" | "created_at" | "updated_at" | "status" | "source" | "category"
> & {
  id?: string;
  status?: PostStatus;
  source?: PostSource;
  /** Defaulted to 'blog' in Postgres, so the drafting tool can keep omitting it. */
  category?: PostCategory;
};

export type PostUpdate = Partial<Omit<PostRow, "id" | "created_at">>;

export type NewsletterRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  external_url: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  issue_date: string;
  status: NewsletterStatus;
  created_at: string;
  updated_at: string;
};

export type NewsletterInsert = Omit<
  NewsletterRow,
  "id" | "created_at" | "updated_at" | "status"
> & {
  id?: string;
  status?: NewsletterStatus;
};

export type NewsletterUpdate = Partial<Omit<NewsletterRow, "id" | "created_at">>;

export type ProfileRow = {
  id: string;
  display_name: string | null;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      posts: {
        Row: PostRow;
        Insert: PostInsert;
        Update: PostUpdate;
        Relationships: [];
      };
      newsletters: {
        Row: NewsletterRow;
        Insert: NewsletterInsert;
        Update: NewsletterUpdate;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          display_name?: string | null;
          role: ProfileRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ProfileRow, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean };
      is_owner: { Args: Record<never, never>; Returns: boolean };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
