import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  console.warn('[Supabase] VITE_SUPABASE_URL not configured — cloud save disabled');
}
if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key-here') {
  console.warn('[Supabase] VITE_SUPABASE_ANON_KEY not configured — cloud save disabled');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
);

/** True only when the project credentials are actually configured. */
export const isSupabaseConfigured =
  !!supabaseUrl &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !!supabaseAnonKey &&
  supabaseAnonKey !== 'your-anon-key-here';

// ─── friend_notifications helpers ─────────────────────────────────────────────

export interface FriendNotificationRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  type: 'gift' | 'poke' | 'friend_add' | 'sticker';
  coins: number;
  opals: number;
  sender_name: string;
  friend_code?: string | null;
  sticker_id?: string | null;
  applied: boolean;
  created_at: string;
}

/**
 * Inserts a gift or poke row for the recipient.
 * Returns null on success, or 'cooldown' if the RLS 18-hour window blocks it.
 */
export async function sendFriendAction(
  senderId: string,
  recipientId: string,
  senderName: string,
  type: 'gift' | 'poke',
  coins: number,
  opals: number,
): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Not signed in';

  const { error } = await supabase
    .from('friend_notifications')
    .insert({ sender_id: senderId, recipient_id: recipientId, sender_name: senderName, type, coins, opals, applied: false });

  if (error) {
    if (error.code === '42501' || error.code === 'PGRST301') return 'cooldown';
    console.error('[sendFriendAction]', error);
    return error.message;
  }
  return null;
}

/**
 * Sends a sticker to a friend during a visit. Stickers are preset and have no
 * cooldown (different from pokes — see SOCIAL_COOLDOWN_MS in SocialModal).
 * Returns null on success or a short error string for the caller to show.
 */
export async function sendSticker(
  senderId: string,
  recipientId: string,
  senderName: string,
  stickerId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Not signed in';

  const { error } = await supabase
    .from('friend_notifications')
    .insert({ sender_id: senderId, recipient_id: recipientId, sender_name: senderName, type: 'sticker', sticker_id: stickerId, coins: 0, opals: 0, applied: false });

  if (error) {
    console.error('[sendSticker]', error);
    return error.message;
  }
  return null;
}

/**
 * Notifies a user that they were added as a friend by inserting a
 * `friend_add` row. The mutual-detection trigger (Phase 2.1) reads these
 * to know when both sides have added each other and creates the friendship
 * row at level 2 with the welcome bonus.
 *
 * Returns `{ ok: true }` on success or `{ ok: false, error }` on failure.
 * Callers should treat failure as observable (log telemetry, surface to
 * user) rather than silent — without this row, the friendship-level system
 * never activates for the pair.
 */
