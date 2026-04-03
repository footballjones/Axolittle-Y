import { useState, useCallback } from 'react';
import { GameState } from '../types/game';
import { GameNotification } from '../data/notifications';
import { getTodayDateString, calculateLoginStreak } from '../utils/dailySystem';
import { checkAchievements, ALL_ACHIEVEMENTS } from '../data/achievements';

interface UseEconomyActionsProps {
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  setNotifications: React.Dispatch<React.SetStateAction<GameNotification[]>>;
}

interface UseEconomyActionsReturn {
  showSpinWheel: boolean;
  setShowSpinWheel: React.Dispatch<React.SetStateAction<boolean>>;
  showDailyLogin: boolean;
  setShowDailyLogin: React.Dispatch<React.SetStateAction<boolean>>;
  handleSpinWheel: (reward: { type: 'coins' | 'opals'; amount: number }) => void;
  handleDailyLoginClaim: (reward: { coins: number; opals?: number; decoration?: string }) => void;
}

/**
 * Manages economy-related daily features: spin wheel and daily login bonus.
 */
export function useEconomyActions({ setGameState, setNotifications }: UseEconomyActionsProps): UseEconomyActionsReturn {
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showDailyLogin, setShowDailyLogin] = useState(false);

  const withAchievements = useCallback((newState: GameState): GameState => {
    const newIds = checkAchievements(newState);
    if (newIds.length === 0) return newState;
    newIds.forEach(id => {
      const achievement = ALL_ACHIEVEMENTS.find(a => a.id === id);
      if (!achievement) return;
      setNotifications(prev => [...prev, {
        id: `achievement-${id}-${Date.now()}`,
        type: 'achievement' as const,
        icon: achievement.icon,
        message: `Achievement Unlocked: ${achievement.name} — tap to claim your reward!`,
        time: 'now',
        read: false,
        metadata: { achievementId: id },
      }]);
    });
    return {
      ...newState,
      achievements: [...(newState.achievements ?? []), ...newIds],
      pendingAchievements: [...(newState.pendingAchievements ?? []), ...newIds],
    };
  }, [setNotifications]);

  const handleSpinWheel = useCallback((reward: { type: 'coins' | 'opals'; amount: number }) => {
    setGameState(prev => {
      if (!prev) return prev;

      const today = getTodayDateString();
      const newCoins = reward.type === 'coins' ? prev.coins + reward.amount : prev.coins;
      const newOpals = reward.type === 'opals' ? (prev.opals || 0) + reward.amount : prev.opals;

      return withAchievements({
        ...prev,
        coins: newCoins,
        opals: newOpals,
        lastSpinDate: today,
      });
    });
  }, [setGameState, withAchievements]);

  const handleDailyLoginClaim = useCallback((reward: { coins: number; opals?: number; decoration?: string }) => {
    setGameState(prev => {
      if (!prev) return prev;

      const today = getTodayDateString();
      const { streak: newStreak, usedForgiveness } = calculateLoginStreak(
        prev.lastLoginDate,
        prev.loginStreak || 0,
        prev.lastMissForgivenDate
      );

      const newCoins = prev.coins + reward.coins;
      const newOpals = (prev.opals || 0) + (reward.opals || 0);
      const newUnlockedDecorations = reward.decoration
        ? [...prev.unlockedDecorations, reward.decoration]
        : prev.unlockedDecorations;

      return withAchievements({
        ...prev,
        coins: newCoins,
        opals: newOpals,
        lastLoginDate: today,
        lastLoginBonusDate: today,
        loginStreak: newStreak,
        lastMissForgivenDate: usedForgiveness ? today : prev.lastMissForgivenDate,
        unlockedDecorations: newUnlockedDecorations,
      });
    });
  }, [setGameState, withAchievements]);

  return {
    showSpinWheel,
    setShowSpinWheel,
    showDailyLogin,
    setShowDailyLogin,
    handleSpinWheel,
    handleDailyLoginClaim,
  };
}
