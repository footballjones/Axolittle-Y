import { motion } from 'motion/react';
import { PartyPopper, Sparkles, Gem } from 'lucide-react';

interface WellbeingCompleteModalProps {
  axolotlName: string;
  onCollect: () => void;
}

const SPARKLE_COUNT = 10;

export function WellbeingCompleteModal({ axolotlName, onCollect }: WellbeingCompleteModalProps) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center px-5"
      style={{ zIndex: 10002, background: 'rgba(15,10,40,0.82)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Background sparkle burst */}
      {Array.from({ length: SPARKLE_COUNT }).map((_, i) => {
        const angle = (i / SPARKLE_COUNT) * 360;
        const dist = 110 + Math.random() * 60;
        const x = Math.cos((angle * Math.PI) / 180) * dist;
        const y = Math.sin((angle * Math.PI) / 180) * dist;
        const size = 4 + Math.random() * 6;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: size,
              height: size,
              background: ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'][i % 5],
              top: '50%',
              left: '50%',
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x, y, opacity: [1, 0.8, 0], scale: [1, 1.4, 0.4] }}
            transition={{ duration: 1.0, delay: 0.15 + i * 0.05, ease: 'easeOut' }}
          />
        );
      })}

      <motion.div
        className="w-full max-w-[340px] rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(160deg, #064e3b 0%, #065f46 45%, #047857 100%)', border: '1.5px solid rgba(52,211,153,0.35)' }}
        initial={{ scale: 0.88, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.05 }}
      >
        {/* Header */}
        <div className="px-6 pt-7 pb-4 text-center">
          <motion.div
            className="flex justify-center mb-3"
            animate={{ rotate: [0, -8, 8, -4, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <PartyPopper className="w-12 h-12 text-emerald-300" />
          </motion.div>

          <h2 className="text-white text-[20px] font-extrabold leading-tight">
            Amazing job!
          </h2>
          <p className="text-emerald-200/80 text-[12.5px] mt-1.5 leading-snug">
            {axolotlName} is lucky to have you as a caretaker!
          </p>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-white/10" />

        {/* Body */}
        <div className="px-6 py-5 text-center">
          <p className="text-emerald-100/80 text-[12px] leading-relaxed">
            You've learned how to <span className="text-white font-bold">feed</span>,{' '}
            <span className="text-white font-bold">play</span>,{' '}
            <span className="text-white font-bold">clean</span>, and{' '}
            <span className="text-white font-bold">change the water</span>.{' '}
            A healthy axolotl is a happy axolotl!
          </p>

          {/* Reward card */}
          <motion.div
            className="mt-4 rounded-2xl py-4 px-5 flex items-center justify-center gap-3"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1.5px solid rgba(52,211,153,0.4)' }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 280, damping: 22 }}
          >
            <motion.span
              className="select-none"
              animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.7, delay: 0.6 }}
            >
              <Sparkles className="w-8 h-8 text-emerald-300" />
            </motion.span>
            <div className="text-left">
              <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest">Reward</p>
              <p className="text-white text-[22px] font-extrabold leading-none">+5 Opals</p>
            </div>
            <motion.span
              className="select-none"
              animate={{ rotate: [0, -15, 10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.7, delay: 0.65 }}
            >
              <Sparkles className="w-8 h-8 text-emerald-300" />
            </motion.span>
          </motion.div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-7">
          <motion.button
            onClick={onCollect}
            whileTap={{ scale: 0.96 }}
            className="w-full py-3.5 rounded-2xl font-extrabold text-[15px] text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.35 }}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
            />
            <span className="relative inline-flex items-center gap-1.5">Collect Reward! <Gem className="w-4 h-4" /></span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
