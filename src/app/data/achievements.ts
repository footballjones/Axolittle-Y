import type { Achievement } from '../types/achievements';
import type { GameState } from '../types/game';
import { calculateLevel } from '../utils/gameLogic';

// The 6 solo game IDs used in MiniGameMenu
const SOLO_GAME_IDS = [
  'fish-hooks',
  'keepey-upey',
  'math-rush',
  'axolotl-stacker',
  'treasure-hunt',
  'coral-code',
];

// Helper: check if any axolotl (current or lineage) ever had a given rarity
function everHadRarity(state: GameState, rarities: string[]): boolean {
  const current = state.axolotl;
  if (current?.rarity && rarities.includes(current.rarity)) return true;
  return state.lineage.some(a => a.rarity && rarities.includes(a.rarity));
}

// Helper: check if any egg (lineage axolotl parentIds check) or current eggs have 2 parents (bred)
function everBredWithFriend(state: GameState): boolean {
  if (state.incubatorEgg && state.incubatorEgg.parentIds.length === 2) return true;
  if (state.nurseryEggs.some(e => e.parentIds.length === 2)) return true;
  return state.lineage.some(a => a.parentIds.length === 2);
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // ─── 🌿 NURTURE ────────────────────────────────────────────────────────────
  {
    id: 'first-meal',
    name: 'First Meal',
    description: 'Feed your axolotl for the very first time.',
    emoji: '🍖',
    category: 'nurture',
    check: s => (s.totalFeedsEver ?? 0) >= 1,
  },
  {
    id: 'devoted-feeder',
    name: 'Devoted Feeder',
    description: 'Feed your axolotl 100 times.',
    emoji: '🍽️',
    category: 'nurture',
    check: s => (s.totalFeedsEver ?? 0) >= 100,
  },
  {
    id: 'spotless-tank',
    name: 'Spotless Tank',
    description: 'Clean up 50 poop items from the tank.',
    emoji: '✨',
    category: 'nurture',
    check: s => (s.totalCleansEver ?? 0) >= 50,
  },
  {
    id: 'water-whisperer',
    name: 'Water Whisperer',
    description: 'Change the aquarium water 20 times.',
    emoji: '💧',
    category: 'nurture',
    check: s => (s.totalWaterChanges ?? 0) >= 20,
  },
  {
    id: 'premium-care',
    name: 'Premium Care',
    description: 'Install the Premium Filter in your aquarium.',
    emoji: '⚗️',
    category: 'nurture',
    check: s => s.filterTier === 'filter-premium',
  },

  // ─── 🎮 MINI GAMES ─────────────────────────────────────────────────────────
  {
    id: 'game-on',
    name: 'Game On!',
    description: 'Play your first mini game.',
    emoji: '🕹️',
    category: 'minigames',
    check: s => (s.totalMinigamesPlayed ?? 0) >= 1,
  },
  {
    id: 'dedicated-gamer',
    name: 'Dedicated Gamer',
    description: 'Play 50 mini games.',
    emoji: '🎯',
    category: 'minigames',
    check: s => (s.totalMinigamesPlayed ?? 0) >= 50,
  },
  {
    id: 'veteran-gamer',
    name: 'Veteran Gamer',
    description: 'Play 100 mini games.',
    emoji: '🏅',
    category: 'minigames',
    check: s => (s.totalMinigamesPlayed ?? 0) >= 100,
  },
  {
    id: 'exceptional-player',
    name: 'Exceptional Player',
    description: 'Achieve 10 exceptional scores across any mini games.',
    emoji: '⭐',
    category: 'minigames',
    check: s => (s.totalExceptionalScores ?? 0) >= 10,
  },
  {
    id: 'all-rounder',
    name: 'All-Rounder',
    description: 'Play every solo mini game at least once.',
    emoji: '🎪',
    category: 'minigames',
    check: s => {
      const played = new Set(s.uniqueGamesPlayed ?? []);
      return SOLO_GAME_IDS.every(id => played.has(id));
    },
  },

  // ─── 📈 PROGRESSION ────────────────────────────────────────────────────────
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Your axolotl reaches the Juvenile stage.',
    emoji: '🌱',
    category: 'progression',
    check: s => {
      const cur = s.axolotl;
      if (cur && ['juvenile', 'adult', 'elder'].includes(cur.stage)) return true;
      return s.lineage.some(a => ['juvenile', 'adult', 'elder'].includes(a.stage));
    },
  },
  {
    id: 'all-grown-up',
    name: 'All Grown Up',
    description: 'Your axolotl reaches the Adult stage.',
    emoji: '🌿',
    category: 'progression',
    check: s => {
      const cur = s.axolotl;
      if (cur && ['adult', 'elder'].includes(cur.stage)) return true;
      return s.lineage.some(a => ['adult', 'elder'].includes(a.stage));
    },
  },
  {
    id: 'elder-wisdom',
    name: 'Elder Wisdom',
    description: 'Your axolotl reaches the Elder stage.',
    emoji: '🧙',
    category: 'progression',
    check: s => {
      const cur = s.axolotl;
      if (cur?.stage === 'elder') return true;
      return s.lineage.some(a => a.stage === 'elder');
    },
  },
  {
    id: 'peak-potential',
    name: 'Peak Potential',
    description: 'Reach the maximum level of 40.',
    emoji: '🔱',
    category: 'progression',
    check: s => {
      const cur = s.axolotl;
      if (cur && calculateLevel(cur.experience) >= 40) return true;
      return s.lineage.some(a => calculateLevel(a.experience) >= 40);
    },
  },
  {
    id: 'circle-of-life',
    name: 'Circle of Life',
    description: 'Complete your first Rebirth.',
    emoji: '🔄',
    category: 'progression',
    check: s => s.lineage.length >= 1,
  },
  {
    id: 'dynasty',
    name: 'Dynasty',
    description: 'Raise an axolotl of Generation 5 or higher.',
    emoji: '👑',
    category: 'progression',
    check: s => {
      const cur = s.axolotl;
      if (cur && cur.generation >= 5) return true;
      return s.lineage.some(a => a.generation >= 5);
    },
  },

  // ─── 🥚 GENETICS ───────────────────────────────────────────────────────────
  {
    id: 'hatchling',
    name: 'Hatchling',
    description: 'Hatch your first egg.',
    emoji: '🐣',
    category: 'genetics',
    check: s => (s.totalEggsHatched ?? 0) >= 1,
  },
  {
    id: 'rare-find',
    name: 'Rare Find',
    description: 'Hatch a Rare (or higher) egg.',
    emoji: '💙',
    category: 'genetics',
    check: s => everHadRarity(s, ['Rare', 'Epic', 'Legendary', 'Mythic']),
  },
  {
    id: 'epic-specimen',
    name: 'Epic Specimen',
    description: 'Hatch an Epic (or higher) egg.',
    emoji: '💜',
    category: 'genetics',
    check: s => everHadRarity(s, ['Epic', 'Legendary', 'Mythic']),
  },
  {
    id: 'legendary-being',
    name: 'Legendary Being',
    description: 'Hatch a Legendary (or higher) egg.',
    emoji: '💛',
    category: 'genetics',
    check: s => everHadRarity(s, ['Legendary', 'Mythic']),
  },
  {
    id: 'mythic-creature',
    name: 'Mythic Creature',
    description: 'Hatch a Mythic egg — the rarest of all.',
    emoji: '🔴',
    category: 'genetics',
    check: s => everHadRarity(s, ['Mythic']),
  },

  // ─── 👥 SOCIAL ─────────────────────────────────────────────────────────────
  {
    id: 'first-friend',
    name: 'First Friend',
    description: 'Add your first friend.',
    emoji: '🤝',
    category: 'social',
    check: s => s.friends.length >= 1,
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Add 5 friends.',
    emoji: '🦋',
    category: 'social',
    check: s => s.friends.length >= 5,
  },
  {
    id: 'gift-giver',
    name: 'Gift Giver',
    description: 'Send 10 gifts to friends.',
    emoji: '🎁',
    category: 'social',
    check: s => (s.totalGiftsSent ?? 0) >= 10,
  },
  {
    id: 'family-matters',
    name: 'Family Matters',
    description: 'Breed your axolotl with a friend\'s.',
    emoji: '💞',
    category: 'social',
    check: s => everBredWithFriend(s),
  },

  // ─── 🎁 DAILY HABITS ───────────────────────────────────────────────────────
  {
    id: 'lucky-spin',
    name: 'Lucky Spin',
    description: 'Use the Spin Wheel for the first time.',
    emoji: '🎰',
    category: 'daily',
    check: s => !!s.lastSpinDate,
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day login streak.',
    emoji: '🗓️',
    category: 'daily',
    check: s => (s.loginStreak ?? 0) >= 7,
  },
  {
    id: 'monthly-devotee',
    name: 'Monthly Devotee',
    description: 'Maintain a 30-day login streak.',
    emoji: '📅',
    category: 'daily',
    check: s => (s.loginStreak ?? 0) >= 30,
  },
  {
    id: 'legend-of-devotion',
    name: 'Legend of Devotion',
    description: 'Maintain a 100-day login streak.',
    emoji: '🌟',
    category: 'daily',
    check: s => (s.loginStreak ?? 0) >= 100,
  },
];

/**
 * Pure function. Given the current game state, returns the IDs of any
 * achievements that are newly satisfied but not yet recorded.
 */
export function checkAchievements(state: GameState): string[] {
  const alreadyUnlocked = new Set(state.achievements ?? []);
  const newlyUnlocked: string[] = [];
  for (const achievement of ALL_ACHIEVEMENTS) {
    if (!alreadyUnlocked.has(achievement.id) && achievement.check(state)) {
      newlyUnlocked.push(achievement.id);
    }
  }
  return newlyUnlocked;
}
