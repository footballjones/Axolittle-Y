import { useState } from 'react';
import { INITIAL_NOTIFICATIONS, GameNotification } from '../data/notifications';

interface UseSocialStateReturn {
  notifications: GameNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<GameNotification[]>>;
  hasPendingPokes: boolean;
  setHasPendingPokes: React.Dispatch<React.SetStateAction<boolean>>;
  unreadCount: number;
  hasNotifications: boolean;
}

/**
 * Manages social state: notifications and pending pokes.
 */
export function useSocialState(): UseSocialStateReturn {
  const [notifications, setNotifications] = useState<GameNotification[]>(INITIAL_NOTIFICATIONS);
  const [hasPendingPokes, setHasPendingPokes] = useState(true);

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
