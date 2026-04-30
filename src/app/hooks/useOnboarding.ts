/**
 * useOnboarding — manages all tutorial and onboarding state for the game.
 *
 * Extracted from App.tsx to reduce its size. Owns:
 *  - Hatching / naming flow state
 *  - Tutorial pacing (delayNextTutorial, tutorialAllowed)
 *  - All tutorial modal visibility flags
 *  - Tutorial progression effects (level-unlock triggers, pacing delays)
 *  - Mini-game tutorial phase
 *  - Derived tutorial lock state (tutorialLockMode, lockedActionButtons)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { GameState } from '../types/game';
import type { TutorialLockMode } from '../config/tutorialSteps';
import { calculateLevel, generateAxolotl } from '../utils/gameLogic';
import { getInitialGameState } from '../utils/storage';
import { trackOnce, OnboardingEvents } from '../utils/telemetry';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseOnboardingOptions {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  currentScreen: 'home' | 'games';
  activeModal: string | null;
  playMode: boolean;
  cleaningMode: boolean;
}

export interface UseOnboardingReturn {
  // ── Hatching / naming screens ──────────────────────────────────────────────
  showHatchingIntro: boolean;
  setShowHatchingIntro: (v: boolean) => void;
  hatchingNurseryEggId: string | null;
  setHatchingNurseryEggId: (v: string | null) => void;
  handleStart: (name: string) => void;
  handleNameAxolotl: (name: string) => void;

  // ── Tutorial pacing ────────────────────────────────────────────────────────
  tutorialAllowed: boolean;
  delayNextTutorial: (ms: number) => void;
  /** Ref used by the aquarium scroll handler to fire the swipe tutorial only once. */
  swipeTutDoneRef: React.MutableRefObject<boolean>;

  // ── Mini-game tutorial ─────────────────────────────────────────────────────
  mgTutPhase: 'unlock' | 'keepey' | null;
  setMgTutPhase: (v: 'unlock' | 'keepey' | null) => void;
  isGameLocked: boolean;

  // ── Tutorial modal visibility (passed through to ModalManager) ────────────
  showJuvenileUnlock: boolean;
  setShowJuvenileUnlock: (v: boolean) => void;
  showLevel7Unlock: boolean;
  setShowLevel7Unlock: (v: boolean) => void;
  showShrimpTutorialIntro: boolean;
  setShowShrimpTutorialIntro: (v: boolean) => void;
  showShrimpInfoModal: boolean;
  setShowShrimpInfoModal: (v: boolean) => void;
  shrimpTutorialShopPhase: 'info' | 'buy' | false;
  setShrimpTutorialShopPhase: (v: 'info' | 'buy' | false) => void;
  showRebirthReady: boolean;
  setShowRebirthReady: (v: boolean) => void;

  // ── Derived lock state (consumed by aquarium render + ActionButtons) ───────
  tutorialLockMode: TutorialLockMode | null;
  lockedActionButtons: Set<string>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOnboarding({
  gameState,
  setGameState,
  currentScreen,
  activeModal,
  playMode,
  cleaningMode: _cleaningMode,
}: UseOnboardingOptions): UseOnboardingReturn {

  // ── Hatching / naming ──────────────────────────────────────────────────────
  const [showHatchingIntro, setShowHatchingIntro] = useState(false);
  const [hatchingNurseryEggId, setHatchingNurseryEggId] = useState<string | null>(null);

  const handleStart = useCallback((name: string) => {
    setGameState(prev => {
      const base = prev || getInitialGameState();
      const axolotl = generateAxolotl(name);
      // Reduce water quality for new players so the water-change tutorial is relevant.
      const isNewGame = base.onboardingProgress !== undefined && base.onboardingProgress !== 'complete';
      const finalAxolotl = isNewGame
        ? { ...axolotl, stats: { ...axolotl.stats, waterQuality: 70 } }
        : axolotl;
      return { ...base, axolotl: finalAxolotl };
    });
  }, [setGameState]);

  const handleNameAxolotl = useCallback((name: string) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      return { ...prev, axolotl: { ...prev.axolotl, name } };
    });
    trackOnce(OnboardingEvents.NAMING_COMPLETE);
  }, [setGameState]);

  // ── Tutorial pacing ────────────────────────────────────────────────────────
  const [tutorialAllowed, setTutorialAllowed] = useState(true);
  const tutorialDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeTutDoneRef = useRef(false);

  const delayNextTutorial = useCallback((ms: number) => {
    setTutorialAllowed(false);
    if (tutorialDelayRef.current) clearTimeout(tutorialDelayRef.current);
    tutorialDelayRef.current = setTimeout(() => {
      setTutorialAllowed(true);
      tutorialDelayRef.current = null;
    }, ms);
  }, []);

  // ── Tutorial modal flags ───────────────────────────────────────────────────
  const [showJuvenileUnlock, setShowJuvenileUnlock] = useState(false);
  const [showLevel7Unlock, setShowLevel7Unlock] = useState(false);
  const [showShrimpTutorialIntro, setShowShrimpTutorialIntro] = useState(false);
  const [showShrimpInfoModal, setShowShrimpInfoModal] = useState(false);
  const [shrimpTutorialShopPhase, setShrimpTutorialShopPhase] = useState<'info' | 'buy' | false>(false);
  const [showRebirthReady, setShowRebirthReady] = useState(false);
  const shrimpTutorialTriggeredRef = useRef(false);
  const rebirthReadyTriggeredRef = useRef(false);

  // ── Mini-game tutorial phase ───────────────────────────────────────────────
  const [mgTutPhase, setMgTutPhase] = useState<'unlock' | 'keepey' | null>(null);
  const isGameLocked = !!gameState?.miniGamesLockedUntil && gameState.miniGamesLockedUntil > Date.now();

  // ── Effects: unlock modal triggers ────────────────────────────────────────

  useEffect(() => {
    if (
      gameState?.axolotl?.stage === 'sprout' &&
      !gameState.seenMilestones?.includes('juvenile_unlock') &&
      !showJuvenileUnlock
    ) {
      setShowJuvenileUnlock(true);
    }
  }, [gameState?.axolotl?.stage, gameState?.seenMilestones, showJuvenileUnlock]);

  // Level 7 unlock modal removed — social (friends) is always available and the
  // life-stage modal already conveys the same milestone info.

  useEffect(() => {
    const lvl = gameState?.axolotl ? calculateLevel(gameState.axolotl.experience) : 0;
    if (
      lvl >= 12 &&
      !gameState?.seenMilestones?.includes('shrimp_tutorial') &&
      !shrimpTutorialTriggeredRef.current &&
      currentScreen === 'home' &&
      !activeModal
    ) {
      shrimpTutorialTriggeredRef.current = true;
      setShowShrimpTutorialIntro(true);
    }
  }, [gameState?.axolotl?.experience, gameState?.seenMilestones, currentScreen, activeModal]);

  // Level 30 rebirth ready popup
  useEffect(() => {
    const lvl = gameState?.axolotl ? calculateLevel(gameState.axolotl.experience) : 0;
    if (
      lvl >= 30 &&
      gameState?.axolotl?.stage === 'elder' &&
      !gameState?.seenMilestones?.includes('rebirth_ready') &&
      !rebirthReadyTriggeredRef.current &&
      currentScreen === 'home' &&
      !activeModal
    ) {
      rebirthReadyTriggeredRef.current = true;
      setShowRebirthReady(true);
    }
  }, [gameState?.axolotl?.experience, gameState?.axolotl?.stage, gameState?.seenMilestones, currentScreen, activeModal]);

  // ── Effects: tutorial pacing delays (fire on progress transitions) ─────────

  const prevProgress = useRef(gameState?.onboardingProgress);
  useEffect(() => {
    const prev = prevProgress.current;
    const curr = gameState?.onboardingProgress;
    if (prev === curr) return;
    prevProgress.current = curr;

    if (curr === 'play')             delayNextTutorial(1000); // after stat banner tap, brief pause
    if (curr === 'clean')            delayNextTutorial(4000); // after first play, longer pause
    if (curr === 'water')            delayNextTutorial(1000); // after first clean
    if (curr === 'wellbeing_reward') delayNextTutorial(1000); // after first water change
    if (curr === 'complete') {
      trackOnce(OnboardingEvents.FIRST_CARE_CYCLE);
    }
  }, [gameState?.onboardingProgress, delayNextTutorial]);

  // Also delay after the stat milestone is first set (player taps stat banner)
  const prevMilestones = useRef(gameState?.seenMilestones);
  useEffect(() => {
    const prev = prevMilestones.current;
    const curr = gameState?.seenMilestones;
    if (prev === curr) return;
    prevMilestones.current = curr;
    if (
      curr?.includes('stat_tutorial') &&
      !prev?.includes('stat_tutorial')
    ) {
      delayNextTutorial(1000);
    }
  }, [gameState?.seenMilestones, delayNextTutorial]);

  // ── Effects: mini-game tutorial phase ─────────────────────────────────────

  useEffect(() => {
    if (currentScreen !== 'games') { setMgTutPhase(null); return; }
    if (
      gameState?.seenMilestones?.includes('mini_game_tutorial') ||
      gameState?.onboardingProgress !== 'complete'
    ) return;
    setMgTutPhase(isGameLocked ? 'unlock' : 'keepey');
  // isGameLocked intentionally excluded — handled by the effect below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen]);

  useEffect(() => {
    if (mgTutPhase === 'unlock' && !isGameLocked) setMgTutPhase('keepey');
  }, [mgTutPhase, isGameLocked]);

  useEffect(() => {
    if (mgTutPhase === 'keepey') {
      setGameState(s => {
        if (!s || s.seenMilestones?.includes('mini_game_tutorial')) return s;
        return { ...s, seenMilestones: [...(s.seenMilestones ?? []), 'mini_game_tutorial'] };
      });
    }
  }, [mgTutPhase, setGameState]);

  // ── Derived: tutorial lock ─────────────────────────────────────────────────

  const tutorialLockMode = ((): TutorialLockMode | null => {
    if (!tutorialAllowed || currentScreen !== 'home') return null;
    const progress = gameState?.onboardingProgress;
    const milestones = gameState?.seenMilestones ?? [];

    if (progress === 'swipe') return 'swipe';
    if (progress === 'feed')  return 'feed';
    if (progress === 'eat')   return 'watch';
    if (progress === 'clean') return 'clean';
    if (progress === 'water') return 'water';

    if (progress === 'play') {
      // Stat tutorial fires first if the player has unspent stat points
      if ((gameState?.pendingStatPoints ?? 0) > 0 && !milestones.includes('stat_tutorial') && !activeModal)
        return 'stat';
      // Once stat is done (or there were never points), gate play
      if (
        (milestones.includes('stat_tutorial') || (gameState?.pendingStatPoints ?? 0) === 0) &&
        !activeModal && !playMode
      ) return 'play';
    }

    return null;
  })();

  const lockedActionButtons = new Set<string>();
  if (tutorialLockMode === 'feed') {
    ['Playtime', 'Clean', 'Water Quality'].forEach(b => lockedActionButtons.add(b));
  } else if (tutorialLockMode === 'swipe' || tutorialLockMode === 'watch' || tutorialLockMode === 'stat') {
    ['Feed', 'Playtime', 'Clean', 'Water Quality'].forEach(b => lockedActionButtons.add(b));
  } else if (tutorialLockMode === 'play') {
    ['Feed', 'Clean', 'Water Quality'].forEach(b => lockedActionButtons.add(b));
  } else if (tutorialLockMode === 'clean') {
    ['Feed', 'Playtime', 'Water Quality'].forEach(b => lockedActionButtons.add(b));
  } else if (tutorialLockMode === 'water') {
    ['Feed', 'Playtime', 'Clean'].forEach(b => lockedActionButtons.add(b));
  }

  return {
    showHatchingIntro,
    setShowHatchingIntro,
    hatchingNurseryEggId,
    setHatchingNurseryEggId,
    handleStart,
    handleNameAxolotl,
    tutorialAllowed,
    delayNextTutorial,
    swipeTutDoneRef,
    mgTutPhase,
    setMgTutPhase,
    isGameLocked,
    showJuvenileUnlock,
    setShowJuvenileUnlock,
    showLevel7Unlock,
    setShowLevel7Unlock,
    showShrimpTutorialIntro,
    setShowShrimpTutorialIntro,
    showShrimpInfoModal,
    setShowShrimpInfoModal,
    shrimpTutorialShopPhase,
    setShrimpTutorialShopPhase,
    showRebirthReady,
    setShowRebirthReady,
    tutorialLockMode,
    lockedActionButtons,
  };
}
