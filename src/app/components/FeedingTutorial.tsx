import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FeedingTutorialProps {
  step: 'feed' | 'eat' | 'xp-tip';
  axolotlName: string;
  onXpTipDismiss?: () => void;
}

export function FeedingTutorial({ step, axolotlName, onXpTipDismiss }: FeedingTutorialProps) {
  // Auto-dismiss the XP tip after 5 seconds
  useEffect(() => {
    if (step === 'xp-tip' && onXpTipDismiss) {
      const timer = setTimeout(onXpTipDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [step, onXpTipDismiss]);

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

          {/* Bubble pinned to bottom, above the action buttons */}
          <motion.div
            className="absolute bottom-[82px] left-0 right-0 flex flex-col items-center gap-1 px-4"
            initial={{ opacity: 0, y: 12 }}
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
          </motion.div>
        </motion.div>
      )}

      {step === 'xp-tip' && (
        <motion.div
          key="tutorial-xp-tip"
          className="absolute inset-0 pointer-events-auto"
          style={{ zIndex: 45 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={onXpTipDismiss}
        >
          {/* Dim overlay */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />

          {/* Centered tip card */}
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ delay: 0.1, duration: 0.4, type: 'spring', bounce: 0.3 }}
              className="w-full rounded-3xl px-6 py-5 shadow-2xl"
              style={{
                background: 'rgba(255,255,255,0.97)',
                border: '2.5px solid rgba(234,179,8,0.7)',
                boxShadow: '0 12px 48px rgba(234,179,8,0.35)',
                maxWidth: 300,
              }}
            >
              {/* Icon + header */}
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="text-slate-800 text-[14px] font-black leading-tight">
                    Feeding earns XP!
                  </p>
                  <p className="text-yellow-600 text-[11px] font-bold">Daily tip</p>
                </div>
              </div>

              {/* Tip body */}
              <p className="text-slate-600 text-[12.5px] leading-relaxed">
                Every time {axolotlName} eats, you earn{' '}
                <span className="text-slate-800 font-bold">+0.1 XP</span>. Feed up to{' '}
                <span className="text-slate-800 font-bold">20 times a day</span> to earn a full{' '}
                <span className="text-yellow-600 font-bold">2 XP daily</span> from feeding!
              </p>

              {/* Progress illustration */}
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">0</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 0.5, duration: 2.5, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[11px] text-amber-600 font-bold">2 XP</span>
              </div>
              <p className="text-center text-slate-400 text-[10px] mt-0.5">20 feeds = 2 XP max per day</p>

              {/* Dismiss hint */}
              <p className="text-center text-slate-300 text-[10px] mt-3">Tap anywhere to continue</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
