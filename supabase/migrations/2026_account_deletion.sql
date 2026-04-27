-- ─────────────────────────────────────────────────────────────────────────────
-- Account self-deletion (Apple App Store Guideline 5.1.1(v) compliance).
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- Provides a single RPC `delete_my_account()` that the authenticated user can
-- invoke from the client. Runs as `security definer` so it can clean up rows
-- under RLS and remove the auth.users record itself.
--
-- Tables removed (extend as new user-scoped tables are added):
--   • game_states         (player_id = auth.uid())
--   • profiles            (id = auth.uid())
--   • user_achievements   (player_id = auth.uid())
--   • friend_notifications (sender_id OR recipient_id = auth.uid())
--   • auth.users          (id = auth.uid())
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
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

  -- Auth row last so the JWT remains valid for the rows above.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
