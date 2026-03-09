/**
 * Axolotl Stacker - Stack blocks high with precision timing
 * Rebuilt from scratch - smooth and simple
 * After block 10, tower moves down to make room for more blocks
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps } from './types';
import { calculateRewards } from './config';

const CANVAS_W = 360;
const CANVAS_H = 640;
const BASE_Y = CANVAS_H - 40;
const BLOCK_HEIGHT = 28;
const INITIAL_WIDTH = 120;
const SWING_SPEED_BASE = 2.5;
const TOWER_DROP_THRESHOLD = 10; // After 10 blocks, start moving tower down

interface StackBlock {
  x: number;
  width: number;
  y: number;
}

interface CurrentBlock {
  x: number;
  width: number;
  y: number;
  speed: number;
  direction: number;
}

const COLORS = [
  '#E8A0BF', '#A0D2DB', '#C5A3CF', '#F7C59F', '#B5EAD7',
  '#FFB7B2', '#B5B9FF', '#FFDAC1', '#E2F0CB', '#C7CEEA',
];

export function AxolotlStacker({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number>();
  const gameRef = useRef<{
    isPlaying: boolean;
    isPaused: boolean;
    stack: StackBlock[];
    current: CurrentBlock | null;
    score: number;
    towerOffset: number; // How much the tower has moved down
    onGameEnd: (() => void) | null;
  }>({
    isPlaying: false,
    isPaused: false,
    stack: [],
    current: null,
    score: 0,
    towerOffset: 0,
    onGameEnd: null,
  });

  const spawnBlock = useCallback((currentScore: number) => {
    const game = gameRef.current;
    const top = game.stack[game.stack.length - 1];
    const speed = SWING_SPEED_BASE + currentScore * 0.15;
    const width = Math.max(20, top.width - (currentScore > 5 ? 2 : 0));
    
    game.current = {
      x: 0,
      width,
      y: top.y - BLOCK_HEIGHT,
      speed,
      direction: 1,
    };
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const game = gameRef.current;
    
    // Background
    ctx.fillStyle = '#0e2233';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw stack
    for (let i = 0; i < game.stack.length; i++) {
      const b = game.stack[i];
      // Only draw blocks that are on screen
      if (b.y + BLOCK_HEIGHT < 0 || b.y > CANVAS_H) continue;
      
      const color = i === 0 ? '#556' : COLORS[(i - 1) % COLORS.length];
      ctx.fillStyle = color;
      ctx.fillRect(b.x, b.y, b.width, BLOCK_HEIGHT - 2);
    }

    // Draw current block
    if (game.current && game.isPlaying) {
      ctx.fillStyle = COLORS[game.score % COLORS.length];
      ctx.globalAlpha = 0.9;
      ctx.fillRect(game.current.x, game.current.y, game.current.width, BLOCK_HEIGHT - 2);
      ctx.globalAlpha = 1;
    }

    // Height display
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Height: ${game.score}`, CANVAS_W - 10, 24);
  }, []);

  const gameLoop = useCallback(() => {
    const game = gameRef.current;
    const ctx = ctxRef.current;
    if (!game.isPlaying || game.isPaused || !ctx) return;

    // Update current block position
    if (game.current) {
      game.current.x += game.current.speed * game.current.direction;
      if (game.current.x + game.current.width >= CANVAS_W) {
        game.current.direction = -1;
        game.current.x = CANVAS_W - game.current.width;
      } else if (game.current.x <= 0) {
        game.current.direction = 1;
        game.current.x = 0;
      }
    }

    // Move tower down after threshold
    if (game.score >= TOWER_DROP_THRESHOLD) {
      const targetOffset = (game.score - TOWER_DROP_THRESHOLD) * BLOCK_HEIGHT;
      if (targetOffset > game.towerOffset) {
        // Smoothly move tower down
        const moveAmount = Math.min(2, targetOffset - game.towerOffset);
        game.towerOffset += moveAmount;
        
        // Move all blocks down
        for (const block of game.stack) {
          block.y += moveAmount;
        }
        if (game.current) {
          game.current.y += moveAmount;
        }
      }
    }

    // Draw
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    draw(ctx);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  const dropBlock = useCallback(() => {
    const game = gameRef.current;
    if (!game.isPlaying || game.isPaused || !game.current) return;

    const top = game.stack[game.stack.length - 1];
    const c = game.current;

    // Calculate overlap
    const cLeft = Math.floor(c.x);
    const cRight = Math.floor(c.x + c.width);
    const topLeft = Math.floor(top.x);
    const topRight = Math.floor(top.x + top.width);
    
    const overlapLeft = Math.max(cLeft, topLeft);
    const overlapRight = Math.min(cRight, topRight);
    const overlapWidth = overlapRight - overlapLeft;

    // End game on complete miss
    if (overlapWidth <= 0) {
      if (game.onGameEnd) game.onGameEnd();
      return;
    }

    // Place overlapping portion
    game.stack.push({
      x: overlapLeft,
      width: overlapWidth,
      y: c.y,
    });

    game.score += 1;
    setScore(game.score);

    // Spawn next block
    spawnBlock(game.score);
  }, [spawnBlock]);

  const endGame = useCallback(() => {
    const game = gameRef.current;
    game.isPlaying = false;
    setGameEnded(true);
    
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('axolotl-stacker', game.score);
      setFinalRewards({
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    } else {
      setFinalRewards({
        tier: 'normal',
        xp: 0,
        coins: 0,
        opals: undefined,
      });
    }
    setShowOverlay(true);
  }, [hadEnergyAtStart]);

  const startGame = useCallback(() => {
    setHadEnergyAtStart(energy > 0);
    const game = gameRef.current;
    game.isPlaying = true;
    game.isPaused = false;
    game.score = 0;
    game.towerOffset = 0;
    game.stack = [{
      x: CANVAS_W / 2 - INITIAL_WIDTH / 2,
      width: INITIAL_WIDTH,
      y: BASE_Y,
    }];
    game.current = null;
    setScore(0);
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    
    spawnBlock(0);
    
    // Draw initial frame
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      draw(ctx);
    }
    
    // Start game loop
    if (ctx && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
  }, [energy, spawnBlock, draw, gameLoop]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', { 
        alpha: false, 
        desynchronized: true 
      });
    }
  }, []);

  // Set up game end handler
  useEffect(() => {
    gameRef.current.onGameEnd = endGame;
  }, [endGame]);

  // Touch/click handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTap = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      dropBlock();
    };

    canvas.addEventListener('touchstart', handleTap, { passive: false });
    canvas.addEventListener('click', handleTap);

    return () => {
      canvas.removeEventListener('touchstart', handleTap);
      canvas.removeEventListener('click', handleTap);
    };
  }, [dropBlock]);

  // Start game loop
  useEffect(() => {
    const game = gameRef.current;
    const ctx = ctxRef.current;
    
    if (game.isPlaying && !game.isPaused && ctx && !showOverlay) {
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [showOverlay, gameEnded, gameLoop]);

  return (
    <GameWrapper
      gameName="Axolotl Stacker"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={() => {
        gameRef.current.isPaused = !gameRef.current.isPaused;
      }}
      isPaused={gameRef.current.isPaused}
    >
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100" style={{ margin: 0, padding: 0 }}>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-pink-900/80 backdrop-blur-md z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-purple-300/80 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/30 rounded-full blur-xl -ml-12 -mb-12" />
              
              <div className="relative z-10">
                {!gameRef.current.isPlaying && !gameEnded ? (
                  <>
                    <div className="text-center mb-6">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-6xl mb-4"
                      >
                        🥞
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Axolotl Stacker
                      </h2>
                      <div className="space-y-2 text-purple-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">👆</span>
                          Tap to drop each block
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🎯</span>
                          Line them up to stack higher!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚠️</span>
                          Overhangs fall off
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={startGame}
                      className="w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg relative overflow-hidden group"
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span>Start Game</span>
                        <span className="text-xl">🚀</span>
                      </span>
                    </motion.button>
                  </>
                ) : gameEnded && finalRewards ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">
                        {score >= 20 ? '✨' : score >= 10 ? '🎉' : '🎮'}
                      </div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Game Over!
                      </h2>
                      <p className="text-purple-800 text-center mb-2 text-2xl font-bold">
                        Stack height: {score}
                      </p>
                      <p className="text-purple-600 text-center mb-4 text-sm font-medium">
                        {score >= 20 ? '🌟 Exceptional performance!' : score >= 10 ? '🎯 Good job!' : '💪 Keep practicing!'}
                      </p>
                      
                      {hadEnergyAtStart && finalRewards && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-purple-200">
                          <p className="text-purple-700 font-bold text-lg mb-2">Rewards:</p>
                          <div className="flex flex-col gap-2 text-purple-800">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xl">⭐</span>
                              <span className="font-semibold">+{finalRewards.xp} XP</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xl">💰</span>
                              <span className="font-semibold">+{finalRewards.coins} Coins</span>
                            </div>
                            {finalRewards.opals && (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">🪬</span>
                                <span className="font-semibold">+{finalRewards.opals} Opals</span>
                              </div>
                            )}
                            <p className="text-xs text-purple-600 mt-1">
                              Tier: {finalRewards.tier.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-purple-200">
                          <p className="text-purple-700 font-bold text-lg mb-2">No Energy!</p>
                          <p className="text-purple-600 text-center text-sm">
                            Played for fun but no rewards earned.<br />
                            Energy regenerates over time.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={startGame}
                        className="flex-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg"
                        whileTap={{ scale: 0.95 }}
                      >
                        Play Again
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          if (hadEnergyAtStart && finalRewards) {
                            onEnd({
                              score,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: finalRewards.xp,
                              coins: finalRewards.coins,
                              opals: finalRewards.opals,
                            });
                          } else {
                            onEnd({
                              score,
                              tier: 'normal',
                              xp: 0,
                              coins: 0,
                            });
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold py-3 rounded-xl shadow-lg"
                        whileTap={{ scale: 0.95 }}
                      >
                        Back to Games
                      </motion.button>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}

        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            touchAction: 'none',
            display: 'block',
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,
          }}
        />
      </div>
    </GameWrapper>
  );
}