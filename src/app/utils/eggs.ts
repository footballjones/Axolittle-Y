import { Egg, Axolotl } from '../types/game';
import { GAME_CONFIG } from '../config/game';
import { breedAxolotls, generateAxolotl } from './gameLogic';

/**
 * Create an egg from rebirth (Elder lays egg)
 */
export function createRebirthEgg(parent: Axolotl, pendingName?: string): Egg {
  // Roll for recessive expression
  let color = parent.color;
  let pattern = parent.pattern;

  if (parent.recessiveGenes?.color && Math.random() < GAME_CONFIG.recessiveGeneExpressionChance) {
    color = parent.recessiveGenes.color;
  }

  if (parent.recessiveGenes?.pattern && Math.random() < GAME_CONFIG.recessiveGeneExpressionChance) {
    pattern = parent.recessiveGenes.pattern;
  }

  // Get parent's rarity (default to Common if not set, for backwards compatibility)
  const parentRarity = parent.rarity || 'Common';

  // Rarity hierarchy for comparison
  const rarityOrder: ('Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic')[] =
    ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];

  // ── Weighted pool score (all stats count) ────────────────────────────────
  // Intellect is the primary driver but strength/stamina/speed contribute too,
  // so builds that spread stats aren't penalized vs pure INT stackers.
  const { intellect, strength, stamina, speed } = parent.secondaryStats;
  const baseIntellect = intellect;
  const poolScore = Math.floor(
    intellect * 0.5 +
    strength * 0.2 +
    stamina * 0.15 +
    speed * 0.15
  );

  // ── Luck Meter (pity system) ──────────────────────────────────────────────
  // Each rebirth at the same rarity without upgrading adds +5 to the pool score.
  const LUCK_BONUS_PER_STREAK = 5;
  const currentStreak = parent.rebirthStreak ?? 0;
  const effectiveScore = Math.min(100, poolScore + currentStreak * LUCK_BONUS_PER_STREAK);

  // Neglect decay logic: higher rarities can drop if overall fitness (poolScore) is too low
  let minRarity = parentRarity;

  // Generation floor: Common axolotls entering Gen 3+ are guaranteed at least Rare
  if (parentRarity === 'Common' && parent.generation >= 2) {
    minRarity = 'Rare';
  } else if (parentRarity === 'Mythic' && poolScore < 61) {
    minRarity = 'Legendary';
  } else if (parentRarity === 'Legendary' && poolScore <= 60) {
    minRarity = 'Epic';
  } else if (parentRarity === 'Epic' && poolScore < 47) {
    minRarity = 'Rare';
  } else if (parentRarity === 'Rare' && poolScore < 40) {
    minRarity = 'Common';
  }

  const minRarityIndex = rarityOrder.indexOf(minRarity);

  // Determine potential rarity based on generation and effective pool score (includes luck bonus)
  let rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' = minRarity;
  const rand = Math.random();

  if (parent.generation >= 5 || effectiveScore >= 65) {
    if (rand < 0.05) {
      rarity = 'Mythic';
    } else if (rand < 0.25) {
      rarity = 'Legendary';
    } else if (rand < 0.55) {
      rarity = 'Epic';
    } else if (rand < 0.85) {
      rarity = 'Rare';
    } else {
      rarity = 'Common';
    }
  } else if (parent.generation >= 4 || effectiveScore >= 50) {
    if (rand < 0.15) {
      rarity = 'Legendary';
    } else if (rand < 0.45) {
      rarity = 'Epic';
    } else if (rand < 0.75) {
      rarity = 'Rare';
    } else {
      rarity = 'Common';
    }
  } else if (parent.generation >= 4 || effectiveScore >= 25) {
    if (rand < 0.20) {
      rarity = 'Epic';
    } else if (rand < 0.60) {
      rarity = 'Rare';
    } else {
      rarity = 'Common';
    }
  } else if (parent.generation >= 2 || effectiveScore >= 15) {
    if (rand < 0.30) {
      rarity = 'Rare';
    } else {
      rarity = 'Common';
    }
  }
  // Otherwise stays Common

  // Ensure we never go below the minimum rarity
  const finalRarityIndex = rarityOrder.indexOf(rarity);
  if (finalRarityIndex < minRarityIndex) {
    rarity = minRarity;
  }

  // ── Update streak for the child ───────────────────────────────────────────
  // If rarity upgraded → streak resets. Same or lower → streak grows.
  const parentRarityIndex = rarityOrder.indexOf(parentRarity);
  const newStreak = rarityOrder.indexOf(rarity) > parentRarityIndex ? 0 : currentStreak + 1;

  return {
    id: `egg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parentIds: [parent.id],
    generation: parent.generation + 1,
    incubationEndsAt: Date.now() + (GAME_CONFIG.eggIncubationHours * 60 * 60 * 1000),
    color,
    pattern,
    rarity,
    pendingName,
    parentStats: parent.secondaryStats,
    rebirthStreak: newStreak,
  };
}

/**
 * Create an egg from breeding (two parents)
 */
export function createBreedingEgg(parent1: Axolotl, parent2: Axolotl): Egg {
  const { color, pattern, recessiveGenes: _recessiveGenes } = breedAxolotls(parent1, parent2);
  
  // Determine rarity (higher with both parents having high intellect or high generation)
  const avgIntellect = (parent1.secondaryStats.intellect + parent2.secondaryStats.intellect) / 2;
  const maxGeneration = Math.max(parent1.generation, parent2.generation);
  const minIntellect = Math.min(parent1.secondaryStats.intellect, parent2.secondaryStats.intellect);
  
  let rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' = 'Common';
  const rand = Math.random();
  
  if (maxGeneration >= 5 || (avgIntellect > 90 && minIntellect > 80)) {
    // Very high generation or both parents have high intellect - chance for Mythic
    if (rand < 0.05) {
      rarity = 'Mythic';
    } else if (rand < 0.25) {
      rarity = 'Legendary';
    } else if (rand < 0.55) {
      rarity = 'Epic';
    } else if (rand < 0.85) {
      rarity = 'Rare';
    } else {
      rarity = 'Common';
    }
  } else if (maxGeneration >= 4 || (avgIntellect > 85 && minIntellect > 70)) {
    // High generation or both parents have good intellect - chance for Legendary
    if (rand < 0.15) {
      rarity = 'Legendary';
    } else if (rand < 0.45) {
      rarity = 'Epic';
    } else if (rand < 0.75) {
      rarity = 'Rare';
    } else {
      rarity = 'Common';
    }
  } else if (maxGeneration >= 3 || avgIntellect > 80) {
    // Good generation or high average intellect - chance for Epic
    if (rand < 0.20) {
      rarity = 'Epic';
    } else if (rand < 0.60) {
      rarity = 'Rare';
    } else {
      rarity = 'Common';
    }
  } else if (maxGeneration >= 2 || avgIntellect > 60) {
    // Moderate generation or intellect - chance for Rare
    if (rand < 0.50) {
      rarity = 'Rare';
    } else {
      rarity = 'Common';
    }
  }
  // Otherwise stays Common
  
  return {
    id: `egg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parentIds: [parent1.id, parent2.id],
    generation: Math.max(parent1.generation, parent2.generation) + 1,
    incubationEndsAt: Date.now() + (GAME_CONFIG.eggIncubationHours * 60 * 60 * 1000), // 24 hours
    color,
    pattern,
    rarity,
  };
}

/**
 * Hatch an egg into a new axolotl at Baby, Level 1
 * The egg's color/pattern may already include recessive expression from breeding/rebirth
 */
export function hatchEgg(egg: Egg, name: string): Axolotl {
  // Generate new random recessive genes for the hatched axolotl
  // (these will be hidden until future breeding/rebirth)
  return generateAxolotl(
    name,
    egg.generation,
    egg.parentIds,
    egg.color,       // May already include recessive expression
    egg.pattern,     // May already include recessive expression
    undefined,       // New random recessive genes for this axolotl
    egg.rarity,      // Use the egg's rarity to determine starting stats
    egg.parentStats, // Parent's birth stats — enforces inheritance floor on child's stats
    egg.rebirthStreak  // carry the luck streak to the new axolotl
  );
}

/**
 * Check if an egg is ready to hatch
 */
export function isEggReady(egg: Egg): boolean {
  return Date.now() >= egg.incubationEndsAt;
}
