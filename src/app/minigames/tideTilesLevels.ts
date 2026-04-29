/**
 * TideTiles level objectives.
 *
 * Each session is a 5-level run. Each level has a specific objective the
 * player must hit before either running out of moves or filling the board.
 * Completing a level advances to the next; failing any level ends the run.
 *
 * Designer's intent: replace the "endless 2048" identity with structured
 * goals that give the player a clear "win" moment per level. Score and
 * best-tile carry across levels so the run feels cumulative.
 */

export type ObjectiveType = 'reach-tile' | 'reach-score';

export interface Objective {
  type: ObjectiveType;
  /** For 'reach-tile': the tile value the player must produce on the board. */
  targetTile?: number;
  /** For 'reach-score': the cumulative score within this level. */
  targetScore?: number;
  /** Optional move-limit constraint — exceeded → level failed. */
  moveLimit?: number;
}

export interface LevelDefinition {
  id: number;        // 1-indexed
  name: string;      // Short evocative name shown above the goal text
  goalText: string;  // Glanceable goal description for the HUD
  objective: Objective;
}

/**
 * Five-level progression. Difficulty climbs through tile targets,
 * introduces a move-limit constraint at L2, switches to a score-based
 * goal at L3, then back to bigger tile targets to finish.
 */
export const LEVELS: LevelDefinition[] = [
  {
    id: 1,
    name: 'Shallows',
    goalText: 'Reach the 64 tile',
    objective: { type: 'reach-tile', targetTile: 64 },
  },
  {
    id: 2,
    name: 'Reef Edge',
    // Math: each valid move adds avg 2.2 to total board value. To have a 128
    // tile, V ≥ 128, so theoretical floor is N=57. With merge-skill discount
    // for 8-13yo demographic, 70 moves gives ~50-65% completion — the
    // "challenging but achievable" sweet spot.
    goalText: 'Reach 128 in 70 moves',
    objective: { type: 'reach-tile', targetTile: 128, moveLimit: 70 },
  },
  {
    id: 3,
    name: 'Coral Bed',
    // Score 1,500 ≈ "reach 128 + small margin." 80 moves keeps tension
    // similar to L2 with slightly more room for the score to accumulate.
    goalText: 'Score 1,500 in 80 moves',
    objective: { type: 'reach-score', targetScore: 1500, moveLimit: 80 },
  },
  {
    id: 4,
    name: 'Deep Cove',
    goalText: 'Reach the 256 tile',
    objective: { type: 'reach-tile', targetTile: 256 },
  },
  {
    id: 5,
    name: 'Open Ocean',
    goalText: 'Reach the 512 tile',
    objective: { type: 'reach-tile', targetTile: 512 },
  },
];

export const TOTAL_LEVELS = LEVELS.length;

// ────────────────────────────────────────────────────────────────────────────
// State snapshot the level checker reads
// ────────────────────────────────────────────────────────────────────────────

export interface LevelState {
  /** Highest tile value currently anywhere on the board. */
  highestTile: number;
  /** Score earned within the CURRENT level (resets on level advance). */
  scoreThisLevel: number;
  /** Move count within the CURRENT level (resets on level advance). */
  movesThisLevel: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Objective evaluation
// ────────────────────────────────────────────────────────────────────────────

export function isObjectiveMet(level: LevelDefinition, state: LevelState): boolean {
  const o = level.objective;
  if (o.type === 'reach-tile' && o.targetTile !== undefined) {
    return state.highestTile >= o.targetTile;
  }
  if (o.type === 'reach-score' && o.targetScore !== undefined) {
    return state.scoreThisLevel >= o.targetScore;
  }
  return false;
}

/**
 * Returns true if the player can no longer complete the objective.
 * Currently only triggered by exceeding the move limit; a board with no
 * moves is handled separately in the game (fall-back to "out of moves").
 */
export function isObjectiveFailed(level: LevelDefinition, state: LevelState): boolean {
  const limit = level.objective.moveLimit;
  if (limit !== undefined && state.movesThisLevel >= limit) {
    return !isObjectiveMet(level, state);
  }
  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// Progress display
// ────────────────────────────────────────────────────────────────────────────

export interface ProgressDisplay {
  /** Primary goal progress (0–1). */
  primary: number;
  /** Short label like "32 / 64" or "1,200 / 1,500". */
  primaryLabel: string;
  /** Optional move-limit progress (0–1, where 1 = limit reached). */
  constraint?: { value: number; label: string };
}

export function getProgress(level: LevelDefinition, state: LevelState): ProgressDisplay {
  const o = level.objective;
  let primary = 0;
  let primaryLabel = '';

  if (o.type === 'reach-tile' && o.targetTile !== undefined) {
    primary = Math.min(1, state.highestTile / o.targetTile);
    primaryLabel = `${state.highestTile} / ${o.targetTile}`;
  } else if (o.type === 'reach-score' && o.targetScore !== undefined) {
    primary = Math.min(1, state.scoreThisLevel / o.targetScore);
    primaryLabel = `${state.scoreThisLevel.toLocaleString()} / ${o.targetScore.toLocaleString()}`;
  }

  let constraint: ProgressDisplay['constraint'];
  if (o.moveLimit !== undefined) {
    constraint = {
      value: Math.min(1, state.movesThisLevel / o.moveLimit),
      label: `${state.movesThisLevel} / ${o.moveLimit} moves`,
    };
  }

  return { primary, primaryLabel, constraint };
}
