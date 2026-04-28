-- ─────────────────────────────────────────────────────────────────────────────
-- Release 1.1 — Advisor cleanup follow-up
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- Addresses Supabase advisor warnings raised after the main release_1_1
-- migration:
--   A) Lock down anon access on the new RPCs. They all assert auth.uid() is
--      not null, but advisor flags any anon-callable security-definer
--      function. Revoke explicitly so the API doesn't expose them at all.
--   B) flag_existing_axolotl_names is operator-only; revoke from BOTH anon
--      and authenticated so only the service-role can run it.
--   C) Pin search_path on the three remaining mutable-search-path helpers
--      (defense-in-depth; prevents schema-confusion attacks via session
--      search_path manipulation).
-- ─────────────────────────────────────────────────────────────────────────────

-- A: lock down anon on the new friend-request RPCs
revoke execute on function public.send_friend_request(uuid, text, jsonb)     from anon;
revoke execute on function public.respond_to_friend_request(uuid, boolean)   from anon;
revoke execute on function public.cancel_friend_request(uuid)                from anon;

-- B: operator-only — never callable from the API
revoke execute on function public.flag_existing_axolotl_names() from anon, authenticated;

-- C: pin search_path on the helpers / trigger function
alter function public.normalize_axolotl_name(text)       set search_path = public, pg_temp;
alter function public.is_axolotl_name_banned(text)       set search_path = public, pg_temp;
alter function public.profiles_check_axolotl_name()      set search_path = public, pg_temp;
