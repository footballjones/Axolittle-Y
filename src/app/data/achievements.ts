import type { Achievement } from '../types/achievements';
import type { GameState } from '../types/game';
import { calculateLevel } from '../utils/gameLogic';

// Solo game IDs used in MiniGameMenu
const SOLO_GAME_IDS = [
  'keepey-upey',
  'math-rush',
  'axolotl-stacker',
  'coral-code',
  'tide-tiles',
  'bubble-line-up',
];

// Helper: highest level ever reached across current axolotl and all lineage
function maxLevelEver(state: GameState): number {
  const cur = state.axolotl ? calculateLevel(state.axolotl.experience) : 0;
  const lineageMax = state.lineage.reduce((m, a) => Math.max(m, calculateLevel(a.experience)), 0);
  return Math.max(cur, lineageMax);
}

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
  // ─── NURTURE ────────────────────────────────────────────────────────────────
  {
    id: 'first-meal',
    name: 'First Meal',
    description: 'Feed your axolotl for the very first time.',
    icon: 'Bone',
    category: 'nurture',
    coinReward: 5,
    check: s => (s.totalFeedsEver ?? 0) >= 1,
  },
  {
    id: 'devoted-feeder',
    name: 'Devoted Feeder',
    description: 'Feed your axolotl 100 times.',
    icon: 'Utensils',
    category: 'nurture',
    coinReward: 30,
    check: s => (s.totalFeedsEver ?? 0) >= 100,
  },
  {
    id: 'spotless-tank',
    name: 'Spotless Tank',
    description: 'Clean up 50 poop items from the tank.',
    icon: 'Sparkles',
    category: 'nurture',
    coinReward: 15,
    check: s => (s.totalCleansEver ?? 0) >= 50,
  },
  {
    id: 'water-whisperer',
    name: 'Water Whisperer',
    description: 'Change the aquarium water 20 times.',
    icon: 'Droplets',
    category: 'nurture',
    coinReward: 20,
    check: s => (s.totalWaterChanges ?? 0) >= 20,
  },
  {
    id: 'premium-care',
    name: 'Premium Care',
    description: 'Install the Premium Filter in your aquarium.',
    icon: 'FlaskConical',
    category: 'nurture',
    coinReward: 25,
    opalReward: 2,
    check: s => (s.equippedFilter ?? s.filterTier) === 'filter-premium',
  },

  // ─── MINI GAMES ─────────────────────────────────────────────────────────────
  {
    id: 'game-on',
    name: 'Game On!',
    description: 'Play your first mini game.',
    icon: 'Gamepad2',
    category: 'minigames',
    coinReward: 10,
    check: s => (s.totalMinigamesPlayed ?? 0) >= 1,
  },
  {
    id: 'dedicated-gamer',
    name: 'Dedicated Gamer',
    description: 'Play 50 mini games.',
    icon: 'Target',
    category: 'minigames',
    coinReward: 25,
    check: s => (s.totalMinigamesPlayed ?? 0) >= 50,
  },
  {
    id: 'veteran-gamer',
    name: 'Veteran Gamer',
    description: 'Play 100 mini games.',
    icon: 'Medal',
    category: 'minigames',
    coinReward: 40,
    opalReward: 2,
    check: s => (s.totalMinigamesPlayed ?? 0) >= 100,
  },
  {
    id: 'exceptional-player',
    name: 'Exceptional Player',
    description: 'Achieve 10 exceptional scores across any mini games.',
    icon: 'Star',
    category: 'minigames',
    coinReward: 30,
    opalReward: 3,
    check: s => (s.totalExceptionalScores ?? 0) >= 10,
  },
  {
    id: 'all-rounder',
    name: 'All-Rounder',
    description: 'Play every solo mini game at least once.',
    icon: 'CircleDot',
    category: 'minigames',
    coinReward: 35,
    opalReward: 3,
    check: s => {
      const played = new Set(s.uniqueGamesPlayed ?? []);
      return SOLO_GAME_IDS.every(id => played.has(id));
    },
  },

  // ─── PROGRESSION ────────────────────────────────────────────────────────────
  // Level milestone series — collapses to a single tile; each step unlocks after the previous is claimed
  {
    id: 'level-milestone-5',
    name: 'Level Up!',
    description: 'Reach Level 5.',
    icon: 'TrendingUp',
    category: 'progression',
    coinReward: 20,
    seriesId: 'level-milestones',
    check: s => maxLevelEver(s) >= 5,
  },
  {
    id: 'level-milestone-10',
    name: 'Level Up!',
    description: 'Reach Level 10.',
    icon: 'TrendingUp',
    category: 'progression',
    coinReward: 50,
    seriesId: 'level-milestones',
    check: s => (s.achievements ?? []).includes('level-milestone-5') && maxLevelEver(s) >= 10,
  },
  {
    id: 'level-milestone-20',
    name: 'Level Up!',
    description: 'Reach Level 20.',
    icon: 'TrendingUp',
    category: 'progression',
    opalReward: 5,
    seriesId: 'level-milestones',
    check: s => (s.achievements ?? []).includes('level-milestone-10') && maxLevelEver(s) >= 20,
  },
  {
    id: 'level-milestone-30',
    name: 'Level Up!',
    description: 'Reach Level 30.',
    icon: 'TrendingUp',
    category: 'progression',
    opalReward: 10,
    seriesId: 'level-milestones',
    check: s => (s.achievements ?? []).includes('level-milestone-20') && maxLevelEver(s) >= 30,
  },
  {
    id: 'level-milestone-40',
    name: 'Level Up!',
    description: 'Reach Level 40.',
    icon: 'TrendingUp',
    category: 'progression',
    coinReward: 100,
    seriesId: 'level-milestones',
    check: s => (s.achievements ?? []).includes('level-milestone-30') && maxLevelEver(s) >= 40,
  },
  {
    id: 'level-milestone-60',
    name: 'Level Up!',
    description: 'Reach the maximum level — Level 60!',
    icon: 'TrendingUp',
    category: 'progression',
    opalReward: 15,
    seriesId: 'level-milestones',
    check: s => (s.achievements ?? []).includes('level-milestone-40') && maxLevelEver(s) >= 60,
  },
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Your axolotl reaches the Sprout stage.',
    icon: 'Sprout',
    category: 'progression',
    coinReward: 10,
    check: s => {
      const cur = s.axolotl;
      if (cur && ['sprout', 'guardian', 'elder'].includes(cur.stage)) return true;
      return s.lineage.some(a => ['sprout', 'guardian', 'elder'].includes(a.stage));
    },
  },
  {
    id: 'all-grown-up',
    name: 'All Grown Up',
    description: 'Your axolotl reaches the Guardian stage.',
    icon: 'Leaf',
    category: 'progression',
    coinReward: 15,
    check: s => {
      const cur = s.axolotl;
      if (cur && ['guardian', 'elder'].includes(cur.stage)) return true;
      return s.lineage.some(a => ['guardian', 'elder'].includes(a.stage));
    },
  },
  {
    id: 'elder-wisdom',
    name: 'Elder Wisdom',
    description: 'Your axolotl reaches the Elder stage.',
    icon: 'Wand2',
    category: 'progression',
    coinReward: 25,
    opalReward: 2,
    check: s => {
      const cur = s.axolotl;
      if (cur?.stage === 'elder') return true;
      return s.lineage.some(a => a.stage === 'elder');
    },
  },
  {
    id: 'circle-of-life',
    name: 'Circle of Life',
    description: 'Complete your first Rebirth.',
    icon: 'RefreshCw',
    category: 'progression',
    coinReward: 20,
    opalReward: 1,
    check: s => s.lineage.length >= 1,
  },
  {
    id: 'dynasty',
    name: 'Dynasty',
    description: 'Raise an axolotl of Generation 5 or higher.',
    icon: 'Crown',
    category: 'progression',
    coinReward: 35,
    opalReward: 3,
    check: s => {
      const cur = s.axolotl;
      if (cur && cur.generation >= 5) return true;
      return s.lineage.some(a => a.generation >= 5);
    },
  },

  // ─── GENETICS ───────────────────────────────────────────────────────────────
  {
    id: 'hatchling',
    name: 'Hatchling',
    description: 'Hatch your first egg.',
    icon: 'Egg',
    category: 'genetics',
    coinReward: 10,
    check: s => (s.totalEggsHatched ?? 0) >= 1,
  },
  {
    id: 'rare-find',
    name: 'Rare Find',
    description: 'Hatch a Rare (or higher) egg.',
    icon: 'Gem',
    category: 'genetics',
    coinReward: 20,
    opalReward: 2,
    check: s => everHadRarity(s, ['Rare', 'Epic', 'Legendary', 'Mythic']),
  },
  {
    id: 'epic-specimen',
    name: 'Epic Specimen',
    description: 'Hatch an Epic (or higher) egg.',
    icon: 'Diamond',
    category: 'genetics',
    coinReward: 25,
    opalReward: 3,
    check: s => everHadRarity(s, ['Epic', 'Legendary', 'Mythic']),
  },
  {
    id: 'legendary-being',
    name: 'Legendary Being',
    description: 'Hatch a Legendary (or higher) egg.',
    icon: 'Trophy',
    category: 'genetics',
    coinReward: 35,
    opalReward: 4,
    check: s => everHadRarity(s, ['Legendary', 'Mythic']),
  },
  {
    id: 'mythic-creature',
    name: 'Mythic Creature',
    description: 'Hatch a Mythic egg — the rarest of all.',
    icon: 'Flame',
    category: 'genetics',
    coinReward: 40,
    opalReward: 5,
    check: s => everHadRarity(s, ['Mythic']),
  },

  // ─── SOCIAL ─────────────────────────────────────────────────────────────────
  {
    id: 'first-friend',
    name: 'First Friend',
    description: 'Add your first friend.',
    icon: 'Heart',
    category: 'social',
    coinReward: 10,
    check: s => s.friends.length >= 1,
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Add 5 friends.',
    icon: 'Users',
    category: 'social',
    coinReward: 20,
    opalReward: 1,
    check: s => s.friends.length >= 5,
  },
  {
    id: 'gift-giver',
    name: 'Gift Giver',
    description: 'Send 10 gifts to friends.',
    icon: 'Gift',
    category: 'social',
    coinReward: 15,
    check: s => (s.totalGiftsSent ?? 0) >= 10,
  },
  {
    id: 'family-matters',
    name: 'Family Matters',
    description: 'Breed your axolotl with a friend\'s.',
    icon: 'HeartHandshake',
    category: 'social',
    coinReward: 20,
    opalReward: 2,
    check: s => everBredWithFriend(s),
  },

  // ─── DAILY HABITS ───────────────────────────────────────────────────────────
  {
    id: 'lucky-spin',
    name: 'Lucky Spin',
    description: 'Use the Spin Wheel for the first time.',
    icon: 'Dices',
    category: 'daily',
    coinReward: 5,
    check: s => !!s.lastSpinDate,
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day login streak.',
    icon: 'CalendarDays',
    category: 'daily',
    coinReward: 15,
    opalReward: 1,
    check: s => (s.loginStreak ?? 0) >= 7,
  },
  {
    id: 'monthly-devotee',
    name: 'Monthly Devotee',
    description: 'Maintain a 30-day login streak.',
    icon: 'Calendar',
    category: 'daily',
    coinReward: 30,
    opalReward: 2,
    check: s => (s.loginStreak ?? 0) >= 30,
  },
  {
    id: 'legend-of-devotion',
    name: 'Legend of Devotion',
    description: 'Maintain a 100-day login streak.',
    icon: 'Star',
    category: 'daily',
    coinReward: 40,
    opalReward: 5,
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
