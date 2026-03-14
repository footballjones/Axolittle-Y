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
  energy: number; // Current energy (for display/validation)
  strength?: number; // Axolotl strength stat (0-100)
  speed?: number; // Axolotl speed stat (0-100)
  stamina?: number; // Axolotl stamina stat (0-100)
  soundEnabled?: boolean; // Whether sound effects should play (default true)
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
