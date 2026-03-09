/**
 * Modal for confirming release of current axolotl to make room for hatching
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';

interface ReleaseAxolotlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  axolotlName?: string;
}

export function ReleaseAxolotlModal({ isOpen, onClose, onConfirm, axolotlName = 'your axolotl' }: ReleaseAxolotlModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #fef2f2 0%, #fee2e2 60%, #fecaca 100%)',
                border: '2px solid rgba(239,68,68,0.4)',
                boxShadow: '0 20px 60px rgba(239,68,68,0.3)',
              }}
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 rounded-full p-1.5 border border-red-200/60 bg-white/60 active:bg-white/90"
                >
                  <X className="w-4 h-4 text-red-400" strokeWidth={2.5} />
                </button>

                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="rounded-full p-3 bg-red-100">
                      <AlertTriangle className="w-8 h-8 text-red-600" strokeWidth={2.5} />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-red-800 mb-2">
                    Release to the Wild?
                  </h2>
                  <p className="text-sm text-red-700 mb-1">
                    Your aquarium is full
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <div className="mb-5 p-4 rounded-2xl bg-white/80 border border-red-200">
                  <p className="text-sm text-red-800 leading-relaxed text-center">
                    Releasing <span className="font-bold">{axolotlName}</span> to the wild will <span className="font-bold">permanently lose all progress</span> with this axolotl, including stats, experience, and time spent together.
                  </p>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-bold text-red-700 bg-white/80 border border-red-200 active:bg-white"
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-white"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239,68,68,0.9) 0%, rgba(220,38,38,0.9) 100%)',
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Release
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
