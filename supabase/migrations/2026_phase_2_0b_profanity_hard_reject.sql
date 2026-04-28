-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2.0b — Profanity hard-reject for new axolotl names
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- Promotes the existing `profiles_check_axolotl_name` trigger from
-- "soft-flag" (set name_flagged=true) to "hard-reject" (RAISE EXCEPTION) for
-- newly-set or newly-changed axolotl names. Existing flagged names in the DB
-- stay in place — we don't retroactively reject saves that have already
-- written successfully.
--
-- Behavior table:
--   • INSERT with banned name → RAISE (rejected)
--   • UPDATE setting axolotl_name to a banned value → RAISE (rejected)
--   • UPDATE that doesn't touch axolotl_name → unchanged (legacy flagged
--     rows can still update other fields without revalidation)
--   • Existing rows with name_flagged=true → unchanged, staff review handles
--
-- Client gets PG error code '23514' (check_violation) which the NamingScreen
-- and any future name-edit UI maps to a friendly "please choose a different
-- name" message.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.profiles_check_axolotl_name()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Only validate when axolotl_name is being newly set or changed.
  if tg_op = 'INSERT' or new.axolotl_name is distinct from old.axolotl_name then
    if public.is_axolotl_name_banned(new.axolotl_name) then
      -- Hard-reject: the save fails. Client maps '23514' to a friendly UX.
      -- We still set name_flagged so any code path that queries by it (e.g.
      -- a future moderation tool) sees a consistent state on rejected attempts.
      raise exception 'axolotl_name failed moderation check'
        using errcode = '23514',
              hint = 'Please choose a different name.';
    end if;
    -- Clean name → ensure flag is false so toggling between names works.
    new.name_flagged := false;
  end if;
  return new;
end;
$$;
