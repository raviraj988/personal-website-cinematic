-- ===========================================================================
-- News & Updates.
--
-- Two additions, both strictly alongside the wire contract in 0001. Nothing
-- here renames, retypes, or drops a contract column, so the external drafting
-- tool keeps working untouched.
--
--   1. `posts.category` — separates news items from blog posts. Article-shaped
--      news reuses the whole existing editor, upload, and RLS machinery rather
--      than growing a parallel copy of it.
--   2. `newsletters` — issues are not articles. An issue is a cover, a date, a
--      short description, and a link to where it is actually hosted (Canva, a
--      PDF). Forcing that through `posts.content not null` would mean inventing
--      body text for every issue, so it gets its own small table.
--
-- Idempotent. Safe to re-apply.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. posts.category
--
-- Defaulted and NOT NULL, so every existing row becomes 'blog' and the drafting
-- tool — which does not know this column exists — keeps inserting valid rows.
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists category text not null default 'blog';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_category_check'
  ) then
    alter table public.posts
      add constraint posts_category_check check (category in ('blog', 'news'));
  end if;
end
$$;

-- The public index queries filter on category alongside the existing status and
-- published_at predicates, so the partial index needs to carry it.
create index if not exists posts_category_published_idx
  on public.posts (category, published_at desc)
  where status = 'published';


-- ---------------------------------------------------------------------------
-- 2. newsletters
--
-- `external_url` is where the issue actually lives. It is required: an issue
-- nobody can open is not an issue. The check keeps it to https rather than
-- accepting `javascript:` or a bare string, because this value is rendered
-- straight into an href.
-- ---------------------------------------------------------------------------

create table if not exists public.newsletters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  external_url text not null,
  cover_image_url text,
  cover_image_alt text,
  issue_date date not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint newsletters_status_check check (status in ('draft', 'published')),
  constraint newsletters_title_length check (char_length(title) between 1 and 160),
  constraint newsletters_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint newsletters_slug_length check (char_length(slug) between 1 and 160),
  constraint newsletters_description_length check (
    char_length(description) between 1 and 320
  ),
  constraint newsletters_external_url_https check (external_url ~ '^https://'),
  constraint newsletters_external_url_length check (
    char_length(external_url) <= 2048
  ),
  -- Same rule as posts: a cover image without alt text is an accessibility
  -- failure, and the database is the copy that cannot be bypassed.
  constraint newsletters_cover_alt_required check (
    cover_image_url is null
    or (cover_image_alt is not null and char_length(btrim(cover_image_alt)) > 0)
  )
);

create index if not exists newsletters_published_idx
  on public.newsletters (issue_date desc) where status = 'published';

drop trigger if exists newsletters_set_updated_at on public.newsletters;
create trigger newsletters_set_updated_at
  before update on public.newsletters
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- RLS
--
-- Mirrors the posts policies exactly: the public reads published rows, admins
-- do everything. There is no anon write path anywhere in this schema — the
-- newsletter signup form posts to a third-party email provider, not to
-- Postgres, so nothing here needs to accept an untrusted insert.
-- ---------------------------------------------------------------------------

alter table public.newsletters enable row level security;

grant select on public.newsletters to anon, authenticated;
grant insert, update, delete on public.newsletters to authenticated;

drop policy if exists newsletters_public_read on public.newsletters;
create policy newsletters_public_read
  on public.newsletters
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists newsletters_admin_all on public.newsletters;
create policy newsletters_admin_all
  on public.newsletters
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
