/**
 * Wrapper component for mini-games
 * Handles common game UI (score, timer, pause, etc.)
 */

import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { X, Pause, Play } from 'lucide-react';
import { MiniGameProps } from './types';

interface GameWrapperProps extends MiniGameProps {
  children: ReactNode;
  gameName: string;
  score?: number;
  onPause?: () => void;
  isPaused?: boolean;
  /** When true the result screen is visible — hide the X so rewards
   *  aren't discarded; the result screen's own buttons handle exit. */
  gameEnded?: boolean;
}

export function GameWrapper({
  children,
  gameName,
  score,
  onPause,
  isPaused = false,
  onEnd,
  gameEnded = false,
}: GameWrapperProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          {/* X only shown during active play — result screen has its own exit buttons */}
          {!gameEnded && (
            <motion.button
              onClick={() => onEnd({ score: score || 0, tier: 'normal', xp: 0, coins: 0 })}
              className="rounded-full p-2 bg-white/20 backdrop-blur-sm border border-white/30 active:bg-white/30"
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5 text-white" strokeWidth={2.5} />
            </motion.button>
          )}
          <h2 className="text-white font-bold text-lg">{gameName}</h2>
        </div>
        
        {onPause && (
          <motion.button
            onClick={onPause}
            className="rounded-full p-2 bg-white/20 backdrop-blur-sm border border-white/30 active:bg-white/30"
            whileTap={{ scale: 0.9 }}
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-white" strokeWidth={2.5} />
            ) : (
              <Pause className="w-5 h-5 text-white" strokeWidth={2.5} />
            )}
          </motion.button>
        )}
      </div>

      {/* Score display */}
      {score !== undefined && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 inline-block border border-white/20">
            <span className="text-white text-sm font-bold">Score: {score}</span>
          </div>
        </div>
      )}

      {/* Game content — pad for the iPhone home indicator so children
          (canvas, grid, etc.) don't extend behind it and get clipped. */}
      <div
        className="flex-1 min-h-0 relative overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {isPaused && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/30">
              <p className="text-white font-bold text-xl text-center">Paused</p>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
