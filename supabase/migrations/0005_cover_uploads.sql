-- Out-of-band cover uploads, so a remote AI client can hand over an image it
-- generated without carrying the bytes through the MCP conversation.
--
-- ## Why this table has to exist
--
-- MCP tool arguments are JSON, and the protocol defines no file-input type and no
-- way for a server to pull a file from a client. So the only in-band option is
-- base64 — and for a client whose *model* has to emit the argument, that is not
-- merely inefficient, it is impossible: a 1.5 MB cover is roughly 2 MB of base64,
-- about 600,000 output tokens the model would have to type. It works from Claude
-- Code, whose runtime substitutes file bytes programmatically, and cannot work
-- from ChatGPT, whose model would have to produce them.
--
-- The fix is to move the bytes off the conversation. `create_cover_upload` mints a
-- row here and returns a URL; the bytes are PUT to that URL over plain HTTP by
-- whatever can reach it — the client, a browser drop page, or curl — and a second
-- tool call reads back the result. The model only ever handles a short ticket and
-- a finished URL.
--
-- ## Why the ticket is safe to be the only credential on the upload endpoint
--
-- That endpoint cannot require the OAuth bearer token, because the thing doing the
-- upload may be a browser rather than the MCP client. So the ticket *is* the
-- authorisation, in the manner of any signed upload URL:
--
--   * 256 bits of entropy, stored only as a SHA-256 hash, so a dump of this table
--     yields nothing usable.
--   * Single use. `consumed_at` is set by a conditional update, so two concurrent
--     uploads cannot both succeed.
--   * Fifteen minutes. Long enough for a human to find the file, short enough that
--     a leaked URL is dead by the time it is useful.
--   * The storage path is fixed **at issue time** from a validated slug. The
--     uploader cannot choose where the object lands, only whether one lands.
--
-- And a ticket can only be minted by an MCP call holding `blog:draft`, which
-- descends from an administrator's consent. So the capability chain still starts
-- with a human, exactly as it did before.
--
-- Run after 0004_mcp_oauth.sql.

create table if not exists public.cover_uploads (
  ticket_hash text primary key,
  -- Which registered site, and the post this cover belongs to. Both fixed here so
  -- the upload endpoint derives the storage key rather than accepting one.
  site text not null,
  slug text not null,
  title text not null,
  -- Alt text supplied when the ticket was created. The uploader may not override
  -- it: the tool call that minted the ticket is the authenticated side.
  image_alt text,
  -- Who the grant belongs to. References profiles for the same reason
  -- oauth_tokens does — every write is traceable to an admin account.
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  -- Set on first successful upload. Single-use is enforced by a conditional
  -- update against this being null.
  consumed_at timestamptz,
  -- The finished, normalised result, recorded so the MCP side can read it back
  -- without the model ever seeing the bytes.
  result_url text,
  result_path text,
  result_alt text,
  result_width integer,
  result_height integer,
  result_content_type text,
  -- Why an upload failed, for a client that needs to tell a human something
  -- better than "it did not work".
  failure text,
  created_at timestamptz not null default now()
);

create index if not exists cover_uploads_expires_at_idx on public.cover_uploads (expires_at);
create index if not exists cover_uploads_user_id_idx on public.cover_uploads (user_id);

comment on table public.cover_uploads is
  'Single-use, short-lived tickets for uploading a client-generated blog cover out of band. Ticket stored as a SHA-256 hash; storage path fixed at issue time.';

-- ---------------------------------------------------------------------------
-- RLS: deny everything except the service role.
--
-- Same access model as the oauth_* tables and for the same reason: this holds
-- credential material, and only the route handlers touch it.
-- ---------------------------------------------------------------------------

alter table public.cover_uploads enable row level security;
revoke all on public.cover_uploads from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Housekeeping
-- ---------------------------------------------------------------------------

create or replace function public.purge_expired_cover_uploads()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.cover_uploads
  where expires_at < now() - interval '1 day';
end;
$$;

comment on function public.purge_expired_cover_uploads is
  'Deletes long-expired cover upload tickets. Safe to run at any time.';
