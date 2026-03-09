/**
 * Flappy Fish Hooks - Simple Flappy Bird clone
 * Maximum simplicity for mobile performance
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps } from './types';
import { calculateRewards } from './config';

const CANVAS_W = 360;
const CANVAS_H = 640;
const GRAVITY_BASE = 0.35;
const JUMP_FORCE = -6.5;
const HOOK_SPEED_BASE = 2.5;
const HOOK_GAP_BASE = 200;
const HOOK_WIDTH_BASE = 50;
const HOOK_INTERVAL_BASE = 2500;

interface Hook {
  x: number;
  gapY: number;
  gap: number;
  width: number;
  scored: boolean;
}

export function FlappyFishHooks({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    ctx: CanvasRenderingContext2D | null;
    running: boolean;
    paused: boolean;
    score: number;
    hadEnergy: boolean;
    bird: { x: number; y: number; vy: number; size: number };
    hooks: Hook[];
    lastHookTime: number;
    frameId: number | null;
  }>({
    ctx: null,
    running: false,
    paused: false,
    score: 0,
    hadEnergy: false,
    bird: { x: 80, y: CANVAS_H / 2, vy: 0, size: 22 },
    hooks: [],
    lastHookTime: 0,
    frameId: null,
  });

  // Ultra-simple game loop - stored in ref to prevent recreation
  const gameLoopRef = useRef<() => void>();
  
  gameLoopRef.current = () => {
    const g = gameRef.current;
    if (!g.running || g.paused || !g.ctx) {
      g.frameId = null;
      return;
    }

    const ctx = g.ctx;
    const bird = g.bird;
    const hooks = g.hooks;
    const now = performance.now();

    // Progressive difficulty based on score
    // Piecewise scaling: 20% at 15, 40% at 25, 70% at 40, 100% at 60
    let difficulty = 0;
    if (g.score < 15) {
      difficulty = (g.score / 15) * 0.2; // 0 to 20%
    } else if (g.score < 25) {
      difficulty = 0.2 + ((g.score - 15) / 10) * 0.2; // 20% to 40%
    } else if (g.score < 40) {
      difficulty = 0.4 + ((g.score - 25) / 15) * 0.3; // 40% to 70%
    } else if (g.score < 60) {
      difficulty = 0.7 + ((g.score - 40) / 20) * 0.3; // 70% to 100%
    } else {
      difficulty = 1.0; // Max at 60+
    }
    
    const gravity = GRAVITY_BASE * (1 + difficulty * 0.4); // +40% max
    const hookSpeed = HOOK_SPEED_BASE * (1 + difficulty * 0.5); // +50% max
    // Hook gap and interval stay constant - only speed and gravity change

    // Clear - single operation
    ctx.fillStyle = '#1a3a4a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Bird physics - progressive gravity
    bird.vy += gravity;
    bird.y += bird.vy;

    // Spawn hooks - constant interval and gap
    if (now - g.lastHookTime > HOOK_INTERVAL_BASE) {
      const lastHook = hooks[hooks.length - 1];
      if (!lastHook || lastHook.x < CANVAS_W - 200) {
        // Simple random gap - constant size
        const gapY = 80 + Math.random() * (CANVAS_H - 200);
        // Reuse hook object if available
        let hook = hooks.find(h => h.x < -100);
        if (hook) {
          hook.x = CANVAS_W;
          hook.gapY = gapY;
          hook.gap = HOOK_GAP_BASE;
          hook.scored = false;
        } else {
          hooks.push({ x: CANVAS_W, gapY, gap: HOOK_GAP_BASE, width: HOOK_WIDTH_BASE, scored: false });
        }
        g.lastHookTime = now;
      }
    }

    // Process hooks - minimal operations
    const bx = bird.x;
    const by = bird.y;
    const bs = bird.size;
    const bLeft = bx - bs;
    const bRight = bx + bs;
    const bTop = by - bs;
    const bBottom = by + bs;

    // Process hooks - ultra-simplified
    ctx.fillStyle = '#666';
    
    // Process only first 3 hooks (most visible ones)
    const maxProcess = Math.min(3, hooks.length);
    for (let i = 0; i < maxProcess; i++) {
      const h = hooks[i];
      h.x -= hookSpeed; // Progressive speed

      // Skip off-screen
      if (h.x + h.width < -10 || h.x > CANVAS_W) {
        continue;
      }

      const top = h.gapY - h.gap / 2;
      const bottom = h.gapY + h.gap / 2;
      
      // Draw - batch operations
      ctx.fillRect(h.x, 0, h.width, top);
      ctx.fillRect(h.x, bottom, h.width, CANVAS_H - bottom);

      // Score
      if (!h.scored && h.x + h.width < bx) {
        h.scored = true;
        g.score += 1;
      }

      // Collision - ultra-simple
      if (h.x < bRight && h.x + h.width > bLeft) {
        if (bTop < top || bBottom > bottom) {
          g.running = false;
          g.frameId = null;
          setScore(g.score);
          const rewards = g.hadEnergy 
            ? calculateRewards('fish-hooks', g.score)
            : { tier: 'normal', xp: 0, coins: 0, opals: undefined };
          setFinalRewards({
            tier: rewards.tier,
            xp: rewards.xp,
            coins: rewards.coins,
            opals: rewards.opals,
          });
          setGameEnded(true);
          setShowOverlay(true);
          return;
        }
      }
    }

    // Boundary check
    if (bBottom > CANVAS_H || bTop < 0) {
      g.running = false;
      g.frameId = null;
      setScore(g.score);
      const rewards = g.hadEnergy 
        ? calculateRewards('fish-hooks', g.score)
        : { tier: 'normal', xp: 0, coins: 0, opals: undefined };
      setFinalRewards({
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
      setGameEnded(true);
      setShowOverlay(true);
      return;
    }

    // Draw bird - single circle only
    ctx.fillStyle = '#E8A0BF';
    ctx.beginPath();
    ctx.arc(bx, by, bs, 0, Math.PI * 2);
    ctx.fill();

    // Score on canvas
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${g.score}`, CANVAS_W - 10, 28);

    // Continue loop - self-managing, no React
    if (g.running && !g.paused && g.ctx) {
      g.frameId = requestAnimationFrame(gameLoopRef.current!);
    } else {
      g.frameId = null;
    }
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { 
      alpha: false, 
      desynchronized: true 
    });
    if (!ctx) return;

    gameRef.current.ctx = ctx;

    const handleTap = (e: Event) => {
      e.preventDefault();
      if (gameRef.current.running && !gameRef.current.paused) {
        gameRef.current.bird.vy = JUMP_FORCE;
      }
    };

    canvas.addEventListener('touchstart', handleTap, { passive: false });
    canvas.addEventListener('click', handleTap);

    return () => {
      canvas.removeEventListener('touchstart', handleTap);
      canvas.removeEventListener('click', handleTap);
      if (gameRef.current.frameId) {
        cancelAnimationFrame(gameRef.current.frameId);
      }
    };
  }, []);

  // Game loop manages itself - no React dependencies
  // Loop will check its own state and continue/stop accordingly

  const startGame = () => {
    const g = gameRef.current;
    g.hadEnergy = energy > 0;
    g.running = true;
    g.paused = false;
    g.score = 0;
    g.bird = { x: 80, y: CANVAS_H / 2, vy: 0, size: 22 };
    g.hooks = [];
    g.lastHookTime = performance.now();
    
    setScore(0);
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    
    if (g.ctx && !g.frameId) {
      g.frameId = requestAnimationFrame(gameLoopRef.current!);
    }
  };

  const handlePause = () => {
    const g = gameRef.current;
    g.paused = !g.paused;
    if (g.running && !g.paused && g.ctx && !g.frameId) {
      g.frameId = requestAnimationFrame(gameLoopRef.current!);
    } else if (g.paused && g.frameId) {
      cancelAnimationFrame(g.frameId);
      g.frameId = null;
    }
  };

  return (
    <GameWrapper
      gameName="Fish Hooks"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={handlePause}
      isPaused={gameRef.current.paused}
    >
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100" style={{ margin: 0, padding: 0 }}>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-violet-900/80 via-purple-900/80 to-indigo-900/80 backdrop-blur-md z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100 rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-purple-300/80 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/30 rounded-full blur-xl -ml-12 -mb-12" />
              
              <div className="relative z-10">
                {!gameRef.current.running && !gameEnded ? (
                  <>
                    <div className="text-center mb-6">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-6xl mb-4"
                      >
                        🪝
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Fish Hooks
                      </h2>
                      <div className="space-y-2 text-purple-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">👆</span>
                          Tap or click to swim up
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚠️</span>
                          Avoid the hooks!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🎯</span>
                          Pass as many as you can
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
                        Score: {score} hooks passed
                      </p>
                      <p className="text-purple-600 text-center mb-4 text-sm font-medium">
                        {score >= 20 ? '🌟 Exceptional performance!' : score >= 10 ? '🎯 Good job!' : '💪 Keep practicing!'}
                      </p>
                      
                      {gameRef.current.hadEnergy && finalRewards && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
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
                          if (gameRef.current.hadEnergy && finalRewards) {
                            onEnd({
                              score: score,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: finalRewards.xp,
                              coins: finalRewards.coins,
                              opals: finalRewards.opals,
                            });
                          } else {
                            onEnd({
                              score: score,
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