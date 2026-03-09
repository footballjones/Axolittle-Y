import { motion } from 'motion/react';

interface XPBarProps {
  currentXP: number;
  nextLevelXP: number;
  level: number;
}

export function XPBar({ currentXP, nextLevelXP, level }: XPBarProps) {
  const progress = (currentXP / nextLevelXP) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg px-2.5 py-1 shadow-lg shadow-indigo-500/30"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-white text-xs font-bold">Level {level}</span>
          </motion.div>
          <span className="text-white/60 text-xs font-medium">
            {currentXP} / {nextLevelXP} XP
          </span>
        </div>
      </div>

      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/10 shadow-inner">
        {/* Background glow */}
        <motion.div
          className="absolute inset-0 bg-white rounded-full ring-1 ring-black/30"
          animate={{
            opacity: [0.85, 1, 0.85],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Progress bar */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.6), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        />

        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
            ease: 'easeInOut',
          }}
          style={{ width: '30%' }}
        />

        {/* Top highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      </div>
    </div>
  );
}