import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, SecondaryStats } from './types/game';
import {
  generateAxolotl,
  canRebirth,
  calculateLevel,
  getXPForNextLevel,
  getCurrentLevelXP,
} from './utils/gameLogic';
import { loadGameState, saveGameState, getInitialGameState } from './utils/storage';
import { GAME_CONFIG } from './config/game';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AxolotlDisplay } from './components/AxolotlDisplay';
import { ActionButtons } from './components/ActionButtons';
import { AquariumBackground } from './components/AquariumBackground';
import { MiniGameMenu } from './components/MiniGameMenu';
import { ShopModal } from './components/ShopModal';
import { SocialModal } from './components/SocialModal';
import { RebirthModal } from './components/RebirthModal';
import { StatsModal } from './components/StatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WaterChangeModal } from './components/WaterChangeModal';
import { AchievementCenter } from './components/AchievementCenter';
import { ALL_ACHIEVEMENTS } from './data/achievements';
import { FoodDisplay } from './components/FoodDisplay';
import { FeedingTutorial } from './components/FeedingTutorial';
import { PoopDisplay } from './components/PoopDisplay';
import { EggsPanel } from './components/EggsPanel';
import { DecorationsPanel } from './components/DecorationsPanel';
import { SpinWheel } from './components/SpinWheel';
import { DailyLoginBonus } from './components/DailyLoginBonus';
import { Coins, Sparkles, Menu, X, Check, ChevronDown, ShoppingCart, Gamepad2, Home, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { KeepeyUpey } from './minigames/KeepeyUpey';
import { FlappyFishHooks } from './minigames/FlappyFishHooks';
import { MathRush } from './minigames/MathRush';
import { AxolotlStacker } from './minigames/AxolotlStacker';
import { CoralCode } from './minigames/CoralCode';
import { TreasureHuntCave } from './minigames/TreasureHuntCave';
import { Fishing } from './minigames/Fishing';
import { BiteTag } from './minigames/BiteTag';
import { useGameActions } from './hooks/useGameActions';
import { useMenuState } from './hooks/useMenuState';
import { useWellbeingEngine } from './hooks/useWellbeingEngine';
import { useEconomyActions } from './hooks/useEconomyActions';
import { useSocialState } from './hooks/useSocialState';
import { useAquariumMusic, useContextMusic } from './hooks/useAquariumMusic';
import { getTodayDateString, canSpinToday, canClaimDailyLogin } from './utils/dailySystem';
import { useAuth } from './context/AuthContext';
import { useCloudSync, SyncStatus } from './hooks/useCloudSync';
import { LoginScreen } from './components/LoginScreen';
import { SyncIndicator } from './components/SyncIndicator';
import { JimmyChubsAquarium } from './components/JimmyChubsAquarium';
import { JIMMY_CHUBS_FRIEND } from './utils/storage';

// Jimmy & Chubs sends a gift every 3.5 days (twice a week)
const JIMMY_GIFT_INTERVAL_MS = 3.5 * 24 * 60 * 60 * 1000;

function rollJimmyGift(): { coins: number; opals: number } {
  const r = Math.random();
  if (r < 0.75) return { coins: 20, opals: 0 };
  if (r < 0.95) return { coins: 50, opals: 0 };
  return { coins: 0, opals: 3 };
}

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [clickTarget, setClickTarget] = useState<{ x: number; y: number; timestamp: number } | null>(null);
  const [showWaterChangeModal, setShowWaterChangeModal] = useState(false);
  const [cleaningMode, setCleaningMode] = useState(false);
  const cleaningModeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playMode, setPlayMode] = useState(false);
  const playModeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Set when the axolotl levels up mid-game; drives the level-up StatsModal */
  const [levelUpData, setLevelUpData] = useState<{ level: number; prevStats: SecondaryStats } | null>(null);

  /** Show Jimmy & Chubs's aquarium */
  const [showJimmyAquarium, setShowJimmyAquarium] = useState(false);

  // Domain hooks
  const {
    notifications,
    setNotifications,
    hasPendingPokes,
    setHasPendingPokes,
    unreadCount,
    hasNotifications,
  } = useSocialState();

  const {
    showSpinWheel,
    setShowSpinWheel,
    showDailyLogin,
    setShowDailyLogin,
    handleSpinWheel,
    handleDailyLoginClaim,
  } = useEconomyActions({ setGameState, setNotifications });

  // ── Auth + Cloud Sync ──────────────────────────────────────────────────────
  const { user, isLoading: authLoading, isGuest } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  /** True if a save already existed in localStorage when the app first launched.
   *  Used to skip LoginScreen for existing / returning players. */
  const [hasLocalSave] = useState(() => !!localStorage.getItem('axolotl-game-state'));

  useCloudSync({
    userId: user?.id ?? null,
    gameState,
    onCloudStateLoaded: setGameState,
    onStatusChange: setSyncStatus,
  });

  useWellbeingEngine({ axolotlId: gameState?.axolotl?.id, setGameState });

  // Menu state from hook
  const menuState = useMenuState();
  const {
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
    decorationsTab,
    setDecorationsTab,
    currentScreen,
    setCurrentScreen,
    activeGame,
    setActiveGame,
    shopSection,
    setShopSection,
  } = menuState;

  // Aquarium music — play everywhere except minigame page and Jimmy's aquarium
  // Music continues even when modals (shop, social, stats, settings) are open
  // Respects global musicEnabled setting from GameState
  const shouldPlayAquariumMusic = gameState && !showJimmyAquarium && currentScreen === 'home';
  useAquariumMusic({
    enabled: !!shouldPlayAquariumMusic,
    musicEnabled: gameState?.musicEnabled !== false, // Default to true
    volume: 0.25,
  });

  // Minigame menu music — play on games screen when not actively playing a game
  const shouldPlayMiniGameMenuMusic = gameState && !activeGame && currentScreen === 'games';
  useContextMusic({
    context: 'miniGames',
    enabled: !!shouldPlayMiniGameMenuMusic,
    musicEnabled: gameState?.musicEnabled !== false,
    volume: 0.25,
  });
  
  // Level-up callback — navigates home and opens the stats modal with gain data
  const handleLevelUp = useCallback((newLevel: number, prevStats: SecondaryStats) => {
    setLevelUpData({ level: newLevel, prevStats });
    setActiveModal('stats');
  }, [setActiveModal]);

  // Game actions from hook
  const gameActions = useGameActions({
    gameState,
    setGameState,
    setNotifications,
    setActiveModal,
    setActiveGame,
    setCurrentScreen,
    onLevelUp: handleLevelUp,
  });
  
  const {
    handleFeed,
    handleEatFood,
    handlePlayTap,
    handleCleanPoop,
    handleWaterChange,
    handlePurchase,
    handleEquipDecoration,
    handleAddFriend,
    handleRemoveFriend,
    handleBreed,
    handleRebirth,
    handleReleaseAxolotl,
    handleHatchEgg,
    handleMoveToIncubator,
    handleBoostEgg,
    handleGiftEgg,
    handleDiscardEgg,
    handleMiniGameEnd,
    handleBuyCoins,
    handleBuyOpals,
    handleBuyFilter,
    handleBuyShrimp,
    handleBuyTreatment,
    handleUnlockGames,
  } = gameActions;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const aquariumScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const hasInitiallyScrolled = useRef(false);
  const isCenteringScroll = useRef(false);

  // Deducts 1 energy when a mini-game attempt begins.
  // Uses functional updater so it's always reading fresh state.
  // Called by each game's startGame(), including "Play Again" attempts.
  const handleDeductEnergy = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      const now = Date.now();
      const lastUpdate = prev.lastEnergyUpdate || now;
      const elapsedSeconds = (now - lastUpdate) / 1000;
      const energyRegenRate = GAME_CONFIG.energyRegenRate / 3600;
      const maxEnergy = prev.maxEnergy || GAME_CONFIG.energyMax;
      const currentEnergy = Math.min(maxEnergy, prev.energy + energyRegenRate * elapsedSeconds);
      // Only deduct if there is at least 1 whole energy point
      if (Math.floor(currentEnergy) < 1) return prev;
      return {
        ...prev,
        energy: Math.max(0, currentEnergy - 1),
        lastEnergyUpdate: now,
      };
    });
  }, []);

  // Center aquarium scroll on first load
  useEffect(() => {
    if (gameState?.axolotl && aquariumScrollRef.current && !hasInitiallyScrolled.current) {
      const el = aquariumScrollRef.current;
      // Wait for layout to complete
      requestAnimationFrame(() => {
        isCenteringScroll.current = true;
        const scrollMax = el.scrollWidth - el.clientWidth;
        el.scrollLeft = scrollMax / 2;
        // Reset centering flag after the scroll event fires
        requestAnimationFrame(() => {
          isCenteringScroll.current = false;
        });
      });
    }
  }, [gameState?.axolotl]);

  // Load game state on mount
  useEffect(() => {
    const loaded = loadGameState();
    if (loaded) {
      // Ensure all new fields are initialized (migration should handle this, but double-check)
      if (loaded.energy === undefined) {
        loaded.energy = GAME_CONFIG.energyMax;
      }
      if (loaded.maxEnergy === undefined) {
        loaded.maxEnergy = GAME_CONFIG.energyMax;
      }
      if (loaded.lastEnergyUpdate === undefined) {
        loaded.lastEnergyUpdate = Date.now();
      }
      if (loaded.incubatorEgg === undefined) {
        loaded.incubatorEgg = null;
      }
      if (loaded.nurseryEggs === undefined) {
        loaded.nurseryEggs = [];
      }
      if (loaded.shrimpCount === undefined) {
        loaded.shrimpCount = 0;
      }
      if (loaded.loginStreak === undefined) {
        loaded.loginStreak = 0;
      }
      
      // Calculate energy regeneration since last update
      const now = Date.now();
      const lastUpdate = loaded.lastEnergyUpdate || now;
      const elapsedSeconds = (now - lastUpdate) / 1000;
      const energyRegenRate = GAME_CONFIG.energyRegenRate / 3600; // per second
      const maxEnergy = loaded.maxEnergy || GAME_CONFIG.energyMax;
      const currentEnergy = loaded.energy || 0;
      const energyGained = energyRegenRate * elapsedSeconds;
      const newEnergy = Math.min(maxEnergy, currentEnergy + energyGained);
      
      // Update energy and timestamp (keep as float to preserve fractional progress)
      loaded.energy = newEnergy;
      loaded.lastEnergyUpdate = now;
      
      // ── Jimmy & Chubs gift check (twice a week = every 3.5 days) ──────────
      const jimmyLast = loaded.lastJimmyGift;
      if (jimmyLast === undefined || (now - jimmyLast) >= JIMMY_GIFT_INTERVAL_MS) {
        const gift = rollJimmyGift();
        loaded.coins = (loaded.coins || 0) + gift.coins;
        loaded.opals = (loaded.opals || 0) + gift.opals;
        loaded.lastJimmyGift = now;
        // Ensure Jimmy & Chubs is in friends
        if (!loaded.friends) loaded.friends = [];
        if (!loaded.friends.some(f => f.id === JIMMY_CHUBS_FRIEND.id)) {
          loaded.friends = [JIMMY_CHUBS_FRIEND, ...loaded.friends];
        }
        const giftMsg = gift.opals > 0
          ? `Jimmy & Chubs sent you ${gift.opals} opals! 💜`
          : `Jimmy & Chubs sent you ${gift.coins} coins! 🪙`;
        // Queue notification after state is set
        setTimeout(() => {
          setNotifications(prev => [{
            id: `jimmy-gift-${now}`,
            type: 'gift',
            emoji: '🎁',
            message: giftMsg,
            time: 'Just now',
            read: false,
          }, ...prev]);
        }, 800);
      }

      setGameState(loaded);

      // Check for daily login bonus on app open
      const today = getTodayDateString();
      if (loaded.lastLoginDate !== today) {
        // Show daily login bonus if not claimed today
        setTimeout(() => {
          setShowDailyLogin(true);
        }, 1000); // Show after 1 second delay
      }
    } else {
      setGameState(getInitialGameState());
      // Show daily login for new players
      setTimeout(() => {
        setShowDailyLogin(true);
      }, 2000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save game state
  useEffect(() => {
    if (gameState) {
      saveGameState(gameState);
    }
  }, [gameState]);

  // Stats decay, evolution, and energy regen are handled by useWellbeingEngine

  const handleStart = useCallback((name: string) => {
    const newAxolotl = generateAxolotl(name);
    setGameState(prev => ({
      ...(prev || getInitialGameState()),
      axolotl: newAxolotl,
    }));
  }, []);

  /** Applied after a rebirth egg hatches: sets the name on the freshly-created axolotl. */
  const handleNameAxolotl = useCallback((name: string) => {
    setGameState(prev => {
      if (!prev?.axolotl) return prev;
      return { ...prev, axolotl: { ...prev.axolotl, name } };
    });
  }, []);

  // Cleaning mode: user taps Clean button, then taps individual poops to remove them.
  // Auto-exits after 3 s of inactivity.
  const exitCleaningMode = useCallback(() => {
    setCleaningMode(false);
    if (cleaningModeTimerRef.current) {
      clearTimeout(cleaningModeTimerRef.current);
      cleaningModeTimerRef.current = null;
    }
  }, []);

  const enterCleaningMode = useCallback(() => {
    // Toggle off if already active
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
    // After cleaning one poop, restart the 3-second timer so consecutive taps feel natural
    if (cleaningModeTimerRef.current) clearTimeout(cleaningModeTimerRef.current);
    cleaningModeTimerRef.current = setTimeout(() => {
      setCleaningMode(false);
      cleaningModeTimerRef.current = null;
    }, 3000);
  }, [handleCleanPoop]);

  // Play mode: user taps Playtime button, then taps the aquarium to make the axolotl swim (+10 happiness).
  // Tapping the axolotl itself triggers a wiggle (cosmetic only). Auto-exits after 5 s of inactivity.
  const exitPlayMode = useCallback(() => {
    setPlayMode(false);
    if (playModeTimerRef.current) {
      clearTimeout(playModeTimerRef.current);
      playModeTimerRef.current = null;
    }
  }, []);

  const enterPlayMode = useCallback(() => {
    // Toggle off if already active
    if (playMode) {
      exitPlayMode();
      return;
    }
    setPlayMode(true);
    if (playModeTimerRef.current) clearTimeout(playModeTimerRef.current);
    playModeTimerRef.current = setTimeout(() => {
      setPlayMode(false);
      playModeTimerRef.current = null;
    }, 5000);
  }, [playMode, exitPlayMode]);

  // Called on every aquarium tap in play mode — give happiness and reset the 5-second idle timer
  const handleAquariumPlayTap = useCallback(() => {
    handlePlayTap();
    if (playModeTimerRef.current) clearTimeout(playModeTimerRef.current);
    playModeTimerRef.current = setTimeout(() => {
      setPlayMode(false);
      playModeTimerRef.current = null;
    }, 5000);
  }, [handlePlayTap]);

  // All other handlers are now in useGameActions, useEconomyActions, or useWellbeingEngine

  // Wait for Supabase auth to resolve before rendering (avoids flash of LoginScreen for returning users)
  if (authLoading) return null;

  // Truly new player: no local save, not signed in, hasn't chosen guest — prompt to sign in or continue as guest.
  // Existing players (hasLocalSave) are let through immediately for backwards-compatibility.
  if (!user && !isGuest && !hasLocalSave) {
    return <LoginScreen />;
  }

  if (!gameState) return null;

  const _hasAnyEgg = !!(gameState.incubatorEgg || (gameState.nurseryEggs && gameState.nurseryEggs.length > 0));

  // ── No axolotl, no eggs → genuine first-start or post-release ──
  if (!gameState.axolotl && !_hasAnyEgg) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  // ── No axolotl, but egg(s) are waiting (post-rebirth) → nursery screen ──
  if (!gameState.axolotl && _hasAnyEgg) {
    return (
      <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-0 sm:p-4">
        <div className="w-full h-full sm:max-h-[calc(100vh-2rem)] max-w-md relative" style={{ height: '100%', maxHeight: '100vh' }}>
          <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 rounded-none sm:rounded-[2rem] blur opacity-40 z-0" />
          <div className="relative z-10 bg-white rounded-none sm:rounded-[2rem] shadow-2xl border-0 sm:border border-white/60 overflow-hidden" style={{ height: '100%' }}>
            <EggsPanel
              onClose={() => {}} // Cannot close — must hatch to continue
              incubatorEgg={gameState.incubatorEgg}
              nurseryEggs={gameState.nurseryEggs || []}
              axolotl={null}
              onHatch={(eggId) => handleHatchEgg(eggId, '')}
              onMoveToIncubator={handleMoveToIncubator}
              onBoost={handleBoostEgg}
              onGift={handleGiftEgg}
              onDiscard={handleDiscardEgg}
              opals={gameState.opals ?? 0}
              hasAxolotl={false}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Axolotl exists but has no name (just hatched from a rebirth egg) → naming screen ──
  if (gameState.axolotl && gameState.axolotl.name === '') {
    return <WelcomeScreen onStart={handleNameAxolotl} />;
  }

  // All three null-axolotl cases are handled above; this guard exists only to
  // satisfy the TypeScript compiler so that `axolotl` is narrowed to Axolotl.
  if (!gameState.axolotl) return null;

  const { axolotl, coins, customization, friends, lineage } = gameState;
  const opals = gameState.opals || 0; // Default to 0 if not set
  const showRebirthButton = canRebirth(axolotl);

  // Calculate XP and level
  const currentLevel = calculateLevel(axolotl.experience);
  const nextLevelXP = getXPForNextLevel(currentLevel);
  const currentLevelXP = getCurrentLevelXP(axolotl.experience);

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

                  {/* Hamburger Menu Button */}
                  <motion.button
                    ref={menuButtonRef}
                    onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
                    className="relative bg-transparent hover:bg-white/[0.08] rounded-lg transition-all border border-white/30 flex-shrink-0"
                    style={{ padding: '0.54rem' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Menu"
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

                {/* Cloud sync status indicator */}
                <div className="flex justify-end -mt-0.5 pointer-events-none">
                  <SyncIndicator status={isGuest ? 'guest' : syncStatus} />
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
                        <span className="text-white/50 text-[9px] font-medium">{currentLevelXP}/{nextLevelXP} XP</span>
                        <span className="text-white/30 text-[9px]">·</span>
                        <span className="text-white/50 text-[9px] font-medium capitalize">Stage: {axolotl.stage}</span>
                        {axolotl.rarity && (
                          <>
                            <span className="text-white/30 text-[9px]">·</span>
                            <span 
                              className={`text-[9px] font-bold ${
                                axolotl.rarity === 'Mythic' ? 'text-red-400' :
                                axolotl.rarity === 'Legendary' ? 'text-amber-400' :
                                axolotl.rarity === 'Epic' ? 'text-violet-400' :
                                axolotl.rarity === 'Rare' ? 'text-blue-400' :
                                'text-white'
                              }`}
                            >
                              {axolotl.rarity}
                            </span>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Home, Mini Games, Shop buttons - evenly spaced */}
                <div className="flex justify-center items-center mt-1">
                  <div className="flex items-center gap-6 w-3/4">
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
                    onClick={() => setCurrentScreen('games')}
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
                          style={{ fontSize: 15 }}
                        >
                          🧹
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
                          style={{ fontSize: 15 }}
                        >
                          ✨
                        </motion.span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#5b21b6', whiteSpace: 'nowrap' }}>
                          Tap the aquarium to play!
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Fixed Hamburger Dropdown Menu - rendered outside overflow:hidden header */}
            <AnimatePresence>
              {showHamburgerMenu && (
                <>
                  {/* Blurred backdrop */}
                  <motion.div
                    className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => { setShowHamburgerMenu(false); setShowNotifPanel(false); setShowHowToPlayPanel(false); setShowInventoryPanel(false); setShowEggsPanel(false); }}
                  />
                  {/* Full-screen popup panel */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.93, y: 32 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93, y: 32 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed inset-x-3 z-[9999] flex flex-col overflow-hidden rounded-3xl shadow-[0_20px_60px_-8px_rgba(99,102,241,0.22)]"
                    style={{
                      top: 'max(1rem, env(safe-area-inset-top))',
                      bottom: 'max(1rem, env(safe-area-inset-bottom))',
                      background: 'linear-gradient(160deg, #e0f7ff 0%, #ede9fe 48%, #fce7f3 100%)',
                      border: '1px solid rgba(255,255,255,0.9)',
                    }}
                  >
                    {/* Soft bubble orb top-right */}
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-cyan-300/35 blur-3xl pointer-events-none" />
                    {/* Soft bubble orb bottom-left */}
                    <div className="absolute -bottom-14 -left-8 w-52 h-52 rounded-full bg-violet-300/30 blur-3xl pointer-events-none" />
                    {/* Centre glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-pink-200/20 blur-3xl pointer-events-none" />

                    {/* ── Header ── */}
                    <div className="relative flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                      <div>
                        <h2
                          className="font-black tracking-tight"
                          style={{
                            fontSize: '1.9rem',
                            lineHeight: 1,
                            background: 'linear-gradient(110deg, #7c3aed 0%, #0ea5e9 55%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          Axopedia
                        </h2>
                        <p className="text-indigo-400/70 text-[11.5px] tracking-widest uppercase mt-0.5 font-semibold">Your aquatic universe</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Alerts button */}
                        <motion.button
                          onClick={() => setShowNotifPanel(prev => !prev)}
                          className="relative rounded-full p-2 border backdrop-blur-sm active:bg-white/80"
                          style={{
                            borderColor: showNotifPanel ? 'rgba(6,182,212,0.55)' : 'rgba(165,243,252,0.7)',
                            background: showNotifPanel ? 'rgba(103,232,249,0.35)' : 'rgba(255,255,255,0.5)',
                          }}
                          whileTap={{ scale: 0.85 }}
                        >
                          {unreadCount > 0 && (
                            <motion.div
                              className="absolute -top-1 -right-1 min-w-[1rem] h-4 rounded-full bg-rose-500 flex items-center justify-center border-2 border-white shadow-lg shadow-rose-400/50"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              <span className="text-[7px] font-black text-white leading-none px-0.5">{unreadCount}</span>
                            </motion.div>
                          )}
                          <span className="text-[1.1rem] leading-none">🔔</span>
                        </motion.button>
                        {/* Settings button */}
                        <motion.button
                          onClick={() => { setActiveModal('settings'); setShowHamburgerMenu(false); setShowNotifPanel(false); }}
                          className="rounded-full p-2 border border-indigo-200/60 bg-white/50 active:bg-white/80 backdrop-blur-sm"
                          whileTap={{ scale: 0.85 }}
                        >
                          <Settings className="w-5 h-5 text-indigo-400" strokeWidth={2.5} />
                        </motion.button>
                        {/* Close button */}
                        <motion.button
                          onClick={() => { setShowHamburgerMenu(false); setShowNotifPanel(false); setShowHowToPlayPanel(false); setShowInventoryPanel(false); setShowEggsPanel(false); setShowAchievementsPanel(false); }}
                          className="rounded-full p-2 border border-indigo-200/60 bg-white/50 active:bg-white/80 backdrop-blur-sm"
                          whileTap={{ scale: 0.85 }}
                        >
                          <X className="w-5 h-5 text-indigo-400" strokeWidth={2.5} />
                        </motion.button>
                      </div>
                    </div>

                    {/* Thin divider */}
                    <div className="h-px mx-5 flex-shrink-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.4),transparent)' }} />

                    {/* ── Scrollable tile grid ── */}
                    <div className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-2.5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                      <div className="grid grid-cols-2 gap-4 w-4/5 mx-auto">

                        {/* SPIN WHEEL */}
                        <motion.button
                          onClick={() => setShowSpinWheel(true)}
                          className="group relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.75) 0%, rgba(124,58,237,0.55) 100%)',
                            border: '1px solid rgba(124,58,237,0.45)',
                          }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">🎰</span>
                          <span className="text-[11px] font-bold text-violet-800 tracking-wider uppercase">Spin Wheel</span>
                          {gameState && canSpinToday(gameState.lastSpinDate) && (
                            <motion.div
                              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-md"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          )}
                        </motion.button>

                        {/* DAILY LOGIN */}
                        <motion.button
                          onClick={() => setShowDailyLogin(true)}
                          className="group relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.75) 0%, rgba(217,119,6,0.55) 100%)',
                            border: '1px solid rgba(217,119,6,0.45)',
                          }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">🎁</span>
                          <span className="text-[11px] font-bold text-amber-800 tracking-wider uppercase">Daily Bonus</span>
                          {gameState && canClaimDailyLogin(gameState.lastLoginDate) && (
                            <motion.div
                              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-md"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          )}
                        </motion.button>

                        {/* STATS */}
                        <motion.button
                          onClick={() => { setActiveModal('stats'); setShowHamburgerMenu(false); setShowNotifPanel(false); }}
                          className="group relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.75) 0%, rgba(2,132,199,0.6) 100%)', border: '1px solid rgba(2,132,199,0.45)' }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">📊</span>
                          <span className="text-[11px] font-bold text-sky-800 tracking-wider uppercase">Stats</span>
                        </motion.button>

                        {/* EGGS */}
                        <motion.button
                          onClick={() => setShowEggsPanel(true)}
                          className="group relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl overflow-hidden"
                          style={{
                            background: showEggsPanel
                              ? 'linear-gradient(135deg, rgba(99,102,241,0.85) 0%, rgba(79,70,229,0.75) 100%)'
                              : 'linear-gradient(135deg, rgba(99,102,241,0.7) 0%, rgba(79,70,229,0.55) 100%)',
                            border: showEggsPanel ? '1px solid rgba(79,70,229,0.6)' : '1px solid rgba(79,70,229,0.45)',
                          }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">🥚</span>
                          <span className="text-[11px] font-bold text-indigo-800 tracking-wider uppercase">Eggs</span>
                        </motion.button>

                        {/* SOCIAL */}
                        <motion.button
                          onClick={() => { setActiveModal('social'); setShowHamburgerMenu(false); setShowNotifPanel(false); setHasPendingPokes(false); }}
                          className="group relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.75) 0%, rgba(219,39,119,0.6) 100%)', border: '1px solid rgba(219,39,119,0.45)' }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          {hasPendingPokes && (
                            <motion.div
                              className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-lg shadow-rose-400/60"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          )}
                          <span className="text-[2rem]">👥</span>
                          <span className="text-[11px] font-bold text-pink-800 tracking-wider uppercase">Social</span>
                        </motion.button>

                        {/* DECORATIONS */}
                        <motion.button
                          onClick={() => { setShowInventoryPanel(true); setDecorationsTab('store'); }}
                          className="group relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl overflow-hidden"
                          style={{
                            background: showInventoryPanel
                              ? 'linear-gradient(135deg, rgba(20,184,166,0.85) 0%, rgba(13,148,136,0.75) 100%)'
                              : 'linear-gradient(135deg, rgba(20,184,166,0.7) 0%, rgba(13,148,136,0.55) 100%)',
                            border: showInventoryPanel ? '1px solid rgba(13,148,136,0.6)' : '1px solid rgba(13,148,136,0.45)',
                          }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">🪸</span>
                          <span className="text-[11px] font-bold text-teal-800 tracking-wider uppercase">Decorations</span>
                        </motion.button>

                        {/* HOW TO PLAY */}
                        <motion.button
                          onClick={() => setShowHowToPlayPanel(true)}
                          className="group relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl overflow-hidden"
                          style={{
                            background: showHowToPlayPanel
                              ? 'linear-gradient(135deg, rgba(6,182,212,0.85) 0%, rgba(8,145,178,0.75) 100%)'
                              : 'linear-gradient(135deg, rgba(6,182,212,0.7) 0%, rgba(8,145,178,0.55) 100%)',
                            border: showHowToPlayPanel ? '1px solid rgba(8,145,178,0.6)' : '1px solid rgba(8,145,178,0.45)',
                          }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">💡</span>
                          <span className="text-[11px] font-bold text-cyan-800 tracking-wider uppercase">How to Play</span>
                        </motion.button>

                        {/* ACHIEVEMENTS */}
                        {(() => {
                          const unlockedCount = (gameState?.achievements ?? []).length;
                          const totalCount = ALL_ACHIEVEMENTS.length;
                          return (
                            <motion.button
                              onClick={() => { setShowAchievementsPanel(true); setShowHowToPlayPanel(false); setShowInventoryPanel(false); setShowEggsPanel(false); }}
                              className="group relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl overflow-hidden"
                              style={{
                                background: showAchievementsPanel
                                  ? 'linear-gradient(135deg, rgba(245,158,11,0.85) 0%, rgba(217,119,6,0.75) 100%)'
                                  : 'linear-gradient(135deg, rgba(245,158,11,0.7) 0%, rgba(217,119,6,0.55) 100%)',
                                border: showAchievementsPanel ? '1px solid rgba(217,119,6,0.6)' : '1px solid rgba(217,119,6,0.45)',
                              }}
                              whileTap={{ scale: 0.93 }}
                            >
                              <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                              <span className="text-[2rem]">🏆</span>
                              <span className="text-[11px] font-bold text-amber-800 tracking-wider uppercase">Achievements</span>
                              <span className="text-[9px] font-semibold text-amber-700/70">{unlockedCount}/{totalCount}</span>
                            </motion.button>
                          );
                        })()}

                        {/* REBIRTH — full-width, always visible; glows when available */}
                        <motion.button
                          onClick={() => { if (showRebirthButton) { setActiveModal('rebirth'); setShowHamburgerMenu(false); setShowNotifPanel(false); } }}
                          className="col-span-2 group relative flex flex-row items-center justify-center gap-2.5 py-3 rounded-2xl overflow-hidden"
                          style={showRebirthButton ? {
                            background: 'linear-gradient(110deg, rgba(233,213,255,0.88) 0%, rgba(216,180,254,0.82) 35%, rgba(251,207,232,0.82) 70%, rgba(253,186,116,0.75) 100%)',
                            border: '1px solid rgba(192,132,252,0.5)',
                          } : {
                            background: 'linear-gradient(110deg, rgba(200,200,215,0.45) 0%, rgba(210,210,225,0.4) 100%)',
                            border: '1px solid rgba(160,160,180,0.3)',
                            opacity: 0.7,
                          }}
                          whileTap={showRebirthButton ? { scale: 0.96 } : {}}
                        >
                          {showRebirthButton && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                              animate={{ x: ['-100%', '180%'] }}
                              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
                              style={{ width: '40%' }}
                            />
                          )}
                          <span className="text-[2rem]">{showRebirthButton ? '✨' : '🔒'}</span>
                          <div className="flex flex-col items-start">
                            <span className={`text-[13px] font-black tracking-wider uppercase ${showRebirthButton ? 'text-violet-700' : 'text-slate-400'}`}>
                              {showRebirthButton ? 'Rebirth Available' : 'Rebirth'}
                            </span>
                            <span className={`text-[9px] font-medium ${showRebirthButton ? 'text-violet-500/80' : 'text-slate-400/80'}`}>
                              {showRebirthButton ? 'Start a new generation' : 'Reach Elder • Level 40'}
                            </span>
                          </div>
                        </motion.button>
                      </div>
                    </div>

                    {/* ── How to Play sub-panel overlay ── */}
                    <AnimatePresence>
                      {showHowToPlayPanel && (
                        <motion.div
                          initial={{ opacity: 0, y: '100%' }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: '100%' }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0 flex flex-col rounded-3xl overflow-hidden"
                          style={{ background: 'linear-gradient(160deg, #e0f7ff 0%, #ede9fe 48%, #fce7f3 100%)' }}
                        >
                          {/* Panel header */}
                          <div className="flex items-center px-5 pt-5 pb-3 flex-shrink-0 gap-3">
                            <motion.button
                              onClick={() => setShowHowToPlayPanel(false)}
                              className="rounded-full p-1.5 border border-indigo-200/60 bg-white/50 active:bg-white/80 flex-shrink-0"
                              whileTap={{ scale: 0.85 }}
                            >
                              <ChevronDown className="w-4 h-4 text-indigo-400 rotate-90" strokeWidth={2.5} />
                            </motion.button>
                            <div>
                              <h3 className="text-indigo-800 font-bold text-base">How to Play</h3>
                              <p className="text-[10px] text-sky-500/80 font-medium">Axolotl care guide</p>
                            </div>
                          </div>
                          <div className="h-px mx-5 flex-shrink-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(56,189,248,0.3),transparent)' }} />

                          {/* Tips list */}
                          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-2.5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                            {[
                              { emoji: '🍤', color: 'rgba(16,185,129,0.12)', border: 'rgba(52,211,153,0.18)', title: 'Keep Your Axolotl Fed', tip: "Tap Feed to drop food pellets. Your axolotl swims up and eats them. Hunger drops over time — don't let it bottom out!" },
                              { emoji: '🎮', color: 'rgba(139,92,246,0.12)', border: 'rgba(167,139,250,0.18)', title: 'Play Mini Games', tip: 'Head to Mini Games to earn XP and coins. Level up your axolotl to unlock the ability to rebirth at Level 40.' },
                              { emoji: '🧹', color: 'rgba(14,165,233,0.12)', border: 'rgba(56,189,248,0.18)', title: 'Clean the Tank', tip: "Tap Clean to remove poops and keep the tank clean. If cleanliness drops below 50% for more than a day, it will start to affect water quality decay." },
                              { emoji: '💧', color: 'rgba(99,102,241,0.12)', border: 'rgba(129,140,248,0.18)', title: 'Change the Water', tip: 'Tap Water to refresh the tank and directly boost water quality. Good water quality slows decay of other stats.' },
                              { emoji: '🌱', color: 'rgba(34,197,94,0.12)', border: 'rgba(74,222,128,0.18)', title: 'Evolve Through 4 Stages', tip: 'Your axolotl grows from Baby → Juvenile → Adult → Elder. Keep all stats high to evolve faster. Eggs hatch into Baby at Level 1.' },
                              { emoji: '✨', color: 'rgba(168,85,247,0.12)', border: 'rgba(216,180,254,0.18)', title: 'Rebirth for Bonuses', tip: 'At Elder stage (Level 40) you can Rebirth — start a new generation with bonus coins and inherited colour traits.' },
                              { emoji: '🛍️', color: 'rgba(245,158,11,0.12)', border: 'rgba(251,191,36,0.18)', title: 'Customize Your Tank', tip: 'Tap the Shop button in the HUD to buy decorations, plants, and filters. Unlock backgrounds with opals.' },
                              { emoji: '👥', color: 'rgba(236,72,153,0.12)', border: 'rgba(244,114,182,0.18)', title: 'Play with Friends', tip: 'Add friends via code in Social. Poke them, visit their tanks, or hatch eggs together.' },
                            ].map((item, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.045 }}
                                className="flex gap-3 px-4 py-3.5 rounded-2xl"
                                style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${item.border}` }}
                              >
                                <span className="text-2xl flex-shrink-0 mt-0.5">{item.emoji}</span>
                                <div>
                                  <p className="text-slate-700 font-bold text-[12px] leading-tight">{item.title}</p>
                                  <p className="text-slate-500 text-[11px] leading-snug mt-1">{item.tip}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── Decorations sub-panel overlay ── */}
                    <AnimatePresence>
                      {showInventoryPanel && (() => {
                        const owned = gameState?.unlockedDecorations ?? [];
                        const equippedDecos = gameState?.customization?.decorations ?? [];
                        return (
                          <DecorationsPanel
                            owned={owned}
                            equippedDecos={equippedDecos}
                            coins={coins}
                            activeBackground={gameState?.customization?.background ?? ''}
                            decorationsTab={decorationsTab}
                            setDecorationsTab={setDecorationsTab}
                            onClose={() => setShowInventoryPanel(false)}
                            onPurchase={handlePurchase}
                            onEquip={handleEquipDecoration}
                          />
                        );
                      })()}
                    </AnimatePresence>

                    {/* ── Eggs sub-panel overlay ── */}
                    <AnimatePresence>
                      {showEggsPanel && (
                        <EggsPanel 
                          onClose={() => setShowEggsPanel(false)}
                          incubatorEgg={gameState?.incubatorEgg || null}
                          nurseryEggs={gameState?.nurseryEggs || []}
                          axolotl={gameState?.axolotl || null}
                          onHatch={handleHatchEgg}
                          onReleaseAxolotl={handleReleaseAxolotl}
                          onMoveToIncubator={handleMoveToIncubator}
                          onBoost={handleBoostEgg}
                          onGift={handleGiftEgg}
                          onDiscard={handleDiscardEgg}
                          opals={opals}
                          hasAxolotl={!!gameState?.axolotl}
                        />
                      )}
                    </AnimatePresence>

                    {/* ── Achievements sub-panel overlay ── */}
                    <AnimatePresence>
                      {showAchievementsPanel && gameState && (
                        <motion.div
                          initial={{ opacity: 0, y: '100%' }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: '100%' }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0 flex flex-col rounded-3xl overflow-hidden"
                          style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' }}
                        >
                          {/* Panel header */}
                          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🏆</span>
                              <h3 className="text-white font-bold text-base">Achievement Center</h3>
                            </div>
                            <motion.button
                              onClick={() => setShowAchievementsPanel(false)}
                              className="rounded-full p-2 border border-white/20 bg-white/10 active:bg-white/20"
                              whileTap={{ scale: 0.85 }}
                            >
                              <X className="w-4 h-4 text-white/80" strokeWidth={2.5} />
                            </motion.button>
                          </div>
                          {/* Scrollable content */}
                          <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <AchievementCenter gameState={gameState} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── Notification sub-panel overlay ── */}
                    <AnimatePresence>
                      {showNotifPanel && (
                        <motion.div
                          initial={{ opacity: 0, y: '100%' }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: '100%' }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0 flex flex-col rounded-3xl overflow-hidden"
                          style={{ background: 'linear-gradient(160deg, #e0f7ff 0%, #ede9fe 48%, #fce7f3 100%)' }}
                        >
                          {/* Panel header */}
                          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                            <div className="flex items-center gap-3">
                              <motion.button
                                onClick={() => setShowNotifPanel(false)}
                                className="rounded-full p-1.5 border border-indigo-200/60 bg-white/50 active:bg-white/80"
                                whileTap={{ scale: 0.85 }}
                              >
                                <ChevronDown className="w-4 h-4 text-indigo-400 rotate-90" strokeWidth={2.5} />
                              </motion.button>
                              <div>
                                <h3 className="text-indigo-800 font-bold text-base">Alerts</h3>
                                {unreadCount > 0 && (
                                  <p className="text-[10px] text-cyan-600/80 font-medium">{unreadCount} unread</p>
                                )}
                              </div>
                            </div>
                            {unreadCount > 0 && (
                              <motion.button
                                onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                                className="flex items-center gap-1.5 text-[10px] text-indigo-400 active:text-indigo-600 border border-indigo-200/50 bg-white/40 rounded-full px-3 py-1.5"
                                whileTap={{ scale: 0.92 }}
                              >
                                <Check className="w-3 h-3" strokeWidth={2.5} />
                                Mark all read
                              </motion.button>
                            )}
                          </div>
                          <div className="h-px mx-5 flex-shrink-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.35),transparent)' }} />

                          {/* Notification list */}
                          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                            {notifications.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                                <span className="text-4xl">🔕</span>
                                <p className="text-slate-500 text-sm">No notifications yet</p>
                              </div>
                            ) : notifications.map((notif, i) => (
                              <motion.button
                                key={notif.id}
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => {
                                  setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                  if (notif.type === 'poke' || notif.type === 'friend' || notif.type === 'gift') {
                                    setActiveModal('social');
                                    setShowHamburgerMenu(false);
                                    setShowNotifPanel(false);
                                    setHasPendingPokes(false);
                                  }
                                }}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left"
                                style={{
                                  background: !notif.read
                                    ? 'linear-gradient(135deg, rgba(221,214,254,0.7) 0%, rgba(186,230,253,0.5) 100%)'
                                    : 'rgba(255,255,255,0.45)',
                                  border: !notif.read ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(203,213,225,0.4)',
                                }}
                                whileTap={{ scale: 0.97 }}
                              >
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                                  style={{ background: !notif.read ? 'rgba(221,214,254,0.6)' : 'rgba(241,245,249,0.8)' }}
                                >
                                  {notif.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[12px] leading-snug ${!notif.read ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>{notif.message}</p>
                                  <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{notif.time}</p>
                                </div>
                                {!notif.read && (
                                  <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 shadow-sm shadow-violet-400/60" />
                                )}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </>
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
                    }}
                  >
                    {/* Wider Aquarium Container */}
                    <div
                      className="relative h-full w-[250%] sm:w-[200%] cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        // Clamp to valid aquarium bounds (0-100%)
                        const clampedX = Math.max(5, Math.min(95, x));
                        const clampedY = Math.max(5, Math.min(95, y));
                        // Always swim to the tapped position
                        setClickTarget({ x: clampedX, y: clampedY, timestamp: Date.now() });
                        // In play mode, also give +10 happiness and reset the idle timer
                        if (playMode) handleAquariumPlayTap();
                      }}
                    >
                      <AquariumBackground
                        background={customization.background}
                        decorations={customization.decorations}
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
                      {/* Ghost Shrimp — emoji placeholders, stable positions derived from index */}
                      {(gameState.shrimpCount || 0) > 0 && Array.from({ length: Math.min(6, gameState.shrimpCount || 0) }).map((_, i) => {
                        const x = 8 + (i * 15 + ((i * 7) % 11)) % 84;
                        const bottom = 14 + (i % 3) * 5;
                        return (
                          <div
                            key={`shrimp-${i}`}
                            className="absolute pointer-events-none select-none"
                            style={{ left: `${x}%`, bottom: `${bottom}%`, fontSize: 14, zIndex: 18, opacity: 0.85 }}
                          >
                            🦐
                          </div>
                        );
                      })}
                      
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

                  {/* Tutorial overlay — rendered inside the aquarium relative container */}
                  {(gameState.tutorialStep === 'feed' || gameState.tutorialStep === 'eat') && (
                    <FeedingTutorial
                      step={gameState.tutorialStep}
                      axolotlName={axolotl.name}
                    />
                  )}

                  {/* ── First-time poop cleaning tutorial ── */}
                  {(() => {
                    const showCleanTutorial =
                      gameState.cleanTutorialSeen === false &&
                      (gameState.poopItems?.length ?? 0) > 0;
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
                            {/* Dim overlay */}
                            <div
                              className="absolute inset-0"
                              style={{ background: 'rgba(0,0,0,0.42)' }}
                            />
                            {/* Speech bubble anchored just above the action buttons */}
                            <motion.div
                              className="absolute bottom-[72px] left-0 right-0 flex flex-col items-center gap-0.5 px-4"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
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
                                  Tap <span className="text-rose-500">Clean</span> to start 🧹
                                </p>
                              </div>
                              {/* Downward caret */}
                              <div
                                className="w-0 h-0"
                                style={{
                                  borderLeft: '9px solid transparent',
                                  borderRight: '9px solid transparent',
                                  borderTop: '9px solid rgba(255,255,255,0.97)',
                                }}
                              />
                              {/* Bouncing finger pointing at Clean button */}
                              <motion.span
                                className="text-2xl select-none"
                                animate={{ y: [0, 8, 0] }}
                                transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                              >
                                👇
                              </motion.span>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    );
                  })()}

                  {/* Floating Action Buttons — lifted above tutorial overlays when needed */}
                  {(() => {
                    const cleanTutActive =
                      gameState.cleanTutorialSeen === false &&
                      (gameState.poopItems?.length ?? 0) > 0 &&
                      !cleaningMode;
                    const needsLift =
                      gameState.tutorialStep === 'feed' || cleanTutActive;
                    return (
                      <div
                        className={`absolute bottom-0 left-0 right-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
                          needsLift ? 'z-50' : 'z-30'
                        }`}
                      >
                        {/* Gradient fade behind buttons */}
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
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </>
            ) : (
              /* Mini Games Screen */
              <div 
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-gradient-to-br from-indigo-300/90 via-purple-300/90 to-pink-300/90"
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                  paddingTop: '0.5rem',
                  height: '100%',
                  width: '100%',
                  position: 'relative',
                  display: activeGame ? 'none' : 'block', // Hide menu when game is active
                }}
              >
                <MiniGameMenu
                  onClose={() => setCurrentScreen('home')}
                  miniGamesLockedUntil={gameState.miniGamesLockedUntil}
                  onSelectGame={(gameId) => {
                    if (!gameState) return;

                    // Track unique games played for "All-Rounder" achievement
                    setGameState(prev => {
                      if (!prev) return prev;
                      const already = prev.uniqueGamesPlayed ?? [];
                      if (already.includes(gameId)) return prev;
                      return { ...prev, uniqueGamesPlayed: [...already, gameId] };
                    });

                    // Start the game - energy is deducted inside each game's startGame()
                    setActiveGame(gameId);
                    setCurrentScreen('home');
                  }}
                  energy={gameState.energy}
                  maxEnergy={gameState.maxEnergy}
                  lastEnergyUpdate={gameState.lastEnergyUpdate}
                  opals={opals}
                  onUnlockGames={handleUnlockGames}
                />
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Water Change Confirmation Modal */}
      {showWaterChangeModal && (
        <WaterChangeModal
          onClose={() => setShowWaterChangeModal(false)}
          onConfirm={handleWaterChange}
        />
      )}

      {/* Modals */}
      {activeModal === 'shop' && (
        <ShopModal
          onClose={() => { setActiveModal(null); setShopSection(null); }}
          coins={coins}
          opals={opals}
          onBuyCoins={handleBuyCoins}
          onBuyOpals={handleBuyOpals}
          onBuyFilter={handleBuyFilter}
          onBuyShrimp={handleBuyShrimp}
          onBuyTreatment={handleBuyTreatment}
          initialSection={shopSection}
        />
      )}

      {activeModal === 'social' && (
        <SocialModal
          onClose={() => setActiveModal(null)}
          axolotl={axolotl}
          friends={friends}
          onAddFriend={handleAddFriend}
          onRemoveFriend={handleRemoveFriend}
          onBreed={handleBreed}
          onGiftFriend={(_friendId, coins, opals) => {
            setGameState(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                coins: prev.coins + coins,
                opals: (prev.opals || 0) + opals,
                totalGiftsSent: (prev.totalGiftsSent ?? 0) + 1,
              };
            });
          }}
          onVisitJimmy={() => {
            setActiveModal(null);
            setShowJimmyAquarium(true);
          }}
          lineage={lineage}
        />
      )}

      {/* Jimmy & Chubs aquarium */}
      <AnimatePresence>
        {showJimmyAquarium && (
          <motion.div
            key="jimmy-aquarium"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <JimmyChubsAquarium onBack={() => setShowJimmyAquarium(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {activeModal === 'rebirth' && showRebirthButton && (
        <RebirthModal
          onClose={() => setActiveModal(null)}
          onConfirm={handleRebirth}
          currentAxolotl={axolotl}
        />
      )}

      {activeModal === 'stats' && (
        <StatsModal
          onClose={() => { setActiveModal(null); setLevelUpData(null); }}
          stats={axolotl.secondaryStats}
          name={axolotl.name}
          levelUp={levelUpData ?? undefined}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          onClose={() => setActiveModal(null)}
          onResetGame={() => {
            localStorage.clear();
            setGameState(null);
          }}
          musicEnabled={gameState?.musicEnabled !== false}
          onMusicToggle={(enabled) => {
            setGameState(prev => prev ? { ...prev, musicEnabled: enabled } : null);
          }}
        />
      )}

      {/* Mini-Games */}
      <AnimatePresence>
        {activeGame === 'keepey-upey' && gameState && (
          <KeepeyUpey
            onEnd={handleMiniGameEnd}
            onDeductEnergy={handleDeductEnergy}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'fish-hooks' && gameState && (
          <FlappyFishHooks
            onEnd={handleMiniGameEnd}
            onDeductEnergy={handleDeductEnergy}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'math-rush' && gameState && (
          <MathRush
            onEnd={handleMiniGameEnd}
            onDeductEnergy={handleDeductEnergy}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'axolotl-stacker' && gameState && (
          <AxolotlStacker
            onEnd={handleMiniGameEnd}
            onDeductEnergy={handleDeductEnergy}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'coral-code' && gameState && (
          <CoralCode
            onEnd={handleMiniGameEnd}
            onDeductEnergy={handleDeductEnergy}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'treasure-hunt' && gameState && (
          <TreasureHuntCave
            onEnd={handleMiniGameEnd}
            onDeductEnergy={handleDeductEnergy}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'fishing' && gameState && (
          <Fishing
            onEnd={handleMiniGameEnd}
            onDeductEnergy={handleDeductEnergy}
            energy={gameState.energy}
            strength={gameState.axolotl?.secondaryStats?.strength || 0}
            speed={gameState.axolotl?.secondaryStats?.speed || 0}
          />
        )}
        {activeGame === 'bite-tag' && gameState && (
          <BiteTag
            onEnd={handleMiniGameEnd}
            onDeductEnergy={handleDeductEnergy}
            energy={gameState.energy}
            speed={gameState.axolotl?.secondaryStats?.speed || 0}
            stamina={gameState.axolotl?.secondaryStats?.stamina || 0}
          />
        )}
      </AnimatePresence>

      {/* Daily Features */}
      {gameState && (
        <>
          <SpinWheel
            isOpen={showSpinWheel}
            onClose={() => setShowSpinWheel(false)}
            onSpin={handleSpinWheel}
            lastSpinDate={gameState.lastSpinDate}
            coins={gameState.coins}
            opals={gameState.opals || 0}
          />
          <DailyLoginBonus
            isOpen={showDailyLogin}
            onClose={() => setShowDailyLogin(false)}
            onClaim={handleDailyLoginClaim}
            lastLoginDate={gameState.lastLoginDate}
            loginStreak={gameState.loginStreak}
            coins={gameState.coins}
            opals={gameState.opals || 0}
          />
        </>
      )}
    </div>
  );
}