export interface GameNotification {
  id: string;
  type: 'poke' | 'evolution' | 'gift' | 'friend' | 'milestone' | 'achievement';
  icon: string;
  message: string;
  time: string;
  read: boolean;
  metadata?: { achievementId?: string };
}

/** @deprecated Replaced by real Supabase-backed notifications. */
export const INITIAL_NOTIFICATIONS: GameNotification[] = [];
