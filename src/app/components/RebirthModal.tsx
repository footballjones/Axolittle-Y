import { useState } from 'react';
import { motion } from 'motion/react';
import { X, RotateCcw, Sparkles } from 'lucide-react';
import { Axolotl } from '../types/game';

interface RebirthModalProps {
  onClose: () => void;
  onConfirm: (name: string) => void;
  currentAxolotl: Axolotl;
}

export function RebirthModal({ onClose, onConfirm, currentAxolotl }: RebirthModalProps) {
  const [newName, setNewName] = useState('');

  const handleConfirm = () => {
    if (newName.trim()) {
      onConfirm(newName.trim());
    }
  };

  const bonuses = [
    `+${currentAxolotl.generation * 10} coins`,
    'Inherit parent color/pattern',
    'Lineage tracking',
    'Breeding unlocked',
  ];

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
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        <div className="relative bg-gradient-to-b from-amber-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-yellow-500/30 shadow-2xl flex flex-col">
          {/* Sparkle effects */}
          <motion.div
            className="absolute top-4 right-4"
            animate={{
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400 drop-shadow-lg" />
          </motion.div>

          <div className="flex items-center justify-between mb-4 sm:mb-6 flex-shrink-0">
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

          <div className="mb-6 space-y-4">
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

            <motion.div 
              className="relative overflow-hidden bg-gradient-to-br from-purple-500/30 to-pink-500/30 backdrop-blur-sm rounded-2xl p-4 border-2 border-purple-400/50 shadow-lg shadow-purple-500/30"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* Animated shine */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{
                  x: ['-200%', '200%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              <div className="relative z-10">
                <div className="text-white/90 text-sm mb-1 font-medium">New Generation</div>
                <div className="text-3xl font-black text-white drop-shadow-lg">
                  Generation {currentAxolotl.generation + 1}
                </div>
              </div>
            </motion.div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white/90 text-sm mb-2 font-medium">Choose a name for your new axolotl</label>
              <p className="text-white/60 text-xs mb-2">(You'll confirm this name when the egg hatches)</p>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={`${currentAxolotl.name} Jr.`}
                maxLength={20}
                className="w-full bg-black/30 border-2 border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 transition-all"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <motion.button
                onClick={onClose}
                className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl py-3 text-white font-bold transition-all border border-white/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleConfirm}
                disabled={!newName.trim()}
                className="relative flex-1 overflow-hidden rounded-xl py-3 text-white font-black transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={newName.trim() ? { scale: 1.02 } : {}}
                whileTap={newName.trim() ? { scale: 0.98 } : {}}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500" />
                {newName.trim() && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/50 to-white/0"
                    animate={{
                      x: ['-200%', '200%'],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                )}
                <span className="relative z-10 drop-shadow-lg">Begin Rebirth</span>
              </motion.button>
            </div>
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