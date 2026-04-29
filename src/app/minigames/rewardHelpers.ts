/**
 * Reward shaping helpers for mini-games.
 *
 * The energy bar policy is "reduce-but-reward" rather than "gate":
 *   - Players with energy: full rewards (1.0× XP and coins)
 *   - Players without energy: 0 XP, fractional coins (default 25%), no opal drops
 *
 * Each game decides when to call this — typically at the moment the game ends
 * and rewards are about to be awarded. Apply once, persist the result.
 *
 * Returning a new object (rather than mutating) keeps the reward shape immutable
 * for the result-overlay rendering.
 */

/**
 * Reward shape returned by `calculateRewards()` in config.ts. Score is owned by
 * the game and not part of this helper's concern.
 */
export interface RewardShape {
  tier: 'normal' | 'good' | 'exceptional';
  xp: number;
  coins: number;
  opals?: number;
}

export interface EnergyMultiplierInput {
  rewards: RewardShape;
  hadEnergy: boolean;
  /** 0–1 multiplier applied to coins when !hadEnergy. XP becomes 0. Default 0.25. */
  noEnergyMultiplier?: number;
}

export function applyEnergyMultiplier({
  rewards,
  hadEnergy,
  noEnergyMultiplier = 0.25,
}: EnergyMultiplierInput): RewardShape {
  if (hadEnergy) {
    return { ...rewards };
  }
  return {
    tier: rewards.tier,
    xp: 0,
    coins: Math.max(0, Math.round(rewards.coins * noEnergyMultiplier)),
    // No opal drops without energy — this is the "earn full" carrot
    opals: undefined,
  };
}