export async function sendFriendAddNotification(
  senderId: string,
  recipientId: string,
  senderName: string,
  senderFriendCode: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'not_configured' };
  const { error } = await supabase
    .from('friend_notifications')
    .insert({ sender_id: senderId, recipient_id: recipientId, sender_name: senderName, type: 'friend_add', coins: 0, opals: 0, friend_code: senderFriendCode, applied: false });
  if (error) {
    console.error('[sendFriendAddNotification]', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Fetches all unapplied friend_notifications for a user, oldest-first. */
export async function fetchPendingNotifications(userId: string): Promise<FriendNotificationRow[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('friend_notifications')
    .select('*')
    .eq('recipient_id', userId)
    .eq('applied', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[fetchPendingNotifications]', error);
    return [];
  }
  return (data ?? []) as FriendNotificationRow[];
}

/** Marks a single friend_notification row as applied (recipient-only via RLS). */
export async function markNotificationApplied(notifId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('friend_notifications')
    .update({ applied: true })
    .eq('id', notifId);

  if (error) console.error('[markNotificationApplied]', error);
}

// ─── friend snapshot (public profiles data) ───────────────────────────────────

export interface FriendSnapshot {
  axolotlColor: string;
  axolotlPattern: string;
  axolotlRarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  bgColor: string;
  decorations: string[];
}

/**
 * Fetches the publicly-visible appearance data for any player from profiles.
 * Uses the SELECT ALL policy which allows any authenticated user to read profiles.
 */
export async function fetchFriendSnapshot(playerId: string): Promise<FriendSnapshot | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('axolotl_color, axolotl_pattern, axolotl_rarity, bg_color, decorations')
    .eq('id', playerId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    axolotlColor: data.axolotl_color ?? '#ff6b9d',
    axolotlPattern: data.axolotl_pattern ?? 'spots',
    axolotlRarity: (data.axolotl_rarity ?? 'Common') as FriendSnapshot['axolotlRarity'],
    bgColor: data.bg_color ?? '#1e40af',
    decorations: (data.decorations as string[]) ?? [],
  };
}

// ─── user_achievements helpers ────────────────────────────────────────────────

/**
 * Upserts a batch of achievement IDs for the authenticated user.
 * Safe to call with IDs that already exist (ON CONFLICT DO NOTHING via UNIQUE constraint).
 */
export async function pushAchievements(userId: string, achievementIds: string[]): Promise<void> {
  if (!isSupabaseConfigured || achievementIds.length === 0) return;

  const rows = achievementIds.map(id => ({ player_id: userId, achievement_id: id }));
  const { error } = await supabase
    .from('user_achievements')
    .upsert(rows, { onConflict: 'player_id,achievement_id', ignoreDuplicates: true });

  if (error) console.error('[pushAchievements]', error);
}

/**
 * Fetches all achievement IDs for any player (public read via RLS).
 * Returns [] on error or when Supabase is not configured.
 */
export async function fetchPlayerAchievements(playerId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('player_id', playerId);

  if (error) {
    console.error('[fetchPlayerAchievements]', error);
    return [];
  }
  return (data ?? []).map((r: { achievement_id: string }) => r.achievement_id);
}

/**
 * Subscribes to new friend_notifications rows for this user via Realtime.
 * Returns the channel so the caller can unsubscribe on cleanup.
 */
export function subscribeToFriendNotifications(
  userId: string,
  onNew: (row: FriendNotificationRow) => void,
) {
  return supabase
    .channel(`friend-notifs-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'friend_notifications', filter: `recipient_id=eq.${userId}` },
      (payload) => onNew(payload.new as FriendNotificationRow),
    )
    .subscribe();
}

// ─── friend_requests helpers ──────────────────────────────────────────────────
// Generic two-party handshake infra. `request_type` distinguishes friend vs.
// breed vs. decoration_trade so future flows reuse the same table and RPCs.

export type FriendRequestType = 'friend' | 'breed' | 'decoration_trade';
export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface FriendRequestRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  request_type: FriendRequestType;
  payload: Record<string, unknown> | null;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
}

export type SendRequestResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'unauthenticated' | 'self_request' | 'duplicate' | 'invalid_type' | 'not_configured' | 'unknown'; message?: string };

/**
 * Creates a pending friend_request row from the caller to the recipient.
 * Errors are translated from PG codes raised in send_friend_request().
 */
export async function sendFriendRequest(
  recipientId: string,
  requestType: FriendRequestType,
  payload: Record<string, unknown> | null = null,
): Promise<SendRequestResult> {
  if (!isSupabaseConfigured) return { ok: false, reason: 'not_configured' };

  const { data, error } = await supabase.rpc('send_friend_request', {
    p_recipient_id: recipientId,
    p_request_type: requestType,
    p_payload: payload,
  });

  if (error) {
    if (error.code === '42501') return { ok: false, reason: 'unauthenticated', message: error.message };
    if (error.code === 'P0001') return { ok: false, reason: 'self_request', message: error.message };
    if (error.code === 'P0002') return { ok: false, reason: 'duplicate', message: error.message };
    if (error.code === '22023') return { ok: false, reason: 'invalid_type', message: error.message };
    console.error('[sendFriendRequest]', error);
    return { ok: false, reason: 'unknown', message: error.message };
  }
  return { ok: true, id: data as string };
}

export type RespondResult =
  | { ok: true; status: 'accepted' | 'declined' }
  | { ok: false; reason: 'unauthenticated' | 'not_found' | 'already_responded' | 'not_recipient' | 'not_configured' | 'unknown'; message?: string };

/** Recipient accepts or declines a pending request. */
export async function respondToFriendRequest(
  requestId: string,
  accept: boolean,
): Promise<RespondResult> {
  if (!isSupabaseConfigured) return { ok: false, reason: 'not_configured' };

  const { data, error } = await supabase.rpc('respond_to_friend_request', {
    p_request_id: requestId,
    p_accept: accept,
  });

  if (error) {
    if (error.code === '42501') {
      return { ok: false, reason: error.message?.includes('Not your request') ? 'not_recipient' : 'unauthenticated', message: error.message };
    }
    if (error.code === 'P0001') return { ok: false, reason: 'not_found', message: error.message };
    if (error.code === 'P0002') return { ok: false, reason: 'already_responded', message: error.message };
    console.error('[respondToFriendRequest]', error);
    return { ok: false, reason: 'unknown', message: error.message };
  }
  return { ok: true, status: data as 'accepted' | 'declined' };
}

/** Sender withdraws a pending request. */
export async function cancelFriendRequest(requestId: string): Promise<{ ok: boolean; message?: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: 'not configured' };
  const { error } = await supabase.rpc('cancel_friend_request', { p_request_id: requestId });
  if (error) {
    console.error('[cancelFriendRequest]', error);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Pending requests where the user is sender OR recipient. */
export async function fetchPendingFriendRequests(userId: string): Promise<FriendRequestRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[fetchPendingFriendRequests]', error);
    return [];
  }
  return (data ?? []) as FriendRequestRow[];
}

/**
 * Subscribes to new friend_requests rows where the user is the recipient.
 * Use for showing toast / unread count when an incoming request arrives.
 */
export function subscribeToFriendRequests(
  userId: string,
  onNew: (row: FriendRequestRow) => void,
) {
  return supabase
    .channel(`friend-requests-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `recipient_id=eq.${userId}` },
      (payload) => onNew(payload.new as FriendRequestRow),
    )
    .subscribe();
}

