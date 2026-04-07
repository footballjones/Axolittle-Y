/**
 * RebirthReadyModal — shown the first time a player reaches level 30.
 * Explains the rebirth system and the level-based rarity boost.
 */

import { motion } from 'motion/react';
import { Egg, Zap, TrendingUp, Star } from 'lucide-react';

interface RebirthReadyModalProps {
  onClose: () => void;
}

export function RebirthReadyModal({ onClose }: RebirthReadyModalProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />

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
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #f59e0b 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
          />

          <motion.div
            className="relative flex items-center justify-center mb-4"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="w-20 h-20 rounded-3xl bg-white/20 border-2 border-white/50 flex items-center justify-center shadow-xl">
              <Egg className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
          </motion.div>

          <motion.p
            className="relative text-white/80 text-[10px] font-black tracking-[0.2em] uppercase mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            Level 30 Reached
          </motion.p>
          <motion.h2
            className="relative text-white font-black text-2xl leading-tight drop-shadow-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Rebirth Unlocked!
          </motion.h2>
          <motion.p
            className="relative text-white/80 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Your axolotl is ready for a new beginning
          </motion.p>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-5 space-y-3">

          {/* What is rebirth */}
          <motion.div
            className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3 space-y-1"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <div className="flex items-center gap-2">
              <Egg className="w-4 h-4 text-violet-500 flex-shrink-0" />
              <p className="text-violet-900 font-black text-sm">What is Rebirth?</p>
            </div>
            <p className="text-violet-800 text-[12px] leading-relaxed">
              Your axolotl lays a new egg and starts over — but the next generation can be a <span className="font-bold">higher rarity</span> and inherit stronger stats.
            </p>
          </motion.div>

          {/* Level bonus */}
          <motion.div
            className="rounded-2xl overflow-hidden border-2 border-amber-200 shadow-sm"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-white flex-shrink-0" />
              <p className="text-white font-black text-sm">Wait for a bonus!</p>
            </div>
            <div className="bg-amber-50 px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-slate-700 text-[12px]">
                  Every level past 30 adds <span className="font-bold text-amber-600">+1%</span> rarity upgrade chance
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-slate-700 text-[12px]">
                  At <span className="font-bold">level 60</span> you get the maximum <span className="font-bold text-amber-600">+30%</span> bonus
                </p>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            onClick={onClose}
            className="relative w-full py-4 rounded-2xl font-black text-white text-base overflow-hidden shadow-lg"
            whileTap={{ scale: 0.97 }}
            style={{ background: 'linear-gradient(110deg, #7c3aed 0%, #c026d3 100%)' }}
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
