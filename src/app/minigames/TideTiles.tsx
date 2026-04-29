import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Grid3X3, RotateCcw } from 'lucide-react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps } from './types';
import { calculateRewards } from './config';
import { CoinIcon, OpalIcon } from '../components/icons';
import { useGameSFX } from '../hooks/useGameSFX';

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

export function TideTiles({ onEnd, onDeductEnergy, onApplyReward, energy, soundEnabled = true }: MiniGameProps) {
  const sfx = useGameSFX(soundEnabled);
  const [board, setBoard] = useState<Board>(() => addRandomTile(addRandomTile(emptyBoard())));
  const [score, setScore] = useState(0);
  const [bestTile, setBestTile] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);

  const restart = useCallback(() => {
    const withEnergy = Math.floor(energy) >= 1;
    if (withEnergy) onDeductEnergy?.();

    const seeded = addRandomTile(addRandomTile(emptyBoard()));
    setBoard(seeded);
    setScore(0);
    setBestTile(2);
    setShowOverlay(false);
    setGameEnded(false);
    setHadEnergyAtStart(withEnergy);
    setFinalRewards(null);
    sfx.play('start');
  }, [energy, onDeductEnergy, sfx]);

  const closeWithRewards = useCallback((finalScore: number) => {
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

  const makeMove = useCallback((direction: Direction) => {
    if (showOverlay || gameEnded) return;

    setBoard(prev => {
      const result = move(prev, direction);
      if (!result.moved) {
        sfx.play('no_move');
        return prev;
      }

      const next = addRandomTile(result.board);
      const nextBest = Math.max(...next.flat());
      setBestTile(nextBest);
      const nextScore = score + result.gain;
      setScore(nextScore);

      if (result.gain > 0) {
        // Pitch climbs with merge value: 4→1, 8→1.1, 16→1.2, ... caps at +0.7
        const steps = Math.max(0, Math.log2(result.gain) - 2);
        sfx.play('merge', { pitch: 1 + Math.min(0.7, steps * 0.1) });
      } else {
        sfx.play('slide');
      }

      if (!hasMoves(next)) {
        window.setTimeout(() => closeWithRewards(nextScore), 50);
      }

      return next;
    });
  }, [closeWithRewards, gameEnded, score, showOverlay, sfx]);

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

  return (
    <GameWrapper gameName="Tide Tiles" score={score} onEnd={onEnd} energy={energy} gameEnded={gameEnded}>
      <div className="relative w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-cyan-950 via-indigo-900 to-violet-900">
        <div className="w-full max-w-sm space-y-4">
          <div
            className="grid grid-cols-4 gap-3 bg-black/25 border border-white/15 p-4 rounded-2xl touch-none"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          >
            {board.flatMap((row, r) => row.map((value, c) => (
              <motion.div
                key={`${r}-${c}-${value}`}
                layout
                className={`h-20 rounded-xl flex items-center justify-center text-2xl font-black ${value === 0 ? 'bg-white/10' : tileClass(value)}`}
              >
                {value || ''}
              </motion.div>
            )))}
          </div>

          <div className="text-center text-white/80 text-xs">Swipe to merge</div>
        </div>

        {showOverlay && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-950/90 border border-white/20 rounded-3xl p-6 w-full max-w-sm text-white">
              {!gameEnded ? (
                <>
                  <div className="flex justify-center mb-3"><Grid3X3 className="w-12 h-12 text-cyan-300" /></div>
                  <h3 className="text-2xl font-bold text-center mb-2">Tide Tiles</h3>
                  <p className="text-center text-sm text-white/80 mb-5">Slide all tiles in one direction. Matching values combine into stronger tiles.</p>
                  <button onClick={restart} className="w-full h-11 rounded-xl bg-cyan-500 font-bold">Start Game</button>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-center mb-2">Run Complete</h3>
                  <div className="grid grid-cols-2 gap-2 mb-4 text-center text-sm">
                    <div className="bg-white/10 rounded-xl p-2"><p className="text-white/70">Score</p><p className="font-bold text-lg">{score}</p></div>
                    <div className="bg-white/10 rounded-xl p-2"><p className="text-white/70">Best Tile</p><p className="font-bold text-lg">{bestTile}</p></div>
                  </div>
                  {finalRewards && (
                    <div className="rounded-xl border border-white/15 bg-white/5 p-3 mb-4 space-y-1 text-sm">
                      <p className="font-semibold">Tier: {finalRewards.tier}</p>
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
