/**
 * Game Template - Copy this file to create a new mini-game
 * Replace "Template" with your game name throughout
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

// Game constants
const GAME_ID = 'your-game-id'; // Change this!

export function Template({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  // Game-specific state
  // Add your game state here
  
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(Date.now());

  // Game loop
  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const now = Date.now();
    const deltaTime = (now - lastFrameTimeRef.current) / 16.67; // Normalize to ~60fps
    lastFrameTimeRef.current = now;

    // TODO: Add your game logic here
    // - Update positions
    // - Check collisions
    // - Update score
    // - Check win/lose conditions

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused]);

  // Start game loop
  useEffect(() => {
    if (isPlaying && !isPaused) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isPaused, gameLoop]);

  // End game when stopped
  useEffect(() => {
    if (!isPlaying && score > 0) {
      const rewards = calculateRewards(GAME_ID, score);
      onEnd({
        score,
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    }
  }, [isPlaying, score, onEnd]);

  return (
    <GameWrapper
      gameName="Template Game"
      score={score}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
      onEnd={onEnd}
    >
      {/* Your game content here */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">
          Your Game Content Here
        </div>
      </div>
    </GameWrapper>
  );
}
