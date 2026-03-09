/**
 * Mini-game reward configuration
 * Based on Mini Games markdown design doc
 */

import { GameRewards } from './types';

export const GAME_REWARDS: Record<string, GameRewards> = {
  'keepey-upey': {
    normal: { xp: 0.5, coins: 15 },
    good: { xp: 1, coins: 25 },
    exceptional: { xp: 2, coins: 35, opalChance: 0.1 }, // 10% chance
  },
  'fish-hooks': {
    normal: { xp: 0.5, coins: 10 },
    good: { xp: 2, coins: 20 },
    exceptional: { xp: 3, coins: 30, opalChance: 0.1 },
  },
  'axolotl-stacker': {
    normal: { xp: 0.5, coins: 15 },
    good: { xp: 1, coins: 25 },
    exceptional: { xp: 3, coins: 30, opalChance: 0.1 },
  },
  'treasure-hunt': {
    normal: { xp: 1, coins: 25 },
    good: { xp: 2, coins: 40 },
    exceptional: { xp: 3, coins: 50, opalChance: 0.1 },
  },
  'math-rush': {
    normal: { xp: 0.5, coins: 20 },
    good: { xp: 1, coins: 30 },
    exceptional: { xp: 2, coins: 40, opalChance: 0.1 },
  },
  'coral-code': {
    normal: { xp: 0.5, coins: 20 },
    good: { xp: 1, coins: 30 },
    exceptional: { xp: 2, coins: 45, opalChance: 0.1 },
  },
  'fishing': {
    normal: { xp: 0, coins: 30 }, // Only winner gets XP in multiplayer
    good: { xp: 0, coins: 40 },
    exceptional: { xp: 1, coins: 60, opalChance: 0.1 }, // Winner only
  },
  'bite-tag': {
    normal: { xp: 0, coins: 25 }, // Only winner gets XP
    good: { xp: 0, coins: 35 },
    exceptional: { xp: 1, coins: 55, opalChance: 0.1 }, // Winner only
  },
};

/**
 * Score thresholds for determining reward tier
 * These are placeholders - should be tuned during testing
 */
export const SCORE_THRESHOLDS: Record<string, { good: number; exceptional: number }> = {
  'keepey-upey': { good: 30, exceptional: 60 }, // seconds survived
  'fish-hooks': { good: 10, exceptional: 25 }, // hooks passed
  'axolotl-stacker': { good: 8, exceptional: 15 }, // stack height
  'treasure-hunt': { good: 15, exceptional: 30 }, // gems + distance
  'math-rush': { good: 10, exceptional: 20 }, // correct answers
  'coral-code': { good: 7, exceptional: 10 }, // guesses remaining (10 - guesses used)
  'fishing': { good: 5, exceptional: 10 }, // fish weight (kg)
  'bite-tag': { good: 60, exceptional: 90 }, // seconds survived
};

/**
 * Calculate reward tier based on score
 */
export function calculateRewardTier(gameId: string, score: number): 'normal' | 'good' | 'exceptional' {
  const thresholds = SCORE_THRESHOLDS[gameId];
  if (!thresholds) return 'normal';
  
  if (score >= thresholds.exceptional) return 'exceptional';
  if (score >= thresholds.good) return 'good';
  return 'normal';
}

/**
 * Calculate rewards based on game result
 */
export function calculateRewards(gameId: string, score: number): {
  tier: 'normal' | 'good' | 'exceptional';
  xp: number;
  coins: number;
  opals?: number;
} {
  const rewards = GAME_REWARDS[gameId];
  if (!rewards) {
    return { tier: 'normal', xp: 0, coins: 0 };
  }
  
  const tier = calculateRewardTier(gameId, score);
  const tierRewards = rewards[tier];
  
  const result: {
    tier: 'normal' | 'good' | 'exceptional';
    xp: number;
    coins: number;
    opals?: number;
  } = {
    tier,
    xp: tierRewards.xp,
    coins: tierRewards.coins,
  };
  
  // Roll for opal drop (exceptional tier only)
  if (tier === 'exceptional' && tierRewards.opalChance && Math.random() < tierRewards.opalChance) {
    result.opals = 1;
  }
  
  return result;
}
