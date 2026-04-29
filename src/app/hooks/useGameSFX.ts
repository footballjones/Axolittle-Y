/**
 * useGameSFX — sample-based sound effects for mini-games.
 *
 * Plays Kenney CC0 audio packs from /public/sounds/Kenney audio/.
 * Files are fetched + decoded lazily on first use, then cached as
 * AudioBuffers. Each play creates a fresh BufferSource so the same SFX
 * can overlap (multiple bounces, multiple merges, etc).
 *
 * `pitch` is implemented via playbackRate (faster rate = higher pitch,
 * shorter duration). `volume` is a 0–1 multiplier on the base entry volume.
 *
 * SFX names map to a short list of files; one is picked at random per play
 * so repeated triggers (e.g. tap, click) don't sound mechanical.
 */

import { useEffect, useMemo, useRef } from 'react';

export type SFXName =
  | 'tap' | 'start' | 'win' | 'lose' | 'tier_good' | 'tier_exceptional'
  | 'bounce' | 'crash'
  | 'drop_perfect' | 'drop_good' | 'miss' | 'slice'
  | 'path_step' | 'pair_complete' | 'time_low'
  | 'slide' | 'merge' | 'no_move'
  | 'correct' | 'wrong' | 'tick'
  | 'peg_pick' | 'submit' | 'feedback_reveal'
  | 'tag' | 'dash' | 'dash_ready' | 'eliminated' | 'hazard_warn'
  | 'cast' | 'hooked' | 'caught' | 'escaped';

interface PlayOptions {
  pitch?: number;  // playbackRate multiplier (1 = original)
  volume?: number; // 0–1 multiplier on entry volume
}

interface SFXEntry {
  files: string[];          // relative to BASE; one is chosen at random
  volume?: number;          // base volume 0–1 (default 0.7)
}

// ────────────────────────────────────────────────────────────────────────────
// File path helpers
// ────────────────────────────────────────────────────────────────────────────

const BASE = `${import.meta.env.BASE_URL}sounds/Kenney audio/`;
const INT = `${BASE}kenney_interface-sounds/Audio/`;  // clicks, glass, etc.
const IMP = `${BASE}kenney_impact-sounds/Audio/`;     // wood, punch, plank.

