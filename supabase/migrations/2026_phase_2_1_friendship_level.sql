-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2.1 — Friendship Level v1
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- Adds the per-pair friendship-level system that gates breeding (level 3),
-- bonded decoration (level 5), rare-egg trade (level 7), and unique decoration
-- (level 10) in subsequent phases. This phase only ships the foundation:
-- table + level formula + XP-grant RPC + automatic mutual-detection trigger
-- + automatic XP awarding from friend_notifications inserts. UI surfaces
-- (ring, detail panel, level-up celebration) ship in the same release but
-- via the client.
--
-- Design decisions locked-in upstream:
--   • Symmetric XP awarding: when one friend acts, BOTH sides' shared row
--     gains XP (one row per pair, level applies to both members).
--   • Daily cap of 5 XP/pair from cap-counted actions; breed bypasses cap.
--   • +10 welcome bonus on mutual-friend establishment → instant level 2.
--   • Lazy-create for legacy mutual pairs (no welcome bonus retroactively;
--     they start at level 0 on first XP-granting action).
--   • Canonical pair_id ordering: 'min_uuid:max_uuid' so each pair has one
--     row, regardless of which side initiated.
--
-- Action XP table (server-authoritative):
--   gift     → 2 XP (cap-counted)
--   visit    → 1 XP (cap-counted)
--   sticker  → 1 XP (cap-counted)
--   egg_gift → 5 XP (cap-counted; will fill the cap alone)
--   breed    → 10 XP (BYPASSES cap)
--
-- gift/sticker fire automatically via the friend_notifications trigger so
-- the client cannot lie about XP. visit and egg_gift go through the public
-- award_friendship_xp RPC since they don't have a server-side persistence
-- step today; trusted-but-rate-limited.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Schema ────────────────────────────────────────────────────────────────

create table if not exists public.friendships (
  pair_id text primary key,
  player_a uuid not null references auth.users(id) on delete cascade,
  player_b uuid not null references auth.users(id) on delete cascade,
  level smallint not null default 0,
  total_xp integer not null default 0,
  bonded_decoration_id text,                          -- assigned at level 5 in Phase 2.4
  daily_xp_count smallint not null default 0,        -- cap-counted XP today
  daily_xp_reset_date date not null default current_date,
  created_at timestamptz not null default now(),
  last_xp_at timestamptz not null default now(),
  constraint friendships_canonical_pair check (
    pair_id = least(player_a::text, player_b::text) || ':' || greatest(player_a::text, player_b::text)
  ),
  constraint friendships_level_range check (level between 0 and 10),
  constraint friendships_no_self check (player_a <> player_b)
);

create index if not exists friendships_player_a_idx on public.friendships (player_a);
create index if not exists friendships_player_b_idx on public.friendships (player_b);

alter table public.friendships enable row level security;

-- Caller can read pairs they're in.
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select using (auth.uid() = player_a or auth.uid() = player_b);

-- All writes go through RPCs / triggers. Direct writes blocked.
drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert with check (false);

drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update using (false) with check (false);

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships
  for delete using (false);

-- ── 2. Level formula ─────────────────────────────────────────────────────────
--
-- Level: 0  1  2  3  4  5   6   7   8   9   10
-- XP:    0  3 10 25 50 85 135 200 275 365 475
--
-- Confirmed by user: target ~5-7 days to level 3 (breeding), ~3 weeks to
-- level 5 (bonded), ~3 months to level 10 for hyper-engaged pairs.

create or replace function public.calc_friendship_level(p_total_xp integer)
returns smallint
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_total_xp <   3 then 0
    when p_total_xp <  10 then 1
    when p_total_xp <  25 then 2
    when p_total_xp <  50 then 3
    when p_total_xp <  85 then 4
    when p_total_xp < 135 then 5
    when p_total_xp < 200 then 6
    when p_total_xp < 275 then 7
    when p_total_xp < 365 then 8
    when p_total_xp < 475 then 9
    else                     10
  end::smallint;
$$;

-- Pair-id helper. Always callable internally.
create or replace function public.canonical_pair_id(p_a uuid, p_b uuid)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select least(p_a::text, p_b::text) || ':' || greatest(p_a::text, p_b::text);
$$;

