/**
 * MenuTutorialPrompt — shown on the aquarium screen whenever the menu tour
 * is pending. Appears every time the player returns to the aquarium until
 * the tutorial is fully complete. There is no dismiss option.
 */

import { motion } from 'motion/react';

interface MenuTutorialPromptProps {
  onStart: () => void;
}

export function MenuTutorialPrompt({ onStart }: MenuTutorialPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="fixed inset-0 z-[200] flex items-end justify-center pb-32 px-4 pointer-events-none"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 shadow-2xl pointer-events-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.97) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 40px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        {/* Header row */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>
          <div>
            <p className="text-white font-black text-sm leading-none mb-0.5">Menu Tour</p>
            <p className="text-white/45 text-[11px]">Quick walkthrough of your menu</p>
          </div>
        </div>

        <p className="text-white/65 text-xs leading-relaxed mb-4">
          Tap the button below to take a quick tour of the menu. You'll see where to find Social, your Eggs, Inventory, and more.
        </p>

        <motion.button
          onClick={onStart}
          className="w-full py-3 rounded-2xl font-black text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)' }}
          whileTap={{ scale: 0.97 }}
        >
          Start Tour
        </motion.button>
      </div>
    </motion.div>
  );
}
