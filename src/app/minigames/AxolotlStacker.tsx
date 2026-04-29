/**
 * Axolotl Stacker - Stack blocks high with precision timing
 * Rebuilt from scratch - smooth and simple
 * After block 10, tower moves down to make room for more blocks
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useAnimation } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps } from './types';
import { calculateRewards } from './config';
import { Layers, Target, AlertTriangle, Star, Trophy, Gamepad2, Rocket } from 'lucide-react';
import { CoinIcon, OpalIcon } from '../components/icons';
import stackerBg from '../../assets/Axolotl stacker.png';
import { useGameSFX } from '../hooks/useGameSFX';
import { EndScreenFooter } from './components/EndScreenFooter';

const CANVAS_W = 360;
const CANVAS_H = 640;
const BASE_Y = CANVAS_H - 40;
const BLOCK_HEIGHT = 28;
const INITIAL_WIDTH = 120;
const SWING_SPEED_BASE = 2.5;
const TOWER_DROP_THRESHOLD = 10; // After 10 blocks, start moving tower down
// "Perfect" tolerance — total overhang in pixels at which we award perfect.
// 4px feels generous enough that skill is recognized, tight enough that
// "perfect" isn't every drop. Worth tuning during playtest.
const PERFECT_TOLERANCE = 4;

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
  '#FF3366', // hot pink
  '#FF6B00', // vivid orange
  '#FFD600', // bright yellow
  '#00C853', // electric green
  '#00B0FF', // vivid blue
  '#D500F9', // electric purple
  '#FF4081', // rose pink
  '#00E5FF', // cyan
  '#76FF03', // lime
  '#FF6D00', // deep orange
];

/** Draw a single tile with bold outline, shadow, and highlight */
function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Drop shadow so tile floats above background
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  // Main fill
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();

  // Clear shadow before decorations
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, Math.min(6, h / 3), 2);
  ctx.fill();

  // Bottom shadow strip
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + h - 6, w - 4, 4, 2);
  ctx.fill();

  // White outline — makes tiles pop on any background
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, w - 2, h - 2, 4);
  ctx.stroke();

  ctx.restore();
}

