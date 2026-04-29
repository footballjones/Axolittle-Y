import { motion, AnimatePresence } from 'motion/react';

interface FeedingTutorialProps {
  step: 'feed' | 'eat';
  axolotlName: string;
}

export function FeedingTutorial({ step, axolotlName: _axolotlName }: FeedingTutorialProps) {
  return (
    <AnimatePresence mode="wait">
      {step === 'feed' && (
        <motion.div
          key="tutorial-feed"
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 45 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Dim overlay */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />

          {/* Spotlight cutout at bottom-left (Feed button area) */}
          <motion.div
            className="absolute"
            style={{
              bottom: 4,
              left: 4,
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0)',
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Single-word bubble pinned near Feed button */}
          <motion.div
            className="absolute bottom-[82px] left-1 flex flex-col items-start gap-1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <motion.div
              className="rounded-2xl px-5 py-2.5 shadow-2xl ml-2"
              style={{
                background: 'rgba(255,255,255,0.97)',
                border: '2.5px solid rgba(52,211,153,0.75)',
                boxShadow: '0 8px 36px rgba(52,211,153,0.4)',
              }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-emerald-600 text-[18px] font-black leading-none">
                Hungry!
              </p>
            </motion.div>

            {/* Caret pointing down-left toward Feed button */}
            <div
              className="w-0 h-0"
              style={{
                marginLeft: 36,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '9px solid rgba(255,255,255,0.97)',
              }}
            />
          </motion.div>
        </motion.div>
      )}

      {step === 'eat' && (
        <motion.div
          key="tutorial-eat"
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 28 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Soft bottom banner so bubble reads clearly */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '30%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.38) 0%, transparent 100%)',
            }}
          />

          {/* Single-line bubble pinned to bottom */}
          <motion.div
            className="absolute bottom-[82px] left-0 right-0 flex flex-col items-center gap-1 px-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <motion.div
              className="rounded-2xl px-5 py-2.5 shadow-2xl text-center"
              style={{
                background: 'rgba(255,255,255,0.97)',
                border: '2.5px solid rgba(239,68,68,0.65)',
                boxShadow: '0 8px 32px rgba(239,68,68,0.3)',
              }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-rose-500 text-[18px] font-black leading-none">
                Tap the worm!
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}

    </AnimatePresence>
  );
}
