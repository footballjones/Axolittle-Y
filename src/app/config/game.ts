/**
 * Centralized game configuration
 * Makes balancing and A/B testing easier in future releases
 */

export const GAME_CONFIG = {
  // Starter values
  starterCoins: 300,
  starterOpals: 5,
  
  // Energy system
  energyMax: 10,
  energyRegenRate: 2, // per hour (1 energy every 30 minutes)
  
  // Nursery
  nurserySlotsOpen: 6,
  nurserySlotsLocked: 18,
  incubatorSlots: 1,
  eggIncubationHours: 24,
  
  // XP/Level progression
  // Level 2 = 1 XP, each subsequent level costs 1 more than the last, capped at 10 XP/level
  // e.g. L1→2: 1, L2→3: 2, ... L9→10: 9, L10→11: 10, L11→12: 10 ...
  xpCapPerLevel: 10,
  
  // Life stages (by level)
  stages: {
    hatchling: { minLevel: 1, maxLevel: 9 },
    sprout: { minLevel: 10, maxLevel: 19 },
    guardian: { minLevel: 20, maxLevel: 29 },
    elder: { minLevel: 30, maxLevel: 40 },
  },
  
  // Rebirth
  rebirthLevel: 40,
  
  // Recessive gene expression probability
  recessiveGeneExpressionChance: 0.2, // 20% per trait
  
  // Egg actions
  eggBoostCost: 3, // Opals to instantly hatch an egg
  nurserySlotUnlockCost: 10, // Opals to unlock one nursery slot
  
  // Shrimp system
  shrimpEatenPerDay: 10, // Axolotl eats 10 shrimp per day
  shrimpCleanlinessBonus: 0.1, // Reduces cleanliness decay by 10% per shrimp (capped)
  
  // Daily spin wheel
  spinWheelRewards: {
    coins: [50, 100, 150, 200, 250, 300], // Small to medium coin rewards
    opals: [5, 10, 15], // Rare opal rewards
    opalChance: 0.14, // ~1 in 7 chance for opals
  },
  
  // Daily login bonus
  dailyLoginCoinBonus: 100, // Coins for daily login
  loginStreakRewards: {
    3:  { opals: 5,  coins: 200, decoration: null },
    7:  { opals: 15, coins: 300, decoration: null },
    14: { opals: 20, coins: 500, decoration: null },
    30: { opals: 30, coins: 750, decoration: null },
    50:  { opals: 50,  coins: 1000, decoration: 'decoration-streak-50'  }, // Exclusive decoration
    100: { opals: 100, coins: 2000, decoration: 'decoration-streak-100' }, // Ultimate milestone
  },
} as const;
