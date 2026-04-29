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
import { ChevronRight, Sparkles, Crown } from 'lucide-react';
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
  /**
   * Player's previous best for this game. When provided, enables PB-aware
   * messaging: "New best!" badge if `score > previousBest`, otherwise an
   * optional "X to beat your best" line in the tier-delta slot.
   */
  previousBest?: number;
  className?: string;
}

const TONE_CLASSES: Record<EndScreenTone, {
  delta: string;
  coaching: string;
  energy: string;
  newBestBg: string;
  newBestText: string;
}> = {
  dark: {
    delta: 'text-amber-300',
    coaching: 'text-white/70',
    energy: 'text-orange-300/80',
    newBestBg: 'bg-gradient-to-r from-amber-400 to-yellow-300',
    newBestText: 'text-amber-950',
  },
  light: {
    delta: 'text-amber-600',
    coaching: 'text-slate-700/85',
    energy: 'text-orange-600/85',
    newBestBg: 'bg-gradient-to-r from-amber-400 to-yellow-300',
    newBestText: 'text-amber-950',
  },
};

export function EndScreenFooter({
  gameId,
  score,
  tier,
  context,
  energyReduced = false,
  tone = 'dark',
  previousBest,
  className = '',
}: EndScreenFooterProps) {
  const { tierDelta, coaching } = getEndScreenLines({
    gameId,
    score,
    tier,
    context,
  });
  const colors = TONE_CLASSES[tone];

  // PB-aware messaging
  const hasPB = previousBest !== undefined;
  const isFirstPlay = hasPB && previousBest === 0;
  const isNewBest = hasPB && !isFirstPlay && score > (previousBest ?? 0);
  const isNearPB = hasPB && !isFirstPlay && !isNewBest && score > 0 && previousBest! - score > 0;

  // When near-miss-to-PB is present, prefer that copy over the tier delta —
  // beating your own record is more motivating than abstract tier progress.
  const showPBDelta = isNearPB && previousBest! - score <= Math.max(50, previousBest! * 0.25);
  const pbDeltaLine = showPBDelta
    ? `${(previousBest! - score).toLocaleString()} to beat your best (${previousBest!.toLocaleString()})`
    : null;

  return (
    <div className={`space-y-2 text-center ${className}`}>
      {/* New best! badge — celebratory pill above everything else */}
      {isNewBest && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.05 }}
          className="flex justify-center"
        >
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs uppercase tracking-wider shadow-lg ${colors.newBestBg} ${colors.newBestText}`}>
            <Crown className="w-3.5 h-3.5" />
            New Best!
            <span className="font-bold normal-case tracking-normal">
              · was {(previousBest ?? 0).toLocaleString()}
            </span>
          </div>
        </motion.div>
      )}

      {/* Prefer "X to beat your best" when within 25% of PB; else show tier delta */}
      {pbDeltaLine ? (
        <motion.p
          key={pbDeltaLine}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className={`text-sm sm:text-base font-semibold flex items-center justify-center gap-1 ${colors.delta}`}
        >
          <ChevronRight className="w-4 h-4" />
          {pbDeltaLine}
        </motion.p>
      ) : tierDelta && !isNewBest && (
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
