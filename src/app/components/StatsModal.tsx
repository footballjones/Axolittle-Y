import { X, Dumbbell, Brain, Heart, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SecondaryStats } from '../types/game';

interface LevelUpData {
  level: number;
  prevStats: SecondaryStats;
}

interface StatsModalProps {
  onClose: () => void;
  stats: SecondaryStats;
  name: string;
  /** Present when the modal is being shown as a result of leveling up */
  levelUp?: LevelUpData;
}

export function StatsModal({ onClose, stats, name, levelUp }: StatsModalProps) {
  const isLevelUp = !!levelUp;

  const statItems = [
    {
      icon: Dumbbell,
      label: 'Strength',
      key: 'strength' as const,
      value: stats.strength,
      prevValue: levelUp?.prevStats.strength ?? stats.strength,
      color: 'from-red-400 to-rose-500',
      bg: 'bg-red-500/20',
      description: 'Physical power and resilience',
    },
    {
      icon: Brain,
      label: 'Intellect',
      key: 'intellect' as const,
      value: stats.intellect,
      prevValue: levelUp?.prevStats.intellect ?? stats.intellect,
      color: 'from-purple-400 to-violet-500',
      bg: 'bg-purple-500/20',
      description: 'Learning ability and problem solving',
    },
    {
      icon: Heart,
      label: 'Stamina',
      key: 'stamina' as const,
      value: stats.stamina,
      prevValue: levelUp?.prevStats.stamina ?? stats.stamina,
      color: 'from-pink-400 to-rose-500',
      bg: 'bg-pink-500/20',
      description: 'Endurance and vitality',
    },
    {
      icon: Zap,
      label: 'Speed',
      key: 'speed' as const,
      value: stats.speed,
      prevValue: levelUp?.prevStats.speed ?? stats.speed,
      color: 'from-amber-400 to-yellow-500',
      bg: 'bg-amber-500/20',
      description: 'Reaction time and agility',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md max-h-[90vh] sm:max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/60 flex flex-col"
        >
          {/* Header — golden on level-up, indigo/purple otherwise */}
          <div
            className="relative px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0"
            style={{
              background: isLevelUp
                ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
            }}
          >
            {/* Dot-grid texture */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
                backgroundSize: '34px 34px',
              }}
            />

            {/* Stars burst for level-up */}
            {isLevelUp && (
              <>
                {['top-1 left-3', 'top-2 right-6', 'bottom-2 left-10', 'top-3 right-16'].map((pos, i) => (
                  <motion.span
                    key={i}
                    className={`absolute text-white/70 text-xs select-none pointer-events-none ${pos}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.7] }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                  >
                    ✦
                  </motion.span>
                ))}
              </>
            )}

            <div className="relative flex items-center justify-between">
              <div>
                {isLevelUp ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-[10px] font-black tracking-widest uppercase text-white/80 mb-0.5"
                    >
                      ⚡ Level Up!
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="text-xl sm:text-2xl font-black text-white"
                    >
                      Now Level {levelUp!.level}
                    </motion.h2>
                    <p className="text-white/80 text-xs sm:text-sm mt-0.5">All stats increased!</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">{name}'s Stats</h2>
                    <p className="text-white/80 text-xs sm:text-sm mt-0.5">Attributes</p>
                  </>
                )}
              </div>
              <motion.button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-2 transition-all border border-white/40"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-white" strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-3 sm:space-y-4">
            {statItems.map(({ icon: Icon, label, value, prevValue, color, bg, description }, index) => {
              const gain = value - prevValue;
              return (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-3 sm:p-4 border border-slate-200/60"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Icon */}
                    <div className={`${bg} rounded-xl p-2 sm:p-3 flex-shrink-0`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" strokeWidth={2.5} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">{label}</h3>
                        <div className="flex items-center gap-1.5">
                          {/* +N gain badge — only shown on level-up */}
                          {isLevelUp && gain > 0 && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{
                                delay: index * 0.1 + 0.3,
                                type: 'spring',
                                stiffness: 300,
                                damping: 15,
                              }}
                              className="text-[11px] font-black text-white px-1.5 py-0.5 rounded-full"
                              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                            >
                              +{gain}
                            </motion.span>
                          )}
                          <span className="text-base sm:text-lg font-black text-slate-700">
                            {Math.round(value)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mb-2 sm:mb-3">{description}</p>

                      {/* Progress Bar */}
                      <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                        {/* Previous value marker (shown during level-up so player sees the "before") */}
                        {isLevelUp && gain > 0 && (
                          <div
                            className="absolute inset-y-0 left-0 opacity-30 rounded-full"
                            style={{
                              width: `${prevValue}%`,
                              background: `linear-gradient(90deg, ${color.replace('from-', '').replace(' to-', ', ')})`,
                            }}
                          />
                        )}
                        {/* Actual bar — animates from prevValue to value on level-up */}
                        <motion.div
                          initial={{ width: isLevelUp && gain > 0 ? `${prevValue}%` : '0%' }}
                          animate={{ width: `${value}%` }}
                          transition={{
                            duration: 0.9,
                            delay: index * 0.1 + (isLevelUp ? 0.45 : 0.2),
                            ease: 'easeOut',
                          }}
                          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full`}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Footer note */}
            {isLevelUp ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="rounded-2xl p-3 sm:p-4 border"
                style={{ background: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.3)' }}
              >
                <p className="text-xs text-amber-700 text-center font-medium">
                  🏆 Each level-up increases all secondary stats by +1
                </p>
              </motion.div>
            ) : (
              <div className="bg-indigo-50 rounded-2xl p-3 sm:p-4 border border-indigo-100">
                <p className="text-xs text-indigo-700 text-center font-medium">
                  💡 Stats are determined at birth and grow through mini-games and evolution
                </p>
              </div>
            )}

            {/* "Got it!" button — only on level-up */}
            {isLevelUp && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                onClick={onClose}
                className="w-full py-3 rounded-2xl font-black text-white text-sm tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                }}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.02 }}
              >
                Got it! 🎉
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
