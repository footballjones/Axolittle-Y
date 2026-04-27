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
import { calculateLevel, generateAxolotl } from '../utils/gameLogic';
import { getInitialGameState } from '../utils/storage';

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
  showMenuTutorial: boolean;
  setShowMenuTutorial: (v: boolean) => void;
  /** True when conditions are met and we should prompt the player to start the menu tour. */
  showMenuTutorialPrompt: boolean;
  /** Call this when the player taps "Start Tour" on the prompt. */
  handleStartMenuTutorial: () => void;
  showMenuTutorialComplete: boolean;
  setShowMenuTutorialComplete: (v: boolean) => void;
  showRebirthReady: boolean;
  setShowRebirthReady: (v: boolean) => void;

  // ── Derived lock state (consumed by aquarium render + ActionButtons) ───────
  tutorialLockMode: 'swipe' | 'feed' | 'watch' | 'stat' | 'play' | 'clean' | 'water' | null;
  lockedActionButtons: Set<string>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOnboarding({
  gameState,
  setGameState,
  currentScreen,
  activeModal,
  playMode,
  cleaningMode,
}: UseOnboardingOptions): UseOnboardingReturn {

  // ── Hatching / naming ──────────────────────────────────────────────────────
  const [showHatchingIntro, setShowHatchingIntro] = useState(false);
  const [hatchingNurseryEggId, setHatchingNurseryEggId] = useState<string | null>(null);

  const handleStart = useCallback((name: string) => {
    setGameState(prev => {
      const base = prev || getInitialGameState();
      const axolotl = generateAxolotl(name);
      const finalAxolotl = base.waterTutorialSeen === false
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
  const [showMenuTutorial, setShowMenuTutorial] = useState(false);
  const [showMenuTutorialPrompt, setShowMenuTutorialPrompt] = useState(false);
  const [showMenuTutorialComplete, setShowMenuTutorialComplete] = useState(false);
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
      !gameState.juvenileUnlockSeen &&
      !showJuvenileUnlock
    ) {
      setShowJuvenileUnlock(true);
    }
  }, [gameState?.axolotl?.stage, gameState?.juvenileUnlockSeen, showJuvenileUnlock]);

  useEffect(() => {
    const lvl = gameState?.axolotl ? calculateLevel(gameState.axolotl.experience) : 0;
    if (lvl >= 7 && !gameState?.level7UnlockSeen && !showLevel7Unlock) {
      setShowLevel7Unlock(true);
    }
  }, [gameState?.axolotl?.experience, gameState?.level7UnlockSeen, showLevel7Unlock]);

  useEffect(() => {
    const lvl = gameState?.axolotl ? calculateLevel(gameState.axolotl.experience) : 0;
    if (
      lvl >= 12 &&
      !gameState?.shrimpTutorialSeen &&
      !shrimpTutorialTriggeredRef.current &&
      currentScreen === 'home' &&
      !activeModal
    ) {
      shrimpTutorialTriggeredRef.current = true;
      setShowShrimpTutorialIntro(true);
    }
  }, [gameState?.axolotl?.experience, gameState?.shrimpTutorialSeen, currentScreen, activeModal, setGameState]);

  // Level 30 rebirth ready popup
  useEffect(() => {
    const lvl = gameState?.axolotl ? calculateLevel(gameState.axolotl.experience) : 0;
    if (
      lvl >= 30 &&
      gameState?.axolotl?.stage === 'elder' &&
      !gameState?.rebirthReadySeen &&
      !rebirthReadyTriggeredRef.current &&
      currentScreen === 'home' &&
      !activeModal
    ) {
      rebirthReadyTriggeredRef.current = true;
      setShowRebirthReady(true);
    }
  }, [gameState?.axolotl?.experience, gameState?.axolotl?.stage, gameState?.rebirthReadySeen, currentScreen, activeModal]);

  // ── Effects: tutorial pacing delays ───────────────────────────────────────

  const prevStatTut = useRef(gameState?.statTutorialSeen);
  useEffect(() => {
    if (gameState?.statTutorialSeen && !prevStatTut.current) delayNextTutorial(1000);
    prevStatTut.current = gameState?.statTutorialSeen;
  }, [gameState?.statTutorialSeen, delayNextTutorial]);

  const prevPlayTut = useRef(gameState?.playTutorialSeen);
  useEffect(() => {
    if (gameState?.playTutorialSeen && !prevPlayTut.current) delayNextTutorial(4000);
    prevPlayTut.current = gameState?.playTutorialSeen;
  }, [gameState?.playTutorialSeen, delayNextTutorial]);

  const prevCleanTut = useRef(gameState?.cleanTutorialSeen);
  useEffect(() => {
    if (gameState?.cleanTutorialSeen === true && prevCleanTut.current === false) delayNextTutorial(1000);
    prevCleanTut.current = gameState?.cleanTutorialSeen;
  }, [gameState?.cleanTutorialSeen, delayNextTutorial]);

  const prevWaterTut = useRef(gameState?.waterTutorialSeen);
  useEffect(() => {
    if (gameState?.waterTutorialSeen === true && prevWaterTut.current === false) delayNextTutorial(1000);
    prevWaterTut.current = gameState?.waterTutorialSeen;
  }, [gameState?.waterTutorialSeen, delayNextTutorial]);

  // Hide the tutorial overlay as soon as the completion modal is shown
  // (both flags can become true simultaneously, leaving the overlay's blocking
  //  strips on top of the "Collect Reward!" button)
  useEffect(() => {
    if (showMenuTutorialComplete && showMenuTutorial) {
      setShowMenuTutorial(false);
    }
  }, [showMenuTutorialComplete, showMenuTutorial]);

  // Menu tutorial: show prompt every time the player is on the home screen
  // until the tutorial is fully complete. This prevents a broken mid-tutorial
  // state after app restart or navigating away.
  useEffect(() => {
    if (
      gameState?.wellbeingCompleteSeen === true &&
      !gameState?.menuTutorialSeen &&
      gameState?.tutorialStep === 'done' &&
      !showMenuTutorial &&
      !showMenuTutorialComplete &&
      tutorialAllowed &&
      currentScreen === 'home'
    ) {
      const t = setTimeout(() => setShowMenuTutorialPrompt(true), 800);
      return () => clearTimeout(t);
    }
    // Hide prompt when conditions are no longer met (e.g. navigated away)
    if (currentScreen !== 'home') {
      setShowMenuTutorialPrompt(false);
    }
  }, [
    gameState?.wellbeingCompleteSeen,
    gameState?.menuTutorialSeen,
    gameState?.tutorialStep,
    tutorialAllowed,
    currentScreen,
    showMenuTutorial,
    showMenuTutorialComplete,
  ]);

  // Reset the active tutorial overlay if the player navigates away from home
  // mid-tutorial. The prompt will re-appear when they return to home.
  useEffect(() => {
    if (showMenuTutorial && currentScreen !== 'home') {
      setShowMenuTutorial(false);
    }
  }, [currentScreen, showMenuTutorial]);

  // ── Effects: mini-game tutorial phase ─────────────────────────────────────

  useEffect(() => {
    if (currentScreen !== 'games') { setMgTutPhase(null); return; }
    if (
      gameState?.miniGameTutorialSeen ||
      !gameState?.waterTutorialSeen ||
      !gameState?.wellbeingCompleteSeen ||
      !gameState?.menuTutorialSeen
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
      setGameState(s => s && !s.miniGameTutorialSeen ? { ...s, miniGameTutorialSeen: true } : s);
    }
  }, [mgTutPhase, setGameState]);

  // ── Derived: tutorial lock ─────────────────────────────────────────────────

  const tutorialLockMode = ((): UseOnboardingReturn['tutorialLockMode'] => {
    if (!tutorialAllowed || currentScreen !== 'home') return null;
    const step = gameState?.tutorialStep;
    if (step === 'swipe') return 'swipe';
    if (step === 'feed') return 'feed';
    if (step === 'eat') return 'watch';
    if (step !== 'done') return null;
    if ((gameState?.pendingStatPoints ?? 0) > 0 && !gameState?.statTutorialSeen && !activeModal) return 'stat';
    if (gameState?.statTutorialSeen && !gameState?.playTutorialSeen && (gameState?.pendingStatPoints ?? 0) === 0 && !activeModal && !playMode) return 'play';
    if (gameState?.cleanTutorialSeen === false && gameState?.playTutorialSeen === true && !activeModal && !playMode) return 'clean';
    if (gameState?.cleanTutorialSeen === true && gameState?.waterTutorialSeen === false && !activeModal && !playMode && !cleaningMode) return 'water';
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

  const handleStartMenuTutorial = useCallback(() => {
    setShowMenuTutorialPrompt(false);
    setShowMenuTutorial(true);
  }, []);

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
    showMenuTutorial,
    setShowMenuTutorial,
    showMenuTutorialPrompt,
    handleStartMenuTutorial,
    showMenuTutorialComplete,
    setShowMenuTutorialComplete,
    showRebirthReady,
    setShowRebirthReady,
    tutorialLockMode,
    lockedActionButtons,
  };
}
