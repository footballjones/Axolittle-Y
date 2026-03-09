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
  const parentRarityIndex = rarityOrder.indexOf(parentRarity);
  
  // Neglect decay logic: higher rarities can drop if intellect is too low
  let minRarity = parentRarity;
  const intellect = parent.secondaryStats.intellect;
  
  if (parentRarity === 'Mythic' && intellect < 61) {
    minRarity = 'Legendary';
  } else if (parentRarity === 'Legendary' && intellect <= 60) {
    minRarity = 'Epic';
  } else if (parentRarity === 'Epic' && intellect < 47) {
    minRarity = 'Rare';
  } else if (parentRarity === 'Rare' && intellect < 40) {
    minRarity = 'Common';
  } else if (parentRarity === 'Common' && intellect < 40) {
    // Can stay Common or drop (already at minimum)
    minRarity = 'Common';
  }
  
  const minRarityIndex = rarityOrder.indexOf(minRarity);
  
  // Determine potential rarity based on generation and intellect
  // But never go below parent's rarity (unless neglect)
  let rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' = minRarity;
  const rand = Math.random();
  
  if (parent.generation >= 5 || parent.secondaryStats.intellect > 90) {
    // Very high generation or intellect - chance for Mythic
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
  } else if (parent.generation >= 4 || parent.secondaryStats.intellect > 85) {
    // High generation or intellect - chance for Legendary
    if (rand < 0.15) {
      rarity = 'Legendary';
    } else if (rand < 0.45) {
      rarity = 'Epic';
    } else if (rand < 0.75) {
      rarity = 'Rare';
    } else {
      rarity = 'Common';
    }
  } else if (parent.generation >= 3 || parent.secondaryStats.intellect > 80) {
    // Good generation or intellect - chance for Epic
    if (rand < 0.20) {
      rarity = 'Epic';
    } else if (rand < 0.60) {
      rarity = 'Rare';
    } else {
      rarity = 'Common';
    }
  } else if (parent.generation >= 2 || parent.secondaryStats.intellect > 60) {
    // Moderate generation or intellect - chance for Rare
    if (rand < 0.50) {
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
  
  return {
    id: `egg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parentIds: [parent.id],
    generation: parent.generation + 1,
    incubationEndsAt: Date.now() + (GAME_CONFIG.eggIncubationHours * 60 * 60 * 1000), // 24 hours
    color,
    pattern,
    rarity,
    pendingName, // Store name provided during rebirth
  };
}

/**
 * Create an egg from breeding (two parents)
 */
export function createBreedingEgg(parent1: Axolotl, parent2: Axolotl): Egg {
  const { color, pattern, recessiveGenes } = breedAxolotls(parent1, parent2);
  
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
    egg.color, // May already include recessive expression
    egg.pattern, // May already include recessive expression
    undefined, // New random recessive genes for this axolotl
    egg.rarity // Use the egg's rarity to determine starting stats
  );
}

/**
 * Check if an egg is ready to hatch
 */
export function isEggReady(egg: Egg): boolean {
  return Date.now() >= egg.incubationEndsAt;
}
