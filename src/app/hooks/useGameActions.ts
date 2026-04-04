/**
 * Custom hook for all game action handlers
 * Extracted from App.tsx for better code organization
 */

import { useCallback } from 'react';
import { GameState, Axolotl, Friend, FoodItem, PendingPoop, PoopItem, SecondaryStats } from '../types/game';
import {
  feedAxolotl,
  checkEvolution,
  calculateLevel,
} from '../utils/gameLogic';
import { createRebirthEgg, createBreedingEgg, hatchEgg, isEggReady } from '../utils/eggs';
import { getDecorationById, BACKGROUND_COLORS } from '../data/decorations';
import { GAME_CONFIG } from '../config/game';
import { GameNotification } from '../data/notifications';
import { GameResult } from '../minigames/types';
import { checkAchievements, ALL_ACHIEVEMENTS } from '../data/achievements';
import { supabase, isSupabaseConfigured, pushAchievements } from '../services/supabase';

interface UseGameActionsProps {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  setNotifications: React.Dispatch<React.SetStateAction<GameNotification[]>>;
  setActiveModal: React.Dispatch<React.SetStateAction<'shop' | 'social' | 'rebirth' | 'stats' | 'settings' | null>>;
  setActiveGame: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentScreen: React.Dispatch<React.SetStateAction<'home' | 'games'>>;
  /** Called when the axolotl levels up — receives the new level and the pre-level-up secondary stats */
  onLevelUp?: (newLevel: number, prevStats: SecondaryStats) => void;
  /** Authenticated user's Supabase ID — used to validate friend codes and prevent self-adds. */
  userId?: string | null;
}

