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
}

export function useContextMusic({
  context = 'aquarium',
  enabled = true,
  musicEnabled = true, // Default to true if not provided (backwards compatibility)
  volume = 0.3,
  fadeDuration = 1000, // ms
}: UseContextMusicOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentVolumeRef = useRef(0);
  const onEndedRef = useRef<() => void>(() => {});
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
  const playNextTrack = useCallback(() => {
    const nextTrack = getRandomTrack(context);
    if (nextTrack) {
      playTrack(nextTrack);
    }
  }, [playTrack, context]);

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
  }, []);

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

  // Start or stop based on both enabled AND musicEnabled (global setting)
  useEffect(() => {
    if (enabled && musicEnabled) {
      start();
    } else {
      stop();
    }
  }, [enabled, musicEnabled, start, stop]);

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
