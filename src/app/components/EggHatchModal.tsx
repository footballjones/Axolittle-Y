/**
 * Modal for entering a name when hatching an egg
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface EggHatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  eggRarity?: 'Common' | 'Rare' | 'Legendary';
  pendingName?: string; // Name provided during rebirth (pre-filled)
}

export function EggHatchModal({ isOpen, onClose, onConfirm, eggRarity = 'Common', pendingName }: EggHatchModalProps) {
  const [name, setName] = useState(pendingName || '');
  
  // Update name when modal opens with pendingName (from rebirth)
  useEffect(() => {
    if (isOpen && pendingName) {
      setName(pendingName);
    } else if (isOpen && !pendingName) {
      setName(''); // Reset if no pending name
    }
  }, [isOpen, pendingName]);

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim());
      setName('');
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 60%, #fef9c3 100%)',
                border: '2px solid rgba(168,85,247,0.4)',
                boxShadow: '0 20px 60px rgba(168,85,247,0.3)',
              }}
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 rounded-full p-1.5 border border-violet-200/60 bg-white/60 active:bg-white/90"
                >
                  <X className="w-4 h-4 text-violet-400" strokeWidth={2.5} />
                </button>

                <div className="text-center">
                  <div className="text-5xl mb-3">🐣</div>
                  <h2 className="text-2xl font-bold text-violet-800 mb-1">
                    Hatch Your Egg!
                  </h2>
                  <p className="text-sm text-violet-600">
                    Give your new axolotl a name
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <div className="mb-4">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter name..."
                    maxLength={20}
                    autoFocus
                    className="w-full bg-white/80 border-2 border-violet-300 rounded-xl px-4 py-3 text-violet-800 placeholder-violet-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 text-center text-lg font-semibold"
                  />
                  <p className="text-xs text-violet-500 mt-2 text-center">
                    {name.length}/20 characters
                  </p>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-bold text-violet-700 bg-white/60 border border-violet-200 active:bg-white/80"
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleConfirm}
                    disabled={!name.trim()}
                    className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: name.trim()
                        ? 'linear-gradient(135deg, rgba(134,239,172,0.9) 0%, rgba(74,222,128,0.9) 100%)'
                        : 'linear-gradient(135deg, rgba(203,213,225,0.9) 0%, rgba(148,163,184,0.9) 100%)',
                    }}
                    whileTap={name.trim() ? { scale: 0.95 } : {}}
                  >
                    Hatch!
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
