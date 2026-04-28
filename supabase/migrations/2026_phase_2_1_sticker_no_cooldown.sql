-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2.1 hotfix — Exempt 'sticker' from the 18-hour insert cooldown
--
-- Apply via Supabase Dashboard → SQL editor. Idempotent: safe to re-run.
--
-- The two existing INSERT policies on friend_notifications enforce an 18-hour
-- per-(sender, recipient, type) cooldown for everything except friend_add.
-- That made sense pre-1.2 when the only types were gift/poke/friend_add.
-- Phase 1.2 introduced 'sticker' as a lightweight reaction during visits;
-- the design intent was multiple stickers per visit AND across visits, but
-- the existing cooldown silently rejected anything beyond the first sticker
-- to a given friend in any 18-hour window. The client UI showed "Sent" in
-- both cases because the insert was fire-and-forget.
--
-- Fix: extend the friend_add carve-out to include 'sticker'. After this:
--   • friend_add: no cooldown (mutual-add notifications)
--   • sticker:    no cooldown (lightweight visit reactions)
--   • gift, poke: 18h cooldown stays (deliberate spam prevention)
--
-- Both existing INSERT policies on the table are updated. We replace the
-- older `fn_insert_authenticated` (public role, full cooldown) with a
-- version that matches the newer `friend_notifications_insert_sender`
-- behavior so OR-semantics across both policies stays consistent.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists fn_insert_authenticated on public.friend_notifications;
create policy fn_insert_authenticated on public.friend_notifications
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> recipient_id
    and (
      type in ('friend_add', 'sticker')
      or not exists (
        select 1 from public.friend_notifications existing
         where existing.sender_id = auth.uid()
           and existing.recipient_id = friend_notifications.recipient_id
           and existing.type = friend_notifications.type
           and existing.created_at > now() - interval '18 hours'
      )
    )
  );

drop policy if exists friend_notifications_insert_sender on public.friend_notifications;
create policy friend_notifications_insert_sender on public.friend_notifications
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and (
      type in ('friend_add', 'sticker')
      or not exists (
        select 1 from public.friend_notifications fn
         where fn.sender_id = auth.uid()
           and fn.recipient_id = friend_notifications.recipient_id
           and fn.type = friend_notifications.type
           and fn.created_at > now() - interval '18 hours'
      )
    )
  );
