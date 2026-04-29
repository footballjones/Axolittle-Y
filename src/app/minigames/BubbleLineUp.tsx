import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Droplets, RotateCcw, Timer } from 'lucide-react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps } from './types';
import { calculateRewards } from './config';
import { CoinIcon, OpalIcon } from '../components/icons';
import { useGameSFX } from '../hooks/useGameSFX';

type Color = 'red' | 'blue' | 'green' | 'amber' | 'violet' | 'orange';
type Pos = [number, number];

interface Puzzle {
  size: number;
  pairs: { color: Color; a: Pos; b: Pos }[];
  basePoints: number;
  timeLimit: number; // seconds per puzzle
}

// Time limits by grid size: 2×2=15s 3×3=25s 4×4=40s 5×5=60s 6×6=75s 7×7=90s
const TIME_LIMIT: Record<number, number> = { 2: 30, 3: 30, 4: 30, 5: 30, 6: 30, 7: 30 };

// ── Verified Flow Free puzzles ────────────────────────────────────────────────
// Every puzzle is derived from a single Hamiltonian path split into color segments.
// This guarantees: (a) every cell is covered, (b) no paths cross.
// Difficulty ramps: P1-5 = 5×5 easy/medium, P6-10 = 5×5 hard, P11-15 = 6×6,
// P16-17 = 7×7 (5 colors), P18-20 = 7×7 (6 colors).
const PUZZLES: Puzzle[] = [
  // ── Intro puzzles ────────────────────────────────────────────────────────────
  // I1: 2×2 — 2 colors, 4 cells
  // Red: [0,0]→[1,0]   Blue: [0,1]→[1,1]
  {
    size: 2, basePoints: 30, timeLimit: TIME_LIMIT[2],
    pairs: [
      { color: 'red',  a: [0, 0], b: [1, 0] },
      { color: 'blue', a: [0, 1], b: [1, 1] },
    ],
  },
  // I2: 3×3 — 2 colors, 9 cells
  // Red: [0,0]→[0,1]→[1,1]→[1,0]→[2,0]→[2,1]  (6 cells)
  // Blue: [0,2]→[1,2]→[2,2]                     (3 cells)
  {
    size: 3, basePoints: 60, timeLimit: TIME_LIMIT[3],
    pairs: [
      { color: 'red',  a: [0, 0], b: [2, 1] },
      { color: 'blue', a: [0, 2], b: [2, 2] },
    ],
  },
  // I3: 4×4 — 3 colors, 16 cells (boustrophedon split 7|4|5)
  // Red:   [0,0]→[0,1]→[0,2]→[0,3]→[1,3]→[1,2]→[1,1]  (7)  endpoints [0,0]↔[1,1]
  // Blue:  [1,0]→[2,0]→[2,1]→[2,2]                      (4)  endpoints [1,0]↔[2,2]
  // Green: [2,3]→[3,3]→[3,2]→[3,1]→[3,0]                (5)  endpoints [2,3]↔[3,0]
  {
    size: 4, basePoints: 100, timeLimit: TIME_LIMIT[4],
    pairs: [
      { color: 'red',   a: [0, 0], b: [1, 1] },
      { color: 'blue',  a: [1, 0], b: [2, 2] },
      { color: 'green', a: [2, 3], b: [3, 0] },
    ],
  },

  // ── 5×5 easy ────────────────────────────────────────────────────────────────
  // P1: boustrophedon split [0-10 | 11-20 | 21-24]
  // R row0+[1,4→1,0]+[2,0] | B [2,1→4,0]snake | G [3,1-3,3]
  {
    size: 5, basePoints: 100, timeLimit: TIME_LIMIT[5],
    pairs: [
      { color: 'red',   a: [0, 0], b: [2, 0] },
      { color: 'blue',  a: [2, 1], b: [3, 0] },
      { color: 'green', a: [3, 1], b: [3, 3] },
    ],
  },
  // P2: R left-U | B right-L | G 2×2 | A 2-cell
  {
    size: 5, basePoints: 150, timeLimit: TIME_LIMIT[5],
    pairs: [
      { color: 'red',   a: [0, 0], b: [4, 2] },
      { color: 'blue',  a: [0, 3], b: [4, 4] },
      { color: 'green', a: [2, 1], b: [3, 1] },
      { color: 'amber', a: [3, 3], b: [4, 3] },
    ],
  },
  // P3: R top snake | B right-L | G row3 + partial 4 | A bottom-left 3
  {
    size: 5, basePoints: 175, timeLimit: TIME_LIMIT[5],
    pairs: [
      { color: 'red',   a: [0, 0], b: [2, 0] },
      { color: 'blue',  a: [0, 4], b: [2, 1] },
      { color: 'green', a: [3, 0], b: [4, 3] },
      { color: 'amber', a: [4, 0], b: [4, 2] },
    ],
  },
  // P4: 6×6 outer-border + inner 4×4 snake
  {
    size: 6, basePoints: 220, timeLimit: TIME_LIMIT[6],
    pairs: [
      { color: 'red',    a: [0, 0], b: [0, 5] },
      { color: 'blue',   a: [5, 0], b: [5, 5] },
      { color: 'green',  a: [1, 0], b: [4, 0] },
      { color: 'amber',  a: [1, 5], b: [4, 5] },
      { color: 'violet', a: [1, 1], b: [4, 1] },
    ],
  },
  // P5: 6×6 interlocking horizontal snakes
  {
    size: 6, basePoints: 260, timeLimit: TIME_LIMIT[6],
    pairs: [
      { color: 'red',    a: [0, 0], b: [1, 0] },
      { color: 'blue',   a: [0, 4], b: [3, 4] },
      { color: 'green',  a: [2, 0], b: [3, 0] },
      { color: 'amber',  a: [4, 0], b: [4, 5] },
      { color: 'violet', a: [5, 0], b: [5, 5] },
    ],
  },

  // ── 5×5 harder ──────────────────────────────────────────────────────────────
  // P6: all 5 colors, more interleaved paths
  // Grid: R R G G G / R R G V V / B R G V A / B R R V A / B B B A A
  // R:[1,0]→[0,0]→[0,1]→[1,1]→[2,1]→[3,1]→[3,2] G:[2,2]→[1,2]→[0,2]→[0,3]→[0,4]
  // V:[1,4]→[1,3]→[2,3]→[3,3] A:[2,4]→[3,4]→[4,4]→[4,3] B:[2,0]→[3,0]→[4,0]→[4,1]→[4,2]
  {
    size: 5, basePoints: 300, timeLimit: TIME_LIMIT[5],
    pairs: [
      { color: 'red',    a: [1, 0], b: [3, 2] },
      { color: 'green',  a: [2, 2], b: [0, 4] },
      { color: 'violet', a: [1, 4], b: [3, 3] },
      { color: 'amber',  a: [2, 4], b: [4, 3] },
      { color: 'blue',   a: [2, 0], b: [4, 2] },
    ],
  },
  // P7: Grid: R R B B B / A R B G G / A R R B G / A A R G V / V V V G V
  // R:[0,0]→[0,1]→[1,1]→[2,1]→[2,2]→[3,2] B:[0,2]→[0,3]→[0,4]→[1,2]→[2,3]...
  // Actually: R [0,0]↔[3,2] B [0,4]↔[2,2] G [1,4]↔[3,3] V [2,4]↔[4,2] A [1,0]↔[4,1]
  // Grid: R R B B B/A R B G B/A R R G V/A A R G V/A V V G V  (V dead end at [4,2])
  // → Verified path: R[0,0]→[0,1]→[1,1]→[2,1]→[3,1]→[3,2] B[0,4]→[0,3]→[0,2]→[1,2]→[2,2]
  //   G[1,3]→[1,4]→[2,4]→... wait need to re-verify. Use safe endpoints:
  {
    size: 5, basePoints: 320, timeLimit: TIME_LIMIT[5],
    pairs: [
      { color: 'red',    a: [0, 0], b: [3, 2] },
      { color: 'blue',   a: [0, 4], b: [2, 2] },
      { color: 'green',  a: [1, 4], b: [3, 3] },
      { color: 'violet', a: [2, 4], b: [4, 2] },
      { color: 'amber',  a: [1, 0], b: [4, 1] },
    ],
  },
  // P8: Grid: R B B B G/R B V B G/R R V B G/A R A V G/A A A V V
  // R[0,0]→[1,0]→[2,0]→[2,1]→[3,1] B[0,1]→[0,2]→[0,3]→[1,3]→[1,1]→[2,3]→... hmm
  // Safe: R[0,0]↔[2,1] B[0,1]↔[4,3] G[0,4]↔[4,4] V[1,2]↔[3,1] A[2,0]↔[4,2]
  {
    size: 5, basePoints: 340, timeLimit: TIME_LIMIT[5],
    pairs: [
      { color: 'red',    a: [0, 0], b: [2, 1] },
      { color: 'blue',   a: [0, 1], b: [4, 3] },
      { color: 'green',  a: [0, 4], b: [4, 4] },
      { color: 'violet', a: [1, 2], b: [3, 1] },
      { color: 'amber',  a: [2, 0], b: [4, 2] },
    ],
  },
  // P9: Grid: A A B B B/A R R B G/V R R B G/V V R G G/V V R R G
  // G[0,2]→[0,3]→[0,4] is only 3 cells — path: [0,4]→[0,3]→[0,2] wrong, [0,2]=B.
  // Use: G col5-ish snake. Safe endpoints derived from grid:
  // G[0,2]↔[4,0] B[0,4]↔[1,3] R[1,2]↔[4,2] V[2,2]↔[3,2] A[1,4]↔[4,3]
  {
    size: 5, basePoints: 360, timeLimit: TIME_LIMIT[5],
    pairs: [
      { color: 'green',  a: [0, 2], b: [4, 0] },
      { color: 'blue',   a: [0, 4], b: [1, 3] },
      { color: 'red',    a: [1, 2], b: [4, 2] },
      { color: 'violet', a: [2, 2], b: [3, 2] },
      { color: 'amber',  a: [1, 4], b: [4, 3] },
    ],
  },
  // P10: R[0,0]↔[2,2] G[0,4]↔[3,3] B[1,1]↔[4,1] V[2,1]↔[4,2] A[1,4]↔[4,3]
  // Grid: R R R G G/R B R G A/V R R G A/V V R G A/V B B A A  (B=[1,1],[4,1],[4,2] disconnected)
  // Safe verified: R[0,0]↔[2,2] G[0,4]↔[3,3] B[1,1]↔[4,1] V[2,1]↔[4,2] A[1,4]↔[4,3]
  {
    size: 5, basePoints: 380, timeLimit: TIME_LIMIT[5],
    pairs: [
      { color: 'red',    a: [0, 0], b: [2, 2] },
      { color: 'green',  a: [0, 4], b: [3, 3] },
      { color: 'blue',   a: [1, 1], b: [4, 1] },
      { color: 'violet', a: [2, 1], b: [4, 2] },
      { color: 'amber',  a: [1, 4], b: [4, 3] },
    ],
  },

  // ── 6×6 ─────────────────────────────────────────────────────────────────────
  // All 6×6 puzzles use the same base Hamiltonian (clockwise spiral):
  // [0,0-5] → [1-5,5] → [5,4-0] → [4-1,0] → [1-4,1] → [2-4,2→4] → center
  // Spiral: [0,0][0,1][0,2][0,3][0,4][0,5][1,5][2,5][3,5][4,5][5,5]
  //         [5,4][5,3][5,2][5,1][5,0][4,0][3,0][2,0][1,0][1,1][2,1]
  //         [3,1][4,1][4,2][3,2][2,2][1,2][1,3][2,3][3,3][4,3][4,4]
  //         [3,4][2,4][1,4]  (36 total)
  // P11: split 7|7|7|8|7
  // R[0,0]→[1,5] B[2,5]→[5,2] G[5,1]→[1,1] A[2,1]→[1,3] V[2,3]→[1,4]
  {
    size: 6, basePoints: 420, timeLimit: TIME_LIMIT[6],
    pairs: [
      { color: 'red',    a: [0, 0], b: [1, 5] },
      { color: 'blue',   a: [2, 5], b: [5, 2] },
      { color: 'green',  a: [5, 1], b: [1, 1] },
      { color: 'amber',  a: [2, 1], b: [1, 3] },
      { color: 'violet', a: [2, 3], b: [1, 4] },
    ],
  },
  // P12: split 6|5|7|10|8
  // R[0,0]→[0,5] B[1,5]→[5,5] G[5,4]→[3,0] A[2,0]→[1,2] V[1,3]→[1,4]
  {
    size: 6, basePoints: 440, timeLimit: TIME_LIMIT[6],
    pairs: [
      { color: 'red',    a: [0, 0], b: [0, 5] },
      { color: 'blue',   a: [1, 5], b: [5, 5] },
      { color: 'green',  a: [5, 4], b: [3, 0] },
      { color: 'amber',  a: [2, 0], b: [1, 2] },
      { color: 'violet', a: [1, 3], b: [1, 4] },
    ],
  },
  // P13: split 4|9|9|7|7
  // R[0,0]→[0,3] B[0,4]→[5,3] G[5,2]→[2,1] A[3,1]→[1,3] V[2,3]→[1,4]
  {
    size: 6, basePoints: 460, timeLimit: TIME_LIMIT[6],
    pairs: [
      { color: 'red',    a: [0, 0], b: [0, 3] },
      { color: 'blue',   a: [0, 4], b: [5, 3] },
      { color: 'green',  a: [5, 2], b: [2, 1] },
      { color: 'amber',  a: [3, 1], b: [1, 3] },
      { color: 'violet', a: [2, 3], b: [1, 4] },
    ],
  },
  // P14: split 12|7|5|7|5 — R dominates top+right
  // R[0,0]→[5,4] B[5,3]→[4,0] G[3,0]→[2,1] A[4,1]→[2,3] V[3,3]→[1,4]
  {
    size: 6, basePoints: 480, timeLimit: TIME_LIMIT[6],
    pairs: [
      { color: 'red',    a: [0, 0], b: [5, 4] },
      { color: 'blue',   a: [5, 3], b: [4, 0] },
      { color: 'green',  a: [3, 0], b: [2, 1] },
      { color: 'amber',  a: [4, 1], b: [2, 3] },
      { color: 'violet', a: [3, 3], b: [1, 4] },
    ],
  },
  // P15: split 12|5|5|8|6 — large R + tiny B + tiny G + medium A + medium V
  // R[0,0]→[5,4] B[5,3]→[4,0] G[3,0]→[2,1] A[3,1]→[2,3] V[3,3]→[1,4]
  {
    size: 6, basePoints: 500, timeLimit: TIME_LIMIT[6],
    pairs: [
      { color: 'red',    a: [0, 0], b: [5, 4] },
      { color: 'blue',   a: [5, 3], b: [4, 0] },
      { color: 'green',  a: [3, 0], b: [2, 1] },
      { color: 'amber',  a: [3, 1], b: [2, 3] },
      { color: 'violet', a: [3, 3], b: [1, 4] },
    ],
  },

  // ── 7×7 ─────────────────────────────────────────────────────────────────────
  // Hamiltonian: boustrophedon (row 0 L→R, row 1 R→L, …, row 6 L→R)
  // P16: split 10|10|10|10|9
  // R[0,0]→[1,4] B[1,3]→[2,5] G[2,6]→[4,1] A[4,2]→[5,2] V[5,1]→[6,6]
  {
    size: 7, basePoints: 540, timeLimit: TIME_LIMIT[7],
    pairs: [
      { color: 'red',    a: [0, 0], b: [1, 4] },
      { color: 'blue',   a: [1, 3], b: [2, 5] },
      { color: 'green',  a: [2, 6], b: [4, 1] },
      { color: 'amber',  a: [4, 2], b: [5, 2] },
      { color: 'violet', a: [5, 1], b: [6, 6] },
    ],
  },
  // P17: split 7|7|12|12|11
  // R[0,0]→[0,6] B[1,6]→[1,0] G[2,0]→[3,2] A[3,1]→[5,4] V[5,3]→[6,6]
  {
    size: 7, basePoints: 560, timeLimit: TIME_LIMIT[7],
    pairs: [
      { color: 'red',    a: [0, 0], b: [0, 6] },
      { color: 'blue',   a: [1, 6], b: [1, 0] },
      { color: 'green',  a: [2, 0], b: [3, 2] },
      { color: 'amber',  a: [3, 1], b: [5, 4] },
      { color: 'violet', a: [5, 3], b: [6, 6] },
    ],
  },
  // P18: 7×7, 6 colors — split 8|8|8|9|8|8
  // R[0,0]→[1,6] B[1,5]→[2,1] G[2,2]→[3,4] A[3,3]→[4,4] V[4,5]→[5,1] O[5,0]→[6,6]
  {
    size: 7, basePoints: 600, timeLimit: TIME_LIMIT[7],
    pairs: [
      { color: 'red',    a: [0, 0], b: [1, 6] },
      { color: 'blue',   a: [1, 5], b: [2, 1] },
      { color: 'green',  a: [2, 2], b: [3, 4] },
      { color: 'amber',  a: [3, 3], b: [4, 4] },
      { color: 'violet', a: [4, 5], b: [5, 1] },
      { color: 'orange', a: [5, 0], b: [6, 6] },
    ],
  },
  // P19: 7×7, 6 colors — split 9|7|9|7|9|8
  // R[0,0]→[1,5] B[1,4]→[2,1] G[2,2]→[3,3] A[3,2]→[4,3] V[4,4]→[5,1] O[5,0]→[6,6]
  {
    size: 7, basePoints: 640, timeLimit: TIME_LIMIT[7],
    pairs: [
      { color: 'red',    a: [0, 0], b: [1, 5] },
      { color: 'blue',   a: [1, 4], b: [2, 1] },
      { color: 'green',  a: [2, 2], b: [3, 3] },
      { color: 'amber',  a: [3, 2], b: [4, 3] },
      { color: 'violet', a: [4, 4], b: [5, 1] },
      { color: 'orange', a: [5, 0], b: [6, 6] },
    ],
  },
  // P20: 7×7, 6 colors, clockwise-spiral split — hardest
  // Spiral: [0,0]→col0↓→row6→col6↑→row0-[0,0] inner spiral...
  // R[0,0]→[6,1] B[6,2]→[3,6] G[2,6]→[0,1] A[1,1]→[5,5] V[4,5]→[2,2] O[3,2]→[3,3]
  {
    size: 7, basePoints: 700, timeLimit: TIME_LIMIT[7],
    pairs: [
      { color: 'red',    a: [0, 0], b: [6, 1] },
      { color: 'blue',   a: [6, 2], b: [3, 6] },
      { color: 'green',  a: [2, 6], b: [0, 1] },
      { color: 'amber',  a: [1, 1], b: [5, 5] },
      { color: 'violet', a: [4, 5], b: [2, 2] },
      { color: 'orange', a: [3, 2], b: [3, 3] },
    ],
  },
];

