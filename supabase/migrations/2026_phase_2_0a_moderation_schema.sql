-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2.0a — Moderation schema (report queue + user blocks)
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- Required by Apple App Store Guideline 1.2 and Google Play UGC policy for
-- any app that exposes user-generated content (axolotl names, in our case)
-- to other users. Two surfaces:
--
--   1. report_queue — players submit reports about other players' behavior or
--      visible content. Staff triage from Supabase Studio (SQL editor) for
--      v1; dedicated dashboard is a future phase.
--   2. user_blocks — players block each other. Symmetric — A blocking B means
--      neither sees the other in friend lookups, visits, or breed proposals.
--
-- The block list is enforced by client-side filtering for v1 (every friend
-- and snapshot fetch joins user_blocks). A future hardening pass can move
-- enforcement into RLS policies.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. report_queue ──────────────────────────────────────────────────────────

create table if not exists public.report_queue (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('inappropriate_name', 'harassment', 'other')),
  context text check (context in ('visit', 'breed_request', 'gift', 'sticker', 'friend_card', 'other')),
  context_metadata jsonb,
  notes text,                    -- optional 200-char user-supplied detail
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_notes text,
  constraint report_queue_no_self check (reporter_id <> reported_id)
);

create index if not exists report_queue_pending_idx
  on public.report_queue (created_at desc)
  where status = 'pending';

create index if not exists report_queue_reported_idx
  on public.report_queue (reported_id, created_at desc);

alter table public.report_queue enable row level security;

-- Reporter can read their own reports (e.g. to show submission history).
drop policy if exists report_queue_select_own on public.report_queue;
create policy report_queue_select_own on public.report_queue
  for select using (auth.uid() = reporter_id);

-- All writes go through the RPC.
drop policy if exists report_queue_insert on public.report_queue;
create policy report_queue_insert on public.report_queue
  for insert with check (false);

drop policy if exists report_queue_update on public.report_queue;
create policy report_queue_update on public.report_queue
  for update using (false) with check (false);

drop policy if exists report_queue_delete on public.report_queue;
create policy report_queue_delete on public.report_queue
  for delete using (false);

-- submit_report: rate-limited to 1 (reporter, reported, reason) per 24h.
-- Errors:
--   42501 — not authenticated
--   P0001 — self-report or invalid recipient
--   P0002 — duplicate within window
--   22023 — invalid reason or context
create or replace function public.submit_report(
  p_reported_id uuid,
  p_reason text,
  p_context text default null,
  p_context_metadata jsonb default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if uid = p_reported_id then
    raise exception 'Cannot report yourself' using errcode = 'P0001';
  end if;
  if p_reason not in ('inappropriate_name', 'harassment', 'other') then
    raise exception 'Invalid reason' using errcode = '22023';
  end if;
  if p_context is not null and p_context not in ('visit', 'breed_request', 'gift', 'sticker', 'friend_card', 'other') then
    raise exception 'Invalid context' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_reported_id) then
    raise exception 'Reported user not found' using errcode = 'P0001';
  end if;

  -- Anti-spam: one (reporter, reported, reason) per 24h.
  if exists (
    select 1 from public.report_queue
     where reporter_id = uid
       and reported_id = p_reported_id
       and reason = p_reason
       and created_at > now() - interval '24 hours'
  ) then
    raise exception 'Already reported recently' using errcode = 'P0002';
  end if;

  insert into public.report_queue (reporter_id, reported_id, reason, context, context_metadata, notes, status)
  values (uid, p_reported_id, p_reason, p_context, p_context_metadata, left(coalesce(p_notes, ''), 500), 'pending')
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function public.submit_report(uuid, text, text, jsonb, text) from public, anon;
grant execute on function public.submit_report(uuid, text, text, jsonb, text) to authenticated;

-- ── 2. user_blocks ───────────────────────────────────────────────────────────

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

-- Blocker reads their own list.
drop policy if exists user_blocks_select_own on public.user_blocks;
create policy user_blocks_select_own on public.user_blocks
  for select using (auth.uid() = blocker_id);

-- All writes go through the RPC.
drop policy if exists user_blocks_insert on public.user_blocks;
create policy user_blocks_insert on public.user_blocks
  for insert with check (false);

drop policy if exists user_blocks_delete on public.user_blocks;
create policy user_blocks_delete on public.user_blocks
  for delete using (false);

drop policy if exists user_blocks_update on public.user_blocks;
create policy user_blocks_update on public.user_blocks
  for update using (false) with check (false);

-- block_user: idempotent (re-blocking is fine).
-- Errors:
--   42501 — not authenticated
--   P0001 — self-block or invalid target
create or replace function public.block_user(p_target_id uuid)
returns void
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
  if uid = p_target_id then
    raise exception 'Cannot block yourself' using errcode = 'P0001';
  end if;
  if not exists (select 1 from auth.users where id = p_target_id) then
    raise exception 'Target user not found' using errcode = 'P0001';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (uid, p_target_id)
  on conflict (blocker_id, blocked_id) do nothing;
end;
$$;

revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

-- unblock_user: idempotent (no error if not currently blocked).
create or replace function public.unblock_user(p_target_id uuid)
returns void
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

  delete from public.user_blocks
   where blocker_id = uid and blocked_id = p_target_id;
end;
$$;

revoke execute on function public.unblock_user(uuid) from public, anon;
grant execute on function public.unblock_user(uuid) to authenticated;
