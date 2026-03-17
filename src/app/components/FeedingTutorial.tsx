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

          {/* Bubble + arrow + hand pinned near Feed button */}
          <motion.div
            className="absolute bottom-[82px] left-1 flex flex-col items-start gap-1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {/* Step badge */}
            <div
              className="ml-3 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
              style={{
                background: 'rgba(52,211,153,0.2)',
                border: '1px solid rgba(52,211,153,0.55)',
                color: '#6ee7b7',
              }}
            >
              Step 1 of 2
            </div>

            {/* Speech bubble */}
            <div
              className="rounded-2xl px-4 py-3 shadow-2xl"
              style={{
                background: 'rgba(255,255,255,0.97)',
                border: '2.5px solid rgba(52,211,153,0.75)',
                boxShadow: '0 8px 36px rgba(52,211,153,0.4)',
                maxWidth: 200,
              }}
            >
              <p className="text-slate-800 text-[13px] font-bold leading-snug">
                {axolotlName} is hungry!
              </p>
              <p className="text-slate-500 text-[11.5px] leading-snug mt-0.5">
                Tap <span className="text-emerald-600 font-bold">Feed</span> to drop a worm 🪱
              </p>
            </div>

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

            {/* Bouncing hand */}
            <motion.span
              className="text-2xl select-none"
              style={{ marginLeft: 30 }}
              animate={{ y: [0, 9, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
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
          {/* Soft top banner so bubble reads clearly */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '38%',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, transparent 100%)',
            }}
          />

          {/* Bubble centered near top */}
          <motion.div
            className="absolute top-[10%] left-0 right-0 flex flex-col items-center gap-1 px-4"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            {/* Step badge */}
            <div
              className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
              style={{
                background: 'rgba(239,68,68,0.18)',
                border: '1px solid rgba(239,68,68,0.5)',
                color: '#fca5a5',
              }}
            >
              Step 2 of 2
            </div>

            {/* Speech bubble */}
            <div
              className="rounded-2xl px-5 py-3 shadow-2xl text-center"
              style={{
                background: 'rgba(255,255,255,0.97)',
                border: '2.5px solid rgba(239,68,68,0.65)',
                boxShadow: '0 8px 32px rgba(239,68,68,0.3)',
                maxWidth: 230,
              }}
            >
              <p className="text-slate-800 text-[13px] font-bold leading-snug">
                Now tap the worm!
              </p>
              <p className="text-slate-500 text-[11.5px] leading-snug mt-0.5">
                Tap near it to guide {axolotlName} over to eat 😋
              </p>
            </div>

            {/* Caret + bouncing hand pointing toward tank */}
            <div
              className="w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '9px solid rgba(255,255,255,0.97)',
              }}
            />
            <motion.span
              className="text-2xl select-none"
              animate={{ y: [0, 9, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              👇
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
