import { useEffect, useRef } from 'react';

interface Options {
  /** When false, the interval is paused. Defaults to true. */
  enabled?: boolean;
  /** When true, fires the callback once whenever the interval transitions
   *  from paused → running (initial mount, resume from background, enabled
   *  flipping from false to true). Defaults to false, which matches
   *  setInterval semantics (first fire after `intervalMs`). */
  immediate?: boolean;
}

/**
 * setInterval, but pauses while the app is backgrounded — webview hidden
 * (`visibilitychange`) OR native shell paused (`axo-app-pause`). Resumes when
 * both signals say active.
 *
 * The latest `callback` is always invoked, so callers don't need useCallback —
 * the interval doesn't restart when the callback identity changes.
 */
export function useBackgroundAwareInterval(
  callback: () => void,
  intervalMs: number,
  options: Options = {},
): void {
  const { enabled = true, immediate = false } = options;

  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let webviewHidden = document.visibilityState === 'hidden';
    let nativePaused = false;

    const fire = () => callbackRef.current();

    const start = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(fire, intervalMs);
    };

    const stop = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const sync = () => {
      const shouldRun = !webviewHidden && !nativePaused;
      if (shouldRun && intervalId === null) {
        if (immediate) fire();
        start();
      } else if (!shouldRun && intervalId !== null) {
        stop();
      }
    };

    const handleVisibility = () => {
      webviewHidden = document.visibilityState === 'hidden';
      sync();
    };
    const handleNativePause = () => {
      nativePaused = true;
      sync();
    };
    const handleNativeResume = () => {
      nativePaused = false;
      sync();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('axo-app-pause', handleNativePause);
    document.addEventListener('axo-app-resume', handleNativeResume);

    sync();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('axo-app-pause', handleNativePause);
      document.removeEventListener('axo-app-resume', handleNativeResume);
    };
  }, [enabled, intervalMs, immediate]);
}
