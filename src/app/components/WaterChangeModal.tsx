import { X, Droplets, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WaterChangeModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export function WaterChangeModal({ onClose, onConfirm }: WaterChangeModalProps) {
  function handleConfirm() {
    onConfirm();
    onClose();
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/60"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 px-5 py-4">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
                backgroundSize: '28px 28px',
              }}
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/20 rounded-xl p-2 border border-white/30">
                  <Droplets className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">Change Water</h2>
              </div>
              <motion.button
                onClick={onClose}
                whileTap={{ scale: 0.92 }}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-2 transition-all border border-white/40"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-white" />
              </motion.button>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-5 flex flex-col gap-5">
            {/* Warning box */}
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="shrink-0 bg-amber-100 rounded-xl p-2 self-start">
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">Mini Games will be locked</p>
                <p className="text-sm text-amber-700 leading-snug">
                  Changing the aquarium water disturbs your axolotl's environment. Mini games will be
                  unavailable for <span className="font-bold">2 hours</span> while the water settles.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <motion.button
                onClick={handleConfirm}
                whileTap={{ scale: 0.97 }}
                className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold text-sm rounded-2xl px-4 py-3.5 transition-all shadow-lg shadow-blue-500/25 border border-white/20"
              >
                Change Water &amp; Lock Mini Games for 2 Hours
              </motion.button>
              <motion.button
                onClick={onClose}
                whileTap={{ scale: 0.97 }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-2xl px-4 py-3.5 transition-all"
              >
                Cancel
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
