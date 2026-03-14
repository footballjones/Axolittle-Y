import type { GameState } from './game';

export type AchievementCategory =
  | 'nurture'
  | 'minigames'
  | 'progression'
  | 'genetics'
  | 'social'
  | 'daily';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: AchievementCategory;
  /** Coins awarded when this achievement is first unlocked (default 0) */
  coinReward?: number;
  /** Opals awarded when this achievement is first unlocked (default 0) */
  opalReward?: number;
  /** Returns true if the achievement condition is met */
  check: (state: GameState) => boolean;
}

export interface AchievementCategoryMeta {
  id: AchievementCategory;
  label: string;
  emoji: string;
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategoryMeta[] = [
  { id: 'nurture',    label: 'Nurture',    emoji: '🌿' },
  { id: 'minigames',  label: 'Mini Games', emoji: '🎮' },
  { id: 'progression',label: 'Progression',emoji: '📈' },
  { id: 'genetics',   label: 'Genetics',   emoji: '🥚' },
  { id: 'social',     label: 'Social',     emoji: '👥' },
  { id: 'daily',      label: 'Daily Habits',emoji: '🎁' },
];
