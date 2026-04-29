/**
 * CrashFlash — reusable death/near-miss visual.
 *
 * Renders a red full-screen flash + screen shake on its parent, fires a haptic
 * pulse, then unmounts itself ~600ms later. Used to give fail states a clear
 * "moment" instead of an abrupt freeze→overlay transition (which players read
 * as a crash bug).
 *
 * Usage:
 *   {showCrash && <CrashFlash onDone={() => setShowOverlay(true)} />}
 *
 * The parent should also delay its end-overlay reveal until onDone fires, so
 * the player sees the flash/shake first.
 *
 * Variants:
 *   intensity="hard"  → bright red, 600ms, full shake (KeepeyUpey crash, BiteTag elim)
 *   intensity="soft"  → orange, 400ms, lighter shake (Fishing escape, MathRush wrong)
 */

import { useEffect } from 'react';
import { motion } from 'motion/react';

export type CrashIntensity = 'hard' | 'soft';

interface CrashFlashProps {
  intensity?: CrashIntensity;
  /** Called once the flash + shake animation is finished. */
  onDone?: () => void;
  /** Set false to skip haptics for very rapid-fire fails (e.g. MathRush). */
  haptic?: boolean;
}

const CONFIG: Record<CrashIntensity, {
  duration: number;
  color: string;
  peakOpacity: number;
  shakeAmplitude: number;
  vibratePattern: number[];
}> = {
  hard: {
    duration: 0.6,
    color: 'rgb(220, 38, 38)',  // red-600
    peakOpacity: 0.55,
    shakeAmplitude: 12,
    vibratePattern: [30, 20, 60],
  },
  soft: {
    duration: 0.4,
    color: 'rgb(234, 88, 12)',  // orange-600
    peakOpacity: 0.4,
    shakeAmplitude: 6,
    vibratePattern: [25],
  },
};

export function CrashFlash({
  intensity = 'hard',
  onDone,
  haptic = true,
}: CrashFlashProps) {
  const cfg = CONFIG[intensity];

  useEffect(() => {
    // Haptic — silently no-ops on unsupported devices (covers iOS WebView fine
    // when the native bridge isn't wired up).
    if (haptic && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(cfg.vibratePattern);
      } catch {
        // ignore
      }
    }
    const t = window.setTimeout(() => {
      onDone?.();
    }, cfg.duration * 1000);
    return () => window.clearTimeout(t);
  }, [haptic, cfg.duration, cfg.vibratePattern, onDone]);

  return (
    <>
      {/* Full-screen color flash that fades from peak → 0 */}
      <motion.div
        aria-hidden
        initial={{ opacity: cfg.peakOpacity }}
        animate={{ opacity: 0 }}
        transition={{ duration: cfg.duration, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: cfg.color,
          pointerEvents: 'none',
          zIndex: 40,
          mixBlendMode: 'screen',
        }}
      />
      {/* Shake — applied to a sibling that wraps the parent's content. We use
          a separate transform layer here so we don't have to refactor the
          parent's component tree. The shake is pinned to inset:0 like the
          flash; if the parent has overflow-hidden the shake stays contained. */}
      <motion.div
        aria-hidden
        animate={{
          x: [0, cfg.shakeAmplitude, -cfg.shakeAmplitude * 0.7, cfg.shakeAmplitude * 0.5, 0],
          y: [0, -cfg.shakeAmplitude * 0.4, cfg.shakeAmplitude * 0.3, 0, 0],
        }}
        transition={{ duration: Math.min(cfg.duration, 0.4), ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 39,
        }}
      />
    </>
  );
}
