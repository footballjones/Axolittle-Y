/**
 * useAquariumMusic — manages background music playback in the aquarium.
 * Automatically rotates through tracks from the aquarium folder.
 */

import { useEffect, useRef, useState } from 'react';
import { getRandomTrack } from '../utils/musicConfig';

interface UseAquariumMusicOptions {
  enabled?: boolean;
  volume?: number;
  fadeDuration?: number;
}

export function useAquariumMusic({
  enabled = true,
  volume = 0.3,
  fadeDuration = 1000, // ms
}: UseAquariumMusicOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentVolumeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Create or get audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.loop = false;
      audioRef.current = audio;

      // When track ends, play next one
      audio.addEventListener('ended', playNextTrack);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', playNextTrack);
      }
    };
  }, []);

  // Fade in/out helper
  const setVolumeSmooth = (targetVolume: number) => {
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
  };

  // Play a specific track
  const playTrack = (src: string) => {
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
  };

  // Play next random track
  const playNextTrack = () => {
    const nextTrack = getRandomTrack('aquarium');
    if (nextTrack) {
      playTrack(nextTrack);
    }
  };

  // Start playing (fade in and auto-rotate)
  const start = () => {
    if (isPlaying) return;
    playNextTrack();
  };

  // Stop playing (fade out and pause)
  const stop = () => {
    if (!isPlaying || !audioRef.current) return;

    setVolumeSmooth(0);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }, fadeDuration);
  };

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

  // Start or stop based on enabled state
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [enabled]);

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
      volume = Math.max(0, Math.min(1, newVolume));
      if (audioRef.current && currentVolumeRef.current > 0) {
        audioRef.current.volume = volume;
      }
    },
  };
}
