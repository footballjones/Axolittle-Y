import { motion } from 'motion/react';
import { Sparkles, Dumbbell, Grid3X3, Link2, Lock, Layers, Puzzle } from 'lucide-react';

interface JuvenileUnlockModalProps {
  axolotlName: string;
  onClose: () => void;
}

const SPARKLE_COLORS_J = ['#a78bfa','#f472b6','#34d399','#60a5fa','#fbbf24','#fb923c'];
const SPARKLES_BURST = [
  { angle: 0,   dist: 130 },
  { angle: 40,  dist: 150 },
  { angle: 80,  dist: 125 },
  { angle: 120, dist: 145 },
  { angle: 160, dist: 120 },
  { angle: 200, dist: 148 },
  { angle: 240, dist: 128 },
  { angle: 280, dist: 152 },
  { angle: 320, dist: 118 },
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
              className="absolute select-none"
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0.8, 0], scale: [0, 1.6, 1, 0], x: tx, y: ty }}
              transition={{ duration: 1.4, delay: 0.2 + i * 0.07, ease: 'easeOut' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={SPARKLE_COLORS_J[i % SPARKLE_COLORS_J.length]}>
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
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
            <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
              <span className="text-white/80 text-[10px] font-black uppercase tracking-wide text-center leading-tight px-1">Hatchling</span>
            </div>
            <motion.span
              className="text-white text-2xl"
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            >→</motion.span>
            <div className="w-16 h-16 rounded-2xl bg-white/30 border-2 border-white/60 flex items-center justify-center shadow-xl">
              <span className="text-white text-[10px] font-black uppercase tracking-wide text-center leading-tight px-1">Sprout</span>
            </div>
          </motion.div>

          <motion.p
            className="relative text-white/80 text-[11px] font-black tracking-[0.2em] uppercase mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" strokeWidth={2} /> Evolution!</span>
          </motion.p>
          <motion.h2
            className="relative text-white font-black text-2xl leading-tight drop-shadow-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {axolotlName} is a Sprout!
          </motion.h2>
          <motion.p
            className="relative text-white/80 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Growing up so fast
          </motion.p>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-5 space-y-4">
          {/* Solo games unlock card */}
          <motion.div
            className="rounded-2xl overflow-hidden border-2 border-violet-200 shadow-md"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <div className="bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
              <p className="text-white font-black text-sm">New Solo Games Unlocked!</p>
            </div>
            <div className="bg-violet-50 px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500 flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-slate-800 font-bold text-xs">Axolotl Stacker</p>
                  <p className="text-slate-500 text-[10px]">Stack them high!</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-slate-600 flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-slate-800 font-bold text-xs">Coral Code</p>
                  <p className="text-slate-500 text-[10px]">Crack the code!</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-cyan-500 flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-slate-800 font-bold text-xs">Tide Tiles</p>
                  <p className="text-slate-500 text-[10px]">Merge the tiles!</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-sky-500 flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-slate-800 font-bold text-xs">Bubble Line Up</p>
                  <p className="text-slate-500 text-[10px]">Connect bubbles!</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Multiplayer teaser */}
          <motion.div
            className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center gap-2.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <Lock className="w-5 h-5 text-slate-400 flex-shrink-0" strokeWidth={2} />
            <p className="text-slate-600 text-[11.5px] leading-snug">
              <span className="font-bold">Multiplayer games</span> (Fishing & Bite Tag) unlock at <span className="font-bold">Level 10</span> — keep levelling up!
            </p>
          </motion.div>

          {/* Stat reminder */}
          <motion.div
            className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3 flex items-start gap-2.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.82 }}
          >
            <Dumbbell className="w-5 h-5 text-violet-500 flex-shrink-0" strokeWidth={2} />
            <p className="text-violet-800 text-[11.5px] leading-snug">
              <span className="font-bold">Tip:</span> Play games to earn coins and boost your axolotl's stats. Assign stat points to level up faster!
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
            <span className="relative z-10">Let's Go!</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
