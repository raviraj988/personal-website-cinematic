-- ===========================================================================
-- Blog + admin console schema.
--
-- The `profiles` and `posts` definitions below are a wire contract with an
-- external drafting tool (an MCP server that lives outside this repository).
-- It inserts and reads these exact column names. Renaming, retyping, or
-- dropping any of them breaks the integration at insert time with no useful
-- error, so this section is reproduced verbatim and must stay that way.
-- Anything this application needs beyond the contract is added *alongside* it,
-- further down.
--
-- Run order: this file is self-contained and idempotent. Apply it once against
-- a fresh Supabase project, then follow the owner-seeding note at the bottom.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Part 1 — the contract. Do not edit.
-- ---------------------------------------------------------------------------

-- profiles: a row here is what grants admin access. Never created by sign-up.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- No default: granting access must always be deliberate and explicit.
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('owner', 'admin')),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 120
  )
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text not null,
  cover_image_url text,
  cover_image_alt text,
  author_id uuid not null references auth.users (id),
  status text not null default 'draft',
  source text not null default 'human',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint posts_status_check check (status in ('draft', 'published')),
  constraint posts_source_check check (source in ('human', 'ai-assisted')),
  constraint posts_title_length check (char_length(title) between 1 and 160),
  constraint posts_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint posts_slug_length check (char_length(slug) between 1 and 160),
  constraint posts_excerpt_length check (char_length(excerpt) between 1 and 320),
  constraint posts_content_present check (char_length(btrim(content)) > 0),
  constraint posts_seo_title_length check (
    seo_title is null or char_length(seo_title) <= 60
  ),
  constraint posts_seo_description_length check (
    seo_description is null or char_length(seo_description) <= 160
  ),
  -- A cover image without alt text is an accessibility failure, so the database
  -- refuses the combination outright.
  constraint posts_cover_alt_required check (
    cover_image_url is null
    or (cover_image_alt is not null and char_length(btrim(cover_image_alt)) > 0)
  ),
  -- A published post must carry a publication timestamp.
  constraint posts_published_has_timestamp check (
    status <> 'published' or published_at is not null
  )
);

create index if not exists posts_published_idx
  on public.posts (published_at desc) where status = 'published';
create index if not exists posts_status_updated_idx
  on public.posts (status, updated_at desc);

-- ---------------------------------------------------------------------------
-- End of contract. Everything below is additive.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- updated_at, maintained by Postgres
--
-- Kept in a trigger rather than in application code so the column cannot go
-- stale when a row is edited by *any* client — this app, the SQL editor, or the
-- external drafting tool over PostgREST.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Authorization helpers
--
-- `security definer` for two reasons: it lets a policy on `profiles` consult
-- `profiles` without recursing through that table's own RLS, and it means the
-- caller cannot see rows through the function that their own policies would
-- deny. `search_path` is pinned so a caller-controlled path cannot shadow
-- `profiles` with a table of their own.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'owner'
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_owner() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_owner() to authenticated;


-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The service-role key bypasses all of this by design — that is the channel the
-- external drafting tool uses to insert drafts. Every other caller is gated
-- here, which is the only layer a tampered client cannot talk its way past.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- Explicit grants. Supabase's default privileges usually cover this, but an
-- explicit grant means the migration does not depend on project defaults that
-- may have been tightened. RLS still decides which rows are visible.
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

-- posts: the public may read published, non-future posts and nothing else.
-- Drafts and scheduled posts are invisible at the row level, so a stray
-- PostgREST query cannot leak them even if the application forgets a filter.
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read
  on public.posts
  for select
  to anon, authenticated
  using (status = 'published' and published_at <= now());

-- posts: admins do everything. This is a second permissive SELECT policy, so an
-- admin reads drafts through it while the public policy still bounds everyone
-- else.
drop policy if exists posts_admin_all on public.posts;
create policy posts_admin_all
  on public.posts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- profiles: a user may read their own row; admins may read every row.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- profiles: writes are owners-only, including the write that would grant
-- somebody else access. An admin cannot promote themselves or anyone else.
drop policy if exists profiles_owner_insert on public.profiles;
create policy profiles_owner_insert
  on public.profiles
  for insert
  to authenticated
  with check (public.is_owner());

drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update
  on public.profiles
  for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists profiles_owner_delete on public.profiles;
create policy profiles_owner_delete
  on public.profiles
  for delete
  to authenticated
  using (public.is_owner());


-- ---------------------------------------------------------------------------
-- Storage: the blog-images bucket
--
-- Public, because cover images are served straight from the CDN into
-- next/image. The 5 MB ceiling and the MIME allow-list are enforced here as
-- well as in the upload action — the bucket is the copy a tampered client
-- cannot get around. Generated covers land under a `covers/` prefix.
--
-- SVG is deliberately absent from the allow-list: it can carry script, and
-- these files are served from an origin we would rather not make
-- script-executing.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "blog images are publicly readable" on storage.objects;
create policy "blog images are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

drop policy if exists "admins upload blog images" on storage.objects;
create policy "admins upload blog images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "admins update blog images" on storage.objects;
create policy "admins update blog images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'blog-images' and public.is_admin())
  with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "admins delete blog images" on storage.objects;
create policy "admins delete blog images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'blog-images' and public.is_admin());


-- ===========================================================================
-- Required manual step: seed one owner.
--
-- The external drafting tool attributes every post it creates to the first
-- `profiles` row with role = 'owner', ordered by `created_at`, and fails
-- outright when there is none. Sign-up cannot create this row — that is the
-- point — so it is created by hand, once:
--
--   1. Supabase dashboard → Authentication → Users → "Add user" →
--      "Create new user". Set an email and password, and tick
--      "Auto Confirm User" so the account can sign in immediately.
--   2. Copy that user's UUID, then run:
--
--        insert into public.profiles (id, display_name, role)
--        values ('<paste-the-uuid>', 'Laura McKelvey', 'owner');
--
--   3. Confirm it took:
--
--        select id, display_name, role, created_at
--        from public.profiles
--        where role = 'owner'
--        order by created_at
--        limit 1;
--
-- Further admins are granted from /admin/people once you are signed in as the
-- owner. There is no public sign-up path.
-- ===========================================================================
