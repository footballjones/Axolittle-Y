-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2.1 hotfix — Fix SQL identifier ambiguity in award_friendship_xp_internal
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- The original function (in 2026_phase_2_1_friendship_level.sql) declares
-- RETURNS TABLE (pair_id text, level smallint, total_xp integer, ...)
-- which creates implicit OUT-parameter-like variables that share names with
-- the public.friendships table columns. PL/pgSQL's default
-- variable_conflict=error mode raises 42702 on the UPDATE statement's WHERE
-- clause `where pair_id = v_pair_id`. Because the trigger
-- on_friend_notif_award_xp PERFORMs this function inside an AFTER INSERT
-- trigger, the exception bubbles up and rolls back the entire INSERT —
-- meaning every gift and sticker has been silently rejected since 2.1
-- shipped. (Verified: friend_notifications has zero gift/sticker rows since
-- the trigger was created.)
--
-- Fix: add `#variable_conflict use_column` directive so unqualified column
-- names in queries always resolve to the table column, never the function's
-- output variables. Function body otherwise unchanged from the original.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.award_friendship_xp_internal(
  p_user_a uuid,
  p_user_b uuid,
  p_action text
) returns table (
  pair_id text,
  level smallint,
  total_xp integer,
  daily_xp_count smallint,
  leveled_up boolean,
  cap_reached boolean
)
language plpgsql security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_pair_id text := public.canonical_pair_id(p_user_a, p_user_b);
  v_min uuid := least(p_user_a, p_user_b);
  v_max uuid := greatest(p_user_a, p_user_b);
  v_xp_amount integer;
  v_capped boolean;
  v_row public.friendships%rowtype;
  v_old_level smallint;
  v_new_level smallint;
  v_today date := current_date;
  v_award integer := 0;
  v_cap_reached boolean := false;
  v_legacy_mutual boolean;
begin
  if    p_action = 'gift'     then v_xp_amount := 2;  v_capped := true;
  elsif p_action = 'visit'    then v_xp_amount := 1;  v_capped := true;
  elsif p_action = 'sticker'  then v_xp_amount := 1;  v_capped := true;
  elsif p_action = 'egg_gift' then v_xp_amount := 5;  v_capped := true;
  elsif p_action = 'breed'    then v_xp_amount := 10; v_capped := false;
  else
    select * into v_row from public.friendships f where f.pair_id = v_pair_id;
    if found then
      return query select v_row.pair_id, v_row.level, v_row.total_xp, v_row.daily_xp_count, false, false;
    end if;
    return;
  end if;

  if p_user_a = p_user_b then return; end if;

  select * into v_row from public.friendships f where f.pair_id = v_pair_id for update;

  if not found then
    select
      exists(select 1 from public.friend_notifications
              where sender_id = p_user_a and recipient_id = p_user_b and type = 'friend_add')
      and
      exists(select 1 from public.friend_notifications
              where sender_id = p_user_b and recipient_id = p_user_a and type = 'friend_add')
      into v_legacy_mutual;

    if not v_legacy_mutual then
      return;
    end if;

    insert into public.friendships (pair_id, player_a, player_b, level, total_xp, daily_xp_count, daily_xp_reset_date)
    values (v_pair_id, v_min, v_max, 0, 0, 0, v_today)
    on conflict (pair_id) do nothing;

    select * into v_row from public.friendships f where f.pair_id = v_pair_id for update;
  end if;

  if v_row.daily_xp_reset_date <> v_today then
    v_row.daily_xp_count := 0;
    v_row.daily_xp_reset_date := v_today;
  end if;

  v_old_level := v_row.level;

  if v_capped then
    if v_row.daily_xp_count >= 5 then
      v_award := 0;
      v_cap_reached := true;
    elsif v_row.daily_xp_count + v_xp_amount > 5 then
      v_award := 5 - v_row.daily_xp_count;
      v_cap_reached := true;
    else
      v_award := v_xp_amount;
    end if;
  else
    v_award := v_xp_amount;
  end if;

  if v_award > 0 then
    v_row.total_xp := v_row.total_xp + v_award;
    v_row.level := public.calc_friendship_level(v_row.total_xp);
    if v_capped then
      v_row.daily_xp_count := v_row.daily_xp_count + v_award;
    end if;
    v_row.last_xp_at := now();

    update public.friendships f
       set total_xp = v_row.total_xp,
           level = v_row.level,
           daily_xp_count = v_row.daily_xp_count,
           daily_xp_reset_date = v_row.daily_xp_reset_date,
           last_xp_at = v_row.last_xp_at
     where f.pair_id = v_pair_id;
  end if;

  v_new_level := v_row.level;

  return query select
    v_row.pair_id,
    v_row.level,
    v_row.total_xp,
    v_row.daily_xp_count,
    (v_new_level > v_old_level) as leveled_up,
    v_cap_reached;
end;
$$;

revoke execute on function public.award_friendship_xp_internal(uuid, uuid, text) from public, anon, authenticated;
