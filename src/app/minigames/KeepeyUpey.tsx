/**
 * Keepey Upey - Keep the axolotl afloat
 * Tap to bounce/lift. Gravity pulls down. Obstacles move across.
 * Score = survival time in seconds
 * Features: Canvas rendering, physics ramping, dual obstacles, visual effects
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const CANVAS_W = 360;
const CANVAS_H = 640;
const GRAVITY_BASE = 0.25;
const GRAVITY_RAMP = 0.004;       // +0.004 per second survived
const BOUNCE_FORCE_BASE = -7;
const BOUNCE_WEAKEN = 0.02;       // bounce weakens over time
const OBSTACLE_SPEED_BASE = 1.5;
const OBSTACLE_SPEED_RAMP = 0.04; // faster ramp than before

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Bubble {
  x: number;
  y: number;
  size: number;
  life: number;
}

export function KeepeyUpey({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0); // Time survived in seconds
  const [isPlaying, setIsPlaying] = useState(false); // Start with false, show overlay first
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false); // Track if energy was available when game started
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTouchTimeRef = useRef<number>(0);
  const gameStateRef = useRef<{
    axo: { x: number; y: number; vy: number; size: number };
    obstacles: Obstacle[];
    bubbles: Bubble[];
    lastObstacleTime: number;
    startTime: number;
  }>({
    axo: { x: CANVAS_W / 2, y: CANVAS_H / 2, vy: 0, size: 24 },
    obstacles: [],
    bubbles: [],
    lastObstacleTime: 0,
    startTime: 0,
  });

  const reset = useCallback(() => {
    gameStateRef.current = {
      axo: { x: CANVAS_W / 2, y: CANVAS_H / 2, vy: 0, size: 24 },
      obstacles: [],
      bubbles: [],
      lastObstacleTime: 0,
      startTime: performance.now(),
    };
    setScore(0);
  }, []);

  const bounce = useCallback(() => {
    if (!isPlaying || isPaused) return;
    // Bounce gets weaker over time — harder to stay up
    const force = Math.min(-3, BOUNCE_FORCE_BASE + score * BOUNCE_WEAKEN);
    gameStateRef.current.axo.vy = force;
    // Spawn decorative bubble
    gameStateRef.current.bubbles.push({
      x: gameStateRef.current.axo.x,
      y: gameStateRef.current.axo.y + gameStateRef.current.axo.size,
      size: 4 + Math.random() * 6,
      life: 1,
    });
  }, [isPlaying, isPaused, score]);

  const spawnObstacle = useCallback(() => {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const y = 50 + Math.random() * (CANVAS_H - 150);
    // Obstacles grow wider and taller over time
    const widthGrow = Math.min(60, score * 1.5);
    const width = 60 + Math.random() * 80 + widthGrow;
    const height = 18 + Math.random() * 12 + Math.min(20, score * 0.5);
    const speed = (OBSTACLE_SPEED_BASE + score * OBSTACLE_SPEED_RAMP) * (side === 'left' ? 1 : -1);
    gameStateRef.current.obstacles.push({ x: side === 'left' ? -width : CANVAS_W, y, width, height, speed });

    // After 15s, chance of a second obstacle from the other side
    if (score > 15 && Math.random() < Math.min(0.6, (score - 15) * 0.03)) {
      const otherSide = side === 'left' ? 'right' : 'left';
      const y2 = 50 + Math.random() * (CANVAS_H - 150);
      const w2 = 50 + Math.random() * 70 + widthGrow * 0.5;
      const h2 = 16 + Math.random() * 10 + Math.min(14, score * 0.3);
      const spd2 = (OBSTACLE_SPEED_BASE + score * OBSTACLE_SPEED_RAMP) * (otherSide === 'left' ? 1 : -1);
      gameStateRef.current.obstacles.push({ x: otherSide === 'left' ? -w2 : CANVAS_W, y: y2, width: w2, height: h2, speed: spd2 });
    }
  }, [score]);

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameEnded(true);
    // Only calculate and show rewards if energy was available at start
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('keepey-upey', score);
      setFinalRewards({
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    } else {
      // No rewards if no energy
      setFinalRewards({
        tier: 'normal',
        xp: 0,
        coins: 0,
        opals: undefined,
      });
    }
    setShowOverlay(true);
  }, [score, hadEnergyAtStart]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { axo, obstacles, bubbles } = gameStateRef.current;
    
    // Background
    ctx.fillStyle = '#132a38';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle gradient at bottom (floor danger zone)
    const grad = ctx.createLinearGradient(0, CANVAS_H - 60, 0, CANVAS_H);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(239, 83, 80, 0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, CANVAS_H - 60, CANVAS_W, 60);

    // Water particles
    ctx.fillStyle = 'rgba(100, 200, 255, 0.06)';
    for (let i = 0; i < 20; i++) {
      const px = (i * 73 + performance.now() * 0.01) % CANVAS_W;
      const py = (i * 137 + performance.now() * 0.008) % CANVAS_H;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Decorative bubbles
    for (const b of bubbles) {
      ctx.fillStyle = `rgba(100, 200, 255, ${b.life * 0.4})`;
      ctx.beginPath();
      ctx.arc(b.x + Math.sin(b.y * 0.1) * 5, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Obstacles (rocks / coral)
    for (const ob of obstacles) {
      // Draw rounded rectangle (polyfill for roundRect if not available)
      const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
        if (ctx.roundRect) {
          ctx.roundRect(x, y, w, h, r);
        } else {
          // Polyfill for browsers without roundRect
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
        }
      };

      ctx.fillStyle = '#5a3a2a';
      ctx.beginPath();
      drawRoundedRect(ob.x, ob.y, ob.width, ob.height, 6);
      ctx.fill();
      ctx.fillStyle = '#6b4a38';
      ctx.beginPath();
      drawRoundedRect(ob.x + 3, ob.y + 3, ob.width - 6, ob.height - 6, 4);
      ctx.fill();
    }

    // Axolotl
    const bx = axo.x, by = axo.y, bs = axo.size;
    // Body
    ctx.fillStyle = '#E8A0BF';
    ctx.beginPath();
    ctx.arc(bx, by, bs, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(bx + 6, by - 5, 3, 0, Math.PI * 2);
    ctx.arc(bx + 6, by + 5, 3, 0, Math.PI * 2);
    ctx.fill();
    // Gills
    ctx.strokeStyle = '#D48BA8';
    ctx.lineWidth = 2;
    for (const dy of [-10, -6, 6, 10]) {
      ctx.beginPath();
      ctx.moveTo(bx - bs + 2, by + dy);
      ctx.lineTo(bx - bs - 8, by + dy + (dy > 0 ? 3 : -3));
      ctx.stroke();
    }

    // Timer display
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${score}s`, CANVAS_W / 2, 30);
  }, [score]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const elapsed = (now - gameStateRef.current.startTime) / 1000;
    setScore(Math.floor(elapsed));

    const { axo, obstacles, bubbles } = gameStateRef.current;

    // Axo physics — gravity increases over time
    const gravity = GRAVITY_BASE + score * GRAVITY_RAMP;
    axo.vy += gravity;
    axo.y += axo.vy;

    // Horizontal drift toward center
    axo.x += (CANVAS_W / 2 - axo.x) * 0.01;

    // Spawn obstacles — interval shrinks over time, lower floor
    const interval = Math.max(500, 2000 - score * 25);
    if (now - gameStateRef.current.lastObstacleTime > interval) {
      spawnObstacle();
      gameStateRef.current.lastObstacleTime = now;
    }

    // Move obstacles
    for (const ob of obstacles) {
      ob.x += ob.speed;
    }
    gameStateRef.current.obstacles = obstacles.filter(ob => ob.x > -200 && ob.x < CANVAS_W + 200);

    // Collision with obstacles
    for (const ob of obstacles) {
      if (
        axo.x + axo.size > ob.x &&
        axo.x - axo.size < ob.x + ob.width &&
        axo.y + axo.size > ob.y &&
        axo.y - axo.size < ob.y + ob.height
      ) {
        endGame();
        return;
      }
    }

    // Floor / ceiling
    if (axo.y + axo.size > CANVAS_H || axo.y - axo.size < 0) {
      endGame();
      return;
    }

    // Update bubbles
    for (const b of bubbles) {
      b.y += 1;
      b.life -= 0.02;
    }
    gameStateRef.current.bubbles = bubbles.filter(b => b.life > 0);

    // Draw everything
    draw(ctx);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, score, spawnObstacle, endGame, draw]);

  const startGame = useCallback(() => {
    // Store whether energy was available when game started
    setHadEnergyAtStart(energy > 0);
    reset();
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    setIsPlaying(true);
    setIsPaused(false);
    gameStateRef.current.startTime = performance.now();
    // Initial draw
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx);
      }
    }
  }, [reset, draw, energy]);

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

  return (
    <GameWrapper
      gameName="Keepey Upey"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100 overflow-hidden">
        {/* Start/End Overlay */}
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
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/30 rounded-full blur-xl -ml-12 -mb-12" />
              
              <div className="relative z-10">
                {!isPlaying && !gameEnded ? (
                  <>
                    <div className="text-center mb-6">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-6xl mb-4"
                      >
                        🪁
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Keepey Upey
                      </h2>
                      <div className="space-y-2 text-purple-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">👆</span>
                          Tap to bounce upward!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚡</span>
                          Stay afloat as long as you can
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🎯</span>
                          Avoid obstacles and walls
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={startGame}
                      className="w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg relative overflow-hidden group"
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span>Start Game</span>
                        <span className="text-xl">🚀</span>
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                    </motion.button>
                  </>
                ) : gameEnded && finalRewards ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">
                        {score >= 30 ? '✨' : score >= 15 ? '🎉' : '🎮'}
                      </div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Game Over!
                      </h2>
                      <p className="text-purple-800 text-center mb-2 text-2xl font-bold">
                        Survived: {score} seconds
                      </p>
                      <p className="text-purple-600 text-center mb-4 text-sm font-medium">
                        {score >= 30 ? '🌟 Exceptional performance!' : score >= 15 ? '🎯 Good job!' : '💪 Keep practicing!'}
                      </p>
                      
                      {/* Rewards display - only show if energy was used */}
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
                        onClick={() => {
                          setGameEnded(false);
                          setFinalRewards(null);
                          startGame();
                        }}
                        className="flex-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg relative overflow-hidden group"
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <span className="relative z-10">Play Again</span>
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          // Call onEnd with actual rewards when leaving (only if energy was used)
                          if (hadEnergyAtStart && finalRewards) {
                            onEnd({
                              score,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: finalRewards.xp,
                              coins: finalRewards.coins,
                              opals: finalRewards.opals,
                            });
                          } else {
                            // No rewards if no energy
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
                        whileHover={{ scale: 1.02 }}
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

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ 
            touchAction: 'none', 
            display: 'block',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
          onClick={(e) => {
            // Ignore click if it happened shortly after a touch event (mobile double-tap prevention)
            const now = performance.now();
            if (now - lastTouchTimeRef.current < 300) {
              e.preventDefault();
              return;
            }
            bounce();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            lastTouchTimeRef.current = performance.now();
            bounce();
          }}
        />

        {/* Tap instruction overlay (first 3 seconds) */}
        {isPlaying && score < 3 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1, delay: 2 }}
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 border-2 border-purple-400">
              <p className="text-purple-800 font-bold text-lg text-center">
                Tap to bounce! 🎈
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </GameWrapper>
  );
}
