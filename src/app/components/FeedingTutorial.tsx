import { motion, AnimatePresence } from 'motion/react';

interface FeedingTutorialProps {
  step: 'feed' | 'eat';
  axolotlName: string;
}

export function FeedingTutorial({ step, axolotlName }: FeedingTutorialProps) {
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
          {/* Dim the whole aquarium */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.42)' }}
          />

          {/* Speech bubble + bouncing hand, aligned to the Feed button (leftmost of 4) */}
          {/* Feed button center ≈ 52px from left (8px padding + first-of-4-button midpoint) */}
          <motion.div
            className="absolute bottom-[72px] left-0 right-0 flex flex-col items-start gap-0.5 pl-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <div
              className="rounded-2xl px-4 py-3 shadow-2xl"
              style={{
                background: 'rgba(255,255,255,0.97)',
                border: '2.5px solid rgba(52,211,153,0.7)',
                boxShadow: '0 8px 32px rgba(52,211,153,0.35)',
                maxWidth: 195,
              }}
            >
              <p className="text-slate-800 text-[13px] font-bold leading-snug">
                {axolotlName} is hungry!<br />
                Tap <span className="text-emerald-600">Feed</span> to drop some food 🍖
              </p>
            </div>
            {/* Downward caret — offset to center on the Feed button */}
            <div
              className="w-0 h-0"
              style={{
                marginLeft: 35,
                borderLeft: '9px solid transparent',
                borderRight: '9px solid transparent',
                borderTop: '9px solid rgba(255,255,255,0.97)',
              }}
            />
            {/* Bouncing hand pointing at Feed button */}
            <motion.span
              className="text-2xl select-none"
              style={{ marginLeft: 30 }}
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
            >
              👇
            </motion.span>
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
          {/* Speech bubble in upper aquarium — bubble first, then arrow pointing down to worm */}
          <motion.div
            className="absolute top-[14%] left-0 right-0 flex flex-col items-center gap-0.5 px-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <div
              className="rounded-2xl px-5 py-3 shadow-2xl text-center max-w-[230px]"
              style={{
                background: 'rgba(255,255,255,0.97)',
                border: '2.5px solid rgba(239,68,68,0.6)',
                boxShadow: '0 8px 32px rgba(239,68,68,0.25)',
              }}
            >
              <p className="text-slate-800 text-[13px] font-bold leading-snug">
                Tap near the worm to guide<br />
                {axolotlName} to eat it! 🪱
              </p>
            </div>
            {/* Downward caret + bouncing hand pointing toward worm below */}
            <div
              className="w-0 h-0"
              style={{
                borderLeft: '9px solid transparent',
                borderRight: '9px solid transparent',
                borderTop: '9px solid rgba(255,255,255,0.97)',
              }}
            />
            <motion.span
              className="text-2xl select-none"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
            >
              👇
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
