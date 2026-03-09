/**
 * Custom hook for all game action handlers
 * Extracted from App.tsx for better code organization
 */

import { useCallback } from 'react';
import { GameState, Axolotl, Friend, FoodItem } from '../types/game';
import { 
  feedAxolotl, 
  playWithAxolotl,
  checkEvolution,
} from '../utils/gameLogic';
import { createRebirthEgg, createBreedingEgg, hatchEgg, isEggReady } from '../utils/eggs';
import { getDecorationById, BACKGROUND_COLORS } from '../data/decorations';
import { GAME_CONFIG } from '../config/game';
import { GameNotification } from '../data/notifications';
import { GameResult } from '../minigames/types';

interface UseGameActionsProps {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  setNotifications: React.Dispatch<React.SetStateAction<GameNotification[]>>;
  setActiveModal: React.Dispatch<React.SetStateAction<'shop' | 'social' | 'rebirth' | 'stats' | 'settings' | null>>;
  setActiveGame: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentScreen: React.Dispatch<React.SetStateAction<'home' | 'games'>>;
}

export function useGameActions({
  gameState,
  setGameState,
  setNotifications,
  setActiveModal,
  setActiveGame,
  setCurrentScreen,
}: UseGameActionsProps) {
  const handleFeed = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      // Don't drop food if hunger is at 100
      if (prev.axolotl.stats.hunger >= 100) {
        return prev;
      }

      // Drop food at a random x position at the TOP
      const newFood: FoodItem = {
        id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID
        x: Math.random() * 80 + 10, // 10-90% from left
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
      }, 5000); // Match the maximum animation duration

      return { ...prev, foodItems };
    });
  }, []);

  const handleEatFood = useCallback((foodId: string) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      const foodItems = (prev.foodItems || []).filter(f => f.id !== foodId);
      const updated = feedAxolotl(prev.axolotl, 15);

      return {
        ...prev,
        axolotl: updated,
        foodItems,
      };
    });
  }, []);

  const handlePlay = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      const updated = playWithAxolotl(prev.axolotl, 20);
      return { ...prev, axolotl: updated };
    });
  }, []);

  const handleClean = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      
      const updated = {
        ...prev.axolotl,
        stats: {
          ...prev.axolotl.stats,
          cleanliness: Math.min(100, prev.axolotl.stats.cleanliness + 35),
        },
      };
      
      // Reset cleanlinessLowSince if cleanliness is now above 50%
      const newCleanliness = Math.min(100, prev.axolotl.stats.cleanliness + 35);
      const shouldResetTracker = newCleanliness >= 50;
      
      return {
        ...prev,
        axolotl: updated,
        cleanlinessLowSince: shouldResetTracker ? undefined : prev.cleanlinessLowSince,
      };
    });
  }, []);

  const handleWaterChange = useCallback(() => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      
      const updated = {
        ...prev.axolotl,
        stats: {
          ...prev.axolotl.stats,
          waterQuality: Math.min(100, prev.axolotl.stats.waterQuality + 30),
        },
      };
      
      return {
        ...prev,
        axolotl: updated,
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

  const handleAddFriend = useCallback((code: string) => {
    // Normalize friend code for duplicate detection (uppercase, trimmed)
    const normalizedCode = code.trim().toUpperCase();
    
    const mockFriend: Friend = {
      id: `friend-${Date.now()}`,
      friendCode: normalizedCode, // Store normalized code for duplicate detection
      name: code.split('-')[0],
      axolotlName: 'Mystery Axo',
      stage: 'adult',
      generation: parseInt(code.split('-')[1]?.[0] || '1'),
      lastSync: Date.now(),
    };

    setGameState(prev => {
      if (!prev) return prev;
      
      // Check for duplicates by normalized friend code, not by generated ID
      if (prev.friends.some(f => f.friendCode === normalizedCode || (f.friendCode === undefined && f.id === mockFriend.id))) {
        setNotifications(prev => [...prev, {
          id: `notif-${Date.now()}`,
          type: 'friend',
          emoji: '⚠️',
          message: 'Friend already added!',
          time: 'now',
          read: false,
        }]);
        return prev;
      }

      setNotifications(prev => [...prev, {
        id: `notif-${Date.now()}`,
        type: 'friend',
        emoji: '🤝',
        message: `Added ${mockFriend.name} as a friend!`,
        time: 'now',
        read: false,
      }]);
      
      return {
        ...prev,
        friends: [...prev.friends, mockFriend],
      };
    });
  }, []);

  const handleRemoveFriend = useCallback((friendId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const friend = prev.friends.find(f => f.id === friendId);
      if (!friend) return prev;

      setNotifications(prev => [...prev, {
        id: `notif-${Date.now()}`,
        type: 'friend',
        emoji: '👋',
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

      if (prev.axolotl.stage !== 'adult' && prev.axolotl.stage !== 'elder') {
        setNotifications(prev => [...prev, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          emoji: '⚠️',
          message: 'Your axolotl must be an adult or elder to breed!',
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
          emoji: '🥚',
          message: 'Breeding successful! Egg is incubating.',
          time: 'now',
          read: false,
        }]);
        
        return {
          ...prev,
          incubatorEgg: egg,
          coins: prev.coins + 50,
        };
      } else {
        if (prev.nurseryEggs.length < GAME_CONFIG.nurserySlotsOpen) {
          setNotifications(prev => [...prev, {
            id: `notif-${Date.now()}`,
            type: 'milestone',
            emoji: '🥚',
            message: 'Breeding successful! Egg added to nursery.',
            time: 'now',
            read: false,
          }]);
          
          return {
            ...prev,
            nurseryEggs: [...prev.nurseryEggs, egg],
            coins: prev.coins + 50,
          };
        } else {
          setNotifications(prev => [...prev, {
            id: `notif-${Date.now()}`,
            type: 'milestone',
            emoji: '⚠️',
            message: 'Nursery storage is full!',
            time: 'now',
            read: false,
          }]);
          return prev;
        }
      }
    });
  }, []);

  const handleRebirth = useCallback((newName: string) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;

      const oldAxolotl = prev.axolotl;
      const bonusCoins = oldAxolotl.generation * 10;

      // Store the name in the egg metadata for use at hatch
      const egg = createRebirthEgg(oldAxolotl, newName);

      return {
        ...prev,
        axolotl: null,
        incubatorEgg: egg,
        coins: prev.coins + bonusCoins,
        lineage: [...prev.lineage, oldAxolotl],
      };
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
        
        return {
          ...prev,
          axolotl: newAxolotl,
          incubatorEgg: null,
        };
      }
      
      // Nursery eggs cannot hatch directly - they must be moved to incubator first
      // (This logic is removed - eggs can only hatch in incubator slot)
      
      return prev;
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
          emoji: '⚠️',
          message: `Not enough opals! You need ${boostCost} 🪬 to boost an egg.`,
          time: 'now',
          read: false,
        }]);
        return prev;
      }
      
      if (prev.incubatorEgg && prev.incubatorEgg.id === eggId) {
        setNotifications(prevNotifs => [...prevNotifs, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          emoji: '⚡',
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
          emoji: '⚡',
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

  const handleGiftEgg = useCallback((eggId: string) => {
    setNotifications(prev => [...prev, {
      id: `notif-${Date.now()}`,
      type: 'gift',
      emoji: '🎁',
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
          emoji: '🗑️',
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
          emoji: '🗑️',
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

  const handleMiniGameEnd = useCallback((result: GameResult) => {
    setActiveGame(null);
    setCurrentScreen('games'); // Return to games menu after game ends
    
    setGameState(prev => {
      if (!prev || !prev.axolotl) return prev;
      
      // Check if energy was available when game started (stored in _lastGameHadEnergy)
      // This flag is set when game starts, before energy is deducted
      const hadEnergy = (prev as any)._lastGameHadEnergy === true;
      
      const newXP = hadEnergy ? prev.axolotl.experience + result.xp : prev.axolotl.experience;
      const newCoins = hadEnergy ? prev.coins + result.coins : prev.coins;
      const newOpals = hadEnergy && result.opals ? (prev.opals || 0) + result.opals : prev.opals;
      
      // Playing mini games makes the axolotl hungry - reduce hunger by 15 points
      const hungerReduction = 15;
      const newHunger = Math.max(0, prev.axolotl.stats.hunger - hungerReduction);
      
      const updatedAxolotl = {
        ...prev.axolotl,
        experience: newXP,
        stats: {
          ...prev.axolotl.stats,
          hunger: newHunger,
        },
      };
      const evolvedAxolotl = checkEvolution(updatedAxolotl);
      
      // Show appropriate notification based on whether rewards were earned
      if (hadEnergy) {
        setNotifications(prevNotifs => [...prevNotifs, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          emoji: result.tier === 'exceptional' ? '✨' : result.tier === 'good' ? '🎉' : '🎮',
          message: `Earned ${result.xp} XP and ${result.coins} coins!${result.opals ? ` +${result.opals} 🪬` : ''}`,
          time: 'now',
          read: false,
        }]);
      } else {
        setNotifications(prevNotifs => [...prevNotifs, {
          id: `notif-${Date.now()}`,
          type: 'milestone',
          emoji: '⚡',
          message: 'No energy! Played for fun but no rewards earned. Energy regenerates over time.',
          time: 'now',
          read: false,
        }]);
      }
      
      // Clean up the temporary flag
      const { _lastGameHadEnergy, ...restState } = prev as any;
      
      return {
        ...restState,
        axolotl: evolvedAxolotl,
        coins: newCoins,
        opals: newOpals,
      };
    });
  }, []);

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
      
      if (filter.opals > 0) {
        if ((prev.opals || 0) < filter.opals) return prev;
        return {
          ...prev,
          opals: (prev.opals || 0) - filter.opals,
          filterTier: filter.id,
        };
      } else {
        if (prev.coins < filter.coins) return prev;
        return {
          ...prev,
          coins: prev.coins - filter.coins,
          filterTier: filter.id,
        };
      }
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
      emoji: '🦐',
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

  return {
    handleFeed,
    handleEatFood,
    handlePlay,
    handleClean,
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
    handleBoostEgg,
    handleGiftEgg,
    handleDiscardEgg,
    handleMiniGameEnd,
    handleBuyCoins,
    handleBuyOpals,
    handleBuyFilter,
    handleBuyShrimp,
    handleBuyTreatment,
  };
}
