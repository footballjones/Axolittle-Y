import { motion } from 'motion/react';
import { Sparkles, Code, Layers, Brain, Users } from 'lucide-react';

interface Level7UnlockModalProps {
  onClose: () => void;
  /** When provided, the modal shows a secondary "Open Social" CTA that opens the
   *  Social modal directly. Used at level 7 to surface friend-add at the same
   *  moment the player unlocks new mini-games — they're already in "I just
   *  unlocked stuff" mode, so it's the right moment to introduce the social
   *  loop. Hidden for under-13 (the host should not pass the prop). */
  onOpenSocial?: () => void;
}

const SPARKLE_COLORS_L7 = ['#60a5fa','#a78bfa','#34d399','#f472b6','#fbbf24','#fb923c'];
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

export function Level7UnlockModal({ onClose, onOpenSocial }: Level7UnlockModalProps) {
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill={SPARKLE_COLORS_L7[i % SPARKLE_COLORS_L7.length]}>
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
          style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)' }}
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

          {/* Level badge */}
          <motion.div
            className="relative flex items-center justify-center mb-4"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="w-20 h-20 rounded-3xl bg-white/20 border-2 border-white/50 flex items-center justify-center shadow-xl">
              <div className="text-center">
                <div className="text-white/70 text-[9px] font-black uppercase tracking-widest">Level</div>
                <div className="text-white font-black text-4xl leading-none">7</div>
              </div>
            </div>
          </motion.div>

          <motion.p
            className="relative text-white/80 text-[11px] font-black tracking-[0.2em] uppercase mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            New Games Unlocked!
          </motion.p>
          <motion.h2
            className="relative text-white font-black text-2xl leading-tight drop-shadow-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            More Games Await!
          </motion.h2>
          <motion.p
            className="relative text-white/80 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Keep leveling up to unlock more
          </motion.p>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-5 space-y-4">
          {/* Games unlock card */}
          <motion.div
            className="rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-md"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
              <p className="text-white font-black text-sm">Solo Games Unlocked!</p>
            </div>
            <div className="bg-indigo-50 px-4 py-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Code className="w-6 h-6 text-indigo-500 flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-slate-800 font-bold text-xs">Coral Code</p>
                  <p className="text-slate-500 text-[10px]">Crack the pattern!</p>
                </div>
              </div>
              <div className="w-px h-8 bg-indigo-200" />
              <div className="flex items-center gap-2">
                <Layers className="w-6 h-6 text-sky-500 flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-slate-800 font-bold text-xs">Axolotl Stacker</p>
                  <p className="text-slate-500 text-[10px]">Stack them high!</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tip */}
          <motion.div
            className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3 flex items-start gap-2.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <Brain className="w-5 h-5 text-sky-500 flex-shrink-0" strokeWidth={2} />
            <p className="text-sky-800 text-[11.5px] leading-snug">
              <span className="font-bold">Tip:</span> Coral Code boosts Intellect, Axolotl Stacker boosts Speed. Play both to grow well-rounded stats!
            </p>
          </motion.div>

          {/* Social unlock card — only shown when onOpenSocial is wired
              (over-13 path). Same shape as the games card so the visual
              hierarchy reads as "two new things just unlocked". */}
          {onOpenSocial && (
            <motion.div
              className="rounded-2xl overflow-hidden border-2 border-pink-200 shadow-md"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-white flex-shrink-0" />
                <p className="text-white font-black text-sm">Add a Friend!</p>
              </div>
              <div className="bg-pink-50/70 px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-pink-200 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-pink-500" strokeWidth={2} />
                </div>
                <p className="text-slate-700 text-[11.5px] leading-snug">
                  Share your code, then visit each other's aquariums to send <span className="font-bold">gifts</span> and leave <span className="font-bold">stickers</span>.
                </p>
              </div>
            </motion.div>
          )}

          {/* CTAs — when onOpenSocial is wired, show two side-by-side buttons
              so "open social" gets equal weight to "let's play". */}
          {onOpenSocial ? (
            <motion.div
              className="grid grid-cols-2 gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <motion.button
                onClick={() => { onOpenSocial(); onClose(); }}
                className="relative py-3.5 rounded-2xl font-black text-pink-700 text-sm overflow-hidden shadow-sm bg-white border-2 border-pink-200"
                whileTap={{ scale: 0.97 }}
              >
                Add a Friend
              </motion.button>
              <motion.button
                onClick={onClose}
                className="relative py-3.5 rounded-2xl font-black text-white text-sm overflow-hidden shadow-lg"
                whileTap={{ scale: 0.97 }}
                style={{ background: 'linear-gradient(110deg, #6366f1 0%, #0ea5e9 100%)' }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
                />
                <span className="relative z-10">Let's Play!</span>
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              onClick={onClose}
              className="relative w-full py-4 rounded-2xl font-black text-white text-base overflow-hidden shadow-lg"
              whileTap={{ scale: 0.97 }}
              style={{ background: 'linear-gradient(110deg, #6366f1 0%, #0ea5e9 100%)' }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
              />
              <span className="relative z-10">Let's Play!</span>
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
