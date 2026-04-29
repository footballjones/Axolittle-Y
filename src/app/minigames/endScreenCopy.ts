/**
 * End-screen copy helpers — tier-delta + coaching line.
 *
 * The psychologist's recommendation: every session-end screen needs
 *   1. Score (rendered by the game)
 *   2. Delta to next tier — gives the player a concrete near-miss reason to retry
 *   3. Specific praise or coaching — tells them what to focus on
 *
 * This module returns lines 2 and 3. Score stays game-owned.
 *
 * Coaching templates are PM-tunable — keep them aspirational, never condescending,
 * and prefer concrete observation ("your last 5 stacks were perfect") over generic
 * praise ("nice job!").
 */

import { SCORE_THRESHOLDS } from './config';

export type GameId =
  | 'keepey-upey'
  | 'axolotl-stacker'
  | 'math-rush'
  | 'coral-code'
  | 'tide-tiles'
  | 'bubble-line-up'
  | 'fishing'
  | 'bite-tag';

export type Tier = 'normal' | 'good' | 'exceptional';

export interface EndScreenLines {
  /** "4 more for Exceptional!" or "New best!" — null when no meaningful delta to surface. */
  tierDelta: string | null;
  /** Specific coaching/praise. Always non-null; falls back to a generic line per game. */
  coaching: string;
}

export interface EndScreenInput {
  gameId: GameId;
  score: number;
  tier: Tier;
  /** Optional context the game can pass for sharper coaching. */
  context?: GameContext;
}

/**
 * Per-game context the game can optionally pass for richer coaching.
 * All fields optional — coaching falls back to score-bucket templates if absent.
 */