// ─── moderation helpers (Phase 2.0) ───────────────────────────────────────────
// Report queue and user blocks. Required by Apple Guideline 1.2 / Google Play
// UGC policy for any feature that exposes user-generated content. The Phase
// 2.0 migration suite defines the server-side schema + RPCs; everything here
// is the client surface.

export type ReportReason = 'inappropriate_name' | 'harassment' | 'other';
export type ReportContext = 'visit' | 'breed_request' | 'gift' | 'sticker' | 'friend_card' | 'other';

export type SubmitReportResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'unauthenticated' | 'self_report' | 'duplicate' | 'invalid' | 'not_configured' | 'unknown'; message?: string };

/**
 * Submits a report. Server enforces 1-per-(reporter,reported,reason) per 24h.
 */
export async function submitReport(
  reportedId: string,
  reason: ReportReason,
  context: ReportContext | null = null,
  contextMetadata: Record<string, unknown> | null = null,
  notes: string | null = null,
): Promise<SubmitReportResult> {
  if (!isSupabaseConfigured) return { ok: false, reason: 'not_configured' };

  const { data, error } = await supabase.rpc('submit_report', {
    p_reported_id: reportedId,
    p_reason: reason,
    p_context: context,
    p_context_metadata: contextMetadata,
    p_notes: notes,
  });

  if (error) {
    if (error.code === '42501') return { ok: false, reason: 'unauthenticated', message: error.message };
    if (error.code === 'P0001') return { ok: false, reason: 'self_report', message: error.message };
    if (error.code === 'P0002') return { ok: false, reason: 'duplicate', message: error.message };
    if (error.code === '22023') return { ok: false, reason: 'invalid', message: error.message };
    console.error('[submitReport]', error);
    return { ok: false, reason: 'unknown', message: error.message };
  }
  return { ok: true, id: data as string };
}

/** Idempotent — re-blocking is fine. */
export async function blockUser(targetId: string): Promise<{ ok: boolean; message?: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: 'not configured' };
  const { error } = await supabase.rpc('block_user', { p_target_id: targetId });
  if (error) {
    console.error('[blockUser]', error);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Idempotent — no error if not currently blocked. */
export async function unblockUser(targetId: string): Promise<{ ok: boolean; message?: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: 'not configured' };
  const { error } = await supabase.rpc('unblock_user', { p_target_id: targetId });
  if (error) {
    console.error('[unblockUser]', error);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export interface BlockedUserRow {
  blocked_id: string;
  created_at: string;
}

/** Returns the list of users this caller has blocked. */
export async function fetchBlockedUsers(userId: string): Promise<BlockedUserRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[fetchBlockedUsers]', error);
    return [];
  }
  return (data ?? []) as BlockedUserRow[];
}

/**
 * Convenience: returns just the IDs of users who block-related the caller in
 * either direction (blocks made by them, OR blocks made against them).
 * Used to filter out blocked users from friend lookups and visit snapshots.
 *
 * Note: a player can only see blocks where they are the blocker (RLS), so
 * this returns IDs of users they have blocked. Symmetric enforcement (you
 * also can't see THEM if they block you) requires either: (a) a separate
 * "blocked_by_me" check the server runs, or (b) accepting that the symmetric
 * filter only kicks in for actions that go through server RPCs (which can
 * see both sides). For v1 we do (b) — friend list and visit show stale data
 * if the OTHER party blocks you, but you can't take any action on them
 * because the server-side RPCs reject. Fully symmetric client-side filter
 * is a follow-up.
 */
