import { Axolotl, LifeStage, GameState, SecondaryStats } from '../types/game';
import { GAME_CONFIG } from '../config/game';
import { updateWellbeingStats } from '../axolotl/needsSystem';

// Life stages are now based on level only (Hatchling L1-9, Sprout L10-19, Guardian L20-29, Elder L30-40)
export const STAGE_REQUIREMENTS = {
  hatchling: { minLevel: 1, maxLevel: 9 },
  sprout: { minLevel: 10, maxLevel: 19 },
  guardian: { minLevel: 20, maxLevel: 29 },
  elder: { minLevel: 30, maxLevel: 60 },
};

// STAT_DECAY_RATE moved to axolotl/needsSystem.ts

export const COLORS = [
  '#FFB5E8', // Pink
  '#B5DEFF', // Light Blue
  '#C9FFBF', // Mint Green
  '#FFFFD4', // Pale Yellow
  '#E7C6FF', // Lavender
  '#FFD6A5', // Peach
];

export const PATTERNS = ['solid', 'spotted', 'striped', 'gradient'];

// Minimum fraction of a parent's birth stat that a child is guaranteed to start with.
// e.g. 0.75 means a child's stat will never be less than 75% of its parent's birth stat.
const STAT_INHERITANCE_FLOOR = 0.75;

/**
 * Get stat range for a given rarity
 */
function getRarityStatRange(rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'): { min: number; max: number } {
  switch (rarity) {
    case 'Common':
      return { min: 1, max: 10 };
    case 'Rare':
      return { min: 7, max: 17 };
    case 'Epic':
      return { min: 15, max: 25 };
    case 'Legendary':
      return { min: 31, max: 40 };
    case 'Mythic':
      return { min: 50, max: 60 };
    default:
      return { min: 1, max: 10 }; // Default to Common
  }
}


