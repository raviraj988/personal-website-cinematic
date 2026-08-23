-- ===========================================================================
-- Focus keyword for the editor's SEO checklist.
--
-- Strictly additive, alongside the wire contract in 0001. Nullable with no
-- default, so the external drafting tool — which does not know this column
-- exists — keeps inserting valid rows untouched.
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
