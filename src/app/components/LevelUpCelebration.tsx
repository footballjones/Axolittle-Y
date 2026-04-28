/**
 * LevelUpCelebration — full-screen confetti moment when a friendship crosses
 * a level boundary. Bigger animation + unlock callout for threshold levels
 * (3, 5, 7, 10); smaller treatment for incremental levels.
 *
 * Auto-dismisses after ~3.2s, or tap to dismiss immediately.
 */

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Egg, Sparkles, ShoppingBag, Crown } from 'lucide-react';
import { FriendshipRing } from './FriendshipRing';

interface LevelUpCelebrationProps {
  friendName: string;
  newLevel: number;
  totalXp: number;
  onDismiss: () => void;
}

const SPARKLE_COLORS = ['#fde047', '#fbbf24', '#f472b6', '#a78bfa', '#60a5fa', '#34d399'];
const BURST = [
  { angle:   0, dist: 140 }, { angle:  35, dist: 165 }, { angle:  70, dist: 135 },
  { angle: 105, dist: 160 }, { angle: 140, dist: 130 }, { angle: 175, dist: 158 },
  { angle: 210, dist: 138 }, { angle: 245, dist: 162 }, { angle: 280, dist: 128 },
  { angle: 315, dist: 165 }, { angle: 350, dist: 135 },
];

interface ThresholdSpec {
  icon: React.ElementType;
  title: string;
  unlockLabel: string;
}

const THRESHOLDS: Record<number, ThresholdSpec> = {
  3:  { icon: Egg,         title: 'You can hatch together!',  unlockLabel: 'Hatch Together unlocked' },
  5:  { icon: Sparkles,    title: 'Bonded decoration earned!', unlockLabel: 'Bonded Decoration unlocked' },
  7:  { icon: ShoppingBag, title: 'You can trade rare eggs!',  unlockLabel: 'Rare-Egg Trade unlocked' },
  10: { icon: Crown,       title: 'Best friends forever!',     unlockLabel: 'Best Friends unlocked' },
};

const AUTO_DISMISS_MS = 3200;

export function LevelUpCelebration({ friendName, newLevel, totalXp, onDismiss }: LevelUpCelebrationProps) {
  const isThreshold = !!THRESHOLDS[newLevel];
  const threshold = THRESHOLDS[newLevel];
  const Icon = threshold?.icon;

  useEffect(() => {
    const id = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
      onClick={onDismiss}
    >
      {/* Sparkle burst */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {BURST.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * s.dist;
          const ty = Math.sin(rad) * s.dist;
          return (
            <motion.span
              key={i}
              className="absolute select-none"
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0.8, 0], scale: [0, 1.6, 1, 0], x: tx, y: ty }}
              transition={{ duration: 1.6, delay: 0.15 + i * 0.06, ease: 'easeOut' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={SPARKLE_COLORS[i % SPARKLE_COLORS.length]}>
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </motion.span>
          );
        })}
      </div>

      {/* Card */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.05 }}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden text-center"
        style={{
          background: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #831843 100%)',
          border: '1.5px solid rgba(244,114,182,0.45)',
          boxShadow: '0 24px 64px -8px rgba(244,114,182,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
        />

        <div className="relative px-6 pt-7 pb-6 flex flex-col items-center gap-3">
          {/* Ring */}
          <motion.div
            initial={{ scale: 0.5, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.25 }}
          >
            <FriendshipRing level={newLevel} totalXp={totalXp} size={104} strokeWidth={7} />
          </motion.div>

          {/* "Level X" headline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <p className="text-pink-200/80 text-[11px] font-black tracking-[0.25em] uppercase">Friendship Level Up</p>
            <h2 className="text-white font-black text-2xl leading-tight mt-0.5">Level {newLevel}!</h2>
            <p className="text-violet-200/80 text-[13px] font-medium mt-1">with <span className="text-white font-black">{friendName}</span></p>
          </motion.div>

          {/* Threshold callout */}
          {isThreshold && Icon && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="mt-2 w-full rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(244,114,182,0.25), rgba(167,139,250,0.25))',
                border: '1.5px solid rgba(244,114,182,0.5)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
              >
                <Icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-black text-[12px] leading-tight">{threshold.title}</div>
                <div className="text-pink-200/80 text-[10px] font-bold mt-0.5">{threshold.unlockLabel}</div>
              </div>
            </motion.div>
          )}

          {/* Tap-to-dismiss hint */}
          <motion.p
            className="text-white/40 text-[10px] font-medium mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            Tap anywhere to dismiss
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