export function generateAxolotl(
  name: string,
  generation: number = 1,
  parentIds: string[] = [],
  inheritedColor?: string,
  inheritedPattern?: string,
  recessiveGenes?: { color?: string; pattern?: string },
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' = 'Common',
  parentStats?: SecondaryStats,
  rebirthStreak?: number
): Axolotl {
  // All secondary stats start at 0 — players grow them by allocating points on level-up.
  const statRange = getRarityStatRange(rarity);
  // For rebirths/breedings the inheritance floor still applies, but the floor is
  // computed from the parent's birth stats (which were also 0 initially, growing via
  // allocations). Generation 1 always starts at 0.
  const baseStats: SecondaryStats = parentStats !== undefined
    ? {
        strength: Math.max(0, Math.min(statRange.max, Math.floor((parentStats.strength ?? 0) * STAT_INHERITANCE_FLOOR))),
        intellect: Math.max(0, Math.min(statRange.max, Math.floor((parentStats.intellect ?? 0) * STAT_INHERITANCE_FLOOR))),
        stamina: Math.max(0, Math.min(statRange.max, Math.floor((parentStats.stamina ?? 0) * STAT_INHERITANCE_FLOOR))),
        speed: Math.max(0, Math.min(statRange.max, Math.floor((parentStats.speed ?? 0) * STAT_INHERITANCE_FLOOR))),
      }
    : { strength: 0, intellect: 0, stamina: 0, speed: 0 };

  // Assign random recessive genes if not provided
  const genes = recessiveGenes || {
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    pattern: PATTERNS[Math.floor(Math.random() * PATTERNS.length)],
  };

  return {
    id: `axo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    stage: 'hatchling' as LifeStage,
    stats: {
      hunger: 50,
      happiness: 50,
      cleanliness: 100,
      waterQuality: 100,
    },
    secondaryStats: baseStats,
    age: 0,
    experience: 0,
    color: inheritedColor || COLORS[Math.floor(Math.random() * COLORS.length)],
    pattern: inheritedPattern || PATTERNS[Math.floor(Math.random() * PATTERNS.length)],
    generation,
    parentIds,
    birthDate: Date.now(),
    lastUpdated: Date.now(),
    recessiveGenes: genes,
    rarity, // Store the rarity this axolotl came from
    lastLevel: 1, // Start at level 1
    birthStats: { ...baseStats }, // Snapshot of stats at birth — used as inheritance floor for children
    rebirthStreak: rebirthStreak ?? 0,
  };
}

export function updateStats(axolotl: Axolotl, gameState?: GameState): { axolotl: Axolotl; gameState?: Partial<GameState> } {
  // Delegate to needsSystem for better organization
  return updateWellbeingStats(axolotl, gameState);
}

/**
 * Update shrimp count based on consumption (10 per day)
 */
export function updateShrimp(gameState: GameState): GameState {
  if (!gameState.shrimpCount || gameState.shrimpCount <= 0) {
    return gameState;
  }

  const now = Date.now();
  const lastUpdate = gameState.lastShrimpUpdate || now;
  const daysPassed = (now - lastUpdate) / (1000 * 60 * 60 * 24);
  
  if (daysPassed < 1 / 24) return gameState; // Less than 1 hour, no update needed
  
  const shrimpEaten = Math.floor(daysPassed * GAME_CONFIG.shrimpEatenPerDay);
  const newShrimpCount = Math.max(0, gameState.shrimpCount - shrimpEaten);
  
  return {
    ...gameState,
    shrimpCount: newShrimpCount,
    lastShrimpUpdate: now,
  };
}

export function feedAxolotl(axolotl: Axolotl, amount: number = 25): Axolotl {
  return {
    ...axolotl,
    stats: {
      ...axolotl.stats,
      hunger: Math.min(100, axolotl.stats.hunger + amount),
    },
    // No XP for feeding — XP is only earned through mini-games
  };
}


export function checkEvolution(axolotl: Axolotl): { axolotl: Axolotl; didLevelUp: boolean } {
  const level = calculateLevel(axolotl.experience);
  const lastLevel = axolotl.lastLevel || level;
  const stages: LifeStage[] = ['hatchling', 'sprout', 'guardian', 'elder'];
  const currentIndex = stages.indexOf(axolotl.stage);

  const didLevelUp = level > lastLevel;

  let updatedAxolotl = {
    ...axolotl,
    lastLevel: level,
  };

  if (currentIndex < stages.length - 1) {
    const nextStage = stages[currentIndex + 1];
    const requirements = STAGE_REQUIREMENTS[nextStage];

    if (level >= requirements.minLevel) {
      updatedAxolotl = {
        ...updatedAxolotl,
        stage: nextStage,
      };
    }
  }

  return { axolotl: updatedAxolotl, didLevelUp };
}

export function canRebirth(axolotl: Axolotl): boolean {
  const level = calculateLevel(axolotl.experience);
  return axolotl.stage === 'elder' && level >= GAME_CONFIG.rebirthLevel; // Level 30+ (Elder)
}

export function getStatColor(value: number): string {
  if (value >= 70) return '#4ade80'; // green
  if (value >= 40) return '#fbbf24'; // yellow
  return '#ef4444'; // red
}

export function breedAxolotls(
  parent1: Axolotl, 
  parent2: Axolotl
): { color: string; pattern: string; recessiveGenes: { color?: string; pattern?: string } } {
  // Randomly inherit visible traits from parents
  let color = Math.random() > 0.5 ? parent1.color : parent2.color;
  let pattern = Math.random() > 0.5 ? parent1.pattern : parent2.pattern;

  // Combine recessive genes from both parents
  const combinedRecessive: { color?: string; pattern?: string } = {};
  
  // Each parent contributes their recessive genes
  if (parent1.recessiveGenes?.color) {
    combinedRecessive.color = parent1.recessiveGenes.color;
  } else if (parent2.recessiveGenes?.color) {
    combinedRecessive.color = parent2.recessiveGenes.color;
  } else {
    // Generate new recessive color if neither parent has one
    combinedRecessive.color = COLORS[Math.floor(Math.random() * COLORS.length)];
  }
  
  if (parent1.recessiveGenes?.pattern) {
    combinedRecessive.pattern = parent1.recessiveGenes.pattern;
  } else if (parent2.recessiveGenes?.pattern) {
    combinedRecessive.pattern = parent2.recessiveGenes.pattern;
  } else {
    combinedRecessive.pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
  }

  // Roll for recessive expression (20% chance per trait)
  if (combinedRecessive.color && Math.random() < GAME_CONFIG.recessiveGeneExpressionChance) {
    color = combinedRecessive.color;
  }
  
  if (combinedRecessive.pattern && Math.random() < GAME_CONFIG.recessiveGeneExpressionChance) {
    pattern = combinedRecessive.pattern;
  }

  // Small chance of mutation (overrides everything)
  if (Math.random() < 0.1) {
    color = COLORS[Math.floor(Math.random() * COLORS.length)];
    // Keep pattern or mutate it too
    if (Math.random() < 0.5) {
      pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    }
  }

  return { 
    color, 
    pattern,
    recessiveGenes: combinedRecessive,
  };
}

/**
 * Total XP required to reach a given level from level 1.
 *
 * Per-level cost starts at 1 XP (L1→L2) and rises by 1 each level,
 * capping at GAME_CONFIG.xpCapPerLevel (10) from L10→L11 onwards.
 *
 * Cumulative totals:
 *   Level  2 →   1 XP total   (cost 1)
 *   Level  3 →   3 XP total   (cost 2)
 *   Level  4 →   6 XP total   (cost 3)
 *   ...
 *   Level 11 →  55 XP total   (cost 10 — cap first reached)
 *   Level 12 →  65 XP total   (cost 10)
 *   Level 40 → 345 XP total
 */
function getXPToReachLevel(level: number): number {
  if (level <= 1) return 0;
  const cap = GAME_CONFIG.xpCapPerLevel; // 10
  const capLevel = cap + 1;              // 11 — first level where cap applies
  if (level <= capLevel) {
    // Triangular number: sum of 1+2+...+(level-1)
    return ((level - 1) * level) / 2;
  }
  // After the cap kicks in, each level costs a flat `cap` XP
  const xpAtCapLevel = ((capLevel - 1) * capLevel) / 2; // 55
  return xpAtCapLevel + (level - capLevel) * cap;
}

export function calculateLevel(experience: number): number {
  if (experience <= 0) return 1;

  const cap = GAME_CONFIG.xpCapPerLevel; // 10
  const xpAtCapLevel = ((cap * (cap + 1)) / 2); // 55 — XP to reach level 11

  if (experience >= xpAtCapLevel) {
    // Flat region: each level above 16 costs exactly `cap` XP
    const level = (cap + 1) + Math.floor((experience - xpAtCapLevel) / cap);
    return Math.min(level, 60);
  }

  // Progressive region: triangular numbers — solve (n-1)*n/2 <= XP
  // Quadratic formula: n = floor((sqrt(8*XP + 1) - 1) / 2) + 1
  return Math.floor((Math.sqrt(8 * experience + 1) - 1) / 2) + 1;
}

/** XP needed to advance from currentLevel to currentLevel + 1. */
export function getXPForNextLevel(currentLevel: number): number {
  return Math.min(currentLevel, GAME_CONFIG.xpCapPerLevel);
}

/** XP accumulated within the current level (progress toward the next level). */
export function getCurrentLevelXP(experience: number): number {
  const level = calculateLevel(experience);
  return experience - getXPToReachLevel(level);
}