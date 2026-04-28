import { useState, useEffect, useCallback } from 'react';
import { GameNotification } from '../data/notifications';
import {
  isSupabaseConfigured,
  FriendNotificationRow,
  fetchPendingNotifications,
  markNotificationApplied,
  subscribeToFriendNotifications,
} from '../services/supabase';
import { track, SocialEvents } from '../utils/telemetry';

interface UseSocialStateOptions {
  userId: string | null;
  onApplyGiftReward: (coins: number, opals: number) => void;
}

interface UseSocialStateReturn {
  notifications: GameNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<GameNotification[]>>;
  hasPendingPokes: boolean;
  setHasPendingPokes: React.Dispatch<React.SetStateAction<boolean>>;
  unreadCount: number;
  hasNotifications: boolean;
}

function rowToNotification(row: FriendNotificationRow): GameNotification {
  if (row.type === 'gift') {
    return {
      id: row.id,
      type: 'gift',
      icon: 'Gift',
      message: row.opals > 0
        ? `${row.sender_name} sent you ${row.opals} opals!`
        : `${row.sender_name} sent you ${row.coins} coins!`,
      time: 'Just now',
      read: false,
    };
  }
  if (row.type === 'friend_add') {
    return {
      id: row.id,
      type: 'friend',
      icon: 'UserPlus',
      message: `${row.sender_name} added you as a friend!`,
      time: 'Just now',
      read: false,
      metadata: { friendCode: row.friend_code ?? undefined },
    };
  }
  return {
    id: row.id,
    type: 'poke',
    icon: 'ChevronRight',
    message: `${row.sender_name} poked you!`,
    time: 'Just now',
    read: false,
  };
}

/**
 * Manages social state: notifications, pending pokes, and Supabase
 * real-time subscriptions for incoming friend gifts and pokes.
 */
export function useSocialState({ userId, onApplyGiftReward }: UseSocialStateOptions): UseSocialStateReturn {
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [hasPendingPokes, setHasPendingPokes] = useState(false);

  const applyRow = useCallback(async (row: FriendNotificationRow) => {
    const notif = rowToNotification(row);

    setNotifications(prev => [notif, ...prev]);

    if (row.type === 'gift' && (row.coins > 0 || row.opals > 0)) {
      onApplyGiftReward(row.coins, row.opals);
      track(SocialEvents.GIFT_RECEIVED, { coins: row.coins, opals: row.opals });
    }

    if (row.type === 'poke') {
      setHasPendingPokes(true);
    }

    await markNotificationApplied(row.id);
  }, [onApplyGiftReward]);

  // Fetch pending (offline) notifications on mount
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;

    fetchPendingNotifications(userId).then(rows => {
      rows.forEach(row => applyRow(row));
    });
  }, [userId, applyRow]);

  // Subscribe to real-time incoming notifications
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;

    const channel = subscribeToFriendNotifications(userId, (row) => {
      applyRow(row);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [userId, applyRow]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const hasNotifications = unreadCount > 0 || hasPendingPokes;

  return {
    notifications,
    setNotifications,
    hasPendingPokes,
    setHasPendingPokes,
    unreadCount,
    hasNotifications,
  };
}
