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

// Helper: highest generation ever raised
function maxGenerationEver(state: GameState): number {
  const cur = state.axolotl?.generation ?? 0;
  const lineageMax = state.lineage.reduce((m, a) => Math.max(m, a.generation), 0);
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

  // Series: Fed With Love — feeding milestones (5 steps, 1 tile)
  {
    id: 'first-meal',
    name: 'Fed With Love',
    description: 'Feed your axolotl for the first time.',
    icon: 'Utensils',
    category: 'nurture',
    coinReward: 5,
    seriesId: 'feeding',
    check: s => (s.totalFeedsEver ?? 0) >= 1,
  },
  {
    id: 'feeding-25',
    name: 'Fed With Love',
    description: 'Feed your axolotl 25 times.',
    icon: 'Utensils',
    category: 'nurture',
    coinReward: 15,
    seriesId: 'feeding',
    check: s => (s.totalFeedsEver ?? 0) >= 25,
  },
  {
    id: 'devoted-feeder',
    name: 'Fed With Love',
    description: 'Feed your axolotl 100 times.',
    icon: 'Utensils',
    category: 'nurture',
    coinReward: 30,
    seriesId: 'feeding',
    check: s => (s.totalFeedsEver ?? 0) >= 100,
  },
  {
    id: 'feeding-500',
    name: 'Fed With Love',
    description: 'Feed your axolotl 500 times.',
    icon: 'Utensils',
    category: 'nurture',
    coinReward: 75,
    seriesId: 'feeding',
    check: s => (s.totalFeedsEver ?? 0) >= 500,
  },
  {
    id: 'feeding-1000',
    name: 'Fed With Love',
    description: 'Feed your axolotl 1,000 times.',
    icon: 'Utensils',
    category: 'nurture',
    opalReward: 10,
    seriesId: 'feeding',
    check: s => (s.totalFeedsEver ?? 0) >= 1000,
  },

  // Series: Squeaky Clean — cleaning milestones (4 steps, 1 tile)
  {
    id: 'first-clean',
    name: 'Squeaky Clean',
    description: 'Clean up your first poop item.',
    icon: 'Sparkles',
    category: 'nurture',
    coinReward: 5,
    seriesId: 'cleaning',
    check: s => (s.totalCleansEver ?? 0) >= 1,
  },
  {
    id: 'spotless-tank',
    name: 'Squeaky Clean',
    description: 'Clean up 50 poop items.',
    icon: 'Sparkles',
    category: 'nurture',
    coinReward: 15,
    seriesId: 'cleaning',
    check: s => (s.totalCleansEver ?? 0) >= 50,
  },
  {
    id: 'cleaning-200',
    name: 'Squeaky Clean',
    description: 'Clean up 200 poop items.',
    icon: 'Sparkles',
    category: 'nurture',
    coinReward: 35,
    seriesId: 'cleaning',
    check: s => (s.totalCleansEver ?? 0) >= 200,
  },
  {
    id: 'cleaning-500',
    name: 'Squeaky Clean',
    description: 'Clean up 500 poop items.',
    icon: 'Sparkles',
    category: 'nurture',
    opalReward: 5,
    seriesId: 'cleaning',
    check: s => (s.totalCleansEver ?? 0) >= 500,
  },

  // Series: Water Master — water change milestones (4 steps, 1 tile)
  {
    id: 'water-first',
    name: 'Water Master',
    description: 'Change the aquarium water for the first time.',
    icon: 'Droplets',
    category: 'nurture',
    coinReward: 10,
    seriesId: 'water-changes',
    check: s => (s.totalWaterChanges ?? 0) >= 1,
  },
  {
    id: 'water-whisperer',
    name: 'Water Master',
    description: 'Change the water 20 times.',
    icon: 'Droplets',
    category: 'nurture',
    coinReward: 20,
    seriesId: 'water-changes',
    check: s => (s.totalWaterChanges ?? 0) >= 20,
  },
  {
    id: 'water-75',
    name: 'Water Master',
    description: 'Change the water 75 times.',
    icon: 'Droplets',
    category: 'nurture',
    coinReward: 50,
    seriesId: 'water-changes',
    check: s => (s.totalWaterChanges ?? 0) >= 75,
  },
  {
    id: 'water-200',
    name: 'Water Master',
    description: 'Change the water 200 times.',
    icon: 'Droplets',
    category: 'nurture',
    opalReward: 5,
    seriesId: 'water-changes',
    check: s => (s.totalWaterChanges ?? 0) >= 200,
  },

  // Standalone: Premium Care
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

  // Series: Game Time — games played milestones (6 steps, 1 tile)
  {
    id: 'game-on',
    name: 'Game Time',
    description: 'Play your first mini game.',
    icon: 'Gamepad2',
    category: 'minigames',
    coinReward: 10,
    seriesId: 'games-played',
    check: s => (s.totalMinigamesPlayed ?? 0) >= 1,
  },
  {
    id: 'games-25',
    name: 'Game Time',
    description: 'Play 25 mini games.',
    icon: 'Gamepad2',
    category: 'minigames',
    coinReward: 20,
    seriesId: 'games-played',
    check: s => (s.totalMinigamesPlayed ?? 0) >= 25,
  },
  {
    id: 'dedicated-gamer',
    name: 'Game Time',
    description: 'Play 50 mini games.',
    icon: 'Gamepad2',
    category: 'minigames',
    coinReward: 25,
    seriesId: 'games-played',
    check: s => (s.totalMinigamesPlayed ?? 0) >= 50,
  },
  {
    id: 'veteran-gamer',
    name: 'Game Time',
    description: 'Play 100 mini games.',
    icon: 'Gamepad2',
    category: 'minigames',
    coinReward: 40,
    opalReward: 2,
    seriesId: 'games-played',
    check: s => (s.totalMinigamesPlayed ?? 0) >= 100,
  },
  {
    id: 'games-250',
    name: 'Game Time',
    description: 'Play 250 mini games.',
    icon: 'Gamepad2',
    category: 'minigames',
    opalReward: 5,
    seriesId: 'games-played',
    check: s => (s.totalMinigamesPlayed ?? 0) >= 250,
  },
  {
    id: 'games-500',
    name: 'Game Time',
    description: 'Play 500 mini games.',
    icon: 'Gamepad2',
    category: 'minigames',
    opalReward: 15,
    seriesId: 'games-played',
    check: s => (s.totalMinigamesPlayed ?? 0) >= 500,
  },

  // Series: Exceptional — high score milestones (4 steps, 1 tile)
  {
    id: 'exceptional-5',
    name: 'Exceptional',
    description: 'Achieve 5 exceptional scores.',
    icon: 'Star',
    category: 'minigames',
    coinReward: 15,
    seriesId: 'exceptional-scores',
    check: s => (s.totalExceptionalScores ?? 0) >= 5,
  },
  {
    id: 'exceptional-player',
    name: 'Exceptional',
    description: 'Achieve 10 exceptional scores.',
    icon: 'Star',
    category: 'minigames',
    coinReward: 30,
    opalReward: 3,
    seriesId: 'exceptional-scores',
    check: s => (s.totalExceptionalScores ?? 0) >= 10,
  },
  {
    id: 'exceptional-25',
    name: 'Exceptional',
    description: 'Achieve 25 exceptional scores.',
    icon: 'Star',
    category: 'minigames',
    opalReward: 5,
    seriesId: 'exceptional-scores',
    check: s => (s.totalExceptionalScores ?? 0) >= 25,
  },
  {
    id: 'exceptional-50',
    name: 'Exceptional',
    description: 'Achieve 50 exceptional scores.',
    icon: 'Star',
    category: 'minigames',
    opalReward: 15,
    seriesId: 'exceptional-scores',
    check: s => (s.totalExceptionalScores ?? 0) >= 50,
  },

  // Standalone: All-Rounder
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

  // Series: Level Up! — level milestones (6 steps, 1 tile) — claim-gated
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

  // Series: Growing Up — life stage milestones (3 steps, 1 tile)
  {
    id: 'first-steps',
    name: 'Growing Up',
    description: 'Your axolotl reaches the Sprout stage.',
    icon: 'Sprout',
    category: 'progression',
    coinReward: 10,
    seriesId: 'life-stages',
    check: s => {
      if (s.axolotl && ['sprout', 'guardian', 'elder'].includes(s.axolotl.stage)) return true;
      return s.lineage.some(a => ['sprout', 'guardian', 'elder'].includes(a.stage));
    },
  },
  {
    id: 'all-grown-up',
    name: 'Growing Up',
    description: 'Your axolotl reaches the Guardian stage.',
    icon: 'Sprout',
    category: 'progression',
    coinReward: 20,
    seriesId: 'life-stages',
    check: s => {
      if (s.axolotl && ['guardian', 'elder'].includes(s.axolotl.stage)) return true;
      return s.lineage.some(a => ['guardian', 'elder'].includes(a.stage));
    },
  },
  {
    id: 'elder-wisdom',
    name: 'Growing Up',
    description: 'Your axolotl reaches the Elder stage.',
    icon: 'Sprout',
    category: 'progression',
    coinReward: 30,
    opalReward: 2,
    seriesId: 'life-stages',
    check: s => {
      if (s.axolotl?.stage === 'elder') return true;
      return s.lineage.some(a => a.stage === 'elder');
    },
  },

  // Series: Reborn — rebirth milestones (4 steps, 1 tile)
  {
    id: 'circle-of-life',
    name: 'Reborn',
    description: 'Complete your first Rebirth.',
    icon: 'RefreshCw',
    category: 'progression',
    coinReward: 20,
    opalReward: 1,
    seriesId: 'rebirths',
    check: s => s.lineage.length >= 1,
  },
  {
    id: 'rebirths-3',
    name: 'Reborn',
    description: 'Complete 3 Rebirths.',
    icon: 'RefreshCw',
    category: 'progression',
    coinReward: 40,
    opalReward: 2,
    seriesId: 'rebirths',
    check: s => s.lineage.length >= 3,
  },
  {
    id: 'rebirths-7',
    name: 'Reborn',
    description: 'Complete 7 Rebirths.',
    icon: 'RefreshCw',
    category: 'progression',
    opalReward: 5,
    seriesId: 'rebirths',
    check: s => s.lineage.length >= 7,
  },
  {
    id: 'rebirths-15',
    name: 'Reborn',
    description: 'Complete 15 Rebirths.',
    icon: 'RefreshCw',
    category: 'progression',
    opalReward: 15,
    seriesId: 'rebirths',
    check: s => s.lineage.length >= 15,
  },

  // Series: Dynasty — generation milestones (4 steps, 1 tile)
  {
    id: 'gen-2',
    name: 'Dynasty',
    description: 'Raise a Generation 2 axolotl.',
    icon: 'Crown',
    category: 'progression',
    coinReward: 15,
    seriesId: 'generations',
    check: s => maxGenerationEver(s) >= 2,
  },
  {
    id: 'dynasty',
    name: 'Dynasty',
    description: 'Raise a Generation 5 axolotl.',
    icon: 'Crown',
    category: 'progression',
    coinReward: 35,
    opalReward: 3,
    seriesId: 'generations',
    check: s => maxGenerationEver(s) >= 5,
  },
  {
    id: 'gen-10',
    name: 'Dynasty',
    description: 'Raise a Generation 10 axolotl.',
    icon: 'Crown',
    category: 'progression',
    opalReward: 5,
    seriesId: 'generations',
    check: s => maxGenerationEver(s) >= 10,
  },
  {
    id: 'gen-20',
    name: 'Dynasty',
    description: 'Raise a Generation 20 axolotl.',
    icon: 'Crown',
    category: 'progression',
    opalReward: 20,
    seriesId: 'generations',
    check: s => maxGenerationEver(s) >= 20,
  },

  // ─── GENETICS ───────────────────────────────────────────────────────────────

  // Series: Egg Collector — eggs hatched milestones (4 steps, 1 tile)
  {
    id: 'hatchling',
    name: 'Egg Collector',
    description: 'Hatch your first egg.',
    icon: 'Egg',
    category: 'genetics',
    coinReward: 10,
    seriesId: 'egg-hatching',
    check: s => (s.totalEggsHatched ?? 0) >= 1,
  },
  {
    id: 'eggs-5',
    name: 'Egg Collector',
    description: 'Hatch 5 eggs.',
    icon: 'Egg',
    category: 'genetics',
    coinReward: 25,
    seriesId: 'egg-hatching',
    check: s => (s.totalEggsHatched ?? 0) >= 5,
  },
  {
    id: 'eggs-25',
    name: 'Egg Collector',
    description: 'Hatch 25 eggs.',
    icon: 'Egg',
    category: 'genetics',
    opalReward: 3,
    seriesId: 'egg-hatching',
    check: s => (s.totalEggsHatched ?? 0) >= 25,
  },
  {
    id: 'eggs-100',
    name: 'Egg Collector',
    description: 'Hatch 100 eggs.',
    icon: 'Egg',
    category: 'genetics',
    opalReward: 15,
    seriesId: 'egg-hatching',
    check: s => (s.totalEggsHatched ?? 0) >= 100,
  },

  // Series: Rarity Hunter — rarity milestones (4 steps, 1 tile)
  {
    id: 'rare-find',
    name: 'Rarity Hunter',
    description: 'Hatch a Rare or higher egg.',
    icon: 'Gem',
    category: 'genetics',
    coinReward: 20,
    opalReward: 2,
    seriesId: 'rarity-hunter',
    check: s => everHadRarity(s, ['Rare', 'Epic', 'Legendary', 'Mythic']),
  },
  {
    id: 'epic-specimen',
    name: 'Rarity Hunter',
    description: 'Hatch an Epic or higher egg.',
    icon: 'Gem',
    category: 'genetics',
    coinReward: 25,
    opalReward: 3,
    seriesId: 'rarity-hunter',
    check: s => everHadRarity(s, ['Epic', 'Legendary', 'Mythic']),
  },
  {
    id: 'legendary-being',
    name: 'Rarity Hunter',
    description: 'Hatch a Legendary or higher egg.',
    icon: 'Gem',
    category: 'genetics',
    coinReward: 35,
    opalReward: 4,
    seriesId: 'rarity-hunter',
    check: s => everHadRarity(s, ['Legendary', 'Mythic']),
  },
  {
    id: 'mythic-creature',
    name: 'Rarity Hunter',
    description: 'Hatch a Mythic egg — the rarest of all.',
    icon: 'Gem',
    category: 'genetics',
    coinReward: 50,
    opalReward: 10,
    seriesId: 'rarity-hunter',
    check: s => everHadRarity(s, ['Mythic']),
  },

  // ─── SOCIAL ─────────────────────────────────────────────────────────────────

  // Series: Making Friends — friend count milestones (4 steps, 1 tile)
  {
    id: 'first-friend',
    name: 'Making Friends',
    description: 'Add your first friend.',
    icon: 'Heart',
    category: 'social',
    coinReward: 10,
    seriesId: 'friendships',
    check: s => s.friends.filter(f => f.id !== 'jimmy-chubs').length >= 1,
  },
  {
    id: 'friends-3',
    name: 'Making Friends',
    description: 'Add 3 friends.',
    icon: 'Heart',
    category: 'social',
    coinReward: 20,
    seriesId: 'friendships',
    check: s => s.friends.filter(f => f.id !== 'jimmy-chubs').length >= 3,
  },
  {
    id: 'social-butterfly',
    name: 'Making Friends',
    description: 'Add 5 friends.',
    icon: 'Heart',
    category: 'social',
    coinReward: 20,
    opalReward: 1,
    seriesId: 'friendships',
    check: s => s.friends.filter(f => f.id !== 'jimmy-chubs').length >= 5,
  },
  {
    id: 'friends-10',
    name: 'Making Friends',
    description: 'Add 10 friends.',
    icon: 'Heart',
    category: 'social',
    opalReward: 5,
    seriesId: 'friendships',
    check: s => s.friends.filter(f => f.id !== 'jimmy-chubs').length >= 10,
  },

  // Series: Generous — gifts sent milestones (4 steps, 1 tile)
  {
    id: 'gift-first',
    name: 'Generous',
    description: 'Send your first gift to a friend.',
    icon: 'Gift',
    category: 'social',
    coinReward: 5,
    seriesId: 'gifting',
    check: s => (s.totalGiftsSent ?? 0) >= 1,
  },
  {
    id: 'gift-giver',
    name: 'Generous',
    description: 'Send 10 gifts to friends.',
    icon: 'Gift',
    category: 'social',
    coinReward: 15,
    seriesId: 'gifting',
    check: s => (s.totalGiftsSent ?? 0) >= 10,
  },
  {
    id: 'gifts-50',
    name: 'Generous',
    description: 'Send 50 gifts to friends.',
    icon: 'Gift',
    category: 'social',
    coinReward: 30,
    opalReward: 2,
    seriesId: 'gifting',
    check: s => (s.totalGiftsSent ?? 0) >= 50,
  },
  {
    id: 'gifts-200',
    name: 'Generous',
    description: 'Send 200 gifts to friends.',
    icon: 'Gift',
    category: 'social',
    opalReward: 10,
    seriesId: 'gifting',
    check: s => (s.totalGiftsSent ?? 0) >= 200,
  },

  // Standalone: Family Matters
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

  // Standalone: Lucky Spin
  {
    id: 'lucky-spin',
    name: 'Lucky Spin',
    description: 'Use the Spin Wheel for the first time.',
    icon: 'Dices',
    category: 'daily',
    coinReward: 5,
    check: s => !!s.lastSpinDate,
  },

  // Series: Daily Streak — login streak milestones (5 steps, 1 tile)
  {
    id: 'streak-3',
    name: 'Daily Streak',
    description: 'Log in 3 days in a row.',
    icon: 'CalendarDays',
    category: 'daily',
    coinReward: 10,
    seriesId: 'login-streak',
    check: s => (s.loginStreak ?? 0) >= 3,
  },
  {
    id: 'week-warrior',
    name: 'Daily Streak',
    description: 'Log in 7 days in a row.',
    icon: 'CalendarDays',
    category: 'daily',
    coinReward: 15,
    opalReward: 1,
    seriesId: 'login-streak',
    check: s => (s.loginStreak ?? 0) >= 7,
  },
  {
    id: 'monthly-devotee',
    name: 'Daily Streak',
    description: 'Log in 30 days in a row.',
    icon: 'CalendarDays',
    category: 'daily',
    coinReward: 30,
    opalReward: 2,
    seriesId: 'login-streak',
    check: s => (s.loginStreak ?? 0) >= 30,
  },
  {
    id: 'legend-of-devotion',
    name: 'Daily Streak',
    description: 'Log in 100 days in a row.',
    icon: 'CalendarDays',
    category: 'daily',
    coinReward: 40,
    opalReward: 5,
    seriesId: 'login-streak',
    check: s => (s.loginStreak ?? 0) >= 100,
  },
  {
    id: 'streak-365',
    name: 'Daily Streak',
    description: 'Log in 365 days in a row.',
    icon: 'CalendarDays',
    category: 'daily',
    opalReward: 50,
    seriesId: 'login-streak',
    check: s => (s.loginStreak ?? 0) >= 365,
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
