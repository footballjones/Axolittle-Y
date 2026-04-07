import { motion } from 'motion/react';
import { Droplets, ShoppingCart, RefreshCw } from 'lucide-react';

// ─── Intro Modal ─────────────────────────────────────────────────────────────
// Shown when the player first reaches level 11 and enters the aquarium.
// Grants 10 opals and points them to the shop.

interface ShrimpTutorialIntroProps {
  onOpenShop: () => void;
}

const SPARKLE_COLORS = ['#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fbbf24'];
const BURST = [
  { angle: 15,  dist: 120 },
  { angle: 60,  dist: 140 },
  { angle: 105, dist: 118 },
  { angle: 150, dist: 135 },
  { angle: 195, dist: 125 },
  { angle: 240, dist: 142 },
  { angle: 285, dist: 116 },
  { angle: 330, dist: 138 },
];

export function ShrimpTutorialIntroModal({ onOpenShop }: ShrimpTutorialIntroProps) {
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
      />

      {/* Sparkle burst */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {BURST.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * s.dist;
          const ty = Math.sin(rad) * s.dist;
          return (
            <motion.span
              key={i}
              className="absolute"
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0.7, 0], scale: [0, 1.5, 1, 0], x: tx, y: ty }}
              transition={{ duration: 1.3, delay: 0.15 + i * 0.07, ease: 'easeOut' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={SPARKLE_COLORS[i % SPARKLE_COLORS.length]}>
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </motion.span>
          );
        })}
      </div>

      {/* Card */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 60 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.05 }}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-6 pt-8 pb-6 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #0891b2 50%, #6366f1 100%)' }}
        >
          {/* Dot-grid texture */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
          />

          {/* Icon badge */}
          <motion.div
            className="relative flex items-center justify-center mb-4"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="w-20 h-20 rounded-3xl bg-white/20 border-2 border-white/50 flex items-center justify-center shadow-xl">
              <Droplets className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
          </motion.div>

          <motion.p
            className="relative text-white/80 text-[10px] font-black tracking-[0.2em] uppercase mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            Level 11 Unlocked
          </motion.p>
          <motion.h2
            className="relative text-white font-black text-2xl leading-tight drop-shadow-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Ghost Shrimp!
          </motion.h2>
          <motion.p
            className="relative text-white/80 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Your tank is ready for some tiny helpers
          </motion.p>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-5 space-y-3">
          {/* What to do */}
          <motion.div
            className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3 flex items-start gap-2.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <ShoppingCart className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-sky-800 text-[11.5px] leading-snug">
              Head to the <span className="font-bold">Wellbeing</span> tab in the Shop and grab a <span className="font-bold">Small Colony</span> to get started.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            onClick={onOpenShop}
            className="relative w-full py-4 rounded-2xl font-black text-white text-base overflow-hidden shadow-lg"
            whileTap={{ scale: 0.97 }}
            style={{ background: 'linear-gradient(110deg, #059669 0%, #0891b2 100%)' }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Open Shop
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Info Modal ───────────────────────────────────────────────────────────────
// Shown after the player buys shrimp during the tutorial.
// Explains what ghost shrimp do in plain language.

interface ShrimpInfoModalProps {
  onClose: () => void;
}

export function ShrimpInfoModal({ onClose }: ShrimpInfoModalProps) {
  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.05 }}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-6 pt-7 pb-5 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0891b2 0%, #6366f1 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <motion.div
            className="flex items-center justify-center mb-3"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center shadow-lg">
              <Droplets className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
          </motion.div>
          <motion.h2
            className="text-white font-black text-xl leading-tight"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            They're in the tank!
          </motion.h2>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-5 space-y-3">

          {/* What they do */}
          <motion.div
            className="rounded-2xl bg-teal-50 border border-teal-100 px-4 py-3 space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-teal-900 font-black text-sm">What do they do?</p>
            <p className="text-teal-800 text-[12px] leading-relaxed">
              Ghost Shrimp munch on algae and leftover food, acting as a natural cleaning crew. The more you have in the tank, the slower your <span className="font-bold">Cleanliness</span> stat drops — meaning less scrubbing for you.
            </p>
          </motion.div>

          {/* They run out */}
          <motion.div
            className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-start gap-2.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <RefreshCw className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="text-amber-800 text-[11.5px] leading-snug">
              <span className="font-bold">They don't last forever.</span> Your axolotl eats them over time, so check back in the Shop to restock when they run low.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={onClose}
            className="relative w-full py-4 rounded-2xl font-black text-white text-base overflow-hidden shadow-lg"
            whileTap={{ scale: 0.97 }}
            style={{ background: 'linear-gradient(110deg, #0891b2 0%, #6366f1 100%)' }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
            />
            <span className="relative z-10">Got it!</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
