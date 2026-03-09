/**
 * Centralized game configuration
 * Makes balancing and A/B testing easier in future releases
 */

export const GAME_CONFIG = {
  // Starter values
  starterCoins: 10000,
  starterOpals: 100,
  
  // Energy system
  energyMax: 10,
  energyRegenRate: 1, // per hour (TBD - placeholder)
  
  // Nursery
  nurserySlotsOpen: 6,
  nurserySlotsLocked: 18,
  incubatorSlots: 1,
  eggIncubationHours: 24,
  
  // XP/Level progression
  // Level 2 = 10 XP, then +5 per level
  level2XP: 10,
  xpPerLevel: 5,
  
  // Life stages (by level)
  stages: {
    baby: { minLevel: 1, maxLevel: 9 },
    juvenile: { minLevel: 10, maxLevel: 19 },
    adult: { minLevel: 20, maxLevel: 29 },
    elder: { minLevel: 30, maxLevel: 40 },
  },
  
  // Rebirth
  rebirthLevel: 40,
  
  // Recessive gene expression probability
  recessiveGeneExpressionChance: 0.2, // 20% per trait
  
  // Egg actions
  eggBoostCost: 3, // Opals to instantly hatch an egg
  
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
    7: { opals: 15, decoration: null },
    30: { opals: 20, decoration: null },
    100: { opals: 20, decoration: 'decoration-streak-100' }, // Exclusive decoration
  },
} as const;
