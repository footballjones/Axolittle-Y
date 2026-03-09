import { X, Dumbbell, Brain, Heart, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SecondaryStats } from '../types/game';

interface StatsModalProps {
  onClose: () => void;
  stats: SecondaryStats;
  name: string;
}

export function StatsModal({ onClose, stats, name }: StatsModalProps) {
  const statItems = [
    { 
      icon: Dumbbell, 
      label: 'Strength', 
      value: stats.strength, 
      color: 'from-red-400 to-rose-500',
      bg: 'bg-red-500/20',
      description: 'Physical power and resilience'
    },
    { 
      icon: Brain, 
      label: 'Intellect', 
      value: stats.intellect, 
      color: 'from-purple-400 to-violet-500',
      bg: 'bg-purple-500/20',
      description: 'Learning ability and problem solving'
    },
    { 
      icon: Heart, 
      label: 'Stamina', 
      value: stats.stamina, 
      color: 'from-pink-400 to-rose-500',
      bg: 'bg-pink-500/20',
      description: 'Endurance and vitality'
    },
    { 
      icon: Zap, 
      label: 'Speed', 
      value: stats.speed, 
      color: 'from-amber-400 to-yellow-500',
      bg: 'bg-amber-500/20',
      description: 'Reaction time and agility'
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
          <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
              backgroundSize: '34px 34px',
            }} />
            
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{name}'s Stats</h2>
                <p className="text-white/80 text-xs sm:text-sm mt-0.5">Attributes</p>
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
            {statItems.map(({ icon: Icon, label, value, color, bg, description }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-3 sm:p-4 border border-slate-200/60"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Icon */}
                  <div className={`${bg} rounded-xl p-2 sm:p-3`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" strokeWidth={2.5} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">{label}</h3>
                      <span className="text-base sm:text-lg font-black text-slate-700">{Math.round(value)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-2 sm:mb-3">{description}</p>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 + 0.2, ease: 'easeOut' }}
                        className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Info note */}
            <div className="bg-indigo-50 rounded-2xl p-3 sm:p-4 border border-indigo-100">
              <p className="text-xs text-indigo-700 text-center font-medium">
                💡 Stats are determined at birth and grow through mini-games and evolution
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}