/**
 * Axolotl needs system
 * Handles wellbeing stat decay and care actions
 * Extracted from gameLogic.ts for better organization
 */

import { Axolotl, AxolotlStats, GameState } from '../types/game';
import { GAME_CONFIG } from '../config/game';

export const STAT_DECAY_RATE = {
  hunger: 0.5, // per minute
  happiness: 0.3,
  cleanliness: 0.2,
  waterQuality: 0.0139, // ~5 days to fully deplete (100 / 7200 min)
};

/**
 * Calculate water quality decay multiplier based on filter tier
 */
export function getFilterDecayMultiplier(filterTier?: string): number {
  switch (filterTier) {
    case 'filter-premium':
      return 0.3; // 70% slower decay
    case 'filter-advanced':
      return 0.6; // 40% slower decay
    case 'filter-basic':
    default:
      return 1.0; // Normal decay
  }
}

/**
 * Update axolotl wellbeing stats over time
 */
export function updateWellbeingStats(axolotl: Axolotl, gameState?: GameState): { axolotl: Axolotl; gameState?: Partial<GameState> } {
  const now = Date.now();
  const minutesPassed = (now - axolotl.lastUpdated) / (1000 * 60);

  if (minutesPassed < 0.1) return { axolotl }; // Don't update if less than 6 seconds

  // Water Quality acts as a multiplier on other stats
  const waterQualityMultiplier = axolotl.stats.waterQuality / 100;
  
  // Filter effect on water quality decay
  const filterMultiplier = getFilterDecayMultiplier(gameState?.filterTier);
  
  // Shrimp effects
  const hasShrimp = (gameState?.shrimpCount || 0) > 0;
  const shrimpCleanlinessBonus = hasShrimp
    ? Math.min(0.5, (gameState?.shrimpCount || 0) * GAME_CONFIG.shrimpCleanlinessBonus) // Max 50% reduction
    : 0;

  // Poop-driven cleanliness decay: 10 points per 8 hours (480 min) per poop present
  const poopCount = (gameState?.poopItems || []).length;
  const poopDecay = poopCount * (10 / 480) * minutesPassed;

  // Cleanliness only decays when poops are present — a clean tank stays clean.
  // Shrimp reduce the poop-driven decay rate.
  const newCleanliness = Math.max(0, axolotl.stats.cleanliness - poopDecay * (1 - shrimpCleanlinessBonus));

  // Poops sitting in the tank also directly degrade water quality:
  // each poop adds 5 points of water quality decay per 8 hours (480 min)
  const poopWaterDecay = poopCount * (5 / 480) * minutesPassed;

  // ── Poop generation & promotion ───────────────────────────────────────────
  const MAX_POOPS = 7;

  // 1. Promote pending feed-based poops that are now due
  const pending = gameState?.pendingPoops || [];
  const ready      = pending.filter(p => p.showAt <= now);
  const stillPending = pending.filter(p => p.showAt > now);
  let currentPoops = [
    ...(gameState?.poopItems || []),
    ...ready.map(p => ({ id: p.id, x: p.x, createdAt: p.showAt })),
  ];

  // 2. Time-based generation: 1 poop every 10 hours (600 min)
  const POOP_INTERVAL_MIN = 600;
  let lastPoopTime = gameState?.lastPoopTime;
  if (!lastPoopTime) {
    // First run: start the clock now (first time-based poop in 10 hours)
    lastPoopTime = now;
  } else if (currentPoops.length < MAX_POOPS) {
    const minutesSinceLastPoop = (now - lastPoopTime) / (1000 * 60);
    const newPoopCount = Math.floor(minutesSinceLastPoop / POOP_INTERVAL_MIN);
    if (newPoopCount > 0) {
      const allowed = Math.min(newPoopCount, MAX_POOPS - currentPoops.length);
      const generated = Array.from({ length: allowed }, (_, i) => ({
        id: `poop-t-${now}-${i}`,
        x: Math.random() * 70 + 15,
        createdAt: lastPoopTime! + (i + 1) * POOP_INTERVAL_MIN * 60 * 1000,
      }));
      currentPoops = [...currentPoops, ...generated];
      lastPoopTime = lastPoopTime + newPoopCount * POOP_INTERVAL_MIN * 60 * 1000;
    }
  }

  // Enforce cap across both sources
  if (currentPoops.length > MAX_POOPS) {
    currentPoops = currentPoops.slice(0, MAX_POOPS);
  }
  
  // Track when cleanliness drops below 50%
  let cleanlinessLowSince = gameState?.cleanlinessLowSince;
  if (newCleanliness < 50) {
    if (!cleanlinessLowSince) cleanlinessLowSince = now;
  } else {
    cleanlinessLowSince = undefined;
  }

  // Track when cleanliness drops below 10%
  let cleanlinessVeryLowSince = gameState?.cleanlinessVeryLowSince;
  if (newCleanliness < 10) {
    if (!cleanlinessVeryLowSince) cleanlinessVeryLowSince = now;
  } else {
    cleanlinessVeryLowSince = undefined;
  }

  // Calculate water quality decay multiplier
  // <10% for >48 hours → 2x decay (takes priority)
  // <50% for >24 hours → 1.2x decay
  let waterQualityDecayMultiplier = filterMultiplier;
  if (cleanlinessVeryLowSince && (now - cleanlinessVeryLowSince) / (1000 * 60) > 2880) {
    waterQualityDecayMultiplier = filterMultiplier * 2.0; // 2x if critically dirty for >48 hrs
  } else if (cleanlinessLowSince && (now - cleanlinessLowSince) / (1000 * 60) > 1440) {
    waterQualityDecayMultiplier = filterMultiplier * 1.2; // 20% increase if dirty for >24 hrs
  }
  
  const newStats: AxolotlStats = {
    // Hunger: stays full if shrimp present
    hunger: hasShrimp 
      ? 100 
      : Math.max(0, axolotl.stats.hunger - STAT_DECAY_RATE.hunger * minutesPassed * (waterQualityMultiplier < 0.5 ? 1.5 : waterQualityMultiplier > 0.7 ? 0.8 : 1)),
    happiness: Math.max(0, axolotl.stats.happiness - STAT_DECAY_RATE.happiness * minutesPassed * (waterQualityMultiplier < 0.5 ? 1.5 : waterQualityMultiplier > 0.7 ? 0.8 : 1)),
    // Cleanliness: shrimp reduce decay
    cleanliness: newCleanliness,
    // Water Quality: filter affects base decay, low cleanliness for >1 day multiplies it,
    // and any poops in the tank add direct additional decay
    waterQuality: Math.max(5, axolotl.stats.waterQuality - STAT_DECAY_RATE.waterQuality * minutesPassed * waterQualityDecayMultiplier - poopWaterDecay),
  };

  // ── Trait decay ───────────────────────────────────────────────────────────
  // If hunger, happiness AND cleanliness are all 0 for >9 days (12,960 min),
  // decay each secondary stat by 1 (min 0) every 18 hours (1,080 min).
  const allZero =
    newStats.hunger === 0 &&
    newStats.happiness === 0 &&
    newStats.cleanliness === 0;

  let allStatsZeroSince = gameState?.allStatsZeroSince;
  if (allZero) {
    if (!allStatsZeroSince) allStatsZeroSince = now;
  } else {
    allStatsZeroSince = undefined;
  }

  const NINE_DAYS_MIN   = 12960; // 9 * 24 * 60
  const DECAY_INTERVAL  = 1080;  // 18 * 60

  let lastTraitDecayTime = gameState?.lastTraitDecayTime;
  let updatedSecondaryStats = axolotl.secondaryStats;

  if (
    allStatsZeroSince &&
    (now - allStatsZeroSince) / (1000 * 60) > NINE_DAYS_MIN
  ) {
    const lastDecay = lastTraitDecayTime ?? allStatsZeroSince;
    const minutesSinceDecay = (now - lastDecay) / (1000 * 60);

    if (minutesSinceDecay >= DECAY_INTERVAL) {
      const ticks = Math.floor(minutesSinceDecay / DECAY_INTERVAL);
      updatedSecondaryStats = {
        strength:  Math.max(2, axolotl.secondaryStats.strength  - ticks),
        intellect: Math.max(2, axolotl.secondaryStats.intellect - ticks),
        stamina:   Math.max(2, axolotl.secondaryStats.stamina   - ticks),
        speed:     Math.max(2, axolotl.secondaryStats.speed     - ticks),
      };
      lastTraitDecayTime = lastDecay + ticks * DECAY_INTERVAL * 60 * 1000;
    }
  }

  const updatedAxolotl = {
    ...axolotl,
    stats: newStats,
    secondaryStats: updatedSecondaryStats,
    age: axolotl.age + minutesPassed,
    lastUpdated: now,
  };

  // Return gameState updates if any tracker changed
  const poopsChanged =
    ready.length > 0 ||
    lastPoopTime !== gameState?.lastPoopTime ||
    currentPoops.length !== (gameState?.poopItems || []).length;

  const trackersChanged =
    cleanlinessLowSince     !== gameState?.cleanlinessLowSince     ||
    cleanlinessVeryLowSince !== gameState?.cleanlinessVeryLowSince ||
    allStatsZeroSince       !== gameState?.allStatsZeroSince       ||
    lastTraitDecayTime      !== gameState?.lastTraitDecayTime      ||
    poopsChanged;

  const gameStateUpdate = trackersChanged
    ? {
        cleanlinessLowSince,
        cleanlinessVeryLowSince,
        allStatsZeroSince,
        lastTraitDecayTime,
        ...(poopsChanged ? { poopItems: currentPoops, pendingPoops: stillPending, lastPoopTime } : {}),
      }
    : undefined;

  return { axolotl: updatedAxolotl, gameState: gameStateUpdate };
}
