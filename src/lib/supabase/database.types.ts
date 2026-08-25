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
  /** Added in 0003. Drives the editor's SEO checklist; never queried. */
  focus_keyword: string | null;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type PostInsert = Omit<
  PostRow,
  | "id"
  | "created_at"
  | "updated_at"
  | "status"
  | "source"
  | "category"
  | "focus_keyword"
> & {
  id?: string;
  status?: PostStatus;
  source?: PostSource;
  /** Defaulted to 'blog' in Postgres, so the drafting tool can keep omitting it. */
  category?: PostCategory;
  /** Nullable with no default — the drafting tool never sets it. */
  focus_keyword?: string | null;
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

/**
 * A JSON column. Mirrors `jsonb`, used by `oauth_clients.raw_metadata`.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* -------------------------------------------------------------- 0004: OAuth */

/**
 * The three OAuth tables below back the remote MCP endpoint at `/api/mcp`.
 * Added in 0004_mcp_oauth.sql; see that migration's header for why an entire
 * authorization server is the minimum a ChatGPT connector will accept.
 *
 * `token_hash` and `code_hash` are SHA-256 hex, never the credential itself.
 */
export type OAuthClientRow = {
  client_id: string;
  client_name: string | null;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  /** Constrained to `'none'` by the migration: public clients with PKCE only. */
  token_endpoint_auth_method: string;
  scope: string | null;
  client_uri: string | null;
  logo_uri: string | null;
  software_id: string | null;
  software_version: string | null;
  raw_metadata: Json;
  created_at: string;
};

export type OAuthClientInsert = Omit<OAuthClientRow, "created_at"> & {
  created_at?: string;
};

export type OAuthAuthorizationCodeRow = {
  code_hash: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scopes: string[];
  resource: string | null;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export type OAuthAuthorizationCodeInsert = Omit<
  OAuthAuthorizationCodeRow,
  "code_challenge_method" | "consumed_at" | "created_at"
> & {
  code_challenge_method?: string;
  consumed_at?: string | null;
  created_at?: string;
};

export type OAuthTokenKind = "access" | "refresh";

export type OAuthTokenRow = {
  token_hash: string;
  kind: OAuthTokenKind;
  client_id: string;
  user_id: string;
  scopes: string[];
  resource: string | null;
  expires_at: string;
  revoked_at: string | null;
  /** The refresh token this one replaced, for replay detection. */
  parent_hash: string | null;
  created_at: string;
};

export type OAuthTokenInsert = Omit<
  OAuthTokenRow,
  "revoked_at" | "parent_hash" | "created_at"
> & {
  revoked_at?: string | null;
  parent_hash?: string | null;
  created_at?: string;
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
      oauth_clients: {
        Row: OAuthClientRow;
        Insert: OAuthClientInsert;
        Update: Partial<Omit<OAuthClientRow, "client_id" | "created_at">>;
        Relationships: [];
      };
      oauth_authorization_codes: {
        Row: OAuthAuthorizationCodeRow;
        Insert: OAuthAuthorizationCodeInsert;
        Update: Partial<Omit<OAuthAuthorizationCodeRow, "code_hash" | "created_at">>;
        Relationships: [];
      };
      oauth_tokens: {
        Row: OAuthTokenRow;
        Insert: OAuthTokenInsert;
        Update: Partial<Omit<OAuthTokenRow, "token_hash" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean };
      is_owner: { Args: Record<never, never>; Returns: boolean };
      purge_expired_oauth_artifacts: { Args: Record<never, never>; Returns: undefined };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
