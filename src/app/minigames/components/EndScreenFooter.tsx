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

interface EndScreenFooterProps {
  gameId: GameId;
  score: number;
  tier: Tier;
  context?: GameContext;
  /** Optional energy-reduced notice. When true, the line "Energy empty —
      rewards reduced. Recharge to earn full XP." is rendered after the
      coaching line. */
  energyReduced?: boolean;
  className?: string;
}

export function EndScreenFooter({
  gameId,
  score,
  tier,
  context,
  energyReduced = false,
  className = '',
}: EndScreenFooterProps) {
  const { tierDelta, coaching } = getEndScreenLines({
    gameId,
    score,
    tier,
    context,
  });

  return (
    <div className={`space-y-2 text-center ${className}`}>
      {tierDelta && (
        <motion.p
          key={tierDelta}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-sm sm:text-base font-semibold text-amber-300 flex items-center justify-center gap-1"
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
        className="text-xs sm:text-sm text-white/70 italic px-2"
      >
        {coaching}
      </motion.p>

      {energyReduced && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="text-xs text-orange-300/80 mt-3"
        >
          ⚡ Energy empty — rewards reduced. Recharge to earn full XP.
        </motion.p>
      )}
    </div>
  );
}
