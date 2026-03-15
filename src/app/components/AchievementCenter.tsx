import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Lock, Check } from 'lucide-react';
import { ALL_ACHIEVEMENTS } from '../data/achievements';
import { ACHIEVEMENT_CATEGORIES } from '../types/achievements';
import type { GameState } from '../types/game';

interface AchievementCenterProps {
  gameState: GameState;
  onClaim: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  nurture:    { bg: 'from-emerald-400 to-teal-500',    text: 'text-emerald-700', border: 'border-emerald-200/60', icon: 'bg-emerald-100' },
  minigames:  { bg: 'from-violet-400 to-indigo-500',   text: 'text-violet-700',  border: 'border-violet-200/60',  icon: 'bg-violet-100'  },
  progression:{ bg: 'from-sky-400 to-blue-500',        text: 'text-sky-700',     border: 'border-sky-200/60',     icon: 'bg-sky-100'     },
  genetics:   { bg: 'from-pink-400 to-rose-500',       text: 'text-pink-700',    border: 'border-pink-200/60',    icon: 'bg-pink-100'    },
  social:     { bg: 'from-fuchsia-400 to-purple-500',  text: 'text-fuchsia-700', border: 'border-fuchsia-200/60', icon: 'bg-fuchsia-100' },
  daily:      { bg: 'from-amber-400 to-orange-500',    text: 'text-amber-700',   border: 'border-amber-200/60',   icon: 'bg-amber-100'   },
};

export function AchievementCenter({ gameState, onClaim }: AchievementCenterProps) {
  const unlockedSet = new Set(gameState.achievements ?? []);
  const pendingSet = new Set(gameState.pendingAchievements ?? []);
  const totalCount = ALL_ACHIEVEMENTS.length;
  const unlockedCount = unlockedSet.size;
  const progressPercent = (unlockedCount / totalCount) * 100;

  return (
    <div className="pt-32 px-4 sm:px-6 pb-32 space-y-5 min-h-full">
      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/[0.08] backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden"
      >
        {/* Shimmer strip */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative px-4 py-4 flex items-center gap-3">
          <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl p-2.5 shadow-lg shadow-amber-500/30">
            <Trophy className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1.5">
              <h2 className="text-base font-bold text-white drop-shadow-sm">Achievements</h2>
              <span className="text-[11px] font-bold text-yellow-300">
                {unlockedCount} / {totalCount}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 rounded-full bg-black/30 border border-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 relative"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Per-category sections */}
      {ACHIEVEMENT_CATEGORIES.map((cat, catIndex) => {
        const catAchievements = ALL_ACHIEVEMENTS.filter(a => a.category === cat.id);
        const catUnlocked = catAchievements.filter(a => unlockedSet.has(a.id)).length;
        const colors = CATEGORY_COLORS[cat.id];

        return (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + catIndex * 0.06 }}
          >
            {/* Category header */}
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <div className={`bg-gradient-to-br ${colors.bg} rounded-lg p-1.5 shadow-md`}>
                <span className="text-sm leading-none">{cat.emoji}</span>
              </div>
              <h3 className="text-sm font-bold text-white/90 drop-shadow-sm">{cat.label}</h3>
              <span className="ml-auto text-[10px] font-semibold text-white/50">
                {catUnlocked}/{catAchievements.length}
              </span>
            </div>

            {/* Achievement cards */}
            <div className="space-y-2">
              <AnimatePresence>
                {catAchievements.map((achievement, idx) => {
                  const isUnlocked = unlockedSet.has(achievement.id);
                  const isPending = pendingSet.has(achievement.id);
                  const hasReward = (achievement.coinReward ?? 0) > 0 || (achievement.opalReward ?? 0) > 0;

                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + catIndex * 0.06 + idx * 0.04 }}
                      className={`relative flex items-center gap-3 rounded-2xl px-3.5 py-3 border backdrop-blur-sm transition-all ${
                        isPending
                          ? 'bg-amber-400/20 border-amber-300/50 shadow-sm shadow-amber-400/20'
                          : isUnlocked
                          ? 'bg-white/20 border-white/30 shadow-sm'
                          : 'bg-white/[0.05] border-white/10'
                      }`}
                    >
                      {/* Emoji badge */}
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner transition-all ${
                        isUnlocked ? colors.icon : 'bg-white/5'
                      } ${isUnlocked ? '' : 'grayscale opacity-40'}`}>
                        {achievement.emoji}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold leading-tight ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
                          {achievement.name}
                        </p>
                        <p className={`text-[10px] leading-snug mt-0.5 ${isUnlocked ? 'text-white/70' : 'text-white/30'}`}>
                          {achievement.description}
                        </p>
                        {!isUnlocked && hasReward && (
                          <p className="text-[10px] font-bold text-white/25 mt-0.5">
                            {[
                              achievement.coinReward ? `${achievement.coinReward}🪙` : '',
                              achievement.opalReward ? `${achievement.opalReward}🪬` : '',
                            ].filter(Boolean).join('  ')}
                          </p>
                        )}
                      </div>

                      {/* Status: claim button, check, or lock */}
                      {isPending && hasReward ? (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => onClaim(achievement.id)}
                          className="shrink-0 rounded-xl px-2.5 py-1.5 bg-amber-400 shadow-md shadow-amber-400/30 flex flex-col items-center"
                        >
                          <span className="text-[10px] font-black text-amber-900 leading-none">CLAIM</span>
                          <span className="text-[9px] font-bold text-amber-800 leading-none mt-0.5">
                            {[
                              achievement.coinReward ? `${achievement.coinReward}🪙` : '',
                              achievement.opalReward ? `${achievement.opalReward}🪬` : '',
                            ].filter(Boolean).join(' ')}
                          </span>
                        </motion.button>
                      ) : isPending ? (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => onClaim(achievement.id)}
                          className="shrink-0 rounded-xl px-2.5 py-1.5 bg-amber-400 shadow-md shadow-amber-400/30"
                        >
                          <span className="text-[10px] font-black text-amber-900 leading-none">CLAIM</span>
                        </motion.button>
                      ) : isUnlocked ? (
                        <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-emerald-400/90 shadow-md shadow-emerald-400/30">
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-white/10">
                          <Lock className="w-3 h-3 text-white/30" strokeWidth={2.5} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
