-- ─────────────────────────────────────────────────────────────────────────────
-- Defense-in-depth on delete_my_account()
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- The function already rejects unauthenticated callers via
--   `if uid is null then raise exception 'Not authenticated'`,
-- but the Supabase advisor flags any anon-callable SECURITY DEFINER function.
-- Revoke at the API layer too so the route returns "permission denied" before
-- the function body even runs.
-- ─────────────────────────────────────────────────────────────────────────────

revoke execute on function public.delete_my_account() from anon;