export function AxolotlStacker({ onEnd, onDeductEnergy, onApplyReward, energy, soundEnabled = true }: MiniGameProps) {
  const sfx = useGameSFX(soundEnabled);
  // Tower-shake on miss — gives the fail moment physical weight.
  // Uses motion's animation controls so the canvas inside doesn't remount.
  const towerShakeControls = useAnimation();
  const [score, setScore] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  const cumulativeRef = useRef({ xp: 0, hadAnyEnergy: false });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Preload background image once
  useEffect(() => {
    const img = new Image();
    img.src = stackerBg;
    img.onload = () => { bgImageRef.current = img; };
  }, []);
  const gameRef = useRef<{
    isPlaying: boolean;
    isPaused: boolean;
    stack: StackBlock[];
    current: CurrentBlock | null;
    score: number;
    towerOffset: number;
    fallingPieces: Array<{ x: number; width: number; y: number; vy: number; color: string; alpha: number }>;
    // ── Perfect-drop combo state ──────────────────────────────────────────────
    perfectStreak: number;          // current consecutive perfects (0 = no streak)
    longestPerfectStreak: number;   // best streak in this run (for end-screen coaching)
    perfectDrops: number;           // total perfects in this run
    totalDrops: number;             // total drops attempted (for ratio in coaching)
    // Floating "PERFECT" text spawned on streak ≥ 2
    floatingTexts: Array<{ x: number; y: number; text: string; life: number; color: string }>;
    // Particle burst on each perfect drop (pulled to size 0 on game over)
    particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number }>;
    onGameEnd: (() => void) | null;
  }>({
    isPlaying: false,
    isPaused: false,
    stack: [],
    current: null,
    score: 0,
    towerOffset: 0,
    fallingPieces: [],
    perfectStreak: 0,
    longestPerfectStreak: 0,
    perfectDrops: 0,
    totalDrops: 0,
    floatingTexts: [],
    particles: [],
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
    const bg = bgImageRef.current;
    if (bg && bg.complete) {
      const scale = Math.max(CANVAS_W / bg.naturalWidth, CANVAS_H / bg.naturalHeight);
      const drawW = bg.naturalWidth * scale;
      const drawH = bg.naturalHeight * scale;
      const offsetX = (CANVAS_W - drawW) / 2;
      const offsetY = (CANVAS_H - drawH) / 2;
      ctx.drawImage(bg, offsetX, offsetY, drawW, drawH);
    } else {
      ctx.fillStyle = '#0e2233';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Draw stack
    for (let i = 0; i < game.stack.length; i++) {
      const b = game.stack[i];
      // Only draw blocks that are on screen
      if (b.y + BLOCK_HEIGHT < 0 || b.y > CANVAS_H) continue;

      const color = i === 0 ? '#4A4E69' : COLORS[(i - 1) % COLORS.length];
      drawTile(ctx, b.x, b.y, b.width, BLOCK_HEIGHT - 2, color);
    }

    // Draw falling cut-off pieces
    for (const fp of game.fallingPieces) {
      drawTile(ctx, fp.x, fp.y, fp.width, BLOCK_HEIGHT - 2, fp.color, fp.alpha);
    }

    // Draw current (moving) block — slightly brighter pulse via full opacity
    if (game.current && game.isPlaying) {
      const color = COLORS[game.score % COLORS.length];
      drawTile(ctx, game.current.x, game.current.y, game.current.width, BLOCK_HEIGHT - 2, color);
    }

    // Particle burst (perfect drops) — drawn before HUD so HUD is always visible above
    for (const p of game.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Floating "PERFECT" text — rises above the placed block, scales up as it fades
    for (const ft of game.floatingTexts) {
      const scale = 1 + (1 - ft.life) * 0.5;
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.translate(ft.x, ft.y);
      ctx.scale(scale, scale);
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Shadow for legibility on any background
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(ft.text, 1, 1);
      // Body — gold glow with the block's color underneath
      ctx.fillStyle = '#FFD600';
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }

    // Height display (top-right)
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Height: ${game.score}`, CANVAS_W - 10, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`Height: ${game.score}`, CANVAS_W - 11, 23);

    // Streak counter (top-left) — hidden when streak < 2 to keep HUD calm
    if (game.perfectStreak >= 2) {
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(`Perfect ×${game.perfectStreak}`, 11, 24);
      ctx.fillStyle = '#FFD600';
      ctx.fillText(`Perfect ×${game.perfectStreak}`, 10, 23);
    }
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

    // Update falling cut-off pieces
    for (const fp of game.fallingPieces) {
      fp.vy += 0.45;
      fp.y += fp.vy;
      fp.alpha -= 0.02;
    }
    game.fallingPieces = game.fallingPieces.filter(fp => fp.alpha > 0 && fp.y < CANVAS_H + 40);

    // Update perfect-drop particles — outward fan with gravity
    for (const p of game.particles) {
      p.vy += 0.18;       // gravity
      p.vx *= 0.985;      // slight air drag so they don't shoot off-screen
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.025;
    }
    game.particles = game.particles.filter(p => p.alpha > 0);

    // Update floating "PERFECT" text — rises and fades, scales slightly larger
    for (const ft of game.floatingTexts) {
      ft.y -= 1.2;
      ft.life -= 0.018;
    }
    game.floatingTexts = game.floatingTexts.filter(ft => ft.life > 0);

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

    // Track every drop attempt (used for end-screen coaching ratios)
    game.totalDrops += 1;

    // End game on complete miss
    if (overlapWidth <= 0) {
      sfx.play('miss');
      // Tower shake — short, weighty, sells the fail moment physically.
      // Doesn't block endGame; runs in parallel with overlay reveal.
      towerShakeControls.start({
        x: [0, -8, 8, -6, 6, -4, 4, 0],
        transition: { duration: 0.4, ease: 'easeOut' },
      });
      // Streak breaks on game over too — but no need to update anything since
      // the run is over.
      if (game.onGameEnd) game.onGameEnd();
      return;
    }

    // Spawn falling cut-off piece(s) so the player can see what was trimmed
    const cutColor = COLORS[game.score % COLORS.length];
    const leftCutW = overlapLeft - cLeft;
    const rightCutW = cRight - overlapRight;
    if (leftCutW > 0) {
      game.fallingPieces.push({ x: cLeft, width: leftCutW, y: c.y, vy: 0, color: cutColor, alpha: 1 });
    }
    if (rightCutW > 0) {
      game.fallingPieces.push({ x: overlapRight, width: rightCutW, y: c.y, vy: 0, color: cutColor, alpha: 1 });
    }

    // "Perfect" if overhang is small relative to the previous block; otherwise "good"
    const overhang = leftCutW + rightCutW;
    const perfect = overhang <= PERFECT_TOLERANCE;

    if (perfect) {
      game.perfectStreak += 1;
      game.perfectDrops += 1;
      if (game.perfectStreak > game.longestPerfectStreak) {
        game.longestPerfectStreak = game.perfectStreak;
      }
      // Pitch climbs with streak — early perfects feel different from late combos
      sfx.play('drop_perfect', { pitch: 1 + Math.min(0.6, game.perfectStreak * 0.08) });

      // Visual juice — only fire on streak ≥ 2 so the first perfect feels
      // like "good" and the second feels like "you're locked in"
      if (game.perfectStreak >= 2) {
        const blockColor = COLORS[game.score % COLORS.length];
        // "PERFECT" / "PERFECT ×3" floating text above the placed block
        const label = game.perfectStreak >= 3 ? `PERFECT ×${game.perfectStreak}` : 'PERFECT';
        game.floatingTexts.push({
          x: overlapLeft + overlapWidth / 2,
          y: c.y - 6,
          text: label,
          life: 1,
          color: blockColor,
        });
        // Particle burst — outward fan, gravity pulls them down
        const burstX = overlapLeft + overlapWidth / 2;
        const burstY = c.y;
        const burstCount = Math.min(20, 10 + game.perfectStreak * 2);
        for (let i = 0; i < burstCount; i++) {
          const angle = (Math.PI * (i / burstCount)) - Math.PI; // upper hemisphere
          const speed = 1.5 + Math.random() * 2.5;
          game.particles.push({
            x: burstX,
            y: burstY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            size: 2 + Math.random() * 4,
            color: blockColor,
            alpha: 1,
          });
        }
      }
    } else {
      // Streak break — quietly reset. No SFX or visual; absent counter is the cue.
      game.perfectStreak = 0;
      sfx.play('drop_good');
      if (overhang > 0) sfx.play('slice');
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
  }, [spawnBlock, sfx, towerShakeControls]);

  const endGame = useCallback(() => {
    const game = gameRef.current;
    game.isPlaying = false;
    setGameEnded(true);

    if (hadEnergyAtStart) {
      const rewards = calculateRewards('axolotl-stacker', game.score);
      cumulativeRef.current.xp += rewards.xp;
      cumulativeRef.current.hadAnyEnergy = true;
      onApplyReward?.(rewards.coins, rewards.opals);
      setFinalRewards({
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
      setTimeout(() => {
        if (rewards.tier === 'exceptional') sfx.play('tier_exceptional');
        else if (rewards.tier === 'good') sfx.play('tier_good');
        else sfx.play('lose');
      }, 350);
    } else {
      setFinalRewards({
        tier: 'normal',
        xp: 0,
        coins: 0,
        opals: undefined,
      });
      setTimeout(() => sfx.play('lose'), 350);
    }
    setShowOverlay(true);
  }, [hadEnergyAtStart, sfx, onApplyReward]);

  const startGame = useCallback(() => {
    const hadEnergy = Math.floor(energy) >= 1;
    if (hadEnergy) onDeductEnergy?.();
    setHadEnergyAtStart(hadEnergy);
    const game = gameRef.current;
    game.isPlaying = true;
    game.isPaused = false;
    game.score = 0;
    game.towerOffset = 0;
    game.fallingPieces = [];
    game.particles = [];
    game.floatingTexts = [];
    game.perfectStreak = 0;
    game.longestPerfectStreak = 0;
    game.perfectDrops = 0;
    game.totalDrops = 0;
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
    sfx.play('start');

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
  }, [energy, onDeductEnergy, spawnBlock, draw, gameLoop, sfx]);

  // Initialize canvas + warm-up draw while the overlay is visible so WKWebView
  // JIT-compiles the canvas draw paths before the user hits Play.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
      });
    }
    if (ctxRef.current && showOverlay) {
      draw(ctxRef.current);
    }
  }, [showOverlay, draw]);

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
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
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
      gameEnded={gameEnded}
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
                        className="flex justify-center mb-4"
                      >
                        <Layers className="w-16 h-16 text-purple-500" />
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Axolotl Stacker
                      </h2>
                      <div className="space-y-2 text-purple-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v8"/><path d="M9 18h6"/></svg>
                          Tap to drop each block
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <Target className="w-5 h-5 text-purple-600" />
                          Line them up to stack higher!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
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
                        <Rocket className="w-5 h-5" />
                      </span>
                    </motion.button>
                  </>
                ) : gameEnded && finalRewards ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="flex justify-center mb-4">
                        {score >= 20 ? <Star className="w-16 h-16 text-amber-400" /> : score >= 10 ? <Trophy className="w-16 h-16 text-yellow-500" /> : <Gamepad2 className="w-16 h-16 text-purple-400" />}
                      </div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Game Over!
                      </h2>
                      <p className="text-purple-800 text-center mb-2 text-2xl font-bold">
                        Stack height: {score}
                      </p>

                      {/* Tier delta + coaching — replaces the old static message.
                          Pulls perfect-drop context for sharper coaching ("3 of your last 5 stacks were perfect"). */}
                      <div className="mb-4">
                        <EndScreenFooter
                          gameId="axolotl-stacker"
                          score={score}
                          tier={(finalRewards?.tier as 'normal' | 'good' | 'exceptional') || 'normal'}
                          context={{
                            longestPerfectStreak: gameRef.current.longestPerfectStreak,
                            perfectDrops: gameRef.current.perfectDrops,
                            totalDrops: gameRef.current.totalDrops,
                          }}
                          energyReduced={!hadEnergyAtStart}
                          tone="light"
                        />
                      </div>

                      {hadEnergyAtStart && finalRewards && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-purple-200">
                          <p className="text-purple-700 font-bold text-lg mb-2">Rewards:</p>
                          <div className="flex flex-col gap-2 text-purple-800">
                            <div className="flex items-center justify-center gap-2">
                              <Star className="w-5 h-5 text-yellow-400" />
                              <span className="font-semibold">+{finalRewards.xp} XP</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <CoinIcon size={20} />
                              <span className="font-semibold">+{finalRewards.coins} Coins</span>
                            </div>
                            {finalRewards.opals && (
                              <div className="flex items-center justify-center gap-2">
                                <OpalIcon size={20} />
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
                          const cum = cumulativeRef.current;
                          if (cum.hadAnyEnergy && finalRewards) {
                            onEnd({
                              score,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: cum.xp,
                              coins: 0,
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

        {/* Tower shake wrapper — runs the miss-shake animation without
            remounting the canvas (would otherwise destroy game state). */}
        <motion.div
          animate={towerShakeControls}
          style={{ width: '100%', height: '100%', display: 'flex' }}
        >
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
        </motion.div>
      </div>
    </GameWrapper>
  );
}