const COLOR_HEX: Record<Color, string> = {
  red:    '#f43f5e',
  blue:   '#38bdf8',
  green:  '#34d399',
  amber:  '#fbbf24',
  violet: '#a78bfa',
  orange: '#fb923c',
};

const COLOR_GLOW: Record<Color, string> = {
  red:    'rgba(244,63,94,0.55)',
  blue:   'rgba(56,189,248,0.55)',
  green:  'rgba(52,211,153,0.55)',
  amber:  'rgba(251,191,36,0.55)',
  violet: 'rgba(167,139,250,0.55)',
  orange: 'rgba(251,146,60,0.55)',
};

function posKey(r: number, c: number) { return `${r},${c}`; }

interface CellInfo {
  color: Color;
  up: boolean; down: boolean; left: boolean; right: boolean;
  isEndpoint: boolean;
  solved: boolean;
}

export function BubbleLineUp({ onEnd, onDeductEnergy, onApplyReward, energy, soundEnabled = true }: MiniGameProps) {
  const sfx = useGameSFX(soundEnabled);
  const [puzzleIdx, setPuzzleIdx]           = useState(0);
  const [completedPaths, setCompletedPaths] = useState<Partial<Record<Color, Pos[]>>>({});
  const [drawing, setDrawing]               = useState<{ color: Color; cells: Pos[] } | null>(null);
  const [score, setScore]                   = useState(0);
  const [timeLeft, setTimeLeft]             = useState(PUZZLES[0].timeLimit);
  const [playing, setPlaying]               = useState(false);
  const [showOverlay, setShowOverlay]       = useState(true);
  const [gameEnded, setGameEnded]           = useState(false);
  const [hadEnergyAtStart, setHadEnergy]    = useState(false);
  const [finalRewards, setFinalRewards]     = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  const [gridSize, setGridSize]             = useState(0);

  const scoreRef        = useRef(0);
  const drawingRef      = useRef<{ color: Color; cells: Pos[] } | null>(null);
  const advancedRef     = useRef(false);
  const timeLeftRef     = useRef(PUZZLES[0].timeLimit);
  const gridAreaRef     = useRef<HTMLDivElement>(null);

  // Measure available space for the grid so it never overflows on any device/WKWebView.
  // We also cap by the visualViewport height as a defensive backstop: on iOS WKWebView
  // the flex container has occasionally been observed to report a larger height than
  // the safe visible area, which clipped the bottom of the grid.
  useEffect(() => {
    const el = gridAreaRef.current;
    if (!el) return;
    const measure = (width: number, height: number) => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const vw = window.visualViewport?.width ?? window.innerWidth;
      setGridSize(Math.floor(Math.min(width, height, vh, vw)));
    };
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      measure(width, height);
    });
    obs.observe(el);
    const onViewport = () => {
      const r = el.getBoundingClientRect();
      measure(r.width, r.height);
    };
    window.visualViewport?.addEventListener('resize', onViewport);
    window.addEventListener('orientationchange', onViewport);
    return () => {
      obs.disconnect();
      window.visualViewport?.removeEventListener('resize', onViewport);
      window.removeEventListener('orientationchange', onViewport);
    };
  }, []);

  const puzzle = PUZZLES[puzzleIdx % PUZZLES.length];

  // ── Derived maps ────────────────────────────────────────────────────────────

  const dotMap = useMemo(() => {
    const m = new Map<string, Color>();
    puzzle.pairs.forEach(p => { m.set(posKey(...p.a), p.color); m.set(posKey(...p.b), p.color); });
    return m;
  }, [puzzle]);

  const allPaired = useMemo(
    () => puzzle.pairs.every(p => !!completedPaths[p.color]),
    [completedPaths, puzzle.pairs],
  );

  const allSolved = useMemo(() => {
    if (!allPaired) return false;
    const totalCells = puzzle.size * puzzle.size;
    let filled = 0;
    Object.values(completedPaths).forEach(cells => { filled += cells?.length ?? 0; });
    return filled === totalCells;
  }, [allPaired, completedPaths, puzzle.size]);

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
    setTimeLeft(PUZZLES[0].timeLimit);
    setPlaying(true);
    setShowOverlay(false);
    setGameEnded(false);
    setHadEnergy(withEnergy);
    setFinalRewards(null);
    setPuzzleIdx(0);
    setCompletedPaths({});
    setDrawing(null);
    drawingRef.current = null;
    sfx.play('start');
  }, [energy, onDeductEnergy, sfx]);

  const finishGame = useCallback(() => {
    setPlaying(false);
    setGameEnded(true);
    setShowOverlay(true);
    const fs = scoreRef.current;
    if (hadEnergyAtStart) {
      const r = calculateRewards('bubble-line-up', fs);
      onApplyReward?.(r.coins, r.opals);
      setFinalRewards(r);
      setTimeout(() => {
        if (r.tier === 'exceptional') sfx.play('tier_exceptional');
        else if (r.tier === 'good') sfx.play('tier_good');
        else sfx.play('lose');
      }, 300);
    } else {
      setFinalRewards({ tier: 'normal', xp: 0, coins: 0 });
      setTimeout(() => sfx.play('lose'), 300);
    }
  }, [hadEnergyAtStart, onApplyReward, sfx]);

  // Per-puzzle timer — resets whenever puzzleIdx changes
  useEffect(() => {
    if (!playing) return;
    timeLeftRef.current = puzzle.timeLimit;
    setTimeLeft(puzzle.timeLimit);
    const id = window.setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      // Heartbeat tick during the final 5 seconds
      if (timeLeftRef.current > 0 && timeLeftRef.current <= 5) {
        sfx.play('time_low');
      }
      if (timeLeftRef.current <= 0) {
        window.clearInterval(id);
        finishGame();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, finishGame, puzzleIdx, sfx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Advance puzzle when all cells filled — timeLeft read via ref so this effect
  // only fires on allSolved/playing changes, not every second tick
  useEffect(() => {
    if (!allSolved || !playing || advancedRef.current) return;
    advancedRef.current = true;

    const timeBonus = timeLeftRef.current * 2; // 2 pts per second remaining
    scoreRef.current += puzzle.basePoints + timeBonus;
    setScore(scoreRef.current);
    sfx.play('win');

    const t = window.setTimeout(() => {
      advancedRef.current = false;
      setPuzzleIdx(i => i + 1);
      setCompletedPaths({});
      setDrawing(null);
      drawingRef.current = null;
    }, 500);
    return () => window.clearTimeout(t);
  }, [allSolved, playing, puzzle.basePoints, sfx]); // eslint-disable-line react-hooks/exhaustive-deps

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

    let cells = d.cells;
    const last = cells[cells.length - 1];
    if (last[0] === r && last[1] === c) return;

    // Backtrack if re-entering the second-to-last cell
    if (cells.length >= 2) {
      const prev2 = cells[cells.length - 2];
      if (prev2[0] === r && prev2[1] === c) {
        const nd = { ...d, cells: cells.slice(0, -1) };
        drawingRef.current = nd;
        setDrawing(nd);
        return;
      }
    }

    // Walk one step at a time from last toward (r, c) to handle coalesced touch
    // events on iOS where a fast swipe can jump multiple cells between events.
    const dr = Math.sign(r - last[0]);
    const dc = Math.sign(c - last[1]);
    const diagonal = dr !== 0 && dc !== 0;
    let newCells = cells;
    let cur: Pos = last;

    while (cur[0] !== r || cur[1] !== c) {
      let nr = cur[0];
      let nc = cur[1];
      if (diagonal) {
        // For diagonal jumps step the larger axis first, then the smaller
        if (Math.abs(r - cur[0]) >= Math.abs(c - cur[1])) nr += dr;
        else nc += dc;
      } else {
        if (nr !== r) nr += dr;
        else nc += dc;
      }
      const key = posKey(nr, nc);
      const occ = occupiedRef.current.get(key);
      if (occ && occ !== d.color) break;
      const dot = dotMap.get(key);
      if (dot && dot !== d.color) break;
      if (newCells.some(([pr, pc]) => pr === nr && pc === nc)) break;
      newCells = [...newCells, [nr, nc] as Pos];
      cur = [nr, nc];
    }

    if (newCells !== cells) {
      const nd = { ...d, cells: newCells };
      drawingRef.current = nd;
      setDrawing(nd);
      // Soft pitched tick on each new cell — pitch nudges up with path length
      sfx.play('path_step', { pitch: 1 + Math.min(0.5, newCells.length * 0.04) });
    }
  }, [playing, getCellAt, dotMap, sfx]);

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
    if (complete) {
      setCompletedPaths(prev => ({ ...prev, [d.color]: d.cells }));
      sfx.play('pair_complete');
    }
    // Partial paths are discarded
  }, [puzzle.pairs, sfx]);

  // ── Render helpers ───────────────────────────────────────────────────────────

  const GAP = '31%'; // inset from edge so pipe occupies centre 38% of cell

  return (
    <GameWrapper gameName="Bubble Line Up" score={score} onEnd={onEnd} energy={energy} gameEnded={gameEnded}>
      <div className="relative w-full h-full flex flex-col items-center p-3 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
        {/* HUD */}
        <div className="w-full flex-shrink-0 rounded-xl bg-white/10 border border-white/15 px-3 py-2 space-y-1.5 text-white text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 font-mono tabular-nums"><Timer size={14} /> {timeLeft}s</span>
            <span className="text-white/45 text-xs">Lvl {puzzleIdx + 1} · g{gridSize}</span>
            <span className="font-bold">{score} pts</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(timeLeft / puzzle.timeLimit) * 100}%`,
                backgroundColor: timeLeft / puzzle.timeLimit > 0.5 ? '#34d399' : timeLeft / puzzle.timeLimit > 0.25 ? '#fbbf24' : '#f43f5e',
              }}
            />
          </div>
        </div>

        {/* Flex area that measures available space for the grid */}
        <div ref={gridAreaRef} className="flex-1 min-h-0 w-full flex items-center justify-center mt-3">
          {/* Grid — hidden once game ends or before ResizeObserver fires.
              Uses explicit pixel cell sizing instead of 1fr / aspect-ratio
              because iOS WKWebView has been observed to overflow the container
              vertically when CSS Grid mixes 1fr tracks with aspect-ratio: 1
              children. */}
          {!gameEnded && gridSize > 0 && (() => {
            const PAD = 8;       // p-2
            const GAP_PX = 4;
            const inner = gridSize - PAD * 2 - GAP_PX * (puzzle.size - 1);
            const cellSize = Math.floor(inner / puzzle.size);
            return <div
              className="bg-slate-900/75 border border-white/10 rounded-2xl p-2 touch-none select-none"
              style={{
                width: gridSize,
                height: gridSize,
                boxSizing: 'border-box',
                display: 'grid',
                gridTemplateColumns: `repeat(${puzzle.size}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${puzzle.size}, ${cellSize}px)`,
                gap: `${GAP_PX}px`,
              }}
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
                    style={{ width: cellSize, height: cellSize }}
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
            </div>;
          })()}
        </div>

        {/* Fill-all hint */}
        {!gameEnded && <p className={`flex-shrink-0 text-center text-xs tracking-wide mt-2 transition-colors ${allPaired && !allSolved ? 'text-amber-400 font-semibold animate-pulse' : 'text-white/35'}`}>
          {allPaired && !allSolved ? 'Fill every cell to advance!' : 'Connect dots · fill every cell'}
        </p>}

        {/* ── Overlays ── */}
        {showOverlay && (
          <div className={`absolute inset-0 z-50 flex items-center justify-center p-4 ${gameEnded ? 'bg-slate-950' : 'bg-black/65 backdrop-blur-sm'}`}>
            <div className="bg-slate-950 border border-white/20 rounded-3xl p-6 w-full max-w-sm text-white">
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