-- ── 3. Core XP awarder (private — used by RPC + triggers) ────────────────────

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
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  -- Action → XP map. 'breed' bypasses cap; everything else is capped.
  if    p_action = 'gift'     then v_xp_amount := 2;  v_capped := true;
  elsif p_action = 'visit'    then v_xp_amount := 1;  v_capped := true;
  elsif p_action = 'sticker'  then v_xp_amount := 1;  v_capped := true;
  elsif p_action = 'egg_gift' then v_xp_amount := 5;  v_capped := true;
  elsif p_action = 'breed'    then v_xp_amount := 10; v_capped := false;
  else
    -- Unknown action — silent no-op rather than raising, so a future client
    -- with a new action name doesn't crash. Returns the pair's current state.
    select * into v_row from public.friendships where friendships.pair_id = v_pair_id;
    if found then
      return query select v_row.pair_id, v_row.level, v_row.total_xp, v_row.daily_xp_count, false, false;
    end if;
    return;
  end if;

  -- Self-action guard.
  if p_user_a = p_user_b then return; end if;

  -- Try to find existing row.
  select * into v_row from public.friendships where friendships.pair_id = v_pair_id for update;

  -- Lazy-create for legacy mutual pairs. Only if both sides have ever sent
  -- each other a friend_add — that's our proof of mutual friendship for
  -- pairs that existed before this phase shipped.
  if not found then
    select
      exists(select 1 from public.friend_notifications
              where sender_id = p_user_a and recipient_id = p_user_b and type = 'friend_add')
      and
      exists(select 1 from public.friend_notifications
              where sender_id = p_user_b and recipient_id = p_user_a and type = 'friend_add')
      into v_legacy_mutual;

    if not v_legacy_mutual then
      -- Not yet mutual — silent no-op. The friend_add trigger will create the
      -- row when both sides have added; until then XP doesn't flow.
      return;
    end if;

    -- Legacy mutual — create the row with NO welcome bonus (the act of
    -- becoming friends already happened pre-system).
    insert into public.friendships (pair_id, player_a, player_b, level, total_xp, daily_xp_count, daily_xp_reset_date)
    values (v_pair_id, v_min, v_max, 0, 0, 0, v_today)
    on conflict (pair_id) do nothing;

    select * into v_row from public.friendships where friendships.pair_id = v_pair_id for update;
  end if;

  -- Reset daily counter if a day has rolled over.
  if v_row.daily_xp_reset_date <> v_today then
    v_row.daily_xp_count := 0;
    v_row.daily_xp_reset_date := v_today;
  end if;

  v_old_level := v_row.level;

  -- Apply daily cap for capped actions.
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

    update public.friendships
       set total_xp = v_row.total_xp,
           level = v_row.level,
           daily_xp_count = v_row.daily_xp_count,
           daily_xp_reset_date = v_row.daily_xp_reset_date,
           last_xp_at = v_row.last_xp_at
     where pair_id = v_pair_id;
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

-- ── 4. Public XP RPC for client-driven actions (visit, egg_gift) ─────────────

create or replace function public.award_friendship_xp(
  p_other_player uuid,
  p_action text
) returns table (
  pair_id text,
  level smallint,
  total_xp integer,
  daily_xp_count smallint,
  leveled_up boolean,
  cap_reached boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  -- Only accept the actions we expect from the client. gift/sticker/breed
  -- fire from server-side triggers and shouldn't be re-counted via this path.
  if p_action not in ('visit', 'egg_gift') then
    raise exception 'Action % must be triggered server-side', p_action using errcode = '22023';
  end if;

  return query select * from public.award_friendship_xp_internal(uid, p_other_player, p_action);
end;
$$;

revoke execute on function public.award_friendship_xp(uuid, text) from public, anon;
grant execute on function public.award_friendship_xp(uuid, text) to authenticated;

-- ── 5. Mutual-detection trigger ──────────────────────────────────────────────
-- Fires on friend_notifications inserts. When type='friend_add' arrives and
-- the OTHER side has also previously sent a friend_add, both sides have
-- mutually added — create the friendship row at level 2 (welcome bonus).

create or replace function public.on_friend_add_check_mutual()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pair_id text;
  v_min uuid;
  v_max uuid;
begin
  if new.type <> 'friend_add' then return new; end if;
  if new.sender_id = new.recipient_id then return new; end if;

  -- Check if the recipient has ever added the sender (mutual establishment).
  if exists (
    select 1 from public.friend_notifications
     where sender_id = new.recipient_id
       and recipient_id = new.sender_id
       and type = 'friend_add'
  ) then
    v_min := least(new.sender_id, new.recipient_id);
    v_max := greatest(new.sender_id, new.recipient_id);
    v_pair_id := v_min::text || ':' || v_max::text;

    -- Welcome bonus: +10 XP → level 2 from the formula. daily_xp_count stays 0
    -- because welcome bonus bypasses the cap.
    insert into public.friendships (pair_id, player_a, player_b, level, total_xp, daily_xp_count, daily_xp_reset_date)
    values (v_pair_id, v_min, v_max, 2, 10, 0, current_date)
    on conflict (pair_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_friend_add_check_mutual on public.friend_notifications;
create trigger trg_friend_add_check_mutual
  after insert on public.friend_notifications
  for each row execute function public.on_friend_add_check_mutual();

-- ── 6. Auto-XP trigger for gifts and stickers ────────────────────────────────
-- Server-authoritative XP for every gift and sticker insert. Pokes don't
-- grant XP per design.

create or replace function public.on_friend_notif_award_xp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text;
begin
  if new.type = 'gift' then
    v_action := 'gift';
  elsif new.type = 'sticker' then
    v_action := 'sticker';
  else
    return new;  -- friend_add and poke don't grant XP
  end if;

  perform public.award_friendship_xp_internal(new.sender_id, new.recipient_id, v_action);
  return new;
end;
$$;

drop trigger if exists trg_friend_notif_award_xp on public.friend_notifications;
create trigger trg_friend_notif_award_xp
  after insert on public.friend_notifications
  for each row execute function public.on_friend_notif_award_xp();

-- ── 7. Account deletion cascade extension ────────────────────────────────────
-- Friendships rows are removed by the auth.users foreign-key cascade, but we
-- mirror the explicit-delete pattern of delete_my_account for predictability.

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
  delete from public.report_queue        where reporter_id = uid or reported_id = uid;
  delete from public.user_blocks         where blocker_id  = uid or blocked_id = uid;
  delete from public.friendships         where player_a = uid or player_b = uid;

  delete from auth.users where id = uid;
end;
$$;