export async function fetchBlockedIds(userId: string): Promise<string[]> {
  const rows = await fetchBlockedUsers(userId);
  return rows.map(r => r.blocked_id);
}

// ─── friendship-level (Phase 2.1) ─────────────────────────────────────────────
// One row per mutual-friend pair. Symmetric: both members see the same level.
// XP is server-authoritative — gift/sticker fire from a postgres trigger;
// visit/egg_gift go through the public `award_friendship_xp` RPC; breed
// fires from the breed-completion RPC in Phase 2.2.

export interface FriendshipRow {
  pair_id: string;
  player_a: string;
  player_b: string;
  level: number;
  total_xp: number;
  bonded_decoration_id: string | null;
  daily_xp_count: number;
  daily_xp_reset_date: string;
  created_at: string;
  last_xp_at: string;
}

export interface FriendshipXpResult {
  pair_id: string;
  level: number;
  total_xp: number;
  daily_xp_count: number;
  leveled_up: boolean;
  cap_reached: boolean;
}

/** Friendship-level XP curve. Total XP needed to reach each level (cumulative). */
export const FRIENDSHIP_LEVEL_THRESHOLDS = [0, 3, 10, 25, 50, 85, 135, 200, 275, 365, 475] as const;

/** Returns the XP needed to advance past the given level (the next threshold). */
export function xpToNextFriendshipLevel(level: number): number | null {
  if (level >= 10) return null;
  return FRIENDSHIP_LEVEL_THRESHOLDS[level + 1];
}

/** XP within the current level (relative to the current threshold). */
export function xpWithinFriendshipLevel(totalXp: number, level: number): number {
  const floor = FRIENDSHIP_LEVEL_THRESHOLDS[level] ?? 0;
  return Math.max(0, totalXp - floor);
}

/** XP span between current level and the next (denominator for the ring). */
export function xpSpanForFriendshipLevel(level: number): number | null {
  if (level >= 10) return null;
  return FRIENDSHIP_LEVEL_THRESHOLDS[level + 1] - FRIENDSHIP_LEVEL_THRESHOLDS[level];
}

/** Fetches all friendships the caller is in. */
export async function fetchFriendships(userId: string): Promise<FriendshipRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`player_a.eq.${userId},player_b.eq.${userId}`);
  if (error) {
    console.error('[fetchFriendships]', error);
    return [];
  }
  return (data ?? []) as FriendshipRow[];
}

/**
 * Awards XP for client-driven actions: 'visit' or 'egg_gift'. Other actions
 * (gift/sticker/breed) are fired server-side and reject from this RPC.
 *
 * Returns the new state INCLUDING `leveled_up` (true if this call crossed a
 * level boundary). Caller is responsible for showing the level-up moment.
 */
export async function awardFriendshipXp(
  otherPlayerId: string,
  action: 'visit' | 'egg_gift',
): Promise<FriendshipXpResult | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('award_friendship_xp', {
    p_other_player: otherPlayerId,
    p_action: action,
  });
  if (error) {
    console.error('[awardFriendshipXp]', error);
    return null;
  }
  // RPC returns SETOF — get first row.
  const rows = data as FriendshipXpResult[] | null;
  if (!rows || rows.length === 0) return null;
  return rows[0];
}

/**
 * Subscribes to friendships changes for any pair the user is in. Fires on
 * UPDATE (XP/level changes) and INSERT (new mutual friendship established).
 */
export function subscribeToFriendships(
  userId: string,
  onChange: (row: FriendshipRow) => void,
) {
  return supabase
    .channel(`friendships-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friendships', filter: `player_a=eq.${userId}` },
      (payload) => onChange(payload.new as FriendshipRow),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friendships', filter: `player_b=eq.${userId}` },
      (payload) => onChange(payload.new as FriendshipRow),
    )
    .subscribe();
}

// ─── under-13 server flag (Phase 2.0c) ────────────────────────────────────────

/**
 * Persists the user's under-13 flag to their profile. Called once after the
 * age gate completes so the server has authoritative truth (not just
 * localStorage). Returns the value that was set on success, null on failure.
 */
export async function setUnder13Flag(value: boolean): Promise<boolean | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('set_under_13_flag', { p_value: value });
  if (error) {
    console.error('[setUnder13Flag]', error);
    return null;
  }
  return data as boolean;
}
