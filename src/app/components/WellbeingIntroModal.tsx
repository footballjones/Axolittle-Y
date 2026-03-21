import { motion } from 'motion/react';
import { Worm, Sparkles, Brush, Droplets } from 'lucide-react';
import React from 'react';

interface WellbeingIntroModalProps {
  axolotlName: string;
  onStart: () => void;
}

const STEPS: Array<{ icon: React.ReactNode; label: string }> = [
  { icon: <Worm className="w-6 h-6 text-emerald-400" />, label: 'Feed' },
  { icon: <Sparkles className="w-6 h-6 text-violet-400" />, label: 'Play' },
  { icon: <Brush className="w-6 h-6 text-rose-400" />, label: 'Clean' },
  { icon: <Droplets className="w-6 h-6 text-sky-400" />, label: 'Water' },
];

export function WellbeingIntroModal({ axolotlName, onStart }: WellbeingIntroModalProps) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center px-5"
      style={{ zIndex: 10002, background: 'rgba(15,10,40,0.82)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="w-full max-w-[340px] rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(160deg, #1e1456 0%, #2d1b6e 50%, #1a1040 100%)', border: '1.5px solid rgba(139,92,246,0.35)' }}
        initial={{ scale: 0.88, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.05 }}
      >
        {/* Header band */}
        <div className="px-6 pt-7 pb-5 text-center">
          {/* Animated axolotl glow */}
          <motion.div
            className="flex justify-center mb-3"
            animate={{ scale: [1, 1.08, 1], filter: ['drop-shadow(0 0 6px rgba(167,139,250,0.4))', 'drop-shadow(0 0 18px rgba(167,139,250,0.8))', 'drop-shadow(0 0 6px rgba(167,139,250,0.4))'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Droplets className="w-12 h-12 text-teal-400" />
          </motion.div>

          <h2 className="text-white text-[19px] font-extrabold leading-tight">
            Let's care for {axolotlName}!
          </h2>
          <p className="text-violet-300/80 text-[12.5px] mt-1.5 leading-snug">
            A quick guide to keeping your axolotl happy & healthy
          </p>

          {/* Reward teaser */}
          <motion.div
            className="mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-2"
            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <motion.span
              className="select-none"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
            </motion.span>
            <p className="text-amber-300 text-[11.5px] font-semibold leading-snug">
              Complete it and earn <span className="text-amber-200 font-extrabold">5 free Opals!</span>
            </p>
            <motion.span
              className="select-none"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
            </motion.span>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-white/10" />

        {/* Step icons */}
        <div className="px-6 py-5 flex justify-around">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.label}
              className="flex flex-col items-center gap-1.5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08, duration: 0.35 }}
            >
              <motion.div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(139,92,246,0.18)', border: '1.5px solid rgba(139,92,246,0.3)' }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
              >
                {s.icon}
              </motion.div>
              <span className="text-white/70 text-[10px] font-semibold tracking-wide uppercase">
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-7">
          <motion.button
            onClick={onStart}
            whileTap={{ scale: 0.96 }}
            className="w-full py-3.5 rounded-2xl font-extrabold text-[15px] text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
            />
            <span className="relative inline-flex items-center gap-1.5">Let's Start! <Sparkles className="w-4 h-4" /></span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
