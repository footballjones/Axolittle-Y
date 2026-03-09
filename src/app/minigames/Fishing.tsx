/**
 * Fishing - Competitive fishing game
 * Player vs bot axolotl. Click & hold to lower line, release to reel up.
 * Catch the most weight in 45 seconds to win!
 * Features: Canvas rendering, 4 fish types, stat integration, bot AI
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const CANVAS_W = 360;
const CANVAS_H = 640;
const WATERLINE_Y = 140;
const SEABED_Y = 580;
const LINE_DESCEND_BASE = 2.8;
const LINE_DESCEND_SPEED_BONUS = 1.4; // max bonus from speed stat
const LINE_ASCEND_SPEED = 5;
const GAME_DURATION = 45; // 45 seconds
const ESCAPE_TIMEOUT = 2000;

const PLAYER_BOAT_X = 90;
const BOT_BOAT_X = 270;
const BOAT_Y = 100;

const FISH_TYPES = {
  minnow:  { weight: 1,  speed: 2.5, depthMin: 200, depthMax: 320, breakFree: 0,    strengthDiv: Infinity, color: '#c0c0c0', w: 16, h: 8  },
  perch:   { weight: 3,  speed: 1.8, depthMin: 280, depthMax: 420, breakFree: 0.20, strengthDiv: 200,      color: '#66bb6a', w: 22, h: 12 },
  bass:    { weight: 6,  speed: 1.2, depthMin: 380, depthMax: 520, breakFree: 0.45, strengthDiv: 150,      color: '#2e7d32', w: 30, h: 16 },
  catfish: { weight: 10, speed: 0.8, depthMin: 460, depthMax: 570, breakFree: 0.70, strengthDiv: 120,      color: '#8d6e63', w: 36, h: 18 },
};

const SPAWN_TABLE = [
  { type: 'minnow',  cumWeight: 0.45 },
  { type: 'perch',   cumWeight: 0.75 },
  { type: 'bass',    cumWeight: 0.93 },
  { type: 'catfish', cumWeight: 1.00 },
];

type FishTypeName = keyof typeof FISH_TYPES;

interface Fish {
  typeName: FishTypeName;
  type: typeof FISH_TYPES[FishTypeName];
  x: number;
  y: number;
  baseY: number;
  direction: number; // 1 or -1
  speed: number;
  caught: boolean;
  phase: number;
}

type PlayerState = 'IDLE' | 'CASTING' | 'HOOKED' | 'REELING';
type BotState = 'BOT_IDLE' | 'BOT_CASTING' | 'BOT_HOOKED' | 'BOT_REELING';

interface EscapeEffect {
  x: number;
  y: number;
  life: number;
}

const BOT_CATCH_RATES: Record<FishTypeName, number> = {
  minnow: 1.0,
  perch: 0.88,
  bass: 0.59,
  catfish: 0.20,
};

function pickFishType(): FishTypeName {
  const r = Math.random();
  for (const entry of SPAWN_TABLE) {
    if (r <= entry.cumWeight) return entry.type as FishTypeName;
  }
  return 'minnow';
}

export function Fishing({ onEnd, energy, strength = 0, speed = 0 }: MiniGameProps) {
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const gameStateRef = useRef<{
    playerState: PlayerState;
    playerLineY: number;
    playerHooked: Fish | null;
    playerHookTime: number;
    botState: BotState;
    botLineY: number;
    botHooked: Fish | null;
    botHookTime: number;
    botReelDelay: number;
    botTargetDepth: number;
    botNextCast: number;
    fish: Fish[];
    escapeEffects: EscapeEffect[];
    lastSpawn: number;
    gameStartTime: number;
    lineDescendSpeed: number;
  }>({
    playerState: 'IDLE',
    playerLineY: BOAT_Y,
    playerHooked: null,
    playerHookTime: 0,
    botState: 'BOT_IDLE',
    botLineY: BOAT_Y,
    botHooked: null,
    botHookTime: 0,
    botReelDelay: 0,
    botTargetDepth: 300,
    botNextCast: 0,
    fish: [],
    escapeEffects: [],
    lastSpawn: 0,
    gameStartTime: 0,
    lineDescendSpeed: LINE_DESCEND_BASE,
  });

  const reset = useCallback(() => {
    // Calculate line descend speed based on speed stat
    const lineDescendSpeed = LINE_DESCEND_BASE + (speed / 100) * LINE_DESCEND_SPEED_BONUS;
    
    gameStateRef.current = {
      playerState: 'IDLE',
      playerLineY: BOAT_Y,
      playerHooked: null,
      playerHookTime: 0,
      botState: 'BOT_IDLE',
      botLineY: BOAT_Y,
      botHooked: null,
      botHookTime: 0,
      botReelDelay: 0,
      botTargetDepth: 300,
      botNextCast: performance.now() + 1500,
      fish: [],
      escapeEffects: [],
      lastSpawn: 0,
      gameStartTime: performance.now(),
      lineDescendSpeed,
    };
    setPlayerScore(0);
    setBotScore(0);
    setTimeLeft(GAME_DURATION);
    setIsHolding(false);
  }, [speed]);

  const spawnFish = useCallback(() => {
    const typeName = pickFishType();
    const type = FISH_TYPES[typeName];
    const direction = Math.random() < 0.5 ? 1 : -1;
    const f: Fish = {
      typeName,
      type,
      x: direction === 1 ? -type.w : CANVAS_W + type.w,
      y: type.depthMin + Math.random() * (type.depthMax - type.depthMin),
      baseY: 0,
      direction,
      speed: type.speed * (0.8 + Math.random() * 0.4),
      caught: false,
      phase: Math.random() * Math.PI * 2,
    };
    f.baseY = f.y;
    gameStateRef.current.fish.push(f);
  }, []);

  const removeFish = useCallback((f: Fish) => {
    gameStateRef.current.fish = gameStateRef.current.fish.filter(x => x !== f);
  }, []);

  const addEscape = useCallback((x: number, y: number) => {
    gameStateRef.current.escapeEffects.push({ x, y, life: 1 });
  }, []);

  const botTryCatch = useCallback((now: number) => {
    const { fish, botLineY } = gameStateRef.current;
    for (const f of fish) {
      if (f.caught) continue;
      // Quick distance check
      const dx = Math.abs(f.x - BOT_BOAT_X);
      if (dx > 55) continue;
      const dy = Math.abs(f.y - botLineY);
      if (dy > 40) continue;
      if (dx < 55 && dy < 40) {
        if (Math.random() < (BOT_CATCH_RATES[f.typeName] || 0.5)) {
          f.caught = true;
          gameStateRef.current.botHooked = f;
          gameStateRef.current.botHookTime = now;
          gameStateRef.current.botReelDelay = 0 + Math.random() * 50; // Very fast reel: 0-50ms (almost instant)
          gameStateRef.current.botState = 'BOT_HOOKED';
          return true;
        }
      }
    }
    return false;
  }, []);

  const updatePlayer = useCallback((now: number) => {
    const state = gameStateRef.current;
    const { playerState, playerLineY, playerHooked, playerHookTime, lineDescendSpeed } = state;

    switch (playerState) {
      case 'IDLE':
        state.playerLineY = BOAT_Y;
        if (isHolding) state.playerState = 'CASTING';
        break;

      case 'CASTING':
        if (!isHolding) {
          state.playerState = 'REELING';
          break;
        }
        state.playerLineY = Math.min(SEABED_Y, playerLineY + lineDescendSpeed);
        // Check fish collision - only check nearby fish for performance
        for (const f of state.fish) {
          if (f.caught) continue;
          // Quick distance check first
          const dx = Math.abs(f.x - PLAYER_BOAT_X);
          if (dx > 60) continue; // Skip if too far horizontally
          const dy = Math.abs(f.y - state.playerLineY);
          if (dy > 40) continue; // Skip if too far vertically
          if (dx < f.type.w * 0.8 && dy < f.type.h * 0.8) {
            // Roll break-free
            const chance = f.type.breakFree * Math.max(0, 1 - strength / f.type.strengthDiv);
            if (Math.random() < chance) {
              addEscape(PLAYER_BOAT_X, state.playerLineY);
              break;
            }
            f.caught = true;
            state.playerHooked = f;
            state.playerState = 'HOOKED';
            state.playerHookTime = now;
            break;
          }
        }
        break;

      case 'HOOKED':
        if (playerHooked) {
          playerHooked.x = PLAYER_BOAT_X;
          playerHooked.y = state.playerLineY;
        }
        if (!isHolding) {
          state.playerState = 'REELING';
          break;
        }
        if (now - playerHookTime > ESCAPE_TIMEOUT) {
          addEscape(PLAYER_BOAT_X, state.playerLineY);
          if (playerHooked) {
            playerHooked.caught = false;
            removeFish(playerHooked);
          }
          state.playerHooked = null;
          state.playerState = 'REELING';
        }
        break;

      case 'REELING':
        state.playerLineY = Math.max(BOAT_Y, playerLineY - LINE_ASCEND_SPEED);
        if (playerHooked) {
          playerHooked.x = PLAYER_BOAT_X;
          playerHooked.y = state.playerLineY;
        }
        // Catch fish on the way up if hook is empty and still underwater
        if (!playerHooked && state.playerLineY > WATERLINE_Y) {
          for (const f of state.fish) {
            if (f.caught) continue;
            // Quick distance check first
            const dx = Math.abs(f.x - PLAYER_BOAT_X);
            if (dx > 60) continue;
            const dy = Math.abs(f.y - state.playerLineY);
            if (dy > 40) continue;
            if (dx < f.type.w * 0.8 && dy < f.type.h * 0.8) {
              const chance = f.type.breakFree * Math.max(0, 1 - strength / f.type.strengthDiv);
              if (Math.random() < chance) {
                addEscape(PLAYER_BOAT_X, state.playerLineY);
                break;
              }
              f.caught = true;
              state.playerHooked = f;
              break;
            }
          }
        }
        if (state.playerLineY <= WATERLINE_Y) {
          if (playerHooked) {
            setPlayerScore(prev => prev + playerHooked.type.weight);
            removeFish(playerHooked);
            state.playerHooked = null;
          }
          state.playerState = 'IDLE';
        }
        break;
    }
  }, [isHolding, strength, addEscape, removeFish]);

  const updateBot = useCallback((now: number) => {
    const state = gameStateRef.current;
    const { botState, botLineY, botHooked, botHookTime, botReelDelay, botTargetDepth, botNextCast } = state;

    switch (botState) {
      case 'BOT_IDLE':
        state.botLineY = BOAT_Y;
        if (now >= botNextCast) {
          state.botTargetDepth = 220 + Math.random() * 320;
          state.botState = 'BOT_CASTING';
        }
        break;

      case 'BOT_CASTING':
        state.botLineY = Math.min(botTargetDepth, botLineY + LINE_DESCEND_BASE * 1.82);
        // Actively scan for fish while descending
        if (state.botLineY > WATERLINE_Y) botTryCatch(now);
        if (state.botState === 'BOT_HOOKED') break; // caught one
        // If reached target depth without a catch, reel up
        if (state.botLineY >= botTargetDepth) state.botState = 'BOT_REELING';
        break;

      case 'BOT_HOOKED':
        if (botHooked) {
          botHooked.x = BOT_BOAT_X;
          botHooked.y = state.botLineY;
        }
        if (now - botHookTime > botReelDelay) state.botState = 'BOT_REELING';
        break;

      case 'BOT_REELING':
        state.botLineY = Math.max(BOAT_Y, botLineY - LINE_ASCEND_SPEED);
        if (botHooked) {
          botHooked.x = BOT_BOAT_X;
          botHooked.y = state.botLineY;
        }
        // Catch fish on the way up too
        if (!botHooked && state.botLineY > WATERLINE_Y) botTryCatch(now);
        if (state.botState === 'BOT_HOOKED') break;
        if (state.botLineY <= WATERLINE_Y) {
          if (botHooked) {
            setBotScore(prev => prev + botHooked.type.weight);
            removeFish(botHooked);
            state.botHooked = null;
          }
          state.botState = 'BOT_IDLE';
          state.botNextCast = now + 200 + Math.random() * 200; // Much faster: 200-400ms instead of 840-1820ms
        }
        break;
    }
  }, [botTryCatch, removeFish]);

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameEnded(true);
    
    // Only calculate and show rewards if energy was available at start
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('fishing', playerScore);
      setFinalRewards({
        tier: rewards.tier,
        xp: playerScore > botScore ? rewards.xp : 0, // Only winner gets XP
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
  }, [playerScore, botScore, hadEnergyAtStart]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    const { playerState, playerLineY, playerHooked, playerHookTime, botState, botLineY, botHooked, fish, escapeEffects } = gameStateRef.current;
    
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, WATERLINE_Y);
    sky.addColorStop(0, '#4a90b8');
    sky.addColorStop(1, '#2a6090');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, WATERLINE_Y);

    // Water
    const water = ctx.createLinearGradient(0, WATERLINE_Y, 0, SEABED_Y);
    water.addColorStop(0, '#1a5070');
    water.addColorStop(0.4, '#0f3550');
    water.addColorStop(1, '#081820');
    ctx.fillStyle = water;
    ctx.fillRect(0, WATERLINE_Y, CANVAS_W, SEABED_Y - WATERLINE_Y);

    // Seabed
    const sand = ctx.createLinearGradient(0, SEABED_Y, 0, CANVAS_H);
    sand.addColorStop(0, '#3a2a10');
    sand.addColorStop(1, '#1a1408');
    ctx.fillStyle = sand;
    ctx.fillRect(0, SEABED_Y, CANVAS_W, CANVAS_H - SEABED_Y);

    // Waterline ripple - simplified for performance
    ctx.strokeStyle = 'rgba(150, 220, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < CANVAS_W; x += 4) { // Reduced frequency
      const y = WATERLINE_Y + Math.sin(x * 0.03 + now * 0.002) * 3;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Water particles - reduced for performance
    ctx.fillStyle = 'rgba(100, 200, 255, 0.04)';
    for (let i = 0; i < 8; i++) { // Reduced from 15 to 8
      const px = (i * 73 + now * 0.008) % CANVAS_W;
      const py = WATERLINE_Y + 20 + (i * 137 + now * 0.005) % (SEABED_Y - WATERLINE_Y - 40);
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Depth zone lines - removed for performance

    // Fish (uncaught) - only draw visible fish for performance
    for (const f of fish) {
      if (!f.caught && f.x > -40 && f.x < CANVAS_W + 40) {
        drawFish(ctx, f);
      }
    }

    // Boats
    drawBoat(ctx, PLAYER_BOAT_X, BOAT_Y);
    drawBoat(ctx, BOT_BOAT_X, BOAT_Y);

    // Axolotls on boats
    drawAxolotl(ctx, PLAYER_BOAT_X, BOAT_Y - 18, '#E8A0BF', '#D48BA8');
    drawAxolotl(ctx, BOT_BOAT_X, BOAT_Y - 18, '#A0D2DB', '#80B8C8');

    // Fishing lines
    drawLine(ctx, PLAYER_BOAT_X, playerLineY, playerHooked ? '#ffd54f' : '#ffffff');
    drawLine(ctx, BOT_BOAT_X, botLineY, botHooked ? '#ffd54f' : '#888888');

    // Hooked fish (on lines)
    if (playerHooked) drawFish(ctx, playerHooked);
    if (botHooked) drawFish(ctx, botHooked);

    // Escape effects
    for (const e of escapeEffects) {
      ctx.fillStyle = `rgba(255, 100, 100, ${e.life * 0.8})`;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💨', e.x, e.y - (1 - e.life) * 30);
    }

    // Timer
    ctx.fillStyle = timeLeft < 10 ? '#ef5350' : 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(timeLeft)}s`, CANVAS_W / 2, 30);

    // Scores on canvas
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#E8A0BF';
    ctx.fillText(`You: ${playerScore}kg`, 10, 55);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#A0D2DB';
    ctx.fillText(`Bot: ${botScore}kg`, CANVAS_W - 10, 55);

    // Hold indicator when hooked (danger bar)
    if (playerState === 'HOOKED' && playerHooked) {
      const elapsed = now - playerHookTime;
      const pct = Math.min(1, elapsed / ESCAPE_TIMEOUT);
      const barW = 30;
      const barX = PLAYER_BOAT_X - barW / 2;
      const barY = playerLineY - 18;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(barX, barY, barW, 5);
      ctx.fillStyle = pct > 0.7 ? '#ef5350' : '#ffd54f';
      ctx.fillRect(barX, barY, barW * pct, 5);
    }
  }, [playerScore, botScore, timeLeft]);

  const drawBoat = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#6b4232';
    ctx.beginPath();
    ctx.moveTo(x - 32, y + 8);
    ctx.lineTo(x - 26, y + 22);
    ctx.lineTo(x + 26, y + 22);
    ctx.lineTo(x + 32, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7d5240';
    ctx.fillRect(x - 22, y + 8, 44, 3);
    // Mast
    ctx.strokeStyle = '#5a3520';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 8);
    ctx.lineTo(x + 12, y - 8);
    ctx.stroke();
  }, []);

  const drawAxolotl = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, bodyColor: string, gillColor: string) => {
    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + 4, y - 3, 2, 0, Math.PI * 2);
    ctx.arc(x + 4, y + 3, 2, 0, Math.PI * 2);
    ctx.fill();
    // Gills
    ctx.strokeStyle = gillColor;
    ctx.lineWidth = 1.5;
    for (const dy of [-5, -2, 2, 5]) {
      ctx.beginPath();
      ctx.moveTo(x - 10, y + dy);
      ctx.lineTo(x - 16, y + dy + (dy > 0 ? 2 : -2));
      ctx.stroke();
    }
  }, []);

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, boatX: number, lineY: number, color: string) => {
    if (lineY <= BOAT_Y + 2) return; // no line when fully reeled
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(boatX + 12, BOAT_Y - 6); // rod tip
    ctx.lineTo(boatX, lineY);
    ctx.stroke();
    // Hook
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(boatX, lineY + 3, 4, 0, Math.PI);
    ctx.stroke();
  }, []);

  const drawFish = useCallback((ctx: CanvasRenderingContext2D, f: Fish) => {
    const { x, y, type, direction } = f;
    const dir = direction;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 2, type.w / 2, type.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = type.color;
    ctx.beginPath();
    ctx.ellipse(x, y, type.w / 2, type.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(x - dir * type.w / 2, y);
    ctx.lineTo(x - dir * (type.w / 2 + 7), y - type.h / 3);
    ctx.lineTo(x - dir * (type.w / 2 + 7), y + type.h / 3);
    ctx.closePath();
    ctx.fill();
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + dir * type.w / 4, y - type.h / 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x + dir * type.w / 4, y - type.h / 6, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const now = performance.now();
    const state = gameStateRef.current;

    // Update timer
    const elapsed = (now - state.gameStartTime) / 1000;
    const remaining = Math.max(0, GAME_DURATION - elapsed);
    setTimeLeft(remaining);
    if (remaining <= 0) {
      endGame();
      return;
    }

    // Spawn fish
    if (now - state.lastSpawn > 800 + Math.random() * 700) {
      spawnFish();
      state.lastSpawn = now;
    }

    // Move fish
    for (const f of state.fish) {
      if (f.caught) continue;
      f.x += f.speed * f.direction;
      f.y = f.baseY + Math.sin(f.phase + f.x * 0.015) * 8;
    }
    state.fish = state.fish.filter(f => f.caught || (f.x > -60 && f.x < CANVAS_W + 60));
    while (state.fish.length < 4) spawnFish(); // Reduced from 6 to 4 for performance

    updatePlayer(now);
    updateBot(now);

    // Escape effects
    for (const e of state.escapeEffects) e.life -= 0.03;
    state.escapeEffects = state.escapeEffects.filter(e => e.life > 0);

    // Draw everything
    draw(ctx, now);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, spawnFish, updatePlayer, updateBot, draw, endGame]);

  const startGame = useCallback(() => {
    setHadEnergyAtStart(energy > 0);
    reset();
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    setIsPlaying(true);
    setIsPaused(false);
  }, [reset, energy]);

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

  // Handle input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (isPlaying && !isPaused) setIsHolding(true);
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsHolding(false);
    };

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchstart', handleStart);
    canvas.addEventListener('touchend', handleEnd);
    canvas.addEventListener('touchcancel', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchend', handleEnd);
      canvas.removeEventListener('touchcancel', handleEnd);
    };
  }, [isPlaying, isPaused]);

  return (
    <GameWrapper
      gameName="Fishing"
      score={playerScore}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100" style={{ margin: 0, padding: 0 }}>
        {/* Start/End Overlay */}
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-cyan-900/80 to-teal-900/80 backdrop-blur-md z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100 rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-blue-300/80 shadow-2xl relative overflow-hidden"
            >
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-200/30 rounded-full blur-xl -ml-12 -mb-12" />
              
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
                        🎣
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 mb-4">
                        Fishing
                      </h2>
                      <div className="space-y-2 text-blue-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">👆</span>
                          Hold to lower your line
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">👋</span>
                          Release to reel in your catch!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚠️</span>
                          Don't hold too long or fish escapes
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🏆</span>
                          Catch the most weight to win!
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={startGame}
                      className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg relative overflow-hidden group"
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
                        {playerScore > botScore ? '🏆' : playerScore === botScore ? '🤝' : '😅'}
                      </div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 mb-4">
                        {playerScore > botScore ? 'You Win!' : playerScore === botScore ? "It's a Tie!" : 'Bot Wins!'}
                      </h2>
                      <p className="text-blue-800 text-center mb-2 text-2xl font-bold">
                        You: {playerScore}kg · Bot: {botScore}kg
                      </p>
                      <p className="text-blue-600 text-center mb-4 text-sm font-medium">
                        {playerScore > botScore ? '🌟 Great fishing!' : playerScore === botScore ? '🎯 So close!' : '💪 Keep practicing!'}
                      </p>
                      
                      {/* Rewards display - only show if energy was used */}
                      {hadEnergyAtStart && finalRewards && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-blue-200">
                          <p className="text-blue-700 font-bold text-lg mb-2">Rewards:</p>
                          <div className="flex flex-col gap-2 text-blue-800">
                            {finalRewards.xp > 0 && (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">⭐</span>
                                <span className="font-semibold">+{finalRewards.xp} XP</span>
                              </div>
                            )}
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
                            <p className="text-xs text-blue-600 mt-1">
                              Tier: {finalRewards.tier.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-blue-200">
                          <p className="text-blue-700 font-bold text-lg mb-2">No Energy!</p>
                          <p className="text-blue-600 text-center text-sm">
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
                        className="flex-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white font-bold py-3 rounded-xl shadow-lg relative overflow-hidden group"
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
                              score: playerScore,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: finalRewards.xp,
                              coins: finalRewards.coins,
                              opals: finalRewards.opals,
                            });
                          } else {
                            // No rewards if no energy
                            onEnd({
                              score: playerScore,
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
