-- ─────────────────────────────────────────────────────────────────────────────
-- Release 1.2 — Sticker support + friend_notifications type fix
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- Two related changes:
--   1. Widen friend_notifications.type CHECK constraint to include 'friend_add'
--      (which the client has been trying to insert all along — a pre-existing
--      bug where sendFriendAddNotification was failing silently due to the
--      original CHECK only permitting 'gift' and 'poke') and 'sticker' (new).
--   2. Add nullable `sticker_id` column for sticker payloads. The client maps
--      this to a small set of preset sticker IDs defined in
--      src/app/data/stickers.ts.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.friend_notifications
  drop constraint if exists friend_notifications_type_check;

alter table public.friend_notifications
  add constraint friend_notifications_type_check
  check (type = any (array['gift'::text, 'poke'::text, 'friend_add'::text, 'sticker'::text]));

alter table public.friend_notifications
  add column if not exists sticker_id text;
