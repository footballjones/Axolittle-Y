import { motion } from 'motion/react';
import { X, RotateCcw, Sparkles, Clover, Egg as EggIcon, Flame } from 'lucide-react';
import { Axolotl } from '../types/game';

interface RebirthModalProps {
  onClose: () => void;
  onConfirm: () => void;
  currentAxolotl: Axolotl;
}

export function RebirthModal({ onClose, onConfirm, currentAxolotl }: RebirthModalProps) {
  const bonuses = [
    `+${currentAxolotl.generation * 10} coins`,
    'Inherit parent color/pattern',
    'Lineage tracking',
    'Breeding unlocked',
  ];

  // ── Luck Meter ─────────────────────────────────────────────────────────────
  const LUCK_BONUS_PER_STREAK = 5;
  const streak = currentAxolotl.rebirthStreak ?? 0;
  const effectiveScoreBonus = streak * LUCK_BONUS_PER_STREAK;
  // Bar fills fully at streak 10
  const luckPercent = Math.min(100, (streak / 10) * 100);

  const luckLabel =
    streak === 0 ? 'No bonus yet' :
    streak < 3   ? 'Building luck...' :
    streak < 6   ? 'Good luck bonus!' :
    streak < 9   ? 'Almost there!' :
                   'Max luck!';

  const luckBarColor =
    luckPercent >= 80 ? 'from-amber-400 via-orange-400 to-rose-400' :
    luckPercent >= 50 ? 'from-violet-400 via-purple-400 to-pink-400' :
    luckPercent >= 25 ? 'from-blue-400 via-indigo-400 to-violet-400' :
                        'from-sky-400 to-blue-400';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotateY: -20 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        exit={{ scale: 0.8, opacity: 0, rotateY: 20 }}
        className="relative w-full max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col"
      >
        {/* Animated glow effect */}
        <motion.div
          className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-3xl blur-2xl"
          animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative bg-gradient-to-b from-amber-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-yellow-500/30 shadow-2xl flex flex-col overflow-y-auto max-h-[90vh]">
          {/* Sparkle effects */}
          <motion.div
            className="absolute top-4 right-14"
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400 drop-shadow-lg" />
          </motion.div>

          <div className="flex items-center justify-between mb-4 sm:mb-5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <motion.div
                className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full p-2 shadow-lg shadow-yellow-500/50"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              >
                <RotateCcw className="w-6 h-6 text-white drop-shadow" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Rebirth</h2>
            </div>
            <motion.button
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2 transition-colors border border-white/20"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6 text-white drop-shadow" />
            </motion.button>
          </div>

          <div className="space-y-3 mb-4">
            {/* Bonuses */}
            <motion.div
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-white/90 text-sm mb-3">
                {currentAxolotl.name} has lived a full life! Rebirth to start a new generation with bonuses:
              </p>
              <ul className="space-y-2">
                {bonuses.map((bonus, idx) => (
                  <motion.li
                    key={idx}
                    className="flex items-center gap-2 text-white/90"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <span className="text-sm font-medium">{bonus}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Luck Meter */}
            <motion.div
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold text-sm flex items-center gap-1.5">
                  <Clover className="w-4 h-4 text-emerald-400" strokeWidth={2} /> Rebirth Luck
                </span>
                {effectiveScoreBonus > 0 && (
                  <motion.span
                    className="text-amber-300 font-black text-xs bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                  >
                    +{effectiveScoreBonus} luck bonus
                  </motion.span>
                )}
              </div>

              {/* Bar */}
              <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${luckBarColor} relative overflow-hidden`}
                  initial={{ width: 0 }}
                  animate={{ width: `${luckPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                >
                  {luckPercent > 20 && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      style={{ width: '50%' }}
                    />
                  )}
                </motion.div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/50 text-[11px]">
                  Streak: <span className="text-white/80 font-bold">{streak}</span>
                </span>
                <span className="text-white/60 text-[11px] font-medium">{luckLabel}</span>
              </div>

              {streak > 0 && (
                <p className="text-white/40 text-[10px] mt-1.5 leading-relaxed">
                  Luck carries forward each generation until you get a rarity upgrade.
                </p>
              )}
            </motion.div>

            {/* Generation */}
            <motion.div
              className="relative overflow-hidden bg-gradient-to-br from-purple-500/30 to-pink-500/30 backdrop-blur-sm rounded-2xl p-4 border-2 border-purple-400/50 shadow-lg shadow-purple-500/30"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-200%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <div className="relative z-10">
                <div className="text-white/90 text-sm mb-1 font-medium">New Generation</div>
                <div className="text-3xl font-black text-white drop-shadow-lg">
                  Generation {currentAxolotl.generation + 1}
                </div>
              </div>
            </motion.div>

            {/* Egg info callout */}
            <motion.div
              className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/15"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <EggIcon className="w-8 h-8 text-violet-300" strokeWidth={1.5} />
              <div>
                <p className="text-white font-bold text-sm">A new egg will be placed in your nursery.</p>
                <p className="text-white/60 text-xs mt-0.5">Hatch the egg to name and raise your next axolotl.</p>
              </div>
            </motion.div>
          </div>

          <div className="flex gap-3 flex-shrink-0">
            <motion.button
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl py-3 text-white font-bold transition-all border border-white/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={onConfirm}
              className="relative flex-1 overflow-hidden rounded-xl py-3 text-white font-black transition-all shadow-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500" />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/50 to-white/0"
                animate={{ x: ['-200%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              <span className="relative z-10 drop-shadow-lg">Begin Rebirth</span>
            </motion.button>
          </div>

          <motion.div
            className="mt-4 text-center text-white/50 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Your current axolotl will be added to your lineage
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
