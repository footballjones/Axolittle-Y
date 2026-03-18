import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface JuvenileUnlockModalProps {
  axolotlName: string;
  onClose: () => void;
}

const SPARKLES_BURST = [
  { emoji: '⭐', angle: 0,   dist: 130 },
  { emoji: '✨', angle: 40,  dist: 150 },
  { emoji: '🌟', angle: 80,  dist: 125 },
  { emoji: '💫', angle: 120, dist: 145 },
  { emoji: '⭐', angle: 160, dist: 120 },
  { emoji: '✨', angle: 200, dist: 148 },
  { emoji: '🌟', angle: 240, dist: 128 },
  { emoji: '🎉', angle: 280, dist: 152 },
  { emoji: '🎊', angle: 320, dist: 118 },
];

export function JuvenileUnlockModal({ axolotlName, onClose }: JuvenileUnlockModalProps) {
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />

      {/* Sparkle burst */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {SPARKLES_BURST.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * s.dist;
          const ty = Math.sin(rad) * s.dist;
          return (
            <motion.span
              key={i}
              className="absolute text-2xl select-none"
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0.8, 0], scale: [0, 1.6, 1, 0], x: tx, y: ty }}
              transition={{ duration: 1.4, delay: 0.2 + i * 0.07, ease: 'easeOut' }}
            >
              {s.emoji}
            </motion.span>
          );
        })}
      </div>

      {/* Modal card */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 60 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.05 }}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div
          className="relative px-6 pt-8 pb-6 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #ec4899 100%)' }}
        >
          {/* Dot-grid texture */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
          />

          {/* Stage transition visual */}
          <motion.div
            className="relative flex items-center justify-center gap-4 mb-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-3xl shadow-lg">
                🥚
              </div>
              <span className="text-white/70 text-[10px] font-bold uppercase tracking-wide">Baby</span>
            </div>
            <motion.div
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-white text-2xl">→</span>
            </motion.div>
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className="w-14 h-14 rounded-2xl bg-white/30 border-2 border-white/60 flex items-center justify-center text-3xl shadow-xl"
                animate={{ scale: [1, 1.08, 1], boxShadow: ['0 0 0px rgba(255,255,255,0.3)', '0 0 20px rgba(255,255,255,0.6)', '0 0 0px rgba(255,255,255,0.3)'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                🦎
              </motion.div>
              <span className="text-white text-[10px] font-black uppercase tracking-wide">Juvenile ✨</span>
            </div>
          </motion.div>

          <motion.p
            className="relative text-white/80 text-[11px] font-black tracking-[0.2em] uppercase mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            🎉 Evolution!
          </motion.p>
          <motion.h2
            className="relative text-white font-black text-2xl leading-tight drop-shadow-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {axolotlName} is a Juvenile!
          </motion.h2>
          <motion.p
            className="relative text-white/80 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Growing up so fast 🌱
          </motion.p>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-5 space-y-4">
          {/* Multiplayer unlock card */}
          <motion.div
            className="rounded-2xl overflow-hidden border-2 border-rose-200 shadow-md"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <div className="bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
              <p className="text-white font-black text-sm">Multiplayer Games Unlocked!</p>
            </div>
            <div className="bg-rose-50 px-4 py-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎣</span>
                <div>
                  <p className="text-slate-800 font-bold text-xs">Fishing</p>
                  <p className="text-slate-500 text-[10px]">Catch the most!</p>
                </div>
              </div>
              <div className="w-px h-8 bg-rose-200" />
              <div className="flex items-center gap-2">
                <span className="text-2xl">🦷</span>
                <div>
                  <p className="text-slate-800 font-bold text-xs">Bite Tag</p>
                  <p className="text-slate-500 text-[10px]">Tag other axolotls!</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stat reminder */}
          <motion.div
            className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3 flex items-start gap-2.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <span className="text-lg flex-shrink-0">💪</span>
            <p className="text-violet-800 text-[11.5px] leading-snug">
              <span className="font-bold">Tip:</span> Fishing uses Strength & Speed, Bite-Tag uses Speed & Stamina. Assign your stat points wisely!
            </p>
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            onClick={onClose}
            className="relative w-full py-4 rounded-2xl font-black text-white text-base overflow-hidden shadow-lg"
            whileTap={{ scale: 0.97 }}
            style={{ background: 'linear-gradient(110deg, #8b5cf6 0%, #ec4899 100%)' }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
            />
            <span className="relative z-10">Let's Go! 🎮</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
