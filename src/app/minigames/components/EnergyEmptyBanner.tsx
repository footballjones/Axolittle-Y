/**
 * EnergyEmptyBanner — start-overlay warning rendered when energy < 1.
 *
 * Tells the player upfront that this run will earn reduced rewards rather
 * than letting them learn it after the session is over (which the
 * psychologist flagged as a trust-eroding "stingy" lesson).
 *
 * Drop into each minigame's start overlay above the Start button. Two tones
 * to match the host overlay's palette.
 */

import { motion } from 'motion/react';
import { Zap } from 'lucide-react';

export type EnergyBannerTone = 'light' | 'dark';

interface EnergyEmptyBannerProps {
  /** Render only when this is true; component returns null otherwise. */
  visible: boolean;
  /** Match the host overlay's palette. Defaults to 'dark'. */
  tone?: EnergyBannerTone;
  /** Coin multiplier in effect (default 0.25). Used in copy. */
  multiplier?: number;
}

const TONE_CLASSES: Record<EnergyBannerTone, {
  wrapper: string;
  icon: string;
  title: string;
  body: string;
}> = {
  dark: {
    wrapper: 'bg-orange-500/15 border-orange-400/30',
    icon: 'text-orange-300',
    title: 'text-orange-200',
    body: 'text-orange-100/80',
  },
  light: {
    wrapper: 'bg-orange-100 border-orange-300',
    icon: 'text-orange-600',
    title: 'text-orange-900',
    body: 'text-orange-800/85',
  },
};

export function EnergyEmptyBanner({
  visible,
  tone = 'dark',
  multiplier = 0.25,
}: EnergyEmptyBannerProps) {
  if (!visible) return null;
  const c = TONE_CLASSES[tone];
  const coinPct = Math.round(multiplier * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-xl border px-3 py-2 mb-3 flex items-start gap-2 ${c.wrapper}`}
    >
      <Zap className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.icon}`} />
      <div className="text-left">
        <p className={`text-xs font-bold ${c.title}`}>Energy empty</p>
        <p className={`text-[11px] leading-snug ${c.body}`}>
          You can play, but you'll earn {coinPct}% coins and no XP. Recharge to earn full rewards.
        </p>
      </div>
    </motion.div>
  );
}
