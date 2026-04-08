import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Droplets, RotateCcw, Timer } from 'lucide-react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps } from './types';
import { calculateRewards } from './config';
import { CoinIcon, OpalIcon } from '../components/icons';

type Color = 'red' | 'blue' | 'green' | 'amber' | 'violet';
type Pos = [number, number];

interface Puzzle {
  size: number;
  pairs: { color: Color; a: Pos; b: Pos }[];
  basePoints: number;
}

// Flow Free–style puzzles — connect every pair AND fill every cell
const PUZZLES: Puzzle[] = [
  // Puzzle 1 — 5×5, 3 colors (easy)
  // Solution: R winds top-left block, B winds right+bottom block, G bridges middle row
  {
    size: 5, basePoints: 100,
    pairs: [
      { color: 'red',   a: [0, 0], b: [4, 0] },
      { color: 'blue',  a: [0, 4], b: [4, 4] },
      { color: 'green', a: [2, 1], b: [2, 3] },
    ],
  },
  // Puzzle 2 — 5×5, 4 colors
  {
    size: 5, basePoints: 150,
    pairs: [
      { color: 'red',   a: [0, 0], b: [4, 4] },
      { color: 'blue',  a: [0, 4], b: [4, 0] },
      { color: 'green', a: [0, 2], b: [4, 2] },
      { color: 'amber', a: [2, 0], b: [2, 4] },
    ],
  },
  // Puzzle 3 — 5×5, 4 colors
  {
    size: 5, basePoints: 175,
    pairs: [
      { color: 'red',    a: [0, 0], b: [3, 4] },
      { color: 'blue',   a: [0, 4], b: [4, 1] },
      { color: 'green',  a: [1, 1], b: [4, 3] },
      { color: 'amber',  a: [0, 2], b: [4, 2] },
    ],
  },
  // Puzzle 4 — 6×6, 4 colors
  {
    size: 6, basePoints: 220,
    pairs: [
      { color: 'red',    a: [0, 0], b: [5, 5] },
      { color: 'blue',   a: [0, 5], b: [5, 0] },
      { color: 'green',  a: [0, 2], b: [3, 5] },
      { color: 'amber',  a: [2, 0], b: [5, 3] },
    ],
  },
  // Puzzle 5 — 6×6, 5 colors
  {
    size: 6, basePoints: 260,
    pairs: [
      { color: 'red',    a: [0, 0], b: [5, 0] },
      { color: 'blue',   a: [0, 5], b: [5, 5] },
      { color: 'green',  a: [0, 2], b: [5, 3] },
      { color: 'amber',  a: [0, 4], b: [3, 1] },
      { color: 'violet', a: [2, 3], b: [4, 5] },
    ],
  },
];

const COLOR_HEX: Record<Color, string> = {
  red:    '#f43f5e',
  blue:   '#38bdf8',
  green:  '#34d399',
  amber:  '#fbbf24',
  violet: '#a78bfa',
};

const COLOR_GLOW: Record<Color, string> = {
  red:    'rgba(244,63,94,0.55)',
  blue:   'rgba(56,189,248,0.55)',
  green:  'rgba(52,211,153,0.55)',
  amber:  'rgba(251,191,36,0.55)',
  violet: 'rgba(167,139,250,0.55)',
};

function posKey(r: number, c: number) { return `${r},${c}`; }

interface CellInfo {
  color: Color;
  up: boolean; down: boolean; left: boolean; right: boolean;
  isEndpoint: boolean;
  solved: boolean;
}

