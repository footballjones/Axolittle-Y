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
  type: 'gift' | 'poke';
  coins: number;
  opals: number;
  sender_name: string;
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
