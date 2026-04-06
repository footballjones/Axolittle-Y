/**
 * useContextMusic — manages background music playback.
 * Automatically rotates through tracks from a specified context (aquarium, miniGames, etc).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getRandomTrack, MUSIC_CONFIG } from '../utils/musicConfig';

interface UseContextMusicOptions {
  context?: keyof typeof MUSIC_CONFIG; // Which music folder to play from ('aquarium' or 'miniGames')
  enabled?: boolean; // Play on current page/context
  musicEnabled?: boolean; // Global master toggle from settings
  volume?: number;
  fadeDuration?: number;
  startingTrack?: string; // Specific track to play first (e.g., first track of mini-game context)
}

export function useContextMusic({
  context = 'aquarium',
  enabled = true,
  musicEnabled = true, // Default to true if not provided (backwards compatibility)
  volume = 0.3,
  fadeDuration = 1000, // ms
  startingTrack,
}: UseContextMusicOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentVolumeRef = useRef(0);
  const onEndedRef = useRef<() => void>(() => {});
  const startingTrackUsedRef = useRef(false); // Track if we've used the starting track
  const [isPlaying, setIsPlaying] = useState(false);

  // Create audio element (once)
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.loop = false;
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current && onEndedRef.current) {
        audioRef.current.removeEventListener('ended', onEndedRef.current);
      }
    };
  }, []);

  // Fade in/out helper
  const setVolumeSmooth = useCallback((targetVolume: number) => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    const steps = Math.ceil(fadeDuration / 50); // 50ms per step
    const volumeStep = (targetVolume - currentVolumeRef.current) / steps;
    let stepsRemaining = steps;

    fadeIntervalRef.current = setInterval(() => {
      currentVolumeRef.current += volumeStep;
      stepsRemaining--;

      // Clamp and apply
      currentVolumeRef.current = Math.max(0, Math.min(1, currentVolumeRef.current));
      if (audioRef.current) {
        audioRef.current.volume = currentVolumeRef.current;
      }

      if (stepsRemaining <= 0 && fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }, 50);
  }, [fadeDuration]);

  // Play a specific track
  const playTrack = useCallback((src: string) => {
    if (!audioRef.current) return;

    // Pause first to cleanly abort any in-flight play() promise
    audioRef.current.pause();
    audioRef.current.src = src;
    audioRef.current.currentTime = 0;

    // Fade in
    currentVolumeRef.current = 0;
    audioRef.current.volume = 0;
    audioRef.current.play().catch(err => {
      // Autoplay might be blocked by browser — log silently
      console.debug('[Music] Autoplay blocked:', err);
    });

    setVolumeSmooth(volume);
    setIsPlaying(true);
  }, [setVolumeSmooth, volume]);

  // Play next random track from the specified context
  // On first play, uses startingTrack if provided, then falls back to random selection
  const playNextTrack = useCallback(() => {
    let trackToPlay: string | undefined;

    // Use starting track on first play if provided
    if (startingTrack && !startingTrackUsedRef.current) {
      trackToPlay = startingTrack;
      startingTrackUsedRef.current = true;
    } else {
      // After first play, or if no starting track, use random selection
      trackToPlay = getRandomTrack(context);
    }

    if (trackToPlay) {
      playTrack(trackToPlay);
    }
  }, [playTrack, context, startingTrack]);

  // Reset starting track flag when context or starting track changes
  useEffect(() => {
    startingTrackUsedRef.current = false;
  }, [context, startingTrack]);

  // Update event listener whenever playNextTrack changes (e.g., when context changes)
  useEffect(() => {
    if (!audioRef.current) return;

    // Remove old handler
    if (onEndedRef.current) {
      audioRef.current.removeEventListener('ended', onEndedRef.current);
    }

    // Attach new handler
    onEndedRef.current = playNextTrack;
    audioRef.current.addEventListener('ended', onEndedRef.current);

    return () => {
      if (audioRef.current && onEndedRef.current) {
        audioRef.current.removeEventListener('ended', onEndedRef.current);
      }
    };
  }, [playNextTrack]);

  // Start playing (fade in and auto-rotate)
  const start = useCallback(() => {
    if (!audioRef.current) return;
    playNextTrack();
  }, [playNextTrack]);

  // Stop playing (immediately pause and fade out)
  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setVolumeSmooth(0);
    setIsPlaying(false);
  }, [setVolumeSmooth]);

  // Pause (no fade, just stop)
  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Resume (no fade, just play)
  const resume = () => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Keep refs to the latest start/stop so the enable effect doesn't re-fire
  // every time those callbacks get a new reference (e.g. StrictMode double-mount).
  const startRef = useRef(start);
  const stopRef = useRef(stop);
  useEffect(() => {
    startRef.current = start;
    stopRef.current = stop;
  });

  // Start or stop based on both enabled AND musicEnabled (global setting).
  // Deps intentionally omit start/stop — we use refs so this only fires on
  // actual enabled/musicEnabled changes, preventing double-play in StrictMode.
  useEffect(() => {
    if (enabled && musicEnabled) {
      startRef.current();
    } else {
      stopRef.current();
    }
    return () => stopRef.current(); // Stop on cleanup (unmount or re-run)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, musicEnabled]);

  // Pause/resume when iOS WKWebView fires app lifecycle events
  useEffect(() => {
    const handlePause = () => {
      if (audioRef.current) audioRef.current.pause();
    };
    const handleResume = () => {
      if (audioRef.current && audioRef.current.src && musicEnabled && enabled) {
        audioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('axo-app-pause', handlePause);
    document.addEventListener('axo-app-resume', handleResume);
    return () => {
      document.removeEventListener('axo-app-pause', handlePause);
      document.removeEventListener('axo-app-resume', handleResume);
    };
  }, [musicEnabled, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return {
    isPlaying,
    start,
    stop,
    pause,
    resume,
    setVolume: (newVolume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      if (audioRef.current && currentVolumeRef.current > 0) {
        audioRef.current.volume = clampedVolume;
        currentVolumeRef.current = clampedVolume;
      }
    },
  };
}

/**
 * Backwards-compatible alias for useContextMusic with aquarium context.
 * @deprecated Use useContextMusic instead
 */
export function useAquariumMusic(options?: Omit<UseContextMusicOptions, 'context'>) {
  return useContextMusic({ ...options, context: 'aquarium' });
}
