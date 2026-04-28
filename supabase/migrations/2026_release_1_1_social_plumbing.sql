-- ─────────────────────────────────────────────────────────────────────────────
-- Release 1.1 — Social plumbing
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- This migration introduces three things:
--   1. Server-side axolotl-name moderation flag (`profiles.name_flagged`) plus
--      a BEFORE-update trigger that sets it when a name matches a denylist of
--      banned substrings. The trigger flags but does NOT reject — staff review
--      uses the flag as a signal.
--   2. A retroactive scan helper (`flag_existing_axolotl_names()`) the operator
--      runs once after migration to backfill `name_flagged` for current rows.
--   3. A generic `friend_requests` table with `request_type` so future flows
--      (breeding-with-friend, decoration trades) reuse the same handshake
--      infra. Includes RLS, two RPCs (`send_friend_request`,
--      `respond_to_friend_request`), and per-direction indices.
--
-- Notes for the COPPA posture:
--   • The denylist is hand-curated for a kids' audience and is intentionally
--     stricter than an adult forum. Update the WHERE clause in
--     `is_axolotl_name_banned()` to grow the list.
--   • `friend_requests` does not encode any age check itself. Application
--     code must continue to gate request *creation* on the under-13 flag;
--     this layer is generic infrastructure, not a policy boundary.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Axolotl-name moderation ───────────────────────────────────────────────

alter table public.profiles
  add column if not exists name_flagged boolean not null default false;

create index if not exists profiles_name_flagged_idx
  on public.profiles (name_flagged)
  where name_flagged = true;

-- Normalizes a name for substring matching: lowercases, strips non-letters,
-- and folds common leet substitutions
-- (0→o, 1→i, 3→e, 4→a, 5→s, 6→g, 7→t, 8→b, @→a, $→s, !→i).
-- Must match the client-side normalizer in src/app/utils/contentModeration.ts;
-- the from/to strings here are the same length so positions align 1:1.
create or replace function public.normalize_axolotl_name(p_name text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      lower(coalesce(p_name, '')),
      '01345678@$!',
      'oieasgtbasi'
    ),
    '[^a-z]',
    '',
    'g'
  )
$$;

-- Returns true if the normalized name contains any banned substring.
-- Keep this list short and obvious. Subjective calls go to the review queue
-- (i.e. flag-without-block via the trigger below).
create or replace function public.is_axolotl_name_banned(p_name text)
returns boolean
language plpgsql
immutable
as $$
declare
  n text := public.normalize_axolotl_name(p_name);
  banned text[] := array[
    -- Profanity (normalized forms)
    'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'asshole', 'bastard',
    -- Sexual / body
    'sex', 'porn', 'boob', 'tit', 'penis', 'vagina', 'nude', 'horny', 'rape',
    -- Racial slurs
    'nigger', 'nigga', 'faggot', 'retard', 'tranny', 'chink', 'spic',
    'gook', 'kike', 'wetback', 'towelhead', 'raghead', 'pickaninny',
    'darkie', 'beaner', 'hymie', 'jap', 'dago', 'coon',
    -- Self-harm
    'suicide', 'killyourself', 'kys',
    -- Hate movements / religious slurs
    'hitler', 'nazi', 'kkk', 'klan', 'whitepower', 'whitepride',
    'supremacist', 'siegheil', 'fourteenwords', 'iabb', -- 'iabb' catches "1488" via 1→i,4→a,8→b
    'kafir', 'kaffir',
    -- Illicit drugs
    'cocaine', 'heroin', 'fentanyl', 'marijuana', 'cannabis', 'opium',
    'ecstasy', 'mdma', 'lsd', 'dmt', 'ketamine', 'methamphetamine',
    'crackhead', 'methhead', 'junkie', 'stoner'
  ];
  word text;
begin
  if n = '' then return false; end if;
  foreach word in array banned loop
    if position(word in n) > 0 then return true; end if;
  end loop;
  return false;
end;
$$;

create or replace function public.profiles_check_axolotl_name()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.axolotl_name is distinct from old.axolotl_name then
    new.name_flagged := public.is_axolotl_name_banned(new.axolotl_name);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_check_axolotl_name on public.profiles;
create trigger trg_profiles_check_axolotl_name
  before insert or update of axolotl_name on public.profiles
  for each row execute function public.profiles_check_axolotl_name();

-- One-shot retro-flag for existing rows. Operator runs this once after the
-- migration applies; safe to re-run.
create or replace function public.flag_existing_axolotl_names()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.profiles
     set name_flagged = public.is_axolotl_name_banned(axolotl_name)
   where axolotl_name is not null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.flag_existing_axolotl_names() from public;
-- Operator-only; run from SQL editor with service-role context.