export interface GameContext {
  // KeepeyUpey
  previousBest?: number;
  // AxolotlStacker
  longestPerfectStreak?: number;
  totalDrops?: number;
  perfectDrops?: number;
  // BubbleLineUp
  puzzlesCleared?: number;
  cellsFilledOnFinalPuzzle?: number;
  finalPuzzleCellTotal?: number;
  // MathRush
  highestOperator?: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'sqrt';
  // CoralCode
  guessesUsed?: number;
  exactMatches?: number;
  // BiteTag
  bitesTaken?: number;
  // Fishing
  fishCaught?: number;
  heaviestFishWeight?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Tier-delta calculation
// ────────────────────────────────────────────────────────────────────────────

const NICE_UNITS: Record<GameId, (n: number) => string> = {
  'keepey-upey': (n) => `${n}s longer`,
  'axolotl-stacker': (n) => `${n} more block${n === 1 ? '' : 's'}`,
  'math-rush': (n) => `${n} more correct`,
  'coral-code': (n) => `solve in ${n} fewer guess${n === 1 ? '' : 'es'}`,
  'tide-tiles': (n) => `${n} more points`,
  'bubble-line-up': (n) => `${n} more points`,
  'fishing': (n) => `${n}kg more`,
  'bite-tag': (n) => `${n}s longer`,
};

/**
 * Returns "4 more for Exceptional!" style copy, or null if the player is already
 * at the top tier (with a positive note instead).
 */
function buildTierDelta(
  gameId: GameId,
  score: number,
  tier: Tier,
): string | null {
  const thresholds = SCORE_THRESHOLDS[gameId];
  if (!thresholds) return null;

  if (tier === 'exceptional') {
    // Already at the top — affirm rather than push
    return 'Exceptional run!';
  }

  const target = tier === 'normal' ? thresholds.good : thresholds.exceptional;
  const targetLabel = tier === 'normal' ? 'Good' : 'Exceptional';
  const delta = target - score;
  if (delta <= 0) return null; // edge case — shouldn't happen but guard anyway

  // CoralCode is special: score = guesses remaining, so "delta" means
  // "solve in N fewer guesses" rather than "earn N more points."
  if (gameId === 'coral-code') {
    return `Solve in ${delta} fewer guess${delta === 1 ? '' : 'es'} for ${targetLabel}`;
  }

  return `${NICE_UNITS[gameId](delta)} for ${targetLabel}!`;
}

// ────────────────────────────────────────────────────────────────────────────
// Coaching lines
// ────────────────────────────────────────────────────────────────────────────

function coachKeepeyUpey(score: number, tier: Tier, ctx?: GameContext): string {
  if (ctx?.previousBest && score > ctx.previousBest) return 'New personal best!';
  if (tier === 'exceptional') return 'Tap rhythm dialed in. Keep it going.';
  if (score < 5) return 'Tap rhythm matters more than tap speed.';
  if (score < 15) return 'Try gentle taps to glide between obstacles.';
  return 'Watch for paired obstacles — they ramp up after 15 seconds.';
}

function coachStacker(score: number, tier: Tier, ctx?: GameContext): string {
  if (ctx?.longestPerfectStreak && ctx.longestPerfectStreak >= 3) {
    return `Longest perfect streak: ${ctx.longestPerfectStreak}. Try for ${ctx.longestPerfectStreak + 2} next.`;
  }
  if (ctx?.perfectDrops && ctx?.totalDrops && ctx.totalDrops > 0) {
    const ratio = ctx.perfectDrops / ctx.totalDrops;
    if (ratio >= 0.5) return 'Half your stacks were perfect — your timing is sharp.';
  }
  if (tier === 'exceptional') return 'Towering form. Your timing is locked in.';
  if (score < 3) return 'Drop just before the block reaches the edge — not at it.';
  if (score < 10) return 'Smaller blocks need earlier drops. Anticipate the swing.';
  return 'After 10 blocks, the tower scrolls — keep your eye on the next swing.';
}

function coachBubbleLineUp(score: number, tier: Tier, ctx?: GameContext): string {
  if (ctx?.puzzlesCleared !== undefined) {
    if (ctx.puzzlesCleared === 0) return 'Start by tracing the outside edges first.';
    return `Cleared ${ctx.puzzlesCleared} puzzle${ctx.puzzlesCleared === 1 ? '' : 's'}. Plan paths so they don't trap each other.`;
  }
  if (tier === 'exceptional') return 'Path planning instincts on point.';
  if (score < 100) return 'Fill every cell — connecting pairs is only half of it.';
  return 'Long paths first; short pairs squeeze into what\'s left.';
}

function coachTideTiles(score: number, tier: Tier): string {
  if (tier === 'exceptional') return 'Big-tile chains — that\'s the trick.';
  if (score < 200) return 'Build merges in one corner so they don\'t scatter.';
  return 'Save your highest tile — never let it block a merge.';
}

function coachMathRush(score: number, tier: Tier, ctx?: GameContext): string {
  if (ctx?.highestOperator === 'sqrt' && score >= 33) return 'You hit square roots — top-tier territory.';
  if (ctx?.highestOperator === 'multiplication' && score >= 13) return 'Multiplication unlocked. Division is next.';
  if (tier === 'exceptional') return 'Speed and accuracy locked in.';
  if (score < 4) return 'Take the timer slow at first — accuracy matters more.';
  if (score < 13) return 'You\'ve got addition and subtraction — multiplication unlocks at 13.';
  return 'The timer speeds up — breathe and keep your rhythm.';
}

function coachCoralCode(score: number, tier: Tier, ctx?: GameContext): string {
  if (score === 10) return 'First guess solve — incredible.';
  if (ctx?.guessesUsed !== undefined && ctx?.exactMatches !== undefined) {
    return `Solved with ${ctx.exactMatches} exact match${ctx.exactMatches === 1 ? '' : 'es'} on your way. Try eliminating one position at a time next.`;
  }
  if (tier === 'exceptional') return 'Strong deduction — you read the pegs well.';
  if (score === 0) return 'Use your first 2 guesses to test new colors, not positions.';
  return 'Green pegs lock a position — focus on those before the orange ones.';
}

function coachBiteTag(_score: number, tier: Tier, ctx?: GameContext): string {
  if (ctx?.bitesTaken === 0) return 'Untouched — beautiful play.';
  if (ctx?.bitesTaken === 1) return 'One bite, one survivor. Stay near walls earlier.';
  if (tier === 'exceptional') return 'Excellent dodging.';
  return 'Use dash to break line-of-sight, not just to chase.';
}

function coachFishing(_score: number, tier: Tier, ctx?: GameContext): string {
  if (ctx?.heaviestFishWeight && ctx.heaviestFishWeight >= 15) {
    return `${ctx.heaviestFishWeight}kg catch — hold steady through the fight next time too.`;
  }
  if (ctx?.fishCaught !== undefined) {
    if (ctx.fishCaught === 0) return 'No catches. Try waiting for fish to swim onto your line.';
    return `${ctx.fishCaught} fish caught. Heavier fish swim deeper — drop further next time.`;
  }
  if (tier === 'exceptional') return 'Outfished the bot cleanly.';
  return 'Heavier fish swim deeper. Drop further to find them.';
}

const COACHES: Record<GameId, (score: number, tier: Tier, ctx?: GameContext) => string> = {
  'keepey-upey': coachKeepeyUpey,
  'axolotl-stacker': coachStacker,
  'bubble-line-up': coachBubbleLineUp,
  'tide-tiles': (s, t) => coachTideTiles(s, t),
  'math-rush': coachMathRush,
  'coral-code': coachCoralCode,
  'bite-tag': coachBiteTag,
  'fishing': coachFishing,
};

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

export function getEndScreenLines(input: EndScreenInput): EndScreenLines {
  const { gameId, score, tier, context } = input;
  return {
    tierDelta: buildTierDelta(gameId, score, tier),
    coaching: COACHES[gameId](score, tier, context),
  };
}
