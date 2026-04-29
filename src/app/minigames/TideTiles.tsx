/**
 * Tide Tiles — 5-level objective run on a 4×4 sliding-tile board.
 *
 * Each level has a specific goal (reach a tile value, hit a score, etc.)
 * with optional move-limit constraints. Beat a level → board resets and
 * the next level loads. Fail any level → run ends. Score and best-tile
 * carry across levels so the run feels cumulative.
 *
 * Designed to replace the previous "endless 2048" identity with structured
 * goals that give the player a clear win moment per level.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grid3X3, RotateCcw, Target, CheckCircle2, Trophy } from 'lucide-react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps } from './types';
import { calculateRewards } from './config';
import { CoinIcon, OpalIcon } from '../components/icons';
import { useGameSFX } from '../hooks/useGameSFX';
import { EndScreenFooter } from './components/EndScreenFooter';
import { EnergyEmptyBanner } from './components/EnergyEmptyBanner';
import {
  LEVELS,
  TOTAL_LEVELS,
  isObjectiveMet,
  isObjectiveFailed,
  getProgress,
} from './tideTilesLevels';

type Direction = 'up' | 'down' | 'left' | 'right';
type Board = number[][];

const SIZE = 4;

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

function randomEmptyCell(board: Board): [number, number] | null {
  const empties: [number, number][] = [];
  board.forEach((row, r) => row.forEach((cell, c) => {
    if (cell === 0) empties.push([r, c]);
  }));
  if (empties.length === 0) return null;
  return empties[Math.floor(Math.random() * empties.length)];
}

function addRandomTile(board: Board): Board {
  const next = cloneBoard(board);
  const spot = randomEmptyCell(next);
  if (!spot) return next;
  const [r, c] = spot;
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function mergeLine(line: number[]): { line: number[]; gain: number; moved: boolean } {
  const filtered = line.filter(v => v !== 0);
  const merged: number[] = [];
  let gain = 0;

  for (let i = 0; i < filtered.length; i += 1) {
    if (filtered[i] === filtered[i + 1]) {
      const doubled = filtered[i] * 2;
      merged.push(doubled);
      gain += doubled;
      i += 1;
    } else {
      merged.push(filtered[i]);
    }
  }

  while (merged.length < SIZE) merged.push(0);
  const moved = merged.some((value, index) => value !== line[index]);
  return { line: merged, gain, moved };
}

function transpose(board: Board): Board {
  return board[0].map((_, c) => board.map(row => row[c]));
}

function reverseRows(board: Board): Board {
  return board.map(row => [...row].reverse());
}

function move(board: Board, direction: Direction): { board: Board; gain: number; moved: boolean } {
  let working = cloneBoard(board);

  if (direction === 'up' || direction === 'down') working = transpose(working);
  if (direction === 'right' || direction === 'down') working = reverseRows(working);

  let gain = 0;
  let moved = false;
  working = working.map(row => {
    const result = mergeLine(row);
    gain += result.gain;
    moved = moved || result.moved;
    return result.line;
  });

  if (direction === 'right' || direction === 'down') working = reverseRows(working);
  if (direction === 'up' || direction === 'down') working = transpose(working);

  return { board: working, gain, moved };
}

function hasMoves(board: Board): boolean {
  if (board.some(row => row.some(cell => cell === 0))) return true;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const cur = board[r][c];
      if ((r < SIZE - 1 && board[r + 1][c] === cur) || (c < SIZE - 1 && board[r][c + 1] === cur)) {
        return true;
      }
    }
  }
  return false;
}

function tileClass(value: number): string {
  if (value <= 2) return 'bg-slate-100 text-slate-700';
  if (value <= 8) return 'bg-sky-200 text-sky-900';
  if (value <= 32) return 'bg-cyan-300 text-cyan-950';
  if (value <= 128) return 'bg-indigo-400 text-white';
  if (value <= 512) return 'bg-violet-500 text-white';
  return 'bg-purple-700 text-white';
}

function highestOnBoard(board: Board): number {
  let max = 0;
  for (const row of board) for (const v of row) if (v > max) max = v;
  return max;
}

export function TideTiles({ onEnd, onDeductEnergy, onApplyReward, energy, soundEnabled = true, personalBest = 0 }: MiniGameProps) {
  const sfx = useGameSFX(soundEnabled);
  // Stash PB at game start so end-screen comparison stays stable
  const previousBestRef = useRef(0);

  // Board state
  const [board, setBoard] = useState<Board>(() => addRandomTile(addRandomTile(emptyBoard())));

  // Cumulative run state — carries across levels
  const [score, setScore] = useState(0);
  const [bestTile, setBestTile] = useState(0);

  // Per-level state — resets when the player advances
  const [levelIndex, setLevelIndex] = useState(0);
  const [scoreThisLevel, setScoreThisLevel] = useState(0);
  const [movesThisLevel, setMovesThisLevel] = useState(0);
  const [levelsCompleted, setLevelsCompleted] = useState(0);

  // Transient UX state
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);

  const currentLevel = LEVELS[Math.min(levelIndex, TOTAL_LEVELS - 1)];
  const progress = getProgress(currentLevel, {
    highestTile: highestOnBoard(board),
    scoreThisLevel,
    movesThisLevel,
  });

  // ── Run lifecycle ──────────────────────────────────────────────────────────

  const restart = useCallback(() => {
    const withEnergy = Math.floor(energy) >= 1;
    if (withEnergy) onDeductEnergy?.();

    const seeded = addRandomTile(addRandomTile(emptyBoard()));
    setBoard(seeded);
    setScore(0);
    setBestTile(highestOnBoard(seeded));
    setLevelIndex(0);
    setScoreThisLevel(0);
    setMovesThisLevel(0);
    setLevelsCompleted(0);
    setShowLevelComplete(false);
    setShowOverlay(false);
    setGameEnded(false);
    setHadEnergyAtStart(withEnergy);
    setFinalRewards(null);
    previousBestRef.current = personalBest;
    sfx.play('start');
  }, [energy, onDeductEnergy, sfx, personalBest]);

  const endRun = useCallback((finalScore: number) => {
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('tide-tiles', finalScore);
      onApplyReward?.(rewards.coins, rewards.opals);
      setFinalRewards(rewards);
      setTimeout(() => {
        if (rewards.tier === 'exceptional') sfx.play('tier_exceptional');
        else if (rewards.tier === 'good') sfx.play('tier_good');
        else sfx.play('lose');
      }, 250);
    } else {
      setFinalRewards({ tier: 'normal', xp: 0, coins: 0 });
      setTimeout(() => sfx.play('lose'), 250);
    }
    setShowOverlay(true);
    setGameEnded(true);
  }, [hadEnergyAtStart, onApplyReward, sfx]);

  // ── Level advance ──────────────────────────────────────────────────────────

  /** Called when the player completes the current level's objective. */
  const advanceLevel = useCallback((nextLevelIdx: number) => {
    setLevelsCompleted(c => c + 1);
    setShowLevelComplete(true);
    sfx.play('win');

    // Brief celebration. If we're moving to a next level, reset the board.
    // If this was the final level, leave the celebration up — the run-complete
    // useEffect below will fire endRun and the overlay will cover everything.
    window.setTimeout(() => {
      if (nextLevelIdx < TOTAL_LEVELS) {
        setBoard(addRandomTile(addRandomTile(emptyBoard())));
        setLevelIndex(nextLevelIdx);
        setScoreThisLevel(0);
        setMovesThisLevel(0);
        setShowLevelComplete(false);
      }
    }, 1100);
  }, [sfx]);

  // Run-complete on beating the final level. Single source of truth for ending
  // the run — avoids racing with advanceLevel's celebration timer.
  useEffect(() => {
    if (levelsCompleted >= TOTAL_LEVELS && !gameEnded) {
      const t = window.setTimeout(() => endRun(score), 1100);
      return () => window.clearTimeout(t);
    }
  }, [levelsCompleted, gameEnded, endRun, score]);

  // ── Move handling with objective + fail checks ─────────────────────────────

  const makeMove = useCallback((direction: Direction) => {
    if (showOverlay || gameEnded || showLevelComplete) return;

    setBoard(prev => {
      const result = move(prev, direction);
      if (!result.moved) {
        sfx.play('no_move');
        return prev;
      }

      const next = addRandomTile(result.board);
      const nextHighest = highestOnBoard(next);
      const nextScore = score + result.gain;
      const nextScoreThisLevel = scoreThisLevel + result.gain;
      const nextMovesThisLevel = movesThisLevel + 1;

      setBestTile(b => Math.max(b, nextHighest));
      setScore(nextScore);
      setScoreThisLevel(nextScoreThisLevel);
      setMovesThisLevel(nextMovesThisLevel);

      if (result.gain > 0) {
        const steps = Math.max(0, Math.log2(result.gain) - 2);
        sfx.play('merge', { pitch: 1 + Math.min(0.7, steps * 0.1) });
      } else {
        sfx.play('slide');
      }

      const levelState = {
        highestTile: nextHighest,
        scoreThisLevel: nextScoreThisLevel,
        movesThisLevel: nextMovesThisLevel,
      };

      // Objective met — advance (deferred a frame so React state catches up)
      if (isObjectiveMet(currentLevel, levelState)) {
        window.setTimeout(() => advanceLevel(levelIndex + 1), 50);
        return next;
      }

      // Move-limit exhausted without meeting objective — run ends
      if (isObjectiveFailed(currentLevel, levelState)) {
        window.setTimeout(() => endRun(nextScore), 50);
        return next;
      }

      // Board fully blocked — run ends
      if (!hasMoves(next)) {
        window.setTimeout(() => endRun(nextScore), 50);
      }

      return next;
    });
  }, [showOverlay, gameEnded, showLevelComplete, sfx, score, scoreThisLevel, movesThisLevel, currentLevel, levelIndex, advanceLevel, endRun]);

  // ── Input ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') makeMove('up');
      if (event.key === 'ArrowDown') makeMove('down');
      if (event.key === 'ArrowLeft') makeMove('left');
      if (event.key === 'ArrowRight') makeMove('right');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [makeMove]);

  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    swipeStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!swipeStart.current) return;
    const dx = e.clientX - swipeStart.current.x;
    const dy = e.clientY - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      makeMove(dx > 0 ? 'right' : 'left');
    } else {
      makeMove(dy > 0 ? 'down' : 'up');
    }
  }, [makeMove]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <GameWrapper gameName="Tide Tiles" score={score} onEnd={onEnd} energy={energy} gameEnded={gameEnded}>
      <div className="relative w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-cyan-950 via-indigo-900 to-violet-900">
        <div className="w-full max-w-sm space-y-3">

          {/* HUD strip — level + objective + progress (hidden until first run) */}
          {!showOverlay && (
            <div className="rounded-2xl bg-black/30 border border-white/10 px-3 py-2.5 text-white">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] uppercase tracking-wider text-cyan-300/80 font-bold">
                  Level {levelIndex + 1} / {TOTAL_LEVELS} · {currentLevel.name}
                </p>
                <p className="text-[11px] text-white/55">
                  Score {score.toLocaleString()} · Best {bestTile}
                </p>
              </div>
              <p className="text-sm font-semibold flex items-center gap-1.5 mb-1.5">
                <Target className="w-3.5 h-3.5 text-amber-300" />
                {currentLevel.goalText}
              </p>

              {/* Primary progress bar */}
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                    animate={{ width: `${progress.primary * 100}%` }}
                    transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                  />
                </div>
                <p className="text-[11px] text-white/70 tabular-nums w-20 text-right">
                  {progress.primaryLabel}
                </p>
              </div>

              {/* Move-limit bar (only when constraint exists) */}
              {progress.constraint && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${
                        progress.constraint.value > 0.8
                          ? 'bg-rose-400'
                          : 'bg-amber-300/70'
                      }`}
                      animate={{ width: `${progress.constraint.value * 100}%` }}
                      transition={{ duration: 0.18 }}
                    />
                  </div>
                  <p className="text-[10px] text-white/55 tabular-nums w-20 text-right">
                    {progress.constraint.label}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Grid */}
          <div className="relative">
            <div
              className="grid grid-cols-4 gap-3 bg-black/25 border border-white/15 p-4 rounded-2xl touch-none"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
            >
              {board.flatMap((row, r) => row.map((value, c) => (
                <motion.div
                  key={`${r}-${c}-${value}`}
                  layout
                  // Pop animation on every value change — covers both new
                  // spawns and merge results (because the key includes value).
                  initial={value > 0 ? { scale: 0.4, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 24 }}
                  className={`h-20 rounded-xl flex items-center justify-center text-2xl font-black ${value === 0 ? 'bg-white/10' : tileClass(value)}`}
                >
                  {value || ''}
                </motion.div>
              )))}
            </div>

            {/* Level-complete burst overlay — covers the grid for ~1s when objective met */}
            <AnimatePresence>
              {showLevelComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  className="absolute inset-0 flex items-center justify-center bg-emerald-500/30 backdrop-blur-sm rounded-2xl pointer-events-none"
                >
                  <div className="bg-emerald-500 text-white font-black text-lg px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border-2 border-emerald-300">
                    <CheckCircle2 className="w-6 h-6" />
                    Level {levelIndex + 1} Complete!
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-center text-white/60 text-xs">Swipe to merge</div>
        </div>

        {/* ── Start / End overlay ── */}
        {showOverlay && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-950/90 border border-white/20 rounded-3xl p-6 w-full max-w-sm text-white">
              {!gameEnded ? (
                <>
                  <div className="flex justify-center mb-3"><Grid3X3 className="w-12 h-12 text-cyan-300" /></div>
                  <h3 className="text-2xl font-bold text-center mb-2">Tide Tiles</h3>
                  <p className="text-center text-sm text-white/80 mb-4">
                    Slide tiles to merge them. Hit each level's goal in {TOTAL_LEVELS} levels to win the run.
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-5 space-y-1 text-xs text-white/70">
                    {LEVELS.slice(0, 3).map(l => (
                      <p key={l.id}>
                        <span className="text-cyan-300/80 font-semibold">L{l.id}:</span> {l.goalText}
                      </p>
                    ))}
                    <p className="text-white/40">+ 2 more levels</p>
                  </div>
                  <EnergyEmptyBanner visible={energy < 1} tone="dark" />
                  <button onClick={restart} className="w-full h-11 rounded-xl bg-cyan-500 font-bold">Start Game</button>
                </>
              ) : (
                <>
                  {/* Big trophy + animated entrance for the run-clear; nothing for partial */}
                  {levelsCompleted === TOTAL_LEVELS && (
                    <motion.div
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 16, delay: 0.1 }}
                      className="flex justify-center mb-3"
                    >
                      <div className="relative">
                        <Trophy className="w-16 h-16 text-amber-300 drop-shadow-[0_0_18px_rgba(252,211,77,0.6)]" />
                        <div className="absolute inset-0 rounded-full bg-amber-300/20 blur-xl" />
                      </div>
                    </motion.div>
                  )}
                  <h3 className="text-2xl font-bold text-center mb-2">
                    {levelsCompleted === TOTAL_LEVELS ? 'Master of the Tides!' : 'Run Ended'}
                  </h3>
                  <p className="text-center text-sm text-white/65 mb-4">
                    {levelsCompleted === TOTAL_LEVELS
                      ? 'You conquered the Open Ocean — every level cleared.'
                      : `You cleared ${levelsCompleted} of ${TOTAL_LEVELS} level${levelsCompleted === 1 ? '' : 's'}.`}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center text-sm">
                    <div className="bg-white/10 rounded-xl p-2"><p className="text-white/60 text-[11px]">Levels</p><p className="font-bold">{levelsCompleted} / {TOTAL_LEVELS}</p></div>
                    <div className="bg-white/10 rounded-xl p-2"><p className="text-white/60 text-[11px]">Score</p><p className="font-bold">{score.toLocaleString()}</p></div>
                    <div className="bg-white/10 rounded-xl p-2"><p className="text-white/60 text-[11px]">Best Tile</p><p className="font-bold">{bestTile}</p></div>
                  </div>

                  {/* Tier delta + coaching */}
                  <div className="mb-4">
                    <EndScreenFooter
                      gameId="tide-tiles"
                      score={score}
                      tier={(finalRewards?.tier as 'normal' | 'good' | 'exceptional') || 'normal'}
                      context={{
                        // Reuse the puzzlesCleared field as "levels cleared"
                        // since the coaching shape semantically matches.
                        puzzlesCleared: levelsCompleted,
                      }}
                      energyReduced={!hadEnergyAtStart}
                      tone="dark"
                      previousBest={previousBestRef.current}
                    />
                  </div>

                  {finalRewards && (
                    <div className="rounded-xl border border-white/15 bg-white/5 p-3 mb-4 space-y-1 text-sm">
                      <p className="font-semibold capitalize">Tier: {finalRewards.tier}</p>
                      <p className="flex items-center gap-1"><CoinIcon size={14} /> Coins: {finalRewards.coins}</p>
                      <p>XP: {finalRewards.xp}</p>
                      {finalRewards.opals ? <p className="flex items-center gap-1"><OpalIcon size={14} /> Opals: {finalRewards.opals}</p> : null}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={restart} className="h-10 rounded-xl bg-cyan-500 font-semibold flex items-center justify-center gap-1"><RotateCcw size={16} /> Play Again</button>
                    <button onClick={() => onEnd({ score, tier: (finalRewards?.tier as 'normal' | 'good' | 'exceptional') || 'normal', xp: finalRewards?.xp || 0, coins: finalRewards?.coins || 0, opals: finalRewards?.opals })} className="h-10 rounded-xl bg-white/20 border border-white/20 font-semibold">Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </GameWrapper>
  );
}