export function useGameActions({
  gameState,
  setGameState,
  setNotifications,
  setActiveModal,
  setActiveGame,
  setCurrentScreen,
  onLevelUp,
  userId,
}: UseGameActionsProps) {

  /**
   * Runs achievement checks against the new state, fires notifications for
   * any newly unlocked achievements, and returns the state with the updated
   * achievements array.  Call this at the end of every setGameState callback.
   */
  function withAchievements(newState: GameState): GameState {
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

    // Dual-write to Supabase (fire-and-forget — local state is source of truth)
    if (userId) {
      pushAchievements(userId, newIds).catch(console.error);
    }

    return {
      ...newState,
      achievements: [...(newState.achievements ?? []), ...newIds],
      pendingAchievements: [...(newState.pendingAchievements ?? []), ...newIds],
    };
  }

  const handleFeed = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      if (prev.coins < 10) return prev; // can't afford to feed

      // Drop food at the center during the tutorial, random otherwise
      const newFood: FoodItem = {
        id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID
        x: prev.tutorialStep === 'feed' ? 50 : Math.random() * 80 + 10, // center on first tutorial feed, 10-90% otherwise
        y: 0, // Start at top (will animate down)
        createdAt: Date.now(),
      };

      const foodItems = [...(prev.foodItems || []), newFood];

      // After animation time (5 seconds), update food position to settled
      // Fix race condition: update by foodId instead of predicate y === 0
      const foodId = newFood.id;
      setTimeout(() => {
        setGameState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            foodItems: (prev.foodItems || []).map(f => 
              f.id === foodId ? { ...f, y: 75 } : f
            ),
          };
        });
      }, 7000); // Match the maximum animation duration (4-6.67s sink + buffer)

      // Track feed count; every 6th feed schedules a poop to appear 5 min later
      const newFeedCount = ((prev.feedCount || 0) + 1) % 6;
      let pendingPoops = prev.pendingPoops || [];
      if (newFeedCount === 0) {
        const newPending: PendingPoop = {
          id: `poop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          x: Math.random() * 70 + 15,
          showAt: Date.now() + 5 * 60 * 1000, // 5 minutes from now
        };
        pendingPoops = [...pendingPoops, newPending];
      }

      const next: GameState = {
        ...prev,
        coins: prev.coins - 10,
        foodItems,
        feedCount: newFeedCount,
        pendingPoops,
        totalFeedsEver: (prev.totalFeedsEver ?? 0) + 1,
        // Advance tutorial: 'feed' → 'eat' on first feed
        tutorialStep: prev.tutorialStep === 'feed' ? 'eat' : prev.tutorialStep,
      };
      return withAchievements(next);
    });
  }, []);

  const handleEatFood = useCallback((foodId: string) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      const foodItems = (prev.foodItems || []).filter(f => f.id !== foodId);
      const updated = feedAxolotl(prev.axolotl, 15);
      const prevLevel = calculateLevel(updated.experience);

      let xpGain: number;
      let feedXpToday: number;
      let feedXpDate: string;
      let firstFeedXpGranted = prev.firstFeedXpGranted;

      if (!prev.firstFeedXpGranted) {
        // First-ever eat: grant exactly enough XP to level up (level 1 needs 1 XP)
        xpGain = 1;
        feedXpToday = prev.feedXpDate === new Date().toISOString().slice(0, 10)
          ? (prev.feedXpToday ?? 0) + xpGain
          : xpGain;
        feedXpDate = new Date().toISOString().slice(0, 10);
        firstFeedXpGranted = true;
      } else {
        // Normal daily cap: 0.1 XP per eat, up to 2 XP per day
        const today = new Date().toISOString().slice(0, 10);
        feedXpDate = prev.feedXpDate === today ? prev.feedXpDate : today;
        const prevFeedXpToday = prev.feedXpDate === today ? (prev.feedXpToday ?? 0) : 0;
        const FEED_XP_GAIN = 0.1;
        const FEED_XP_DAILY_CAP = 2;
        xpGain = prevFeedXpToday < FEED_XP_DAILY_CAP
          ? Math.min(FEED_XP_GAIN, FEED_XP_DAILY_CAP - prevFeedXpToday)
          : 0;
        feedXpToday = prevFeedXpToday + xpGain;
      }

      const newExperience = updated.experience + xpGain;
      const newLevel = calculateLevel(newExperience);
      const levelsGained = newLevel - prevLevel;

      return {
        ...prev,
        // lastLevel must be kept in sync whenever experience changes so the
        // wellbeing-engine's checkEvolution() doesn't see a stale lastLevel
        // and double-grant a stat point on its next 5-second tick.
        axolotl: { ...updated, experience: newExperience, lastLevel: newLevel },
        foodItems,
        feedXpToday,
        feedXpDate,
        firstFeedXpGranted,
        pendingStatPoints: (prev.pendingStatPoints ?? 0) + levelsGained,
        // Advance tutorial: 'eat' → 'xp-tip' when first food is eaten (shows feeding XP info)
        tutorialStep: prev.tutorialStep === 'eat' ? 'xp-tip' : prev.tutorialStep,
      };
    });
  }, []);

  // Called on each aquarium tap during play mode — +10 happiness, no XP, no energy cost
  const handlePlayTap = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      const newHappiness = Math.min(100, prev.axolotl.stats.happiness + 10);
      return {
        ...prev,
        axolotl: {
          ...prev.axolotl,
          stats: { ...prev.axolotl.stats, happiness: newHappiness },
        },
      };
    });
  }, []);

  const handleCleanPoop = useCallback((poopId: string) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      const poops = prev.poopItems || [];
      const poopCount = poops.length;

      if (poopCount === 0) return prev;

      // Restore cleanliness by the same fraction as before (one-poop's share)
      const currentCleanliness = prev.axolotl.stats.cleanliness;
      const gain = (100 - currentCleanliness) / poopCount;
      const newCleanliness = Math.min(100, currentCleanliness + gain);
      const remainingPoops = poops.filter(p => p.id !== poopId);

      const next: GameState = {
        ...prev,
        axolotl: {
          ...prev.axolotl,
          stats: { ...prev.axolotl.stats, cleanliness: newCleanliness },
        },
        poopItems: remainingPoops,
        cleanlinessLowSince: newCleanliness >= 50 ? undefined : prev.cleanlinessLowSince,
        cleanlinessVeryLowSince: newCleanliness >= 10 ? undefined : prev.cleanlinessVeryLowSince,
        totalCleansEver: (prev.totalCleansEver ?? 0) + 1,
        // Mark cleaning tutorial as seen on first ever poop cleaned
        cleanTutorialSeen: prev.cleanTutorialSeen === false ? true : prev.cleanTutorialSeen,
      };
      return withAchievements(next);
    });
  }, []);

  const handleWaterChange = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      if (prev.coins < 150) return prev; // can't afford water change

      const updated = {
        ...prev.axolotl,
        stats: {
          ...prev.axolotl.stats,
          waterQuality: Math.min(100, prev.axolotl.stats.waterQuality + 30),
        },
      };

      const next: GameState = {
        ...prev,
        coins: prev.coins - 150,
        axolotl: updated,
        miniGamesLockedUntil: Date.now() + 2 * 60 * 60 * 1000, // lock for 2 hours
        totalWaterChanges: (prev.totalWaterChanges ?? 0) + 1,
        // Mark water tutorial complete on first ever water change
        waterTutorialSeen: prev.waterTutorialSeen === false ? true : prev.waterTutorialSeen,
      };
      return withAchievements(next);
    });
  }, []);

  const UNLOCK_GAMES_COST = 5; // opals
  const REFILL_ENERGY_COST = 10; // opals

  const handleRefillEnergy = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      if ((prev.opals || 0) < REFILL_ENERGY_COST) return prev;
      return {
        ...prev,
        opals: (prev.opals || 0) - REFILL_ENERGY_COST,
        energy: prev.maxEnergy ?? GAME_CONFIG.energyMax,
        lastEnergyUpdate: Date.now(),
      };
    });
  }, []);

  const handleUnlockGames = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      if ((prev.opals || 0) < UNLOCK_GAMES_COST) return prev;
      return {
        ...prev,
        opals: (prev.opals || 0) - UNLOCK_GAMES_COST,
        miniGamesLockedUntil: undefined,
      };
    });
  }, []);

  const handlePurchase = useCallback((decorationId: string) => {
    setGameState(prev => {
      if (!prev) return prev;

      const decoration = getDecorationById(decorationId);
      if (!decoration || prev.coins < decoration.cost) return prev;

      return {
        ...prev,
        coins: prev.coins - decoration.cost,
        unlockedDecorations: [...prev.unlockedDecorations, decorationId],
      };
    });
  }, []);

  const handleEquipDecoration = useCallback((decorationId: string) => {
    setGameState(prev => {
      if (!prev) return prev;

      const decoration = getDecorationById(decorationId);
      if (!decoration) return prev;

      if (decoration.type === 'background') {
        return {
          ...prev,
          customization: {
            ...prev.customization,
            background: BACKGROUND_COLORS[decorationId] || prev.customization.background,
          },
        };
      }

      const isEquipped = prev.customization.decorations.includes(decorationId);
      const maxDecorations = 5;

      if (isEquipped) {
        return {
          ...prev,
          customization: {
            ...prev.customization,
            decorations: prev.customization.decorations.filter(id => id !== decorationId),
          },
        };
      } else if (prev.customization.decorations.length < maxDecorations) {
        return {
          ...prev,
          customization: {
            ...prev.customization,
            decorations: [...prev.customization.decorations, decorationId],
          },
        };
      }

      return prev;
    });
  }, []);

  const handleAddFriend = useCallback(async (code: string): Promise<string | null> => {
    const normalizedCode = code.trim().toUpperCase();

    // Fast local duplicate check before any network call
    if (gameState?.friends.some(f => f.friendCode === normalizedCode)) {
      return 'Friend already added!';
    }

    // Guests can't add real friends — they have no account to look up
    if (!isSupabaseConfigured || !userId) {
      return 'Sign in to add real friends.';
    }

    // Look up the code in the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, axolotl_name, generation, stage')
      .eq('friend_code', normalizedCode)
      .maybeSingle();

    if (error || !data) {
      return "That code doesn't match any player — check it and try again!";
    }

    if (data.id === userId) {
      return "That's your own code — share it with a friend instead!";
    }

    const realFriend: Friend = {
      id: data.id,
      friendCode: normalizedCode,
      name: data.username ?? data.axolotl_name ?? normalizedCode,
      axolotlName: data.axolotl_name ?? 'Mystery Axo',
      stage: (data.stage as Friend['stage']) ?? 'guardian',
      generation: data.generation ?? 1,
      lastSync: Date.now(),
    };

    setGameState(prev => {
      if (!prev) return prev;
      // Race-condition guard: check again inside the updater
      if (prev.friends.some(f => f.friendCode === normalizedCode)) return prev;
      setNotifications(n => [...n, {
        id: `notif-${Date.now()}`,
        type: 'friend',
        icon: 'Users',
        message: `Added ${realFriend.name} as a friend!`,
        time: 'now',
        read: false,
      }]);
      return withAchievements({ ...prev, friends: [...prev.friends, realFriend] });
    });

    return null; // success
  }, [gameState, userId, setGameState, setNotifications]);

  const handleRemoveFriend = useCallback((friendId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const friend = prev.friends.find(f => f.id === friendId);
      if (!friend) return prev;

      setNotifications(prev => [...prev, {
        id: `notif-${Date.now()}`,
        type: 'friend',
        icon: 'UserMinus',
        message: `Removed ${friend.name} from friends`,
        time: 'now',
        read: false,
      }]);
      
      return {
        ...prev,
        friends: prev.friends.filter(f => f.id !== friendId),
      };
    });
  }, []);

  const handleBreed = useCallback((friendId: string) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      const friend = prev.friends.find(f => f.id === friendId);
      if (!friend) return prev;

      if (prev.axolotl.stage !== 'guardian' && prev.axolotl.stage !== 'elder') {
        setNotifications(prev => [...prev, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          icon: 'AlertTriangle',
          message: 'Your axolotl must be a Guardian or Elder to breed!',
          time: 'now',
          read: false,
        }]);
        return prev;
      }

      const mockParent2: Axolotl = {
        ...prev.axolotl,
        id: friendId,
        name: friend.axolotlName,
        generation: friend.generation,
      };

      const egg = createBreedingEgg(prev.axolotl, mockParent2);
      
      if (!prev.incubatorEgg) {
        setNotifications(prev => [...prev, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          icon: 'Egg',
          message: 'Breeding successful! Egg is incubating.',
          time: 'now',
          read: false,
        }]);
        
        return withAchievements({
          ...prev,
          incubatorEgg: egg,
          coins: prev.coins + 50,
        });
      } else {
        if (prev.nurseryEggs.length < GAME_CONFIG.nurserySlotsOpen) {
          setNotifications(prev => [...prev, {
            id: `notif-${Date.now()}`,
            type: 'milestone',
            icon: 'Egg',
            message: 'Breeding successful! Egg added to nursery.',
            time: 'now',
            read: false,
          }]);

          return withAchievements({
            ...prev,
            nurseryEggs: [...prev.nurseryEggs, egg],
            coins: prev.coins + 50,
          });
        } else {
          setNotifications(prev => [...prev, {
            id: `notif-${Date.now()}`,
            type: 'milestone',
            icon: 'AlertTriangle',
            message: 'Nursery storage is full!',
            time: 'now',
            read: false,
          }]);
          return prev;
        }
      }
    });
  }, []);

  const handleRebirth = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      const oldAxolotl = prev.axolotl;
      const bonusCoins = oldAxolotl.generation * 10;

      // No name at rebirth — naming happens after the egg hatches
      const egg = createRebirthEgg(oldAxolotl);

      // If the player has no other eggs, skip the incubation wait so they
      // aren't stuck with no axolotl and nothing to do.
      const hasOtherEggs = (prev.nurseryEggs ?? []).length > 0 || !!prev.incubatorEgg;
      if (!hasOtherEggs) {
        egg.incubationEndsAt = Date.now();
      }

      return withAchievements({
        ...prev,
        axolotl: null,
        incubatorEgg: egg,
        coins: prev.coins + bonusCoins,
        lineage: [...prev.lineage, oldAxolotl],
      });
    });

    setActiveModal(null);
  }, []);

  const handleReleaseAxolotl = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      
      const oldAxolotl = prev.axolotl;
      
      return {
        ...prev,
        axolotl: null,
        lineage: [...prev.lineage, oldAxolotl],
      };
    });
  }, []);

  const handleHatchEgg = useCallback((eggId: string, name: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      // Only allow hatching incubator eggs
      if (prev.incubatorEgg && prev.incubatorEgg.id === eggId) {
        if (!isEggReady(prev.incubatorEgg)) return prev;
        
        const newAxolotl = hatchEgg(prev.incubatorEgg, name);

        // For brand-new players (waterTutorialSeen === false), start water quality
        // at 70 so the water-change tutorial is immediately relevant.
        if (prev.waterTutorialSeen === false) {
          newAxolotl.stats = { ...newAxolotl.stats, waterQuality: 70 };
        }

        const next: GameState = {
          ...prev,
          axolotl: newAxolotl,
          incubatorEgg: null,
          poopItems: [],
          lastPoopTime: Date.now(),
          totalEggsHatched: (prev.totalEggsHatched ?? 0) + 1,
        };
        return withAchievements(next);
      }
      
      // Nursery eggs cannot hatch directly - they must be moved to incubator first
      // (This logic is removed - eggs can only hatch in incubator slot)
      
      return prev;
    });
  }, []);

  const handleUnlockNurserySlot = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      const cost = GAME_CONFIG.nurserySlotUnlockCost;
      const maxSlots = GAME_CONFIG.nurserySlotsOpen + GAME_CONFIG.nurserySlotsLocked;
      const currentUnlocked = prev.nurseryUnlockedSlots ?? GAME_CONFIG.nurserySlotsOpen;
      if (prev.opals < cost) return prev;
      if (currentUnlocked >= maxSlots) return prev;
      return {
        ...prev,
        opals: prev.opals - cost,
        nurseryUnlockedSlots: currentUnlocked + 1,
      };
    });
  }, []);

  const handleBoostEgg = useCallback((eggId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const boostCost = GAME_CONFIG.eggBoostCost;
      if (prev.opals < boostCost) {
        setNotifications(prevNotifs => [...prevNotifs, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          icon: 'AlertTriangle',
          message: `Not enough opals! You need ${boostCost} opals to boost an egg.`,
          time: 'now',
          read: false,
        }]);
        return prev;
      }
      
      if (prev.incubatorEgg && prev.incubatorEgg.id === eggId) {
        setNotifications(prevNotifs => [...prevNotifs, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          icon: 'Zap',
          message: 'Egg boosted! Ready to hatch instantly.',
          time: 'now',
          read: false,
        }]);
        return {
          ...prev,
          opals: prev.opals - boostCost,
          incubatorEgg: {
            ...prev.incubatorEgg,
            incubationEndsAt: Date.now(),
          },
        };
      }
      
      const eggIndex = prev.nurseryEggs.findIndex(e => e.id === eggId);
      if (eggIndex >= 0) {
        setNotifications(prevNotifs => [...prevNotifs, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          icon: 'Zap',
          message: 'Egg boosted! Ready to hatch instantly.',
          time: 'now',
          read: false,
        }]);
        const updatedEggs = [...prev.nurseryEggs];
        updatedEggs[eggIndex] = {
          ...updatedEggs[eggIndex],
          incubationEndsAt: Date.now(),
        };
        return {
          ...prev,
          opals: prev.opals - boostCost,
          nurseryEggs: updatedEggs,
        };
      }
      
      return prev;
    });
  }, []);

  const handleGiftEgg = useCallback((_eggId: string) => {
    setNotifications(prev => [...prev, {
      id: `notif-${Date.now()}`,
      type: 'gift',
      icon: 'Gift',
      message: 'Gift feature coming soon! You\'ll be able to send eggs to friends.',
      time: 'now',
      read: false,
    }]);
  }, []);

  const handleMoveToIncubator = useCallback((eggId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      // Can only move if incubator is empty
      if (prev.incubatorEgg) return prev;
      
      const eggIndex = prev.nurseryEggs.findIndex(e => e.id === eggId);
      if (eggIndex < 0) return prev;
      
      const egg = prev.nurseryEggs[eggIndex];
      
      return {
        ...prev,
        incubatorEgg: egg,
        nurseryEggs: prev.nurseryEggs.filter((_, i) => i !== eggIndex),
      };
    });
  }, []);

  const handleDiscardEgg = useCallback((eggId: string) => {
    if (!window.confirm('Are you sure you want to discard this egg? This cannot be undone.')) {
      return;
    }
    
    setGameState(prev => {
      if (!prev) return prev;
      
      if (prev.incubatorEgg && prev.incubatorEgg.id === eggId) {
        setNotifications(prevNotifs => [...prevNotifs, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          icon: 'Trash2',
          message: 'Egg discarded.',
          time: 'now',
          read: false,
        }]);
        return {
          ...prev,
          incubatorEgg: null,
        };
      }
      
      const eggIndex = prev.nurseryEggs.findIndex(e => e.id === eggId);
      if (eggIndex >= 0) {
        setNotifications(prevNotifs => [...prevNotifs, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          icon: 'Trash2',
          message: 'Egg discarded.',
          time: 'now',
          read: false,
        }]);
        return {
          ...prev,
          nurseryEggs: prev.nurseryEggs.filter((_, i) => i !== eggIndex),
        };
      }
      
      return prev;
    });
  }, []);

  const handleMiniGameApplyReward = useCallback((coins: number, opals?: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        coins: prev.coins + coins,
        opals: opals ? (prev.opals || 0) + opals : prev.opals,
      };
    });
  }, []);

  const handleMiniGameEnd = useCallback((result: GameResult) => {
    setActiveGame(null);

    // Compute level-up BEFORE calling setGameState — React 18 updaters run
    // lazily during reconciliation, so mutations inside the updater are not
    // visible synchronously after setState returns.
    const currentAxolotl = gameState?.axolotl ?? null;
    const prevLevel = currentAxolotl ? calculateLevel(currentAxolotl.experience) : 0;
    const newLevel = currentAxolotl ? calculateLevel(currentAxolotl.experience + result.xp) : 0;
    const willLevelUp = newLevel > prevLevel;
    const prevStats: SecondaryStats = currentAxolotl
      ? { ...currentAxolotl.secondaryStats }
      : { strength: 0, intellect: 0, stamina: 0, speed: 0 };

    setGameState(prev => {
      if (!prev || !prev.axolotl) return prev;

      const newXP = prev.axolotl.experience + result.xp;
      const newCoins = prev.coins + result.coins;
      const newOpals = result.opals ? (prev.opals || 0) + result.opals : prev.opals;

      // Playing mini games makes the axolotl hungry - reduce hunger by 15 points
      const newHunger = Math.max(0, prev.axolotl.stats.hunger - 15);

      const updatedAxolotl = {
        ...prev.axolotl,
        experience: newXP,
        stats: { ...prev.axolotl.stats, hunger: newHunger },
      };
      const { axolotl: evolvedAxolotl } = checkEvolution(updatedAxolotl);
      const resolvedNewLevel = calculateLevel(evolvedAxolotl.experience);

      // Show appropriate notification based on whether rewards were actually earned
      const earnedRewards = result.xp > 0 || result.coins > 0;
      if (earnedRewards) {
        setNotifications(prevNotifs => [...prevNotifs, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          icon: result.tier === 'exceptional' ? 'Sparkles' : result.tier === 'good' ? 'Star' : 'Gamepad2',
          message: result.coins > 0
            ? `Earned ${result.xp} XP and ${result.coins} coins!${result.opals ? ` +${result.opals} opals` : ''}`
            : `Earned ${result.xp} XP!`,
          time: 'now',
          read: false,
        }]);
      } else {
        setNotifications(prevNotifs => [...prevNotifs, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          icon: 'Zap',
          message: 'No energy! Played for fun but no rewards earned. Energy regenerates over time.',
          time: 'now',
          read: false,
        }]);
      }

      const prevLevelInner = calculateLevel(prev.axolotl.experience);
      const next: GameState = {
        ...prev,
        axolotl: evolvedAxolotl,
        coins: newCoins,
        opals: newOpals,
        totalMinigamesPlayed: (prev.totalMinigamesPlayed ?? 0) + 1,
        totalExceptionalScores:
          result.tier === 'exceptional'
            ? (prev.totalExceptionalScores ?? 0) + 1
            : (prev.totalExceptionalScores ?? 0),
        pendingStatPoints: (prev.pendingStatPoints ?? 0) + (resolvedNewLevel - prevLevelInner),
      };
      return withAchievements(next);
    });

    // Always return to the games screen; LevelUpOverlay is fixed z-[10000] and overlays any screen
    setCurrentScreen('games');
    if (willLevelUp) {
      onLevelUp?.(newLevel, prevStats);
    }
  }, [gameState, onLevelUp]);

  const handleBuyCoins = useCallback((pack: { opals: number; coins: number }) => {
    setGameState(prev => {
      if (!prev) return prev;
      const currentOpals = prev.opals || 0;
      if (currentOpals < pack.opals) return prev;
      return {
        ...prev,
        opals: currentOpals - pack.opals,
        coins: prev.coins + pack.coins,
      };
    });
  }, []);

  const handleBuyOpals = useCallback((pack: { price: string; opals: number }) => {
    // Simulated purchase — no real transaction
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        opals: (prev.opals || 0) + pack.opals,
      };
    });
  }, []);

  const handleBuyFilter = useCallback((filter: { id: string; name: string; coins: number; opals: number }) => {
    setGameState(prev => {
      if (!prev) return prev;
      // Migrate legacy ownedFilters from filterTier if needed
      const currentOwned = prev.ownedFilters ?? (prev.filterTier ? [prev.filterTier] : []);
      const newOwned = currentOwned.includes(filter.id) ? currentOwned : [...currentOwned, filter.id];

      if (filter.opals > 0) {
        if ((prev.opals || 0) < filter.opals) return prev;
        return withAchievements({
          ...prev,
          opals: (prev.opals || 0) - filter.opals,
          ownedFilters: newOwned,
          equippedFilter: filter.id,
        });
      } else {
        if (prev.coins < filter.coins) return prev;
        return withAchievements({
          ...prev,
          coins: prev.coins - filter.coins,
          ownedFilters: newOwned,
          equippedFilter: filter.id,
        });
      }
    });
  }, []);

  const handleEquipFilter = useCallback((filterId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      return { ...prev, equippedFilter: filterId };
    });
  }, []);

  const handleBuyShrimp = useCallback((pack: { count: number; opals: number }) => {
    setGameState(prev => {
      if (!prev) return prev;
      if ((prev.opals || 0) < pack.opals) return prev;
      return {
        ...prev,
        opals: (prev.opals || 0) - pack.opals,
        shrimpCount: (prev.shrimpCount || 0) + pack.count,
        lastShrimpUpdate: Date.now(),
      };
    });
    
    setNotifications(prev => [...prev, {
      id: `notif-${Date.now()}`,
      type: 'milestone',
      icon: 'Droplets',
      message: `Added ${pack.count} shrimp to your tank! They'll help maintain cleanliness.`,
      time: 'now',
      read: false,
    }]);
  }, []);

  const handleBuyTreatment = useCallback((treatment: { id: string; name: string; opals: number }) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      if ((prev.opals || 0) < treatment.opals) return prev;
      
      // Apply treatment based on type
      const updated = { ...prev.axolotl };
      if (treatment.id === 'treatment-water') {
        updated.stats.waterQuality = Math.min(100, updated.stats.waterQuality + 30);
      } else if (treatment.id === 'treatment-miracle') {
        updated.stats.hunger = 100;
        updated.stats.happiness = 100;
        updated.stats.cleanliness = 100;
        updated.stats.waterQuality = 100;
      }
      
      return {
        ...prev,
        opals: (prev.opals || 0) - treatment.opals,
        axolotl: updated,
      };
    });
  }, []);

  const handleStoreTreatment = useCallback((treatment: { id: string; name: string; opals: number }) => {
    setGameState(prev => {
      if (!prev) return prev;
      if ((prev.opals || 0) < treatment.opals) return prev;
      const stored = { ...(prev.storedTreatments || {}) };
      stored[treatment.id] = (stored[treatment.id] || 0) + 1;
      return { ...prev, opals: (prev.opals || 0) - treatment.opals, storedTreatments: stored };
    });
  }, []);

  const handleUseTreatmentFromInventory = useCallback((treatmentId: string) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      const stored = { ...(prev.storedTreatments || {}) };
      if (!stored[treatmentId] || stored[treatmentId] < 1) return prev;
      stored[treatmentId] -= 1;
      if (stored[treatmentId] === 0) delete stored[treatmentId];
      const updated = { ...prev.axolotl };
      if (treatmentId === 'treatment-water') {
        updated.stats = { ...updated.stats, waterQuality: Math.min(100, updated.stats.waterQuality + 30) };
      } else if (treatmentId === 'treatment-miracle') {
        updated.stats = { ...updated.stats, hunger: 100, happiness: 100, cleanliness: 100, waterQuality: 100 };
      }
      return { ...prev, axolotl: updated, storedTreatments: stored };
    });
  }, []);

  const handleStoreShrimpInInventory = useCallback((pack: { count: number; opals: number }) => {
    setGameState(prev => {
      if (!prev) return prev;
      if ((prev.opals || 0) < pack.opals) return prev;
      return { ...prev, opals: (prev.opals || 0) - pack.opals, storedShrimp: (prev.storedShrimp || 0) + pack.count };
    });
  }, []);

  const handleDeployShrimpFromInventory = useCallback((count: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      const available = prev.storedShrimp || 0;
      const deploying = Math.min(count, available);
      if (deploying <= 0) return prev;
      return {
        ...prev,
        storedShrimp: available - deploying,
        shrimpCount: (prev.shrimpCount || 0) + deploying,
        lastShrimpUpdate: Date.now(),
      };
    });
  }, []);

  const handleClaimAchievement = useCallback((id: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const achievement = ALL_ACHIEVEMENTS.find(a => a.id === id);
      if (!achievement) return prev;
      const pending = prev.pendingAchievements ?? [];
      if (!pending.includes(id)) return prev;
      return {
        ...prev,
        pendingAchievements: pending.filter(a => a !== id),
        coins: prev.coins + (achievement.coinReward ?? 0),
        opals: (prev.opals ?? 0) + (achievement.opalReward ?? 0),
      };
    });
  }, [setGameState]);

  return {
    handleFeed,
    handleEatFood,
    handlePlayTap,
    handleCleanPoop,
    handleWaterChange,
    handlePurchase,
    handleEquipDecoration,
    handleAddFriend,
    handleRemoveFriend,
    handleBreed,
    handleRebirth,
    handleReleaseAxolotl,
    handleHatchEgg,
    handleMoveToIncubator,
    handleUnlockNurserySlot,
    handleBoostEgg,
    handleGiftEgg,
    handleDiscardEgg,
    handleMiniGameApplyReward,
    handleMiniGameEnd,
    handleBuyCoins,
    handleBuyOpals,
    handleBuyFilter,
    handleEquipFilter,
    handleBuyShrimp,
    handleBuyTreatment,
    handleStoreTreatment,
    handleUseTreatmentFromInventory,
    handleStoreShrimpInInventory,
    handleDeployShrimpFromInventory,
    handleUnlockGames,
    handleRefillEnergy,
    handleClaimAchievement,
  };
}
