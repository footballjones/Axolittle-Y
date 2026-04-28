-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2.0c — Server-side under-13 flag on profiles
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- Today the under-13 flag lives only in localStorage (see AgeGateScreen +
-- App.tsx isUnder13). That's fine for client-side feature gating but
-- insufficient for server-side enforcement on new social RPCs (breeding,
-- friend requests, etc.). A jailbroken or modified client could bypass
-- localStorage; the server has no truth.
--
-- This migration:
--   1. Adds profiles.is_under_13 boolean (default false; nullable so existing
--      rows aren't mis-classified — null = "not yet recorded").
--   2. Adds an updated_at column to track when it was last set (audit trail).
--   3. Creates an RPC `set_under_13_flag(p_value boolean)` that the client
--      calls once after the age gate completes. Self-only (caller can only
--      set their own flag). Returns the new value.
--   4. Creates a helper `is_user_under_13(uuid)` that other RPCs can use to
--      gate features. Returns false (treat as 13+) if no row or null —
--      defensive default so a missing flag doesn't accidentally lock out
--      existing players.
--
-- Privacy note: this flag is the most sensitive piece of data we store about
-- a player. It is never exposed via select-from-profiles RLS to other users.
-- Only the player themselves and server-side RPCs (security definer) can read.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists is_under_13 boolean,
  add column if not exists is_under_13_set_at timestamptz;

-- Read-restrict: select policies on profiles allow authenticated users to read
-- other profiles (visit overlay needs appearance). We need to ensure
-- is_under_13 is NOT visible to other users. Easiest enforcement: do not
-- include the column in any client-side select. The RLS for profiles already
-- allows authenticated select-all, so the column is technically readable.
-- We address this by adding a column-level grant restriction.

-- Revoke select on is_under_13 from anon and authenticated (column-level).
-- Then grant select on every OTHER column individually. Postgres has no
-- "select all except this column" so we enumerate.
do $$
declare
  col_name text;
  cols text := '';
begin
  for col_name in
    select column_name
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'profiles'
       and column_name not in ('is_under_13', 'is_under_13_set_at')
  loop
    cols := cols || quote_ident(col_name) || ', ';
  end loop;

  -- Strip trailing ', '
  cols := rtrim(cols, ', ');

  if cols <> '' then
    execute format('revoke select on public.profiles from anon, authenticated');
    execute format('grant select (%s) on public.profiles to anon, authenticated', cols);
    execute format('grant insert, update, delete on public.profiles to authenticated');
  end if;
end $$;

-- set_under_13_flag: self-only setter. Returns the new value.
create or replace function public.set_under_13_flag(p_value boolean)
returns boolean
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

  -- Upsert: existing profile rows get the column set; new rows are created
  -- with just the id and flag (other fields filled later by the cloud sync).
  insert into public.profiles (id, is_under_13, is_under_13_set_at)
  values (uid, p_value, now())
  on conflict (id) do update
    set is_under_13 = excluded.is_under_13,
        is_under_13_set_at = excluded.is_under_13_set_at;

  return p_value;
end;
$$;

revoke execute on function public.set_under_13_flag(boolean) from public, anon;
grant execute on function public.set_under_13_flag(boolean) to authenticated;

-- is_user_under_13: helper for other security-definer RPCs to gate features.
-- Returns true ONLY if the flag is set true; null/false = not under 13.
-- This is defensive — a missing flag is treated as 13+ so existing accounts
-- without the flag don't lose access.
create or replace function public.is_user_under_13(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select is_under_13 from public.profiles where id = p_user_id), false);
$$;

revoke execute on function public.is_user_under_13(uuid) from public, anon, authenticated;
-- Only callable by other SECURITY DEFINER functions running in the public schema.
