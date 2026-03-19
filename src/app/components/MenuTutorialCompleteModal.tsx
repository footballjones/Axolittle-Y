/**
 * Menu Tutorial Complete Modal — awards 10 opals after completing the menu walkthrough.
 */
import { motion } from 'motion/react';

interface MenuTutorialCompleteModalProps {
  onCollect: () => void;
}

const SPARKLES = [
  { emoji: '⭐', angle: 0,   dist: 110 },
  { emoji: '✨', angle: 45,  dist: 130 },
  { emoji: '🌟', angle: 90,  dist: 105 },
  { emoji: '💫', angle: 135, dist: 125 },
  { emoji: '⭐', angle: 180, dist: 115 },
  { emoji: '✨', angle: 225, dist: 135 },
  { emoji: '🌟', angle: 270, dist: 108 },
  { emoji: '💫', angle: 315, dist: 128 },
];

export function MenuTutorialCompleteModal({ onCollect }: MenuTutorialCompleteModalProps) {
  return (
    <div className="fixed inset-0 z-[10004] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
      />

      {/* Sparkle burst */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {SPARKLES.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * s.dist;
          const ty = Math.sin(rad) * s.dist;
          return (
            <motion.span
              key={i}
              className="absolute text-xl select-none"
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0.8, 0], scale: [0, 1.4, 1, 0], x: tx, y: ty }}
              transition={{ duration: 1.3, delay: 0.2 + i * 0.06, ease: 'easeOut' }}
            >
              {s.emoji}
            </motion.span>
          );
        })}
      </div>

      {/* Card */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.05 }}
        className="relative w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div
          className="relative px-6 pt-7 pb-5 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #0ea5e9 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
          />

          <motion.div
            className="relative text-4xl mb-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
            transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
          >
            📚
          </motion.div>

          <motion.p
            className="relative text-white/80 text-[11px] font-black tracking-[0.2em] uppercase mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Menu Mastered!
          </motion.p>
          <motion.h2
            className="relative text-white font-black text-xl leading-tight drop-shadow-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            You know your way around!
          </motion.h2>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-5 space-y-4">
          {/* Reward card */}
          <motion.div
            className="rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-md"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div
              className="px-4 py-3 flex items-center justify-center gap-3"
              style={{ background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)' }}
            >
              <motion.span
                className="text-3xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                💎
              </motion.span>
              <div>
                <p className="text-indigo-900 font-black text-lg leading-none">+10 Opals</p>
                <p className="text-indigo-500 text-[10px] font-medium mt-0.5">Tutorial reward</p>
              </div>
              <motion.span
                className="text-3xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              >
                💎
              </motion.span>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            onClick={onCollect}
            className="relative w-full py-3.5 rounded-2xl font-black text-white text-base overflow-hidden shadow-lg"
            whileTap={{ scale: 0.97 }}
            style={{ background: 'linear-gradient(110deg, #6366f1 0%, #0ea5e9 100%)' }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
            />
            <span className="relative z-10">Collect Reward! 💎</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