/** Enumerate Kenney `name_NNN.ogg` variants so each SFX can pick a random one. */
function variants(folder: string, base: string, count: number, start = 0): string[] {
  return Array.from({ length: count }, (_, i) =>
    `${folder}${base}_${String(i + start).padStart(3, '0')}.ogg`,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SFX → Kenney file mappings
// ────────────────────────────────────────────────────────────────────────────

const SFX_MAP: Record<SFXName, SFXEntry> = {
  // ── Universal ──────────────────────────────────────────────────────────────
  tap: {
    files: [`${INT}click_001.ogg`, `${INT}click_002.ogg`, `${INT}click_003.ogg`],
    volume: 0.6,
  },
  start: {
    files: [`${INT}confirmation_001.ogg`, `${INT}confirmation_004.ogg`],
    volume: 0.7,
  },
  win: {
    files: [`${INT}bong_001.ogg`],
    volume: 0.75,
  },
  lose: {
    files: [`${INT}error_005.ogg`, `${INT}error_006.ogg`],
    volume: 0.55,
  },
  tier_good: {
    files: [`${INT}confirmation_004.ogg`],
    volume: 0.7,
  },
  tier_exceptional: {
    files: [`${INT}bong_001.ogg`],
    volume: 0.85,
  },

  // ── KeepeyUpey ────────────────────────────────────────────────────────────
  // Fires per tap — pluck was the chiptune offender. Drop sounds are tactile thuds.
  bounce: {
    files: [`${INT}drop_001.ogg`, `${INT}drop_002.ogg`, `${INT}drop_003.ogg`, `${INT}drop_004.ogg`],
    volume: 0.55,
  },
  // Soft heavy = water-y impact, not lumberjack
  crash: {
    files: variants(IMP, 'impactSoft_heavy', 5),
    volume: 0.75,
  },

  // ── AxolotlStacker ────────────────────────────────────────────────────────
  // Plate-light = sharp metallic ping, distinct timbre from drop_good below
  drop_perfect: {
    files: variants(IMP, 'impactPlate_light', 5),
    volume: 0.65,
  },
  // Soft-medium = muted tactile thud, not woodblock-y when repeated
  drop_good: {
    files: variants(IMP, 'impactSoft_medium', 5),
    volume: 0.55,
  },
  // Plank stays — heavy enough to read as "fail" without being arcade
  miss: {
    files: variants(IMP, 'impactPlank_medium', 5),
    volume: 0.65,
  },
  slice: {
    files: [`${INT}scratch_001.ogg`, `${INT}scratch_002.ogg`, `${INT}scratch_003.ogg`],
    volume: 0.35,
  },

  // ── BubbleLineUp ──────────────────────────────────────────────────────────
  path_step: {
    files: [`${INT}click_004.ogg`, `${INT}click_005.ogg`],
    volume: 0.3,
  },
  pair_complete: {
    files: [`${INT}confirmation_001.ogg`],
    volume: 0.45,
  },
  time_low: {
    files: [`${INT}tick_001.ogg`],
    volume: 0.55,
  },

  // ── TideTiles ─────────────────────────────────────────────────────────────
  slide: {
    files: [`${INT}switch_001.ogg`, `${INT}switch_002.ogg`, `${INT}switch_003.ogg`],
    volume: 0.4,
  },
  // Tin = metallic shimmer without the chiptune-glass character.
  // Fires multiple times per move so this matters most.
  merge: {
    files: variants(IMP, 'impactTin_medium', 5),
    volume: 0.55,
  },
  no_move: {
    files: [`${INT}error_001.ogg`],
    volume: 0.4,
  },

  // ── MathRush ──────────────────────────────────────────────────────────────
  // confirmation_001 (the same one BubbleLineUp uses for pair_complete — you liked it).
  // Combo pitch climb still works via playbackRate.
  correct: {
    files: [`${INT}confirmation_001.ogg`],
    volume: 0.6,
  },
  // error_008 is softer than 004 — repeated wrong answers don't blast the player
  wrong: {
    files: [`${INT}error_008.ogg`],
    volume: 0.55,
  },
  tick: {
    files: [`${INT}tick_002.ogg`, `${INT}tick_004.ogg`],
    volume: 0.45,
  },

  // ── CoralCode ─────────────────────────────────────────────────────────────
  // Drop pluck (chiptune-leaning) — pure clicks
  peg_pick: {
    files: [`${INT}click_004.ogg`, `${INT}click_005.ogg`],
    volume: 0.45,
  },
  // Switch = committed/sliding feel, less arcade than confirmation_003
  submit: {
    files: [`${INT}switch_006.ogg`, `${INT}switch_007.ogg`],
    volume: 0.55,
  },
  // Fires up to 5x per submit — must be subtle. Pure click, pitch-coded for correct vs partial.
  feedback_reveal: {
    files: [`${INT}click_002.ogg`, `${INT}click_003.ogg`],
    volume: 0.4,
  },

  // ── BiteTag ───────────────────────────────────────────────────────────────
  tag: {
    files: variants(IMP, 'impactPunch_heavy', 5),
    volume: 0.7,
  },
  dash: {
    files: [
      `${INT}maximize_002.ogg`,
      `${INT}maximize_003.ogg`,
      `${INT}maximize_004.ogg`,
    ],
    volume: 0.5,
  },
  dash_ready: {
    files: [`${INT}select_004.ogg`, `${INT}select_005.ogg`],
    volume: 0.45,
  },
  eliminated: {
    files: [`${INT}error_002.ogg`],
    volume: 0.6,
  },
  hazard_warn: {
    files: [`${INT}glitch_002.ogg`, `${INT}glitch_003.ogg`],
    volume: 0.5,
  },

  // ── Fishing ───────────────────────────────────────────────────────────────
  cast: {
    files: [
      `${INT}drop_001.ogg`,
      `${INT}drop_002.ogg`,
      `${INT}drop_003.ogg`,
      `${INT}drop_004.ogg`,
    ],
    volume: 0.6,
  },
  // Drop pluck/confirmation. A sharp tactile snap reads as "line tightens."
  hooked: {
    files: [`${INT}select_004.ogg`, `${INT}select_005.ogg`],
    volume: 0.55,
  },
  // Soft impact + positive confirmation = water thud + small cheer (no bong)
  caught: {
    files: variants(IMP, 'impactSoft_heavy', 5),
    volume: 0.7,
  },
  // error_007 is softer than _003 — fish escape shouldn't feel hostile
  escaped: {
    files: [`${INT}error_007.ogg`],
    volume: 0.5,
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Audio engine — single shared AudioContext + buffer cache
// ────────────────────────────────────────────────────────────────────────────

let sharedCtx: AudioContext | null = null;
const bufferCache = new Map<string, Promise<AudioBuffer | null>>();

function getCtx(): AudioContext | null {
  if (sharedCtx) return sharedCtx;
  if (typeof window === 'undefined') return null;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    sharedCtx = new Ctor();
    return sharedCtx;
  } catch {
    return null;
  }
}

function ensureRunning(ctx: AudioContext) {
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(url);
  if (cached) return cached;
  const promise = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.arrayBuffer();
      // decodeAudioData callback form for older Safari compatibility
      return await new Promise<AudioBuffer | null>((resolve) => {
        ctx.decodeAudioData(
          data,
          (buf) => resolve(buf),
          () => resolve(null),
        );
      });
    } catch {
      return null;
    }
  })();
  bufferCache.set(url, promise);
  return promise;
}

function playEntry(
  ctx: AudioContext,
  entry: SFXEntry,
  opts: PlayOptions,
) {
  const url = entry.files[Math.floor(Math.random() * entry.files.length)];
  const baseVol = (entry.volume ?? 0.7) * (opts.volume ?? 1);
  const pitch = opts.pitch ?? 1;
  loadBuffer(ctx, url).then((buffer) => {
    if (!buffer) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = pitch;
    const g = ctx.createGain();
    g.gain.value = baseVol;
    src.connect(g).connect(ctx.destination);
    src.start();
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────────────

interface SFXController {
  play: (name: SFXName, opts?: PlayOptions) => void;
}

export function useGameSFX(enabled = true): SFXController {
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  return useMemo<SFXController>(
    () => ({
      play(name, opts = {}) {
        if (!enabledRef.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        ensureRunning(ctx);
        try {
          playEntry(ctx, SFX_MAP[name], opts);
        } catch {
          // Swallow — SFX must never crash gameplay.
        }
      },
    }),
    [],
  );
}
