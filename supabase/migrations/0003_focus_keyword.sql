-- ===========================================================================
-- Focus keyword for the editor's SEO checklist.
--
-- Strictly additive, alongside the wire contract in 0001. Nullable with no
-- default, so a client that omits it keeps inserting valid rows untouched.
--
-- UPDATED: this header used to say the external drafting tool "does not know
-- this column exists". It does now — the tool lives in `mcp/` in this
-- repository and writes `focus_keyword` deliberately. The reason is that
-- `runSeoChecks` in src/lib/blog/seo.ts reports the whole keyword-placement
-- check as `skip` when the field is empty, and those five placement assertions
-- (title, description, slug, opening paragraph, a subheading) are the most
-- SEO-relevant thing the checklist does. A drafting tool that left the field
-- null would produce posts the editor's own panel could not fully evaluate.
--
-- The constraint below is why the tool maps an empty string to NULL rather than
-- passing it through: `''` fails this check, and an absent keyword is genuinely
-- absent rather than empty.
--
-- There is deliberately no index: nothing queries by keyword. It is written by
-- the editor and read back on the same row.
--
-- Idempotent. Safe to re-apply.
-- ===========================================================================

alter table public.posts
  add column if not exists focus_keyword text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_focus_keyword_length'
  ) then
    alter table public.posts
      add constraint posts_focus_keyword_length check (
        focus_keyword is null or char_length(focus_keyword) between 1 and 120
      );
  end if;
end
$$;
