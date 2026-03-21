/**
 * LevelUpOverlay — full-screen celebration when the axolotl levels up.
 * Shows the new level with fanfare, then offers an "Assign Stat Point" CTA
 * or a "Later" dismiss. Auto-dismisses after 5 seconds.
 */

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Zap, Egg as EggIcon } from 'lucide-react';

interface LevelUpOverlayProps {
  level: number;
  onAssignStat: () => void;
  onDismiss: () => void;
}

// Sparkle burst definitions — angle (degrees) + distance (px from centre)
// Colors cycle through warm/cool hues for variety
const SPARKLE_COLORS = ['#fbbf24','#f472b6','#a78bfa','#34d399','#60a5fa','#fb923c'];
const SPARKLES = [
  { angle: 0,   dist: 115 },
  { angle: 30,  dist: 140 },
  { angle: 60,  dist: 118 },
  { angle: 90,  dist: 142 },
  { angle: 120, dist: 112 },
  { angle: 150, dist: 138 },
  { angle: 180, dist: 116 },
  { angle: 210, dist: 145 },
  { angle: 240, dist: 110 },
  { angle: 270, dist: 148 },
  { angle: 300, dist: 122 },
  { angle: 330, dist: 140 },
];

export function LevelUpOverlay({ level, onAssignStat, onDismiss }: LevelUpOverlayProps) {
  // Keep stable refs so the auto-dismiss timer never re-fires due to prop changes
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Auto-dismiss after 5 s
  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), 5000);
    return () => clearTimeout(timer);
  }, []); // intentionally empty — fires once on mount

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Dark blurred backdrop — clicking it dismisses */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
        onClick={onDismiss}
      />

      {/* Orbiting sparkle burst — centered on the card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {SPARKLES.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * s.dist;
          const ty = Math.sin(rad) * s.dist;
          return (
            <motion.span
              key={i}
              className="absolute select-none"
              style={{ originX: '50%', originY: '50%' }}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0.9, 0],
                scale:   [0, 1.5, 1,   0],
                x: tx,
                y: ty,
              }}
              transition={{
                duration: 1.3,
                delay: 0.25 + i * 0.055,
                ease: 'easeOut',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={SPARKLE_COLORS[i % SPARKLE_COLORS.length]}>
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </motion.span>
          );
        })}
      </div>

      {/* Main celebration card */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: 60 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.75, opacity: 0, y: -30 }}
        transition={{ type: 'spring', stiffness: 290, damping: 22, delay: 0.08 }}
        className="relative text-center px-8 py-10 rounded-3xl mx-5 w-full max-w-xs"
        style={{
          background: 'linear-gradient(140deg, #fbbf24 0%, #f97316 52%, #ef4444 100%)',
          boxShadow: '0 0 90px rgba(251,191,36,0.55), 0 28px 56px rgba(0,0,0,0.55)',
          border: '2px solid rgba(255,255,255,0.38)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Shimmer sweep across the card */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <motion.div
            className="absolute inset-y-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '220%'] }}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
            style={{ width: '50%' }}
          />
        </div>

        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 rounded-3xl opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* "Level Up!" label */}
        <motion.p
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="relative text-white/90 font-black text-[11px] tracking-[0.22em] uppercase mb-1"
        >
          <span className="inline-flex items-center gap-1"><Zap className="w-3 h-3 text-white/90" strokeWidth={2.5} /> Level Up!</span>
        </motion.p>

        {/* Big level number */}
        <motion.div
          initial={{ scale: 0.15, rotate: -18 }}
          animate={{ scale: [0.15, 1.4, 1], rotate: [18, -7, 0] }}
          transition={{ delay: 0.38, duration: 0.68, type: 'spring', stiffness: 360, damping: 17 }}
          className="relative text-white font-black leading-none mb-1"
          style={{ fontSize: '6.5rem', textShadow: '0 6px 28px rgba(0,0,0,0.38)' }}
        >
          {level}
        </motion.div>

        {/* Flavour text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.72 }}
          className="relative text-white/90 font-semibold text-[15px] mb-3"
        >
          Your axolotl is growing stronger!
        </motion.p>

        {/* Rarity hint */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.88 }}
          className="relative flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl mb-5"
          style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <EggIcon className="w-4 h-4 text-white/80 flex-shrink-0" strokeWidth={2} />
          <p className="text-white/90 text-[11.5px] font-semibold leading-snug">
            Stronger stats = rarer eggs when you rebirth!
          </p>
        </motion.div>

        {/* Primary CTA — assign stat */}
        <motion.button
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.82 }}
          onClick={onAssignStat}
          className="relative w-full py-4 rounded-2xl font-black text-[15px] bg-white text-amber-600 mb-3"
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.025 }}
          style={{ boxShadow: '0 10px 28px rgba(0,0,0,0.28)' }}
        >
          <span className="inline-flex items-center gap-1.5"><Zap className="w-4 h-4" strokeWidth={2.5} /> Assign Stat Point</span>
        </motion.button>

        {/* Dismiss — secondary */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05 }}
          onClick={onDismiss}
          className="relative text-white/70 font-semibold text-sm hover:text-white/95 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          I'll do it later
        </motion.button>
      </motion.div>
    </div>
  );
}
