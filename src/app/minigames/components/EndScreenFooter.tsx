/**
 * EndScreenFooter — drop-in tier-delta + coaching block for any minigame's
 * end overlay.
 *
 * Renders two lines underneath whatever score display the game already shows:
 *   1. Tier delta: "4 more blocks for Exceptional!"  (or "Exceptional run!" at top tier)
 *   2. Coaching line: specific praise or guidance about how to play next time
 *
 * Score itself is rendered by the calling game — each one formats it differently
 * (seconds, height, kg, X/10 guesses, etc.), so we don't try to standardize it here.
 *
 * Designed to drop into existing overlay layouts without further restyling. Pass
 * an optional className if a specific game needs to override spacing.
 */

import { motion } from 'motion/react';
import { ChevronRight, Sparkles } from 'lucide-react';
import {
  getEndScreenLines,
  type GameId,
  type Tier,
  type GameContext,
} from '../endScreenCopy';

/**
 * Tone matches the host game's end-overlay background.
 *  - 'dark'  — overlay is a dark gradient/blue (BubbleLineUp, TideTiles, BiteTag, Fishing)
 *  - 'light' — overlay is a light pastel (KeepeyUpey, AxolotlStacker)
 */
export type EndScreenTone = 'dark' | 'light';

interface EndScreenFooterProps {
  gameId: GameId;
  score: number;
  tier: Tier;
  context?: GameContext;
  /** Optional energy-reduced notice. When true, the line "Energy empty —
      rewards reduced. Recharge to earn full XP." is rendered after the
      coaching line. */
  energyReduced?: boolean;
  /** Defaults to 'dark'. Switch to 'light' on pastel/bright overlays. */
  tone?: EndScreenTone;
  className?: string;
}

const TONE_CLASSES: Record<EndScreenTone, {
  delta: string;
  coaching: string;
  energy: string;
}> = {
  dark: {
    delta: 'text-amber-300',
    coaching: 'text-white/70',
    energy: 'text-orange-300/80',
  },
  light: {
    delta: 'text-amber-600',
    coaching: 'text-slate-700/85',
    energy: 'text-orange-600/85',
  },
};

export function EndScreenFooter({
  gameId,
  score,
  tier,
  context,
  energyReduced = false,
  tone = 'dark',
  className = '',
}: EndScreenFooterProps) {
  const { tierDelta, coaching } = getEndScreenLines({
    gameId,
    score,
    tier,
    context,
  });
  const colors = TONE_CLASSES[tone];

  return (
    <div className={`space-y-2 text-center ${className}`}>
      {tierDelta && (
        <motion.p
          key={tierDelta}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className={`text-sm sm:text-base font-semibold flex items-center justify-center gap-1 ${colors.delta}`}
        >
          {tier === 'exceptional' ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          {tierDelta}
        </motion.p>
      )}

      <motion.p
        key={coaching}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className={`text-xs sm:text-sm italic px-2 ${colors.coaching}`}
      >
        {coaching}
      </motion.p>

      {energyReduced && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className={`text-xs mt-3 ${colors.energy}`}
        >
          ⚡ Energy empty — rewards reduced. Recharge to earn full XP.
        </motion.p>
      )}
    </div>
  );
}
