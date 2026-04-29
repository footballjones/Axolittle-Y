/**
 * Types and interfaces for mini-games
 */

export interface GameResult {
  score: number;
  tier: 'normal' | 'good' | 'exceptional';
  xp: number;
  coins: number;
  opals?: number; // Only for exceptional tier
}

export interface MiniGameProps {
  onEnd: (result: GameResult) => void;
  onDeductEnergy?: () => void; // Call when a game attempt starts; deducts 1 energy if available
  onApplyReward?: (coins: number, opals?: number) => void; // Call immediately when rewards are earned (crash-safe)
  energy: number; // Current energy (for display/validation)
  strength?: number; // Axolotl strength stat (0-100)
  speed?: number; // Axolotl speed stat (0-100)
  stamina?: number; // Axolotl stamina stat (0-100)
  soundEnabled?: boolean; // Whether sound effects should play (default true)
  /**
   * Reward multiplier applied to coins when the player starts a game without
   * energy. XP is always 0 when no energy. Default 0.25 (25% coins).
   * Use applyEnergyMultiplier() from rewardHelpers.ts to apply consistently.
   */
  noEnergyMultiplier?: number;
  /**
   * Player's current personal best score for this game (0 if never played).
   * Stash in a ref at game start so the end-screen comparison stays stable
   * even after the parent updates the PB on game completion.
   */
  personalBest?: number;
}

export interface GameRewardTier {
  xp: number;
  coins: number;
  opalChance?: number; // 0-1 probability for exceptional tier
}

export interface GameRewards {
  normal: GameRewardTier;
  good: GameRewardTier;
  exceptional: GameRewardTier;
}
