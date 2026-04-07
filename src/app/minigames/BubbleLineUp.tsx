import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Link2, Timer, RotateCcw } from 'lucide-react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps } from './types';
import { calculateRewards } from './config';
import { CoinIcon, OpalIcon } from '../components/icons';

type BubbleColor = 'blue' | 'mint' | 'violet' | 'amber' | 'rose';
type Cell = { id: number; color: BubbleColor };
type Grid = Cell[][];

const SIZE = 6;
const DURATION_SECONDS = 60;
const COLORS: BubbleColor[] = ['blue', 'mint', 'violet', 'amber', 'rose'];

function randomCell(idSeed: number): Cell {
  return {
    id: idSeed,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

function generateGrid(startId = 1): Grid {
  let id = startId;
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => randomCell(id++)));
}

function neighbors(a: [number, number], b: [number, number]): boolean {
  const [ar, ac] = a;
  const [br, bc] = b;
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
}

function colorClass(color: BubbleColor): string {
  if (color === 'blue') return 'bg-sky-400';
  if (color === 'mint') return 'bg-emerald-400';
  if (color === 'violet') return 'bg-violet-400';
  if (color === 'amber') return 'bg-amber-400';
  return 'bg-rose-400';
}

export function BubbleLineUp({ onEnd, onDeductEnergy, onApplyReward, energy }: MiniGameProps) {
  const [grid, setGrid] = useState<Grid>(() => generateGrid());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const [playing, setPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  const [path, setPath] = useState<[number, number][]>([]);
  const [activeColor, setActiveColor] = useState<BubbleColor | null>(null);
  const [nextCellId, setNextCellId] = useState(1000);
  const touchActive = useRef(false);

  const startGame = useCallback(() => {
    const withEnergy = Math.floor(energy) >= 1;
    if (withEnergy) onDeductEnergy?.();

    setGrid(generateGrid());
    setScore(0);
    setTimeLeft(DURATION_SECONDS);
    setPlaying(true);
    setShowOverlay(false);
    setGameEnded(false);
    setHadEnergyAtStart(withEnergy);
    setFinalRewards(null);
    setPath([]);
    setActiveColor(null);
    setNextCellId(1000);
  }, [energy, onDeductEnergy]);

  const finishGame = useCallback((finalScore: number) => {
    setPlaying(false);
    setGameEnded(true);
    setShowOverlay(true);
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('bubble-line-up', finalScore);
      onApplyReward?.(rewards.coins, rewards.opals);
      setFinalRewards(rewards);
    } else {
      setFinalRewards({ tier: 'normal', xp: 0, coins: 0 });
    }
  }, [hadEnergyAtStart, onApplyReward]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(id);
          finishGame(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [finishGame, playing, score]);

  const collapseAndRefill = useCallback((working: Grid, removed: Set<string>) => {
    const rebuilt: Grid = Array.from({ length: SIZE }, () => Array<Cell>(SIZE));
    let seed = nextCellId;

    for (let c = 0; c < SIZE; c += 1) {
      const surviving: Cell[] = [];
      for (let r = SIZE - 1; r >= 0; r -= 1) {
        if (!removed.has(`${r}-${c}`)) surviving.push(working[r][c]);
      }

      while (surviving.length < SIZE) {
        surviving.push(randomCell(seed++));
      }

      for (let r = SIZE - 1; r >= 0; r -= 1) {
        rebuilt[r][c] = surviving[SIZE - 1 - r];
      }
    }

    setNextCellId(seed);
    return rebuilt;
  }, [nextCellId]);

  const completePath = useCallback(() => {
    if (!playing) return;
    if (path.length < 2) {
      setPath([]);
      setActiveColor(null);
      return;
    }

    const removed = new Set(path.map(([r, c]) => `${r}-${c}`));
    const points = path.length * 10 + Math.max(0, path.length - 3) * 5;

    setGrid(prev => collapseAndRefill(prev, removed));
    setScore(prev => prev + points);
    setPath([]);
    setActiveColor(null);
  }, [collapseAndRefill, path, playing]);

  const beginPath = useCallback((r: number, c: number) => {
    if (!playing) return;
    touchActive.current = true;
    setPath([[r, c]]);
    setActiveColor(grid[r][c].color);
  }, [grid, playing]);

  const extendPath = useCallback((r: number, c: number) => {
    if (!touchActive.current || !playing || !activeColor) return;

    setPath(prev => {
      const existsAt = prev.findIndex(([pr, pc]) => pr === r && pc === c);
      if (existsAt !== -1) {
        if (existsAt === prev.length - 2) return prev.slice(0, -1);
        return prev;
      }

      const last = prev[prev.length - 1];
      if (!last || !neighbors(last, [r, c])) return prev;
      if (grid[r][c].color !== activeColor) return prev;

      return [...prev, [r, c]];
    });
  }, [activeColor, grid, playing]);

  const pathLookup = useMemo(() => {
    const map = new Map<string, number>();
    path.forEach(([r, c], idx) => map.set(`${r}-${c}`, idx));
    return map;
  }, [path]);

  return (
    <GameWrapper gameName="Bubble Line Up" score={score} onEnd={onEnd} energy={energy} gameEnded={gameEnded}>
      <div className="relative w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-sky-900 to-indigo-900">
        <div className="w-full max-w-sm space-y-4">
          <div className="rounded-xl bg-white/10 border border-white/20 p-2 flex items-center justify-between text-white text-sm">
            <span className="flex items-center gap-1"><Timer size={15} /> {timeLeft}s</span>
            <span className="text-white/70">Link two or more matching bubbles</span>
          </div>

          <div
            className="grid grid-cols-6 gap-2 bg-black/20 rounded-2xl p-3 touch-none"
            onPointerUp={() => { touchActive.current = false; completePath(); }}
            onPointerLeave={() => { if (touchActive.current) { touchActive.current = false; completePath(); } }}
          >
            {grid.flatMap((row, r) => row.map((cell, c) => {
              const pathIndex = pathLookup.get(`${r}-${c}`);
              return (
                <motion.button
                  key={cell.id}
                  onPointerDown={() => beginPath(r, c)}
                  onPointerEnter={() => extendPath(r, c)}
                  className={`h-11 rounded-full ${colorClass(cell.color)} border-2 ${pathIndex !== undefined ? 'border-white scale-110' : 'border-white/40'} transition-all`}
                  whileTap={{ scale: 0.95 }}
                >
                  {pathIndex !== undefined ? <span className="text-[10px] font-bold text-white">{pathIndex + 1}</span> : null}
                </motion.button>
              );
            }))}
          </div>
        </div>

        {showOverlay && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-950/90 border border-white/20 rounded-3xl p-6 w-full max-w-sm text-white">
              {!gameEnded ? (
                <>
                  <div className="flex justify-center mb-3"><Link2 className="w-12 h-12 text-sky-300" /></div>
                  <h3 className="text-2xl font-bold text-center mb-2">Bubble Line Up</h3>
                  <p className="text-center text-sm text-white/80 mb-5">Drag across touching bubbles of the same color. Longer paths score more points.</p>
                  <button onClick={startGame} className="w-full h-11 rounded-xl bg-sky-500 font-bold">Start Game</button>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-center mb-2">Round Complete</h3>
                  <div className="bg-white/10 rounded-xl p-3 mb-4 text-center">
                    <p className="text-white/70 text-sm">Final Score</p>
                    <p className="text-2xl font-bold">{score}</p>
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
                    <button onClick={startGame} className="h-10 rounded-xl bg-sky-500 font-semibold flex items-center justify-center gap-1"><RotateCcw size={16} /> Play Again</button>
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
