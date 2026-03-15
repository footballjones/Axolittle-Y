export interface GameNotification {
  id: string;
  type: 'poke' | 'evolution' | 'gift' | 'friend' | 'milestone' | 'achievement';
  emoji: string;
  message: string;
  time: string;
  read: boolean;
}

/** @deprecated Replaced by real Supabase-backed notifications. */
export const INITIAL_NOTIFICATIONS: GameNotification[] = [];
