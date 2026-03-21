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
  icon: string;
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
  icon: string;
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategoryMeta[] = [
  { id: 'nurture',    label: 'Nurture',     icon: 'Leaf'     },
  { id: 'minigames',  label: 'Mini Games',  icon: 'Gamepad2' },
  { id: 'progression',label: 'Progression', icon: 'TrendingUp' },
  { id: 'genetics',   label: 'Genetics',    icon: 'Egg'      },
  { id: 'social',     label: 'Social',      icon: 'Users'    },
  { id: 'daily',      label: 'Daily Habits',icon: 'Gift'     },
];
