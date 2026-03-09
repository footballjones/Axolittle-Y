/**
 * Treasure Hunt Cave - Explore cave, collect gems, avoid obstacles
 * Optimized for mobile with canvas rendering
 * Score = gems collected + distance traveled
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const CANVAS_W = 360;
const CANVAS_H = 640;
const PLAYER_SPEED = 1.2; // Slower speed
const OBSTACLE_SPAWN_RATE = 0.012; // Slower spawn rate
const GEM_SPAWN_RATE = 0.01; // Slower spawn rate
const STAMINA_MAX = 100;
const STAMINA_DECAY = 0.06; // Slower decay

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rock' | 'creature';
}

interface Gem {
  id: number;
  x: number;
  y: number;
  value: number;
}

class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export function TreasureHuntCave({ onEnd, energy }: MiniGameProps) {
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
    playerY: number; // percentage
    obstacles: Obstacle[];
    gems: Gem[];
    stamina: number;
    distance: number;
    gemsCollected: number;
    obstacleId: number;
    gemId: number;
    rng: SeededRandom;
    lastFrameTime: number;
    onGameEnd: (() => void) | null;
  }>({
    isPlaying: false,
    isPaused: false,
    playerY: 50,
    obstacles: [],
    gems: [],
    stamina: STAMINA_MAX,
    distance: 0,
    gemsCollected: 0,
    obstacleId: 0,
    gemId: 0,
    rng: new SeededRandom(Date.now()),
    lastFrameTime: 0,
    onGameEnd: null,
  });

  const handleMove = useCallback((direction: 'up' | 'down') => {
    const game = gameRef.current;
    if (!game.isPlaying || game.isPaused) return;
    
    const moveAmount = direction === 'up' ? -2.5 : 2.5; // Slower movement
    game.playerY = Math.max(10, Math.min(85, game.playerY + moveAmount));
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const game = gameRef.current;
    if (!game) return;
    
    // Background
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    
    // Cave walls gradient
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_W, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw obstacles
    for (const obs of game.obstacles) {
      const x = (obs.x / 100) * CANVAS_W;
      const y = (obs.y / 100) * CANVAS_H;
      const w = (obs.width / 100) * CANVAS_W;
      const h = (obs.height / 100) * CANVAS_H;
      
      if (obs.type === 'rock') {
        ctx.fillStyle = '#374151';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      } else {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        // Draw creature emoji (simplified)
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👹', x + w / 2, y + h / 2 + 5);
      }
    }

    // Draw gems
    for (const gem of game.gems) {
      const x = (gem.x / 100) * CANVAS_W;
      const y = (gem.y / 100) * CANVAS_H;
      
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      const emoji = gem.value === 3 ? '💎' : gem.value === 2 ? '💍' : '💠';
      ctx.fillText(emoji, x, y);
    }

    // Draw player
    const playerX = (20 / 100) * CANVAS_W;
    const playerY = (game.playerY / 100) * CANVAS_H;
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🦎', playerX, playerY);
  }, []);

  const gameLoop = useCallback(() => {
    const game = gameRef.current;
    const ctx = ctxRef.current;
    if (!game.isPlaying || game.isPaused || !ctx) return;
    const now = performance.now();
    const deltaTime = game.lastFrameTime > 0 ? (now - game.lastFrameTime) / 16.67 : 1;
    game.lastFrameTime = now;

    // Update distance
    game.distance += PLAYER_SPEED * deltaTime;

    // Update stamina
    game.stamina -= STAMINA_DECAY * deltaTime;
    if (game.stamina <= 0) {
      game.stamina = 0;
      if (game.onGameEnd) game.onGameEnd();
      return;
    }

    // Move obstacles
    const playerX = 20;
    const playerSize = 8;
    const playerYPercent = game.playerY;
    
    for (let i = game.obstacles.length - 1; i >= 0; i--) {
      const obs = game.obstacles[i];
      obs.x -= PLAYER_SPEED * deltaTime;

      // Remove off-screen
      if (obs.x + obs.width < 0) {
        game.obstacles.splice(i, 1);
        continue;
      }

      // Collision check
      if (
        playerX < obs.x + obs.width &&
        playerX + playerSize > obs.x &&
        playerYPercent < obs.y + obs.height &&
        playerYPercent + playerSize > obs.y
      ) {
        if (game.onGameEnd) game.onGameEnd();
        return;
      }
    }

    // Move gems
    for (let i = game.gems.length - 1; i >= 0; i--) {
      const gem = game.gems[i];
      gem.x -= PLAYER_SPEED * deltaTime;

      // Collection check
      if (
        playerX < gem.x + 5 &&
        playerX + playerSize > gem.x - 5 &&
        playerYPercent < gem.y + 5 &&
        playerYPercent + playerSize > gem.y - 5
      ) {
        game.gemsCollected += gem.value;
        game.score += gem.value;
        setScore(game.score);
        game.gems.splice(i, 1);
        continue;
      }

      // Remove off-screen
      if (gem.x < -10) {
        game.gems.splice(i, 1);
      }
    }

    // Spawn obstacles
    if (game.rng.next() < OBSTACLE_SPAWN_RATE) {
      const obstacleY = 20 + game.rng.next() * 60;
      const obstacleHeight = 10 + game.rng.next() * 20;
      const obstacleType = game.rng.next() < 0.5 ? 'rock' : 'creature';
      
      game.obstacles.push({
        id: game.obstacleId++,
        x: 100,
        y: obstacleY,
        width: 8,
        height: obstacleHeight,
        type: obstacleType,
      });
    }

    // Spawn gems
    if (game.rng.next() < GEM_SPAWN_RATE) {
      const gemY = 15 + game.rng.next() * 70;
      const gemValue = game.rng.next() < 0.6 ? 1 : game.rng.next() < 0.8 ? 2 : 3;
      
      game.gems.push({
        id: game.gemId++,
        x: 100,
        y: gemY,
        value: gemValue,
      });
    }

    // Draw
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    draw(ctx);

    // Draw HUD
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(10, 10, 140, 60);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 140, 60);

    // Stamina bar
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Stamina', 15, 25);
    ctx.fillStyle = '#000';
    ctx.fillRect(15, 30, 130, 8);
    ctx.fillStyle = game.stamina > 50 ? '#22c55e' : game.stamina > 25 ? '#eab308' : '#ef4444';
    ctx.fillRect(15, 30, (game.stamina / STAMINA_MAX) * 130, 8);

    // Score
    ctx.fillStyle = '#fff';
    ctx.fillText(`💎 ${game.gemsCollected}`, 15, 50);
    ctx.fillText(`Distance: ${Math.floor(game.distance)}`, 15, 65);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  const endGame = useCallback(() => {
    const game = gameRef.current;
    game.isPlaying = false;
    setGameEnded(true);
    
    const totalScore = game.gemsCollected + Math.floor(game.distance / 10);
    game.score = totalScore;
    setScore(totalScore);
    
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('treasure-hunt', totalScore);
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
    const ctx = ctxRef.current;
    
    game.isPlaying = true;
    game.isPaused = false;
    game.playerY = 50;
    game.obstacles = [];
    game.gems = [];
    game.stamina = STAMINA_MAX;
    game.distance = 0;
    game.gemsCollected = 0;
    game.obstacleId = 0;
    game.gemId = 0;
    game.rng = new SeededRandom(Date.now());
    game.lastFrameTime = 0;
    game.score = 0;
    setScore(0);
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    
    // Draw initial frame
    if (ctx) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      draw(ctx);
    }
    
    // Start game loop immediately
    if (ctx && !animationFrameRef.current) {
      game.lastFrameTime = performance.now();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
  }, [energy, draw, gameLoop]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !ctxRef.current) {
      const ctx = canvas.getContext('2d', { 
        alpha: false, 
        desynchronized: true 
      });
      if (ctx) {
        ctxRef.current = ctx;
        // Draw initial frame
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }
    }
  }, []);

  // Set up game end handler
  useEffect(() => {
    gameRef.current.onGameEnd = endGame;
  }, [endGame]);

  // Touch/click handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTop = (e: Event) => {
      e.preventDefault();
      handleMove('up');
    };

    const handleBottom = (e: Event) => {
      e.preventDefault();
      handleMove('down');
    };

    // Split canvas into top and bottom halves
    const rect = canvas.getBoundingClientRect();
    const handleCanvasTap = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const y = clientY - rect.top;
      if (y < rect.height / 2) {
        handleMove('up');
      } else {
        handleMove('down');
      }
    };

    canvas.addEventListener('touchstart', handleCanvasTap, { passive: false });
    canvas.addEventListener('click', handleCanvasTap);

    return () => {
      canvas.removeEventListener('touchstart', handleCanvasTap);
      canvas.removeEventListener('click', handleCanvasTap);
    };
  }, [handleMove]);

  // Start game loop - watch for game state changes
  useEffect(() => {
    const game = gameRef.current;
    const ctx = ctxRef.current;
    
    if (game.isPlaying && !game.isPaused && ctx && !showOverlay) {
      // Start loop if not already running
      if (!animationFrameRef.current) {
        game.lastFrameTime = performance.now();
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      }
    } else {
      // Stop loop
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
      gameName="Treasure Hunt Cave"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={() => {
        gameRef.current.isPaused = !gameRef.current.isPaused;
      }}
      isPaused={gameRef.current.isPaused}
    >
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900">
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-amber-900/80 via-amber-800/80 to-amber-900/80 backdrop-blur-md z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-amber-100 via-amber-50 to-amber-100 rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-amber-300/80 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-200/30 rounded-full blur-xl -ml-12 -mb-12" />
              
              <div className="relative z-10">
                {!gameRef.current.isPlaying && !gameEnded ? (
                  <>
                    <div className="text-center mb-6">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-6xl mb-4"
                      >
                        💎
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-800 mb-4">
                        Treasure Hunt Cave
                      </h2>
                      <div className="space-y-2 text-amber-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">👆</span>
                          Tap top/bottom to move up/down
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">💎</span>
                          Collect gems for points
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚠️</span>
                          Avoid rocks and creatures!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚡</span>
                          Watch your stamina
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={startGame}
                      className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg relative overflow-hidden group"
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
                        {score >= 50 ? '✨' : score >= 25 ? '🎉' : '🎮'}
                      </div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-800 mb-4">
                        Game Over!
                      </h2>
                      <p className="text-amber-800 text-center mb-2 text-2xl font-bold">
                        Score: {score}
                      </p>
                      <p className="text-amber-600 text-center mb-4 text-sm font-medium">
                        {score >= 50 ? '🌟 Exceptional treasure hunter!' : score >= 25 ? '🎯 Great exploration!' : '💪 Keep exploring!'}
                      </p>
                      
                      {hadEnergyAtStart && finalRewards && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-amber-200">
                          <p className="text-amber-700 font-bold text-lg mb-2">Rewards:</p>
                          <div className="flex flex-col gap-2 text-amber-800">
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
                            <p className="text-xs text-amber-600 mt-1">
                              Tier: {finalRewards.tier.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-amber-200">
                          <p className="text-amber-700 font-bold text-lg mb-2">No Energy!</p>
                          <p className="text-amber-600 text-center text-sm">
                            Played for fun but no rewards earned.<br />
                            Energy regenerates over time.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={startGame}
                        className="flex-1 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white font-bold py-3 rounded-xl shadow-lg"
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