export function BubbleLineUp({ onEnd, onDeductEnergy, onApplyReward, energy }: MiniGameProps) {
  const [puzzleIdx, setPuzzleIdx]           = useState(0);
  const [completedPaths, setCompletedPaths] = useState<Partial<Record<Color, Pos[]>>>({});
  const [drawing, setDrawing]               = useState<{ color: Color; cells: Pos[] } | null>(null);
  const [score, setScore]                   = useState(0);
  const [timeLeft, setTimeLeft]             = useState(90);
  const [playing, setPlaying]               = useState(false);
  const [showOverlay, setShowOverlay]       = useState(true);
  const [gameEnded, setGameEnded]           = useState(false);
  const [hadEnergyAtStart, setHadEnergy]    = useState(false);
  const [finalRewards, setFinalRewards]     = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);

  const scoreRef        = useRef(0);
  const drawingRef      = useRef<{ color: Color; cells: Pos[] } | null>(null);
  const advancedRef     = useRef(false);

  const puzzle = PUZZLES[puzzleIdx % PUZZLES.length];

  // ── Derived maps ────────────────────────────────────────────────────────────

  const dotMap = useMemo(() => {
    const m = new Map<string, Color>();
    puzzle.pairs.forEach(p => { m.set(posKey(...p.a), p.color); m.set(posKey(...p.b), p.color); });
    return m;
  }, [puzzle]);

  const allSolved = useMemo(
    () => puzzle.pairs.every(p => !!completedPaths[p.color]),
    [completedPaths, puzzle.pairs],
  );

  // ── Cell rendering info ─────────────────────────────────────────────────────

  const cellMap = useMemo((): Map<string, CellInfo> => {
    const m = new Map<string, CellInfo>();

    const addPath = (cells: Pos[], color: Color) => {
      const pair = puzzle.pairs.find(p => p.color === color)!;
      const isEndpt = (r: number, c: number) =>
        (r === pair.a[0] && c === pair.a[1]) || (r === pair.b[0] && c === pair.b[1]);

      cells.forEach(([r, c], i) => {
        const prev = cells[i - 1];
        const next = cells[i + 1];
        const connects = (pr: number, pc: number) =>
          (prev?.[0] === pr && prev?.[1] === pc) || (next?.[0] === pr && next?.[1] === pc);
        m.set(posKey(r, c), {
          color,
          up: connects(r - 1, c), down: connects(r + 1, c),
          left: connects(r, c - 1), right: connects(r, c + 1),
          isEndpoint: isEndpt(r, c),
          solved: !!completedPaths[color],
        });
      });
    };

    // Completed paths first
    Object.entries(completedPaths).forEach(([col, cells]) => {
      if (cells) addPath(cells, col as Color);
    });
    // Current drawing overwrites
    if (drawing) addPath(drawing.cells, drawing.color);

    return m;
  }, [completedPaths, drawing, puzzle.pairs]);

  // Occupied cells map for pointer collision (only completed, not current draw)
  const occupiedRef = useRef<Map<string, Color>>(new Map());
  useEffect(() => {
    const m = new Map<string, Color>();
    Object.entries(completedPaths).forEach(([col, cells]) =>
      cells?.forEach(([r, c]) => m.set(posKey(r, c), col as Color)),
    );
    occupiedRef.current = m;
  }, [completedPaths]);

  // ── Game flow ────────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    const withEnergy = Math.floor(energy) >= 1;
    if (withEnergy) onDeductEnergy?.();
    scoreRef.current = 0;
    advancedRef.current = false;
    setScore(0);
    setTimeLeft(90);
    setPlaying(true);
    setShowOverlay(false);
    setGameEnded(false);
    setHadEnergy(withEnergy);
    setFinalRewards(null);
    setPuzzleIdx(0);
    setCompletedPaths({});
    setDrawing(null);
    drawingRef.current = null;
  }, [energy, onDeductEnergy]);

  const finishGame = useCallback(() => {
    setPlaying(false);
    setGameEnded(true);
    setShowOverlay(true);
    const fs = scoreRef.current;
    if (hadEnergyAtStart) {
      const r = calculateRewards('bubble-line-up', fs);
      onApplyReward?.(r.coins, r.opals);
      setFinalRewards(r);
    } else {
      setFinalRewards({ tier: 'normal', xp: 0, coins: 0 });
    }
  }, [hadEnergyAtStart, onApplyReward]);

  // Timer
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { window.clearInterval(id); finishGame(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, finishGame]);

  // Advance puzzle when all pairs solved
  useEffect(() => {
    if (!allSolved || !playing || advancedRef.current) return;
    advancedRef.current = true;

    const totalCells = puzzle.size * puzzle.size;
    let filled = 0;
    Object.values(completedPaths).forEach(cells => { filled += cells?.length ?? 0; });
    const bonus = filled === totalCells ? 50 : 0;
    scoreRef.current += puzzle.basePoints + bonus;
    setScore(scoreRef.current);

    const t = window.setTimeout(() => {
      advancedRef.current = false;
      setPuzzleIdx(i => i + 1);
      setCompletedPaths({});
      setDrawing(null);
      drawingRef.current = null;
    }, 500);
    return () => window.clearTimeout(t);
  }, [allSolved, playing, puzzle.basePoints, puzzle.size, completedPaths]);

  // ── Pointer handling ─────────────────────────────────────────────────────────

  const getCellAt = useCallback((x: number, y: number): Pos | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest('[data-r]') as HTMLElement | null;
    if (!cell) return null;
    return [parseInt(cell.dataset.r!), parseInt(cell.dataset.c!)];
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!playing) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pos = getCellAt(e.clientX, e.clientY);
    if (!pos) return;
    const color = dotMap.get(posKey(...pos));
    if (!color) return;
    // Clear existing path for this color so player can redo it
    setCompletedPaths(prev => { const n = { ...prev }; delete n[color]; return n; });
    const d = { color, cells: [pos] };
    drawingRef.current = d;
    setDrawing(d);
  }, [playing, getCellAt, dotMap]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = drawingRef.current;
    if (!d || !playing) return;
    const pos = getCellAt(e.clientX, e.clientY);
    if (!pos) return;
    const [r, c] = pos;
    const cells = d.cells;
    const last = cells[cells.length - 1];
    if (last[0] === r && last[1] === c) return;
    // Must be directly adjacent
    if (Math.abs(r - last[0]) + Math.abs(c - last[1]) !== 1) return;

    // Backtrack if entering second-to-last cell
    if (cells.length >= 2) {
      const prev2 = cells[cells.length - 2];
      if (prev2[0] === r && prev2[1] === c) {
        const nd = { ...d, cells: cells.slice(0, -1) };
        drawingRef.current = nd;
        setDrawing(nd);
        return;
      }
    }

    const key = posKey(r, c);
    // Block: occupied by another color's completed path
    const occ = occupiedRef.current.get(key);
    if (occ && occ !== d.color) return;
    // Block: endpoint dot of another color
    const dot = dotMap.get(key);
    if (dot && dot !== d.color) return;
    // Block: already in this drawing path (no loops)
    if (cells.some(([pr, pc]) => pr === r && pc === c)) return;

    const nd = { ...d, cells: [...cells, pos] };
    drawingRef.current = nd;
    setDrawing(nd);
  }, [playing, getCellAt, dotMap]);

  const handlePointerUp = useCallback(() => {
    const d = drawingRef.current;
    drawingRef.current = null;
    setDrawing(null);
    if (!d || d.cells.length < 2) return;
    const first = d.cells[0];
    const last  = d.cells[d.cells.length - 1];
    const pair  = puzzle.pairs.find(p => p.color === d.color);
    if (!pair) return;
    const complete =
      (first[0] === pair.a[0] && first[1] === pair.a[1] && last[0] === pair.b[0] && last[1] === pair.b[1]) ||
      (first[0] === pair.b[0] && first[1] === pair.b[1] && last[0] === pair.a[0] && last[1] === pair.a[1]);
    if (complete) setCompletedPaths(prev => ({ ...prev, [d.color]: d.cells }));
    // Partial paths are discarded
  }, [puzzle.pairs]);

  // ── Render helpers ───────────────────────────────────────────────────────────

  const GAP = '31%'; // inset from edge so pipe occupies centre 38% of cell

  return (
    <GameWrapper gameName="Bubble Line Up" score={score} onEnd={onEnd} energy={energy} gameEnded={gameEnded}>
      <div className="relative w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
        <div className="w-full max-w-sm space-y-3">

          {/* HUD */}
          <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 flex items-center justify-between text-white text-sm">
            <span className="flex items-center gap-1 font-mono tabular-nums"><Timer size={14} /> {timeLeft}s</span>
            <span className="text-white/45 text-xs">Puzzle {(puzzleIdx % PUZZLES.length) + 1} / {PUZZLES.length}</span>
            <span className="font-bold">{score} pts</span>
          </div>

          {/* Grid */}
          <div
            className="bg-slate-900/75 border border-white/10 rounded-2xl p-3 touch-none select-none"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`, gap: '5px' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {Array.from({ length: puzzle.size }, (_, r) =>
              Array.from({ length: puzzle.size }, (_, c) => {
                const key    = posKey(r, c);
                const info   = cellMap.get(key);
                const dotCol = dotMap.get(key);

                return (
                  <div
                    key={key}
                    data-r={r}
                    data-c={c}
                    className="relative"
                    style={{ aspectRatio: '1' }}
                  >
                    {info ? (
                      // ── Path / pipe cell ────────────────────────────────────
                      <>
                        {/* Directional pipe segments (non-endpoint cells only) */}
                        {!info.isEndpoint && (
                          <>
                            {info.up    && <div className="absolute" style={{ backgroundColor: COLOR_HEX[info.color], top: 0,    left: GAP,  right: GAP,  bottom: '50%' }} />}
                            {info.down  && <div className="absolute" style={{ backgroundColor: COLOR_HEX[info.color], bottom: 0, left: GAP,  right: GAP,  top: '50%'    }} />}
                            {info.left  && <div className="absolute" style={{ backgroundColor: COLOR_HEX[info.color], left: 0,   top: GAP,   bottom: GAP, right: '50%'  }} />}
                            {info.right && <div className="absolute" style={{ backgroundColor: COLOR_HEX[info.color], right: 0,  top: GAP,   bottom: GAP, left: '50%'   }} />}
                            {/* Center block */}
                            <div className="absolute rounded-sm" style={{ backgroundColor: COLOR_HEX[info.color], top: GAP, left: GAP, right: GAP, bottom: GAP }} />
                          </>
                        )}
                        {/* Endpoint dot (with white ring when solved) */}
                        {info.isEndpoint && (
                          <>
                            {/* Pipe arm from endpoint toward its one neighbor */}
                            {info.up    && <div className="absolute" style={{ backgroundColor: COLOR_HEX[info.color], top: 0,    left: GAP, right: GAP, bottom: '50%' }} />}
                            {info.down  && <div className="absolute" style={{ backgroundColor: COLOR_HEX[info.color], bottom: 0, left: GAP, right: GAP, top: '50%'   }} />}
                            {info.left  && <div className="absolute" style={{ backgroundColor: COLOR_HEX[info.color], left: 0,   top: GAP,  bottom: GAP, right: '50%' }} />}
                            {info.right && <div className="absolute" style={{ backgroundColor: COLOR_HEX[info.color], right: 0,  top: GAP,  bottom: GAP, left: '50%'  }} />}
                            <div
                              className="absolute inset-[12%] rounded-full z-10"
                              style={{
                                backgroundColor: COLOR_HEX[info.color],
                                boxShadow: `0 0 10px 3px ${COLOR_GLOW[info.color]}`,
                                outline: info.solved ? '2.5px solid rgba(255,255,255,0.9)' : 'none',
                                outlineOffset: '2px',
                              }}
                            />
                          </>
                        )}
                      </>
                    ) : dotCol ? (
                      // ── Unconnected endpoint dot ────────────────────────────
                      <div
                        className="absolute inset-[12%] rounded-full"
                        style={{
                          backgroundColor: COLOR_HEX[dotCol],
                          boxShadow: `0 0 10px 3px ${COLOR_GLOW[dotCol]}`,
                        }}
                      />
                    ) : (
                      // ── Empty cell ──────────────────────────────────────────
                      <div
                        className="absolute rounded-full bg-white/15"
                        style={{ width: '18%', height: '18%', top: '41%', left: '41%' }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <p className="text-center text-white/40 text-xs tracking-wide">
            Connect matching dots · fill every cell
          </p>
        </div>

        {/* ── Overlays ── */}
        {showOverlay && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-950/90 border border-white/20 rounded-3xl p-6 w-full max-w-sm text-white">
              {!gameEnded ? (
                <>
                  <div className="flex justify-center mb-3">
                    <Droplets className="w-12 h-12 text-sky-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-center mb-1">Bubble Line Up</h3>
                  <p className="text-center text-sm text-white/75 mb-5">
                    Draw paths to connect matching colored dots. Fill every cell on the grid to solve the puzzle!
                  </p>
                  <button onClick={startGame} className="w-full h-11 rounded-xl bg-sky-500 font-bold">
                    Start Game
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-center mb-3">Time's Up!</h3>
                  <div className="bg-white/10 rounded-xl p-3 mb-4 text-center">
                    <p className="text-white/55 text-sm">Final Score</p>
                    <p className="text-3xl font-black">{score}</p>
                  </div>
                  {finalRewards && (
                    <div className="rounded-xl border border-white/15 bg-white/5 p-3 mb-4 space-y-1 text-sm">
                      <p className="font-semibold capitalize">Tier: {finalRewards.tier}</p>
                      <p className="flex items-center gap-1"><CoinIcon size={14} /> {finalRewards.coins} coins</p>
                      <p>{finalRewards.xp} XP</p>
                      {finalRewards.opals ? (
                        <p className="flex items-center gap-1"><OpalIcon size={14} /> {finalRewards.opals} opal</p>
                      ) : null}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={startGame} className="h-10 rounded-xl bg-sky-500 font-semibold flex items-center justify-center gap-1">
                      <RotateCcw size={16} /> Play Again
                    </button>
                    <button
                      onClick={() => onEnd({
                        score,
                        tier: (finalRewards?.tier as 'normal' | 'good' | 'exceptional') ?? 'normal',
                        xp: finalRewards?.xp ?? 0,
                        coins: finalRewards?.coins ?? 0,
                        opals: finalRewards?.opals,
                      })}
                      className="h-10 rounded-xl bg-white/20 border border-white/20 font-semibold"
                    >
                      Close
                    </button>
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
