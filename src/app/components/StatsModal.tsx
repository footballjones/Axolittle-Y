import { X, Dumbbell, Brain, Heart, Zap, Plus, Target, Trophy, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SecondaryStats } from '../types/game';

interface StatsModalProps {
  onClose: () => void;
  stats: SecondaryStats;
  name: string;
  /** Unspent stat points the player can allocate */
  pendingPoints?: number;
  /** Called when the player taps a stat to spend a point on it */
  onAllocateStat?: (stat: keyof SecondaryStats) => void;
}

export function StatsModal({ onClose, stats, name, pendingPoints = 0, onAllocateStat }: StatsModalProps) {
  const hasPoints = pendingPoints > 0;

  const statItems = [
    {
      icon: Dumbbell,
      label: 'Strength',
      key: 'strength' as const,
      value: stats.strength,
      color: 'from-red-400 to-rose-500',
      bg: 'bg-red-500/20',
      btnColor: 'bg-red-500 hover:bg-red-400',
      description: 'Physical power and resilience',
    },
    {
      icon: Brain,
      label: 'Intellect',
      key: 'intellect' as const,
      value: stats.intellect,
      color: 'from-purple-400 to-violet-500',
      bg: 'bg-purple-500/20',
      btnColor: 'bg-purple-500 hover:bg-purple-400',
      description: 'Learning ability and problem solving',
    },
    {
      icon: Heart,
      label: 'Stamina',
      key: 'stamina' as const,
      value: stats.stamina,
      color: 'from-pink-400 to-rose-500',
      bg: 'bg-pink-500/20',
      btnColor: 'bg-pink-500 hover:bg-pink-400',
      description: 'Endurance and vitality',
    },
    {
      icon: Zap,
      label: 'Speed',
      key: 'speed' as const,
      value: stats.speed,
      color: 'from-amber-400 to-yellow-500',
      bg: 'bg-amber-500/20',
      btnColor: 'bg-amber-500 hover:bg-amber-400',
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
          {/* Header */}
          <div
            className="relative px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0"
            style={{
              background: hasPoints
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

            {/* Stars burst for level-up allocation */}
            {hasPoints && (
              <>
                {['top-1 left-3', 'top-2 right-6', 'bottom-2 left-10', 'top-3 right-16'].map((pos, i) => (
                  <motion.span
                    key={i}
                    className={`absolute text-white/70 text-xs select-none pointer-events-none ${pos}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.7] }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                  >
                    <Zap className="w-3 h-3" />
                  </motion.span>
                ))}
              </>
            )}

            <div className="relative flex items-center justify-between">
              <div>
                {hasPoints ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-[10px] font-black tracking-widest uppercase text-white/80 mb-0.5"
                    >
                      <span className="inline-flex items-center gap-1"><Zap className="w-3 h-3" /> Level Up!</span>
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="text-xl sm:text-2xl font-black text-white"
                    >
                      Choose a Stat to Upgrade
                    </motion.h2>
                    <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                      {pendingPoints === 1
                        ? '1 point to assign'
                        : `${pendingPoints} points to assign`}
                    </p>
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
                className="backdrop-blur-sm rounded-xl p-2 transition-all border"
                style={hasPoints
                  ? { background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }
                  : { background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' }
                }
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                title="Close — reminder will stay on screen"
              >
                <X className={`w-5 h-5 ${hasPoints ? 'text-white/60' : 'text-white'}`} strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-3 sm:space-y-4">

            {/* Points indicator banner */}
            {hasPoints && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl px-4 py-3 flex items-center gap-3 border"
                style={{ background: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.4)' }}
              >
                <Target className="w-6 h-6 text-amber-600" />
                <p className="text-amber-800 font-bold text-sm">
                  Tap any stat below to add +1 point!
                </p>
              </motion.div>
            )}

            {statItems.map(({ icon: Icon, label, key, value, color, bg, btnColor, description }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.07 }}
                className={`bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-3 sm:p-4 border border-slate-200/60 ${hasPoints ? 'cursor-pointer' : ''}`}
                onClick={hasPoints && onAllocateStat ? () => onAllocateStat(key) : undefined}
                whileTap={hasPoints ? { scale: 0.97 } : {}}
                style={hasPoints ? { cursor: 'pointer' } : {}}
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
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-black text-slate-700">{Math.round(value)}</span>
                        {hasPoints && (
                          <motion.div
                            className={`${btnColor} w-7 h-7 rounded-full flex items-center justify-center shadow-md flex-shrink-0`}
                            whileHover={{ scale: 1.15 }}
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <Plus className="w-4 h-4 text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mb-2 sm:mb-3">{description}</p>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min(100, value)}%` }}
                        transition={{ duration: 0.7, delay: index * 0.07 + 0.2, ease: 'easeOut' }}
                        className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Footer */}
            {hasPoints ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl p-3 sm:p-4 border text-center"
                style={{ background: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.3)' }}
              >
                <p className="text-xs text-amber-700 font-medium">
                  <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-amber-600" /> You earn 1 stat point every level-up — choose wisely!</span>
                </p>
              </motion.div>
            ) : (
              <div className="bg-indigo-50 rounded-2xl p-3 sm:p-4 border border-indigo-100">
                <p className="text-xs text-indigo-700 text-center font-medium">
                  <span className="inline-flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5 text-indigo-500" /> Earn stat points by leveling up through mini-games</span>
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
