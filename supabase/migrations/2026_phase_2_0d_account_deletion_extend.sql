-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2.0d — Extend delete_my_account() cascade for new tables
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- Adds explicit cleanup for the moderation tables introduced in 2.0a. The
-- foreign-key cascades on auth.users would handle this physically, but
-- consistency with the existing pattern (explicit DELETEs before the
-- auth.users delete so the JWT remains valid for the rows above) keeps
-- behavior predictable across all tables.
--
-- Note on report_queue: when a reporter deletes their account, their reports
-- are also removed. This is intentional — a deleted account can't follow up
-- on the report and we shouldn't keep PII (their auth.uid) tied to it
-- forever. The reported user's history of being reported by THIS user is
-- erased; reports from other users about them remain.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.game_states         where player_id  = uid;
  delete from public.profiles            where id         = uid;
  delete from public.user_achievements   where player_id  = uid;
  delete from public.friend_notifications where sender_id = uid or recipient_id = uid;
  delete from public.friend_requests     where sender_id = uid or recipient_id = uid;

  -- Phase 2.0 additions:
  delete from public.report_queue        where reporter_id = uid or reported_id = uid;
  delete from public.user_blocks         where blocker_id  = uid or blocked_id = uid;

  -- Auth row last so the JWT remains valid for the rows above.
  delete from auth.users where id = uid;
end;
$$;
