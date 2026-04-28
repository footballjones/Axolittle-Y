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
  type: 'gift' | 'poke' | 'friend_add';
  coins: number;
  opals: number;
  sender_name: string;
  friend_code?: string | null;
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
 * Notifies a user that they were added as a friend.
 * Sends a `friend_add` row so the recipient can add back.
 * Fire-and-forget — failures are non-critical.
 */
export async function sendFriendAddNotification(
  senderId: string,
  recipientId: string,
  senderName: string,
  senderFriendCode: string,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('friend_notifications')
    .insert({ sender_id: senderId, recipient_id: recipientId, sender_name: senderName, type: 'friend_add', coins: 0, opals: 0, friend_code: senderFriendCode, applied: false });
  if (error) console.error('[sendFriendAddNotification]', error);
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
