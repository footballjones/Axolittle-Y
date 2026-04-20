/**
 * GameScreen — the main in-game view (header HUD, aquarium, action buttons,
 * hamburger menu, mini-game menu, and inline tutorial overlays).
 *
 * Extracted from App.tsx. Owns only UI-local state (cleaning/play modes,
 * click targets, tap ripples, scroll hints). All persistent game state and
 * action handlers are owned by App.tsx and passed in as props.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Axolotl, AquariumCustomization, GameState } from '../types/game';
import { GameNotification } from '../data/notifications';
import { SyncStatus } from '../hooks/useCloudSync';
// GAME_CONFIG not needed directly — game logic lives in hooks

import { AxolotlDisplay } from './AxolotlDisplay';
import { ActionButtons } from './ActionButtons';
import { AquariumBackground } from './AquariumBackground';
import { MiniGameMenu } from './MiniGameMenu';
import { FoodDisplay } from './FoodDisplay';
import { FeedingTutorial } from './FeedingTutorial';
import { PoopDisplay } from './PoopDisplay';
import { SyncIndicator } from './SyncIndicator';
import { HamburgerMenu } from './HamburgerMenu';

import { Coins, Sparkles, Menu, X, ShoppingCart, Gamepad2, Home, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Prop types ───────────────────────────────────────────────────────────────

export interface GameScreenProps {
  // Core game state (narrowed — axolotl is guaranteed non-null)
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  axolotl: Axolotl;
  coins: number;
  opals: number;
  customization: AquariumCustomization;
  friends: import('../types/game').Friend[];
  lineage: Axolotl[];
  showRebirthButton: boolean;

  // Computed XP values
  currentLevel: number;
  currentLevelXP: number;
  nextLevelXP: number;

  // Auth / sync
  syncStatus: SyncStatus;

  // ── Menu state (from useMenuState) ─────────────────────────────────────
  activeModal: 'shop' | 'social' | 'rebirth' | 'stats' | 'settings' | null;
  setActiveModal: (modal: 'shop' | 'social' | 'rebirth' | 'stats' | 'settings' | null) => void;
  showHamburgerMenu: boolean;
  setShowHamburgerMenu: (v: boolean) => void;
  showXPBar: boolean;
  setShowXPBar: (v: boolean) => void;
  showNotifPanel: boolean;
  setShowNotifPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showHowToPlayPanel: boolean;
  setShowHowToPlayPanel: (v: boolean) => void;
  showInventoryPanel: boolean;
  setShowInventoryPanel: (v: boolean) => void;
  showEggsPanel: boolean;
  setShowEggsPanel: (v: boolean) => void;
  showAchievementsPanel: boolean;
  setShowAchievementsPanel: (v: boolean) => void;
  currentScreen: 'home' | 'games';
  setCurrentScreen: (v: 'home' | 'games') => void;
  shopSection: 'coins' | 'opals' | 'wellbeing' | null;
  setShopSection: (v: 'coins' | 'opals' | 'wellbeing' | null) => void;
  activeGame: string | null;
  setActiveGame: (v: string | null) => void;

  // ── Onboarding / tutorial ──────────────────────────────────────────────
  tutorialLockMode: 'swipe' | 'feed' | 'watch' | 'stat' | 'play' | 'clean' | 'water' | null;
  lockedActionButtons: Set<string>;
  tutorialAllowed: boolean;
  swipeTutDoneRef: React.MutableRefObject<boolean>;
  mgTutPhase: 'unlock' | 'keepey' | null;
  setMgTutPhase: (v: 'unlock' | 'keepey' | null) => void;
  showMenuTutorial: boolean;
  delayNextTutorial: (ms: number) => void;
  setHatchingNurseryEggId: (v: string | null) => void;

  // ── Social ─────────────────────────────────────────────────────────────
  notifications: GameNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<GameNotification[]>>;
  hasPendingPokes: boolean;
  setHasPendingPokes: React.Dispatch<React.SetStateAction<boolean>>;
  unreadCount: number;
  hasNotifications: boolean;

  // ── Economy (daily features) ───────────────────────────────────────────
  setShowSpinWheel: (v: boolean) => void;
  setShowDailyLogin: (v: boolean) => void;

  // ── Play / cleaning mode (lifted to App for useOnboarding) ─────────────
  playMode: boolean;
  setPlayMode: (v: boolean) => void;
  cleaningMode: boolean;
  setCleaningMode: (v: boolean) => void;

  // ── Modal triggers ─────────────────────────────────────────────────────
  setShowWaterChangeModal: (v: boolean) => void;

  // ── Ref callback — lets App build handleCenterAquarium for ModalManager ──
  onRegisterCenterAquarium: (fn: () => void) => void;

  // ── Game action handlers ───────────────────────────────────────────────
  handleFeed: () => void;
  handleEatFood: (foodId: string) => void;
  handlePlayTap: () => void;
  handleCleanPoop: (poopId: string) => void;
  handleEquipDecoration: (decorationId: string) => void;
  handleUpdateDecorationPosition: (id: string, x: number, y: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleEquipFilter: (filterId: any) => void;
  handleUseTreatmentFromInventory: (treatmentId: string) => void;
  handleDeployShrimpFromInventory: (count: number) => void;
  handleHatchEgg: (eggId: string, name: string) => void;
  handleMoveToIncubator: (eggId: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleBoostEgg: (eggId: any) => void;
  handleGiftEgg: (eggId: string) => void;
  handleDiscardEgg: (eggId: string) => void;
  handleUnlockNurserySlot: () => void;
  handleReleaseAxolotl: () => void;
  handleClaimAchievement: (achievementId: string) => void;
  handleUnlockGames: () => void;
  handleRefillEnergy: () => void;
  handleAddFriend: (code: string) => Promise<string | null>;

  /** COPPA: under-13 users are forced into guest mode; Social features hidden. */
  isUnder13?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function GameScreen({
  gameState,
  setGameState,
  axolotl,
  coins,
  opals,
  customization,
  showRebirthButton,
  currentLevel,
  currentLevelXP,
  nextLevelXP,
  syncStatus,
  activeModal,
  setActiveModal,
  showHamburgerMenu,
  setShowHamburgerMenu,
  showXPBar,
  setShowXPBar,
  showNotifPanel,
  setShowNotifPanel,
  showHowToPlayPanel,
  setShowHowToPlayPanel,
  showInventoryPanel,
  setShowInventoryPanel,
  showEggsPanel,
  setShowEggsPanel,
  showAchievementsPanel,
  setShowAchievementsPanel,
  currentScreen,
  setCurrentScreen,
  activeGame,
  setActiveGame,
  tutorialLockMode,
  lockedActionButtons,
  tutorialAllowed,
  swipeTutDoneRef,
  mgTutPhase,
  setMgTutPhase,
  showMenuTutorial: _showMenuTutorial,
  delayNextTutorial,
  setHatchingNurseryEggId,
  notifications,
  setNotifications,
  hasPendingPokes,
  setHasPendingPokes,
  unreadCount,
  hasNotifications,
  setShowSpinWheel,
  setShowDailyLogin,
  playMode,
  setPlayMode,
  cleaningMode,
  setCleaningMode,
  setShowWaterChangeModal,
  onRegisterCenterAquarium,
  handleFeed,
  handleEatFood,
  handlePlayTap,
  handleCleanPoop,
  handleEquipDecoration,
  handleUpdateDecorationPosition,
  handleEquipFilter,
  handleUseTreatmentFromInventory,
  handleDeployShrimpFromInventory,
  handleHatchEgg,
  handleMoveToIncubator,
  handleBoostEgg,
  handleGiftEgg,
  handleDiscardEgg,
  handleUnlockNurserySlot,
  handleReleaseAxolotl,
  handleClaimAchievement,
  handleUnlockGames,
  handleRefillEnergy,
  handleAddFriend,
  isUnder13 = false,
}: GameScreenProps) {
  // ── Local UI state (owned by GameScreen) ─────────────────────────────────
  const [clickTarget, setClickTarget] = useState<{ x: number; y: number; timestamp: number } | null>(null);
  const [tapRipples, setTapRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const tapRippleCounter = useRef(0);

  // Timer refs for auto-exit of cleaning/play modes (state is lifted to App)
  const cleaningModeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playModeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showScrollHint, setShowScrollHint] = useState(true);
  const hasInitiallyScrolled = useRef(false);
  const isCenteringScroll = useRef(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const aquariumScrollRef = useRef<HTMLDivElement>(null);

  // ── Aquarium centering ─────────────────────────────────────────────────
  const handleCenterAquarium = useCallback(() => {
    const el = aquariumScrollRef.current;
    if (el) {
      isCenteringScroll.current = true;
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      requestAnimationFrame(() => { isCenteringScroll.current = false; });
    }
  }, []);

  // Register the centering function with App so ModalManager can use it
  useEffect(() => {
    onRegisterCenterAquarium(handleCenterAquarium);
  }, [handleCenterAquarium, onRegisterCenterAquarium]);

  // Center aquarium scroll on first load
  useEffect(() => {
    if (gameState?.axolotl && aquariumScrollRef.current && !hasInitiallyScrolled.current) {
      const el = aquariumScrollRef.current;
      requestAnimationFrame(() => {
        isCenteringScroll.current = true;
        const scrollMax = el.scrollWidth - el.clientWidth;
        el.scrollLeft = scrollMax / 2;
        requestAnimationFrame(() => {
          isCenteringScroll.current = false;
        });
      });
    }
  }, [gameState?.axolotl]);

  // ── Cleaning mode ──────────────────────────────────────────────────────
  const exitCleaningMode = useCallback(() => {
    setCleaningMode(false);
    if (cleaningModeTimerRef.current) {
      clearTimeout(cleaningModeTimerRef.current);
      cleaningModeTimerRef.current = null;
    }
  }, []);

  const enterCleaningMode = useCallback(() => {
    if (cleaningMode) {
      exitCleaningMode();
      return;
    }
    setCleaningMode(true);
    if (cleaningModeTimerRef.current) clearTimeout(cleaningModeTimerRef.current);
    cleaningModeTimerRef.current = setTimeout(() => {
      setCleaningMode(false);
      cleaningModeTimerRef.current = null;
    }, 3000);
  }, [cleaningMode, exitCleaningMode]);

  const handleCleanPoopAndReset = useCallback((poopId: string) => {
    handleCleanPoop(poopId);
    if (cleaningModeTimerRef.current) clearTimeout(cleaningModeTimerRef.current);
    cleaningModeTimerRef.current = setTimeout(() => {
      setCleaningMode(false);
      cleaningModeTimerRef.current = null;
    }, 3000);
  }, [handleCleanPoop]);

  // ── Play mode ──────────────────────────────────────────────────────────
  const exitPlayMode = useCallback(() => {
    setPlayMode(false);
    if (playModeTimerRef.current) {
      clearTimeout(playModeTimerRef.current);
      playModeTimerRef.current = null;
    }
  }, []);

  const enterPlayMode = useCallback(() => {
    if (playMode) {
      exitPlayMode();
      return;
    }
    setPlayMode(true);
    // Mark play tutorial seen on first entry, and immediately spawn one tutorial
    // poop so the poop-cleaning tutorial triggers right after play mode exits.
    setGameState(s => {
      if (!s) return s;
      if (s.playTutorialSeen) return s;
      const tutorialPoop = {
        id: `poop-tutorial-${Date.now()}`,
        x: 50,
        createdAt: Date.now(),
      };
      return {
        ...s,
        playTutorialSeen: true,
        poopItems: [...(s.poopItems ?? []), tutorialPoop],
        axolotl: s.axolotl ? {
          ...s.axolotl,
          stats: {
            ...s.axolotl.stats,
            cleanliness: Math.min(s.axolotl.stats.cleanliness, 80),
          },
        } : s.axolotl,
      };
    });
    if (playModeTimerRef.current) clearTimeout(playModeTimerRef.current);
    playModeTimerRef.current = setTimeout(() => {
      setPlayMode(false);
      playModeTimerRef.current = null;
    }, 5000);
  }, [playMode, exitPlayMode, setGameState]);

  const handleAquariumPlayTap = useCallback(() => {
    handlePlayTap();
    if (playModeTimerRef.current) clearTimeout(playModeTimerRef.current);
    playModeTimerRef.current = setTimeout(() => {
      setPlayMode(false);
      playModeTimerRef.current = null;
    }, 5000);
  }, [handlePlayTap]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-0 sm:p-4">
      <div className="w-full h-full sm:max-h-[calc(100vh-2rem)] sm:h-auto max-w-md flex flex-col min-h-0" style={{ height: '100%', maxHeight: '100vh' }}>
        {/* Game Container */}
        <div className="relative flex-1 flex flex-col min-h-0" style={{ minHeight: 0, height: '100%' }}>
          {/* Subtle glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 rounded-none sm:rounded-[2rem] blur opacity-40 z-0" />

          <div className="relative z-10 bg-white backdrop-blur-2xl rounded-none sm:rounded-[2rem] shadow-2xl border-0 sm:border border-white/60 flex flex-col" style={{ height: '100%', minHeight: 0, overflow: 'visible', flex: 1 }}>
            {/* Floating Header HUD - overlays content */}
            <div className="absolute top-0 left-0 right-0 z-40 px-3 sm:px-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 pointer-events-none rounded-t-none sm:rounded-t-[2rem] overflow-hidden">
              {/* Gradient fade behind header */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/60 via-purple-900/30 to-transparent pointer-events-none" />

              <div className="relative z-10 space-y-1 pointer-events-auto">
                {/* Single compact row: Level + Name + Currencies + Menu */}
                <div className="flex items-center gap-2.5">
                  {/* Level badge — filled XP bar pill */}
                  <motion.button
                    onClick={() => setShowXPBar(!showXPBar)}
                    className="relative flex-shrink-0 rounded-lg overflow-hidden border border-white/30 bg-transparent"
                    style={{ width: 81, height: 32 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* XP Fill — transparent empty, teal filled */}
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-400/80 via-cyan-400/80 to-sky-400/80 transition-all duration-700"
                      style={{ width: `${(currentLevelXP / nextLevelXP) * 100}%` }}
                    />
                    {/* Shimmer on fill */}
                    <motion.div
                      className="absolute inset-y-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                      style={{ width: '40%' }}
                    />
                    {/* Label */}
                    <span className="absolute inset-0 flex items-center justify-center text-white font-black tracking-tight drop-shadow-[0_0_4px_rgba(0,0,0,0.4)]" style={{ fontSize: '14.5px' }}>
                      Lv.{currentLevel}
                    </span>
                  </motion.button>

                  {/* Axolotl Name */}
                  <h1 className="font-bold text-white tracking-tight truncate flex-1 min-w-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" style={{ fontSize: '23px' }}>{axolotl.name}</h1>

                  {/* Combined stacked currency tile */}
                  <motion.button
                    onClick={() => setActiveModal('shop')}
                    className="flex flex-col items-center gap-0.5 bg-transparent rounded-md border border-white/30 hover:bg-white/[0.08] transition-colors cursor-pointer flex-shrink-0"
                    style={{ padding: '0.25rem 0.54rem' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex items-center gap-1">
                      <Sparkles className="text-cyan-200" style={{ width: '17px', height: '17px' }} strokeWidth={2.5} />
                      <span className="text-white font-semibold tabular-nums" style={{ fontSize: '16px' }}>{opals}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="text-amber-200" style={{ width: '17px', height: '17px' }} strokeWidth={2.5} />
                      <span className="text-white font-semibold tabular-nums" style={{ fontSize: '16px' }}>{coins}</span>
                    </div>
                  </motion.button>

                  {/* Cloud-sync status dot */}
                  <SyncIndicator status={syncStatus} />

                  {/* Hamburger Menu Button */}
                  <motion.button
                    ref={menuButtonRef}
                    data-menu-id="hamburger"
                    onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
                    className="relative bg-transparent hover:bg-white/[0.08] rounded-lg transition-all border border-white/30 flex-shrink-0"
                    style={{ padding: '0.54rem' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Menu"
                    disabled={tutorialLockMode !== null}
                    aria-disabled={tutorialLockMode !== null}
                  >
                    {showHamburgerMenu ? (
                      <X className="text-white" style={{ width: '23px', height: '23px' }} strokeWidth={2.5} />
                    ) : (
                      <Menu className="text-white" style={{ width: '23px', height: '23px' }} strokeWidth={2.5} />
                    )}
                    {/* Notification dot */}
                    {hasNotifications && !showHamburgerMenu && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-indigo-500 shadow-lg shadow-red-500/50"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                  </motion.button>
                </div>


                {/* XP Bar - toggleable via level badge */}
                <AnimatePresence>
                  {showXPBar && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 4 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative h-1.5 bg-white/90 rounded-full overflow-hidden border border-white/40 shadow-[inset_0_0.5px_1px_rgba(255,255,255,0.8)]">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-300 via-white to-pink-300 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(currentLevelXP / nextLevelXP) * 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          style={{
                            boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
                          }}
                        />
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                          style={{ width: '30%' }}
                        />
                      </div>
                      <div className="flex items-center gap-2 pb-0.5 mt-0.5">
                        <span className="text-white/50 text-[9px] font-medium">{Math.floor(currentLevelXP)}/{nextLevelXP} XP</span>
                        <span className="text-white/30 text-[9px]">&middot;</span>
                        <span className="text-white/50 text-[9px] font-medium capitalize">Stage: {axolotl.stage}</span>
                        {axolotl.rarity && (
                          <>
                            <span className="text-white/30 text-[9px]">&middot;</span>
                            <span
                              className={`text-[9px] font-bold drop-shadow-[0_0_4px_rgba(0,0,0,0.8)] ${
                                axolotl.rarity === 'Mythic' ? 'text-rose-300' :
                                axolotl.rarity === 'Legendary' ? 'text-amber-300' :
                                axolotl.rarity === 'Epic' ? 'text-fuchsia-300' :
                                axolotl.rarity === 'Rare' ? 'text-cyan-300' :
                                'text-white/80'
                              }`}
                            >
                              Rarity: {axolotl.rarity}
                            </span>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Home, Mini Games, Shop buttons - evenly spaced */}
                <div className="flex justify-center items-center mt-1">
                  {/* Lock nav buttons both during normal tutorial lock modes AND while the
                      menu tutorial is pending/active. The hamburger button is intentionally
                      left unlocked so the player can open the menu during the menu tutorial. */}
                  <div className={`flex items-center gap-6 w-3/4 ${(tutorialLockMode !== null || _showMenuTutorial || (gameState.wellbeingCompleteSeen === true && !gameState.menuTutorialSeen && gameState.tutorialStep === 'done')) ? 'pointer-events-none opacity-30' : ''}`}>
                  <motion.button
                    onClick={() => { setCurrentScreen('home'); setShowHamburgerMenu(false); }}
                    className="relative bg-transparent border border-white/30 rounded-xl active:bg-white/[0.08] transition-all flex-1"
                    style={{ padding: '5.6px' }}
                    whileTap={{ scale: 0.93 }}
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, delay: 3 }}
                    title="Home"
                  >
                    <Home className="text-white mx-auto drop-shadow-lg" style={{ width: '40px', height: '40px' }} strokeWidth={2.5} />
                  </motion.button>
                  <motion.button
                    onClick={() => { setCurrentScreen('games'); }}
                    className={`relative bg-transparent border border-white/30 rounded-xl active:bg-white/[0.08] transition-all flex-1 overflow-hidden ${currentScreen === 'games' ? 'opacity-50' : ''}`}
                    style={{ padding: '5.6px' }}
                    whileTap={{ scale: 0.93 }}
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    title="Mini Games"
                  >
                    {/* Border shimmer */}
                    <motion.div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        border: '1px solid',
                        borderColor: 'transparent',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                        backgroundSize: '200% 100%',
                      }}
                      animate={{ backgroundPosition: ['0% 0%', '100% 0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                    <Gamepad2 className="text-white mx-auto drop-shadow-lg relative z-10" style={{ width: '40px', height: '40px' }} strokeWidth={2.5} />
                  </motion.button>
                  <motion.button
                    onClick={() => setActiveModal('shop')}
                    className="relative bg-transparent border border-white/30 rounded-xl active:bg-white/[0.08] transition-all flex-1"
                    style={{ padding: '5.6px' }}
                    whileTap={{ scale: 0.93 }}
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, delay: 1.5 }}
                    title="Shop"
                  >
                    <ShoppingCart className="text-white mx-auto drop-shadow-lg" style={{ width: '40px', height: '40px' }} strokeWidth={2.5} />
                  </motion.button>
                  </div>
                </div>

                {/* Mode banners — sit naturally below nav buttons, inside header so z-ordering is automatic */}
                <AnimatePresence>
                  {cleaningMode && (
                    <motion.div
                      key="cleaning-banner"
                      className="flex justify-center pt-1.5 pointer-events-none"
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.95 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <div
                        style={{
                          background: 'rgba(254,243,199,0.97)',
                          border: '2px solid rgba(251,113,133,0.75)',
                          borderRadius: 16,
                          padding: '5px 14px',
                          boxShadow: '0 4px 20px rgba(251,113,133,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <motion.span
                          animate={{ rotate: [-10, 10, -10] }}
                          transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
                          className="flex items-center"
                        >
                          <Sparkles className="w-4 h-4 text-rose-600" strokeWidth={2} />
                        </motion.span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#9f1239', whiteSpace: 'nowrap' }}>
                          Tap a poop to clean it!
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {playMode && (
                    <motion.div
                      key="play-banner"
                      className="flex justify-center pt-1.5 pointer-events-none"
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.95 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <div
                        style={{
                          background: 'rgba(245,240,255,0.97)',
                          border: '2px solid rgba(167,139,250,0.75)',
                          borderRadius: 16,
                          padding: '5px 14px',
                          boxShadow: '0 4px 20px rgba(167,139,250,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <motion.span
                          animate={{ scale: [1, 1.25, 1], rotate: [0, 15, -15, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                          className="flex items-center"
                        >
                          <Sparkles className="w-4 h-4 text-violet-600" strokeWidth={2} />
                        </motion.span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#5b21b6', whiteSpace: 'nowrap' }}>
                          Tap the aquarium to play!
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Persistent stat-point nudge — guides without forcing */}
                <AnimatePresence>
                  {(gameState?.pendingStatPoints ?? 0) > 0 && currentScreen === 'home' && !activeModal && (
                    <motion.div
                      key="stat-point-banner"
                      className="flex justify-center pt-1.5"
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      <motion.button
                        onClick={() => { setActiveModal('stats'); setShowHamburgerMenu(false); setGameState(s => s ? { ...s, statTutorialSeen: true } : s); }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ boxShadow: ['0 4px 18px rgba(245,158,11,0.45)', '0 4px 28px rgba(245,158,11,0.75)', '0 4px 18px rgba(245,158,11,0.45)'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          background: 'rgba(251,191,36,0.94)',
                          border: '2px solid rgba(245,158,11,0.85)',
                          borderRadius: 16,
                          padding: '5px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <motion.span
                          animate={{ scale: [1, 1.35, 1] }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                          className="flex items-center"
                        >
                          <Zap className="w-4 h-4 text-amber-900" strokeWidth={2.5} />
                        </motion.span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#78350f', whiteSpace: 'nowrap' }}>
                          Stat point ready — tap to assign!
                        </span>
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Fixed Hamburger Dropdown Menu - rendered outside overflow:hidden header */}
            <AnimatePresence>
              {showHamburgerMenu && (
                <HamburgerMenu
                  gameState={gameState}
                  coins={coins}
                  opals={opals}
                  showRebirthButton={showRebirthButton}
                  setShowHamburgerMenu={setShowHamburgerMenu}
                  showNotifPanel={showNotifPanel}
                  setShowNotifPanel={setShowNotifPanel}
                  showHowToPlayPanel={showHowToPlayPanel}
                  setShowHowToPlayPanel={setShowHowToPlayPanel}
                  showInventoryPanel={showInventoryPanel}
                  setShowInventoryPanel={setShowInventoryPanel}
                  showEggsPanel={showEggsPanel}
                  setShowEggsPanel={setShowEggsPanel}
                  showAchievementsPanel={showAchievementsPanel}
                  setShowAchievementsPanel={setShowAchievementsPanel}
                  setActiveModal={setActiveModal}
                  setShowSpinWheel={setShowSpinWheel}
                  setShowDailyLogin={setShowDailyLogin}
                  hasPendingPokes={hasPendingPokes}
                  setHasPendingPokes={setHasPendingPokes}
                  notifications={notifications}
                  setNotifications={setNotifications}
                  unreadCount={unreadCount}
                  onEquipFilter={handleEquipFilter}
                  onEquipDecoration={handleEquipDecoration}
                  onUseTreatmentFromInventory={handleUseTreatmentFromInventory}
                  onDeployShrimpFromInventory={handleDeployShrimpFromInventory}
                  onHatchEgg={handleHatchEgg}
                  onStartHatchAnimation={(eggId) => setHatchingNurseryEggId(eggId)}
                  onMoveToIncubator={handleMoveToIncubator}
                  onBoostEgg={handleBoostEgg}
                  onGiftEgg={handleGiftEgg}
                  onDiscardEgg={handleDiscardEgg}
                  onUnlockNurserySlot={handleUnlockNurserySlot}
                  onReleaseAxolotl={handleReleaseAxolotl}
                  onClaimAchievement={handleClaimAchievement}
                  onAddFriend={handleAddFriend}
                  isTutorialActive={_showMenuTutorial}
                  isUnder13={isUnder13}
                />
              )}
            </AnimatePresence>

            {/* Content Area - Changes based on currentScreen */}
            {/* Start from top, header overlays on top */}
            <div className="flex-1 min-h-0 flex flex-col relative z-20" style={{
              minHeight: 0,
            }}>
            {currentScreen === 'home' ? (
              <>
                {/* Aquarium Display - Horizontally Scrollable, extends to bottom and top */}
                <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0, height: '100%', width: '100%', position: 'relative', marginTop: 0, paddingTop: 0 }}>
                  <div
                    ref={aquariumScrollRef}
                    className="absolute inset-0 overflow-x-auto overflow-y-hidden"
                    style={{ top: 0 }}
                    onScroll={() => {
                      if (isCenteringScroll.current) return;
                      if (!hasInitiallyScrolled.current) {
                        hasInitiallyScrolled.current = true;
                        setShowScrollHint(false);
                      }
                      // Swipe tutorial: advance to feed step after 1 s
                      if (gameState?.tutorialStep === 'swipe' && !swipeTutDoneRef.current) {
                        swipeTutDoneRef.current = true;
                        setTimeout(() => {
                          setGameState(s =>
                            s?.tutorialStep === 'swipe' ? { ...s, tutorialStep: 'feed' } : s
                          );
                        }, 1000);
                      }
                    }}
                  >
                    {/* Wider Aquarium Container */}
                    <div
                      className="relative h-full w-[250%] sm:w-[200%] cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        const clampedX = Math.max(5, Math.min(95, x));
                        const clampedY = Math.max(5, Math.min(95, y));
                        setClickTarget({ x: clampedX, y: clampedY, timestamp: Date.now() });
                        if (playMode) handleAquariumPlayTap();
                        const id = ++tapRippleCounter.current;
                        setTapRipples(prev => [...prev, { id, x, y }]);
                        setTimeout(() => setTapRipples(prev => prev.filter(r => r.id !== id)), 600);
                      }}
                    >
                      <AquariumBackground
                        background={customization.background}
                        decorations={customization.decorations}
                        decorationPositions={customization.decorationPositions}
                        onUpdateDecorationPosition={handleUpdateDecorationPosition}
                        onRemoveDecoration={handleEquipDecoration}
                      />
                      {/* Food Items */}
                      {(gameState.foodItems || []).map(food => (
                        <FoodDisplay
                          key={food.id}
                          food={food}
                          tutorialActive={gameState.tutorialStep === 'eat'}
                        />
                      ))}
                      {/* Poop Items */}
                      {(gameState.poopItems || []).map(poop => (
                        <PoopDisplay
                          key={poop.id}
                          poop={poop}
                          cleaningMode={cleaningMode}
                          onClean={handleCleanPoopAndReset}
                        />
                      ))}
                      {/* Ghost Shrimp */}
                      {(gameState.shrimpCount || 0) > 0 && Array.from({ length: Math.min(6, gameState.shrimpCount || 0) }).map((_, i) => {
                        const x = 8 + (i * 15 + ((i * 7) % 11)) % 84;
                        const bottom = 12 + (i % 3) * 6;
                        const flipX = i % 2 === 0;
                        const swimDuration = 3 + (i * 0.7) % 2;
                        const bobDuration = 2 + (i * 0.5) % 1.5;
                        return (
                          <motion.div
                            key={`shrimp-${i}`}
                            className="absolute pointer-events-none select-none"
                            style={{ left: `${x}%`, bottom: `${bottom}%`, zIndex: 18 }}
                            animate={{
                              x: [0, flipX ? 12 : -12, 0],
                              y: [0, -4, 0],
                            }}
                            transition={{
                              x: { duration: swimDuration, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 },
                              y: { duration: bobDuration, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 },
                            }}
                          >
                            <img
                              src={`${import.meta.env.BASE_URL}decorations/ghost-shrimp.svg`}
                              alt="ghost shrimp"
                              draggable={false}
                              style={{
                                width: 44,
                                height: 'auto',
                                transform: flipX ? 'scaleX(-1)' : undefined,
                                opacity: 0.96,
                                filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.30))',
                              }}
                            />
                          </motion.div>
                        );
                      })}

                      {/* Tap ripple feedback */}
                      {tapRipples.map(r => (
                        <motion.div
                          key={r.id}
                          className="absolute pointer-events-none rounded-full"
                          style={{
                            left: `${r.x}%`,
                            top: `${r.y}%`,
                            width: 28,
                            height: 28,
                            marginLeft: -14,
                            marginTop: -14,
                            background: 'rgba(255,255,255,0.55)',
                            zIndex: 50,
                          }}
                          initial={{ scale: 0, opacity: 0.9 }}
                          animate={{ scale: 2.2, opacity: 0 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      ))}

                      {/* Axolotl */}
                      <div className="absolute inset-0 z-10 pointer-events-none">
                        <AxolotlDisplay
                          axolotl={axolotl}
                          foodItems={gameState.foodItems || []}
                          onEatFood={handleEatFood}
                          clickTarget={clickTarget}
                          playMode={playMode}
                          onAxolotlTap={handleAquariumPlayTap}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Scroll Hint - outside scrollable area so it stays visible */}
                  <AnimatePresence>
                    {showScrollHint && (
                      <motion.div
                        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: [0, -3, 0], scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{
                          opacity: { duration: 0.6, delay: 0.8 },
                          scale: { duration: 0.6, delay: 0.8 },
                          y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.4 },
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Left swipe hand */}
                          <motion.svg
                            width="32" height="32" viewBox="0 0 24 24" fill="none"
                            className="text-white/70 -scale-x-100"
                            animate={{
                              x: [-8, 2, -8],
                              opacity: [0.5, 0.85, 0.5],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <path d="M18 8.5V4.5C18 3.67 17.33 3 16.5 3S15 3.67 15 4.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15 7.5V3.5C15 2.67 14.33 2 13.5 2S12 2.67 12 3.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 7V4.5C12 3.67 11.33 3 10.5 3S9 3.67 9 4.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18 8.5C18 7.67 18.67 7 19.5 7S21 7.67 21 8.5V14C21 18 18 21 14 21H13C10.5 21 9 20 7.5 18.5L4.5 15.5C3.95 14.95 3.95 14.05 4.5 13.5C5.05 12.95 5.95 12.95 6.5 13.5L9 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </motion.svg>
                          <div className="flex flex-col items-center">
                            <span className="text-white/70 text-[11.5px] font-medium tracking-widest uppercase">Swipe to</span>
                            <span className="text-white/70 text-[11.5px] font-medium tracking-widest uppercase">Explore</span>
                          </div>
                          {/* Right swipe hand */}
                          <motion.svg
                            width="32" height="32" viewBox="0 0 24 24" fill="none"
                            className="text-white/70"
                            animate={{
                              x: [8, -2, 8],
                              opacity: [0.5, 0.85, 0.5],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <path d="M18 8.5V4.5C18 3.67 17.33 3 16.5 3S15 3.67 15 4.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15 7.5V3.5C15 2.67 14.33 2 13.5 2S12 2.67 12 3.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 7V4.5C12 3.67 11.33 3 10.5 3S9 3.67 9 4.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18 8.5C18 7.67 18.67 7 19.5 7S21 7.67 21 8.5V14C21 18 18 21 14 21H13C10.5 21 9 20 7.5 18.5L4.5 15.5C3.95 14.95 3.95 14.05 4.5 13.5C5.05 12.95 5.95 12.95 6.5 13.5L9 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </motion.svg>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Swipe tutorial — very first prompt for brand-new players ── */}
                  {gameState.tutorialStep === 'swipe' && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 15 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                    >
                      <motion.div
                        className="absolute left-0 right-0 flex flex-col items-center gap-1"
                        style={{ bottom: '148px' }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0, duration: 0.4 }}
                      >
                        <div
                          className="rounded-2xl px-5 py-3 shadow-2xl text-center"
                          style={{
                            background: 'rgba(255,255,255,0.97)',
                            border: '2.5px solid rgba(6,182,212,0.75)',
                            boxShadow: '0 8px 32px rgba(6,182,212,0.4)',
                            maxWidth: 240,
                          }}
                        >
                          <p className="text-slate-800 text-[13px] font-bold leading-snug">
                            Welcome to your aquarium!
                          </p>
                          <p className="text-slate-500 text-[11.5px] leading-snug mt-0.5">
                            Swipe <span className="text-cyan-600 font-bold">left &amp; right</span> to explore your whole tank
                          </p>
                        </div>
                        <div
                          className="w-0 h-0"
                          style={{
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: '9px solid rgba(255,255,255,0.97)',
                          }}
                        />
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Tutorial overlay — rendered inside the aquarium relative container */}
                  {gameState.wellbeingIntroSeen === true && (gameState.tutorialStep === 'feed' || gameState.tutorialStep === 'eat' || gameState.tutorialStep === 'xp-tip') && (
                    <FeedingTutorial
                      step={gameState.tutorialStep}
                      axolotlName={axolotl.name}
                      onXpTipDismiss={() => {
                        setGameState(s => s ? { ...s, tutorialStep: 'done' } : s);
                        delayNextTutorial(1200);
                      }}
                    />
                  )}

                  {/* Stat assignment tutorial — shown after first level-up */}
                  {(gameState.pendingStatPoints ?? 0) > 0 && !gameState.statTutorialSeen && gameState.tutorialStep === 'done' && !activeModal && tutorialAllowed && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 45 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
                      <motion.div
                        className="absolute top-[25%] left-0 right-0 flex flex-col items-center gap-1 px-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                      >
                        <div
                          className="w-0 h-0"
                          style={{
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderBottom: '9px solid rgba(255,255,255,0.97)',
                          }}
                        />
                        <div
                          className="rounded-2xl px-5 py-3 shadow-2xl text-center"
                          style={{
                            background: 'rgba(255,255,255,0.97)',
                            border: '2.5px solid rgba(245,158,11,0.75)',
                            boxShadow: '0 8px 32px rgba(245,158,11,0.4)',
                            maxWidth: 250,
                          }}
                        >
                          <p className="text-slate-800 text-[13px] font-bold leading-snug">
                            You leveled up!
                          </p>
                          <p className="text-slate-500 text-[11.5px] leading-snug mt-0.5">
                            Tap the glowing button above to assign your stat point!
                          </p>

                          <div className="my-2.5 h-px bg-slate-100" />

                          <p className="text-slate-700 text-[12px] font-bold leading-snug mb-1">
                            Why do stats matter?
                          </p>
                          <p className="text-slate-500 text-[11px] leading-snug">
                            The stronger your axolotl, the better chance you get a{' '}
                            <span className="text-cyan-600 font-bold">Rare</span>,{' '}
                            <span className="text-fuchsia-600 font-bold">Epic</span>, or even{' '}
                            <span className="text-amber-500 font-bold">Legendary</span> egg when you rebirth!
                          </p>

                          <div className="mt-2 flex items-center justify-center gap-1">
                            {['Common','Rare','Epic','Legendary','Mythic'].map((r, i) => (
                              <div
                                key={i}
                                className="text-[8.5px] font-bold px-1 py-0.5 rounded-md leading-none"
                                style={{
                                  background: ['rgba(148,163,184,0.15)','rgba(34,211,238,0.12)','rgba(168,85,247,0.12)','rgba(251,191,36,0.15)','rgba(239,68,68,0.12)'][i],
                                  color: ['#94a3b8','#06b6d4','#a855f7','#d97706','#ef4444'][i],
                                  border: `1px solid ${['rgba(148,163,184,0.3)','rgba(34,211,238,0.3)','rgba(168,85,247,0.3)','rgba(251,191,36,0.3)','rgba(239,68,68,0.3)'][i]}`,
                                }}
                              >
                                {r}
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Play tutorial — shown after stat tutorial is completed */}
                  {gameState.statTutorialSeen && !gameState.playTutorialSeen && (gameState.pendingStatPoints ?? 0) === 0 && gameState.tutorialStep === 'done' && !activeModal && !playMode && tutorialAllowed && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 45 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
                      <motion.div
                        className="absolute bottom-[82px] flex flex-col items-center gap-1"
                        style={{ left: '37.5%' }}
                        initial={{ opacity: 0, y: 12, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                      >
                        <div
                          className="rounded-2xl px-5 py-3 shadow-2xl text-center"
                          style={{
                            background: 'rgba(255,255,255,0.97)',
                            border: '2.5px solid rgba(139,92,246,0.75)',
                            boxShadow: '0 8px 32px rgba(139,92,246,0.4)',
                            maxWidth: 200,
                          }}
                        >
                          <p className="text-slate-800 text-[13px] font-bold leading-snug">
                            Now go play!
                          </p>
                          <p className="text-slate-500 text-[11.5px] leading-snug mt-0.5">
                            Tap <span className="text-violet-600 font-bold">Playtime</span> to boost happiness
                          </p>
                        </div>
                        <div
                          className="w-0 h-0"
                          style={{
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: '9px solid rgba(255,255,255,0.97)',
                          }}
                        />
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Mini game tutorial — shown after wellbeing completion reward is collected */}
                  {gameState.playTutorialSeen && gameState.cleanTutorialSeen === true && gameState.waterTutorialSeen === true && gameState.wellbeingCompleteSeen === true && gameState.menuTutorialSeen === true && !gameState.miniGameTutorialSeen && gameState.tutorialStep === 'done' && !activeModal && !playMode && tutorialAllowed && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 45 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
                      <motion.div
                        className="absolute top-[18%] left-0 right-0 flex flex-col items-center gap-1 px-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                      >
                        <div
                          className="w-0 h-0"
                          style={{
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderBottom: '9px solid rgba(255,255,255,0.97)',
                          }}
                        />
                        <div
                          className="rounded-2xl px-5 py-3 shadow-2xl text-center"
                          style={{
                            background: 'rgba(255,255,255,0.97)',
                            border: '2.5px solid rgba(99,102,241,0.75)',
                            boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
                            maxWidth: 220,
                          }}
                        >
                          <p className="text-slate-800 text-[13px] font-bold leading-snug">
                            Play a mini game!
                          </p>
                          <p className="text-slate-500 text-[11.5px] leading-snug mt-0.5">
                            Tap the controller above to earn XP and coins
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* ── First-time poop cleaning tutorial ── */}
                  {(() => {
                    const showCleanTutorial =
                      gameState.cleanTutorialSeen === false &&
                      gameState.playTutorialSeen === true &&
                      (gameState.poopItems?.length ?? 0) > 0 &&
                      !playMode &&
                      tutorialAllowed;
                    return (
                      <AnimatePresence>
                        {showCleanTutorial && !cleaningMode && (
                          <motion.div
                            key="clean-tutorial"
                            className="absolute inset-0 pointer-events-none"
                            style={{ zIndex: 45 }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                          >
                            <div
                              className="absolute inset-0"
                              style={{ background: 'rgba(0,0,0,0.42)' }}
                            />
                            <motion.div
                              className="absolute bottom-[72px] flex flex-col items-center gap-0.5"
                              style={{ left: '62%' }}
                              initial={{ opacity: 0, y: 10, x: '-50%' }}
                              animate={{ opacity: 1, y: 0, x: '-50%' }}
                              transition={{ delay: 0.3, duration: 0.4 }}
                            >
                              <div
                                className="rounded-2xl px-5 py-3 shadow-2xl text-center max-w-[230px]"
                                style={{
                                  background: 'rgba(255,255,255,0.97)',
                                  border: '2.5px solid rgba(251,191,36,0.75)',
                                  boxShadow: '0 8px 32px rgba(251,191,36,0.4)',
                                }}
                              >
                                <p className="text-slate-800 text-[13px] font-bold leading-snug">
                                  Yikes, there's poop!<br />
                                  Tap <span className="text-rose-500">Clean</span> to start
                                </p>
                              </div>
                              <div
                                className="w-0 h-0"
                                style={{
                                  borderLeft: '9px solid transparent',
                                  borderRight: '9px solid transparent',
                                  borderTop: '9px solid rgba(255,255,255,0.97)',
                                }}
                              />
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    );
                  })()}

                  {/* ── Water quality tutorial — shown after poop is cleaned ── */}
                  {gameState.cleanTutorialSeen === true &&
                    gameState.waterTutorialSeen === false &&
                    gameState.tutorialStep === 'done' &&
                    !activeModal && !playMode && !cleaningMode && tutorialAllowed && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 45 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
                      <motion.div
                        className="absolute bottom-[82px] flex flex-col items-center gap-0.5"
                        style={{ left: '87.5%' }}
                        initial={{ opacity: 0, y: 10, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                      >
                        <div
                          className="rounded-2xl px-4 py-3 shadow-2xl text-center max-w-[210px]"
                          style={{
                            background: 'rgba(255,255,255,0.97)',
                            border: '2.5px solid rgba(99,102,241,0.75)',
                            boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
                          }}
                        >
                          <p className="text-slate-800 text-[13px] font-bold leading-snug">
                            Water quality is low!
                          </p>
                          <p className="text-slate-500 text-[11.5px] leading-snug mt-0.5">
                            Tap <span className="text-indigo-600 font-bold">Water Quality</span> to do a water change
                          </p>
                        </div>
                        <div
                          className="w-0 h-0"
                          style={{
                            borderLeft: '9px solid transparent',
                            borderRight: '9px solid transparent',
                            borderTop: '9px solid rgba(255,255,255,0.97)',
                          }}
                        />
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Floating Action Buttons — lifted above tutorial overlays when needed */}
                  {(() => {
                    const cleanTutActive =
                      gameState.cleanTutorialSeen === false &&
                      gameState.playTutorialSeen === true &&
                      (gameState.poopItems?.length ?? 0) > 0 &&
                      !playMode &&
                      !cleaningMode &&
                      tutorialAllowed;
                    const waterTutActive =
                      gameState.cleanTutorialSeen === true &&
                      gameState.waterTutorialSeen === false &&
                      gameState.tutorialStep === 'done' &&
                      !activeModal && !playMode && !cleaningMode && tutorialAllowed;
                    const playTutActive =
                      gameState.statTutorialSeen === true &&
                      !gameState.playTutorialSeen &&
                      (gameState.pendingStatPoints ?? 0) === 0 &&
                      gameState.tutorialStep === 'done' &&
                      !activeModal && !playMode;
                    const needsLift =
                      gameState.tutorialStep === 'feed' || cleanTutActive || playTutActive || waterTutActive;
                    return (
                      <div
                        className={`absolute bottom-0 left-0 right-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
                          needsLift ? 'z-50' : 'z-30'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/50 via-purple-900/20 to-transparent pointer-events-none" />
                        <div className="relative px-2">
                          <ActionButtons
                            onFeed={handleFeed}
                            onPlay={enterPlayMode}
                            onClean={enterCleaningMode}
                            onWaterChange={() => setShowWaterChangeModal(true)}
                            onRebirth={() => setActiveModal('rebirth')}
                            canRebirth={showRebirthButton}
                            isHungerFull={axolotl.stats.hunger >= 100}
                            stats={axolotl.stats}
                            tutorialFeedActive={gameState.tutorialStep === 'feed'}
                            cleaningMode={cleaningMode}
                            cleanTutorialActive={cleanTutActive}
                            playMode={playMode}
                            coins={coins}
                            lockedButtons={lockedActionButtons.size > 0 ? lockedActionButtons : undefined}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </>
            ) : (
              /* Mini Games Screen */
              <>
                <div
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-gradient-to-br from-indigo-300/90 via-purple-300/90 to-pink-300/90"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y',
                    paddingTop: '0.5rem',
                    height: '100%',
                    width: '100%',
                    position: 'relative',
                    display: activeGame ? 'none' : 'block',
                  }}
                >
                  <MiniGameMenu
                    onClose={() => setCurrentScreen('home')}
                    miniGamesLockedUntil={gameState.miniGamesLockedUntil}
                    currentLevel={currentLevel}
                    tutorialPhase={mgTutPhase ?? undefined}
                    onSelectGame={(gameId) => {
                      if (!gameState) return;

                      if (mgTutPhase !== null) {
                        setMgTutPhase(null);
                      }
                      // Always mark the mini-game tutorial as seen when entering any game.
                      // This prevents the tutorial from looping if the user enters a game
                      // before the mgTutPhase effect has had a chance to fire.
                      setGameState(s => s && !s.miniGameTutorialSeen ? { ...s, miniGameTutorialSeen: true } : s);

                      setGameState(prev => {
                        if (!prev) return prev;
                        const already = prev.uniqueGamesPlayed ?? [];
                        if (already.includes(gameId)) return prev;
                        return { ...prev, uniqueGamesPlayed: [...already, gameId] };
                      });

                      setActiveGame(gameId);
                      setCurrentScreen('home');
                    }}
                    energy={gameState.energy}
                    maxEnergy={gameState.maxEnergy}
                    lastEnergyUpdate={gameState.lastEnergyUpdate}
                    opals={opals}
                    onUnlockGames={handleUnlockGames}
                    onRefillEnergy={handleRefillEnergy}
                  />
                </div>

              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