-- ── 2. friend_requests table + RLS + RPCs ────────────────────────────────────

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('friend', 'breed', 'decoration_trade')),
  payload jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_no_self check (sender_id <> recipient_id)
);

create index if not exists friend_requests_recipient_pending_idx
  on public.friend_requests (recipient_id, created_at desc)
  where status = 'pending';

create index if not exists friend_requests_sender_pending_idx
  on public.friend_requests (sender_id, created_at desc)
  where status = 'pending';

-- One pending row per (sender, recipient, request_type). New requests after a
-- decline/cancel are allowed; only "still-open" ones are unique.
create unique index if not exists friend_requests_unique_pending
  on public.friend_requests (sender_id, recipient_id, request_type)
  where status = 'pending';

alter table public.friend_requests enable row level security;

-- Sender or recipient can read.
drop policy if exists friend_requests_select on public.friend_requests;
create policy friend_requests_select on public.friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Insert path goes through the RPC; block direct inserts.
drop policy if exists friend_requests_insert on public.friend_requests;
create policy friend_requests_insert on public.friend_requests
  for insert with check (false);

-- Update path goes through the RPC; block direct updates.
drop policy if exists friend_requests_update on public.friend_requests;
create policy friend_requests_update on public.friend_requests
  for update using (false) with check (false);

-- No deletes (preserve audit trail; cascade from auth.users handles removal).
drop policy if exists friend_requests_delete on public.friend_requests;
create policy friend_requests_delete on public.friend_requests
  for delete using (false);

-- send_friend_request: creates a pending row from the caller to p_recipient_id.
-- Errors mapped to PG codes the client can recognize:
--   42501 — not authenticated / not authorized
--   22023 — invalid request_type
--   P0001 — self-request
--   P0002 — duplicate pending
create or replace function public.send_friend_request(
  p_recipient_id uuid,
  p_request_type text,
  p_payload jsonb default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_request_type not in ('friend', 'breed', 'decoration_trade') then
    raise exception 'Invalid request_type' using errcode = '22023';
  end if;
  if uid = p_recipient_id then
    raise exception 'Cannot send to self' using errcode = 'P0001';
  end if;
  if not exists (select 1 from auth.users where id = p_recipient_id) then
    raise exception 'Recipient not found' using errcode = 'P0001';
  end if;

  insert into public.friend_requests (sender_id, recipient_id, request_type, payload, status)
  values (uid, p_recipient_id, p_request_type, p_payload, 'pending')
  returning id into new_id;

  return new_id;
exception
  when unique_violation then
    raise exception 'Already pending' using errcode = 'P0002';
end;
$$;

revoke all on function public.send_friend_request(uuid, text, jsonb) from public;
grant execute on function public.send_friend_request(uuid, text, jsonb) to authenticated;

-- respond_to_friend_request: recipient accepts or declines a pending request.
-- Returns the new status string ('accepted' | 'declined').
create or replace function public.respond_to_friend_request(
  p_request_id uuid,
  p_accept boolean
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req public.friend_requests%rowtype;
  new_status text;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into req from public.friend_requests where id = p_request_id;
  if not found then
    raise exception 'Request not found' using errcode = 'P0001';
  end if;
  if req.recipient_id <> uid then
    raise exception 'Not your request' using errcode = '42501';
  end if;
  if req.status <> 'pending' then
    raise exception 'Already responded' using errcode = 'P0002';
  end if;

  new_status := case when p_accept then 'accepted' else 'declined' end;

  update public.friend_requests
     set status = new_status,
         responded_at = now()
   where id = p_request_id;

  return new_status;
end;
$$;

revoke all on function public.respond_to_friend_request(uuid, boolean) from public;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;

-- cancel_friend_request: sender withdraws a pending request.
create or replace function public.cancel_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req public.friend_requests%rowtype;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into req from public.friend_requests where id = p_request_id;
  if not found then
    raise exception 'Request not found' using errcode = 'P0001';
  end if;
  if req.sender_id <> uid then
    raise exception 'Not your request' using errcode = '42501';
  end if;
  if req.status <> 'pending' then
    raise exception 'Already responded' using errcode = 'P0002';
  end if;

  update public.friend_requests
     set status = 'cancelled',
         responded_at = now()
   where id = p_request_id;
end;
$$;

revoke all on function public.cancel_friend_request(uuid) from public;
grant execute on function public.cancel_friend_request(uuid) to authenticated;

-- Extend account-deletion to clean up friend_requests.
-- (The cascade on auth.users handles physical deletion; this is here so the
-- existing delete_my_account RPC drops rows BEFORE the auth.users delete to
-- match its pattern of explicit cleanup.)
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
  delete from public.friend_requests     where sender_id = uid or recipient_id = uid;

  delete from auth.users where id = uid;
end;
$$;
