import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, SecondaryStats } from './types/game';
import {
  canRebirth,
  calculateLevel,
  getXPForNextLevel,
  getCurrentLevelXP,
} from './utils/gameLogic';
import { loadGameState, saveGameState, getInitialGameState, generatePermanentFriendCode } from './utils/storage';
import { GAME_CONFIG } from './config/game';
import { WelcomeScreen } from './components/WelcomeScreen';
import { HatchingIntroScreen } from './components/HatchingIntroScreen';
import { NamingScreen } from './components/NamingScreen';
import { EggsPanel } from './components/EggsPanel';
import { ModalManager } from './components/ModalManager';
import { GameScreen } from './components/GameScreen';
import { useGameActions } from './hooks/useGameActions';
import { useOnboarding } from './hooks/useOnboarding';
import { useMenuState } from './hooks/useMenuState';
import { useWellbeingEngine } from './hooks/useWellbeingEngine';
import { useEconomyActions } from './hooks/useEconomyActions';
import { useSocialState } from './hooks/useSocialState';
import { useAquariumMusic, useContextMusic } from './hooks/useAquariumMusic';
import { getTodayDateString } from './utils/dailySystem';
import { useAuth } from './context/AuthContext';
import { useCloudSync, SyncStatus } from './hooks/useCloudSync';
import { sendFriendAction, isSupabaseConfigured, fetchPlayerAchievements, pushAchievements } from './services/supabase';
import { LoginScreen } from './components/LoginScreen';
import { AgeGateScreen, loadAgeGate } from './components/AgeGateScreen';
import { ParentGate } from './components/ParentGate';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
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
  const [showWaterChangeModal, setShowWaterChangeModal] = useState(false);
  // Lifted from GameScreen so useOnboarding can read them for tutorialLockMode.
  // Timer refs and enter/exit callbacks remain in GameScreen.
  const [playMode, setPlayMode] = useState(false);
  const [cleaningMode, setCleaningMode] = useState(false);

  /** Level-up fanfare overlay: shows when the axolotl gains a level */
  const [levelUpInfo, setLevelUpInfo] = useState<{ level: number } | null>(null);

  /** Show Jimmy & Chubs's aquarium */
  const [showJimmyAquarium, setShowJimmyAquarium] = useState(false);
  /** Populated when a cloud pull finds two meaningful saves — clears after user resolves. */
  const [conflictSaves, setConflictSaves] = useState<{ local: GameState; cloud: GameState } | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { user, isLoading: authLoading, isGuest, isRecovering, signOut, deleteAccount } = useAuth();
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  /** True if a save already existed in localStorage when the app first launched.
   *  Used to skip LoginScreen for existing / returning players. */
  const [hasLocalSave] = useState(() => !!localStorage.getItem('axolotl-game-state'));

  // ── COPPA age gate ────────────────────────────────────────────────────────
  const [ageGateCompleted, setAgeGateCompleted] = useState(() => {
    const saved = loadAgeGate();
    return saved?.completed ?? false;
  });
  const [isUnder13, setIsUnder13] = useState(() => {
    const saved = loadAgeGate();
    return saved?.isUnder13 ?? false;
  });
  const [showParentAuthFromAgeGate, setShowParentAuthFromAgeGate] = useState(false);
  /** True when the parent tapped "Back to game" from the LoginScreen — show the guest warning before proceeding. */
  const [showGuestWarningFromParent, setShowGuestWarningFromParent] = useState(false);
  /** True once the ParentGate has been passed in this session — gate is one-time per session. */
  const [parentGatePassed, setParentGatePassed] = useState(false);

  // Stable callback — must be memoized so useSocialState's effects don't re-fire on every render
  const handleApplyGiftReward = useCallback((coins: number, opals: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      return { ...prev, coins: prev.coins + coins, opals: (prev.opals ?? 0) + opals };
    });
  }, []);

  // Domain hooks
  const {
    notifications,
    setNotifications,
    hasPendingPokes,
    setHasPendingPokes,
    unreadCount,
    hasNotifications,
  } = useSocialState({
    userId: user?.id ?? null,
    onApplyGiftReward: handleApplyGiftReward,
  });

  const {
    showSpinWheel,
    setShowSpinWheel,
    showDailyLogin,
    setShowDailyLogin,
    handleSpinWheel,
    handleDailyLoginClaim,
  } = useEconomyActions({ setGameState, setNotifications });

  const { forcePush } = useCloudSync({
    userId: user?.id ?? null,
    authUsername: (user?.user_metadata?.username as string | undefined) ?? null,
    gameState,
    isUnder13,
    onCloudStateLoaded: (state: GameState) => {
      if (!state.friendCode) state = { ...state, friendCode: generatePermanentFriendCode() };
      setGameState(state);
    },
    onConflict: (local, cloud) => {
      setConflictSaves({ local, cloud });
    },
    onStatusChange: setSyncStatus,
    onFriendCodeCollision: () => {
      setGameState(prev =>
        prev ? { ...prev, friendCode: generatePermanentFriendCode() } : prev,
      );
    },
  });

  // ── Startup achievement sync ───────────────────────────────────────────────
  // Skipped on under-13 devices: COPPA hard-stop on collecting child gameplay
  // even when a parent is signed in.
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured || isUnder13) return;

    const syncAchievements = async () => {
      const remoteIds = await fetchPlayerAchievements(user.id);
      setGameState(prev => {
        if (!prev) return prev;
        const localIds = prev.achievements ?? [];
        const merged = Array.from(new Set([...localIds, ...remoteIds]));
        if (merged.length === localIds.length) return prev;
        const localOnly = localIds.filter(id => !remoteIds.includes(id));
        if (localOnly.length > 0) pushAchievements(user.id, localOnly).catch(console.error);
        return { ...prev, achievements: merged };
      });
    };

    syncAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isUnder13]);

  // Auto-close the in-game auth overlay once the user successfully signs in
  useEffect(() => {
    if (user && !isGuest && showAuthOverlay) {
      setShowAuthOverlay(false);
    }
  }, [user, isGuest, showAuthOverlay]);


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
    currentScreen,
    setCurrentScreen,
    activeGame,
    setActiveGame,
    shopSection,
    setShopSection,
  } = menuState;

  // ── Onboarding / tutorial state ───────────────────────────────────────────
  const {
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
    showMenuTutorialPrompt,
    handleStartMenuTutorial,
    showMenuTutorialComplete,
    setShowMenuTutorialComplete,
    showRebirthReady,
    setShowRebirthReady,
    tutorialLockMode,
    lockedActionButtons,
  } = useOnboarding({
    gameState,
    setGameState,
    currentScreen,
    activeModal,
    playMode,
    cleaningMode,
  });

  // Aquarium music — play everywhere except minigame page and Jimmy's aquarium
  const shouldPlayAquariumMusic = gameState && !showJimmyAquarium && currentScreen === 'home';
  const shouldPlayMiniGameMusic = gameState && currentScreen === 'games';

  useAquariumMusic({
    enabled: !!shouldPlayAquariumMusic && !shouldPlayMiniGameMusic,
    musicEnabled: gameState?.musicEnabled !== false,
    volume: 0.25,
  });

  useContextMusic({
    context: 'miniGames',
    enabled: !!shouldPlayMiniGameMusic,
    musicEnabled: gameState?.musicEnabled !== false,
    volume: 0.25,
    startingTrack: `${import.meta.env.BASE_URL}music/mini-games/Axolittle mini game screen.mp3`,
  });

  // Level-up callback — shows the fanfare overlay
  const handleLevelUp = useCallback((newLevel: number, _prevStats: SecondaryStats) => {
    setLevelUpInfo({ level: newLevel });
  }, []);

  // Game actions from hook
  const gameActions = useGameActions({
    gameState,
    setGameState,
    setNotifications,
    setActiveModal,
    setActiveGame,
    setCurrentScreen,
    onLevelUp: handleLevelUp,
    userId: user?.id ?? null,
  });

  const {
    handleFeed,
    handleEatFood,
    handlePlayTap,
    handleCleanPoop,
    handleWaterChange,
    handlePurchase,
    handleEquipDecoration,
    handleUpdateDecorationPosition,
    handleUpdateDecorationScale,
    handleRemoveDecorationInstance,
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
    handleMiniGameApplyReward,
    handleMiniGameEnd,
    handleBuyCoins,
    handleBuyFilter,
    handleEquipFilter,
    handleBuyShrimp,
    handleBuyTreatment,
    handleStoreTreatment,
    handleUseTreatmentFromInventory,
    handleStoreShrimpInInventory,
    handleDeployShrimpFromInventory,
    handleUnlockNurserySlot,
    handleUnlockGames,
    handleRefillEnergy,
    handleClaimAchievement,
  } = gameActions;

  // ── Friend gift / poke — real Supabase writes ─────────────────────────────
  // The sender identity that travels through the social graph is the axolotl's
  // name, NOT the auth username. Usernames are sign-in identifiers and may
  // include personal info; the axolotl name is the user's chosen public-facing
  // social identity, matching the friend_add notification path.
  const handleGiftFriend = useCallback(async (friendId: string, coins: number, opals: number) => {
    if (!user?.id || !isSupabaseConfigured) return;
    setGameState(prev => prev ? { ...prev, totalGiftsSent: (prev.totalGiftsSent ?? 0) + 1 } : prev);
    const senderName = gameState?.axolotl?.name ?? 'A friend';
    await sendFriendAction(user.id, friendId, senderName, 'gift', coins, opals);
  }, [user, gameState?.axolotl?.name]);

  const handlePokeFriend = useCallback(async (friendId: string) => {
    if (!user?.id || !isSupabaseConfigured) return;
    const senderName = gameState?.axolotl?.name ?? 'A friend';
    await sendFriendAction(user.id, friendId, senderName, 'poke', 0, 0);
  }, [user, gameState?.axolotl?.name]);

  // ── Aquarium centering (registered by GameScreen, consumed by ModalManager) ──
  const centerAquariumRef = useRef<(() => void) | null>(null);
  const handleRegisterCenterAquarium = useCallback((fn: () => void) => {
    centerAquariumRef.current = fn;
  }, []);
  const handleCenterAquarium = useCallback(() => {
    centerAquariumRef.current?.();
  }, []);

  // Deducts 1 energy when a mini-game attempt begins.
  const handleDeductEnergy = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      const now = Date.now();
      const lastUpdate = prev.lastEnergyUpdate || now;
      const elapsedSeconds = (now - lastUpdate) / 1000;
      const energyRegenRate = GAME_CONFIG.energyRegenRate / 3600;
      const maxEnergy = prev.maxEnergy || GAME_CONFIG.energyMax;
      const currentEnergy = Math.min(maxEnergy, prev.energy + energyRegenRate * elapsedSeconds);
      if (Math.floor(currentEnergy) < 1) return prev;
      return {
        ...prev,
        energy: Math.max(0, currentEnergy - 1),
        lastEnergyUpdate: now,
      };
    });
  }, []);

  // Load game state on mount
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const loaded = loadGameState();
    if (loaded) {
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
      if (loaded.nurseryUnlockedSlots === undefined) {
        loaded.nurseryUnlockedSlots = GAME_CONFIG.nurserySlotsOpen;
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
      const energyRegenRate = GAME_CONFIG.energyRegenRate / 3600;
      const maxEnergy = loaded.maxEnergy || GAME_CONFIG.energyMax;
      const currentEnergy = loaded.energy || 0;
      const energyGained = energyRegenRate * elapsedSeconds;
      const newEnergy = Math.min(maxEnergy, currentEnergy + energyGained);

      loaded.energy = newEnergy;
      loaded.lastEnergyUpdate = now;

      // ── Jimmy & Chubs gift check (twice a week = every 3.5 days) ──────────
      const jimmyLast = loaded.lastJimmyGift;
      if (jimmyLast === undefined || (now - jimmyLast) >= JIMMY_GIFT_INTERVAL_MS) {
        const gift = rollJimmyGift();
        loaded.coins = (loaded.coins || 0) + gift.coins;
        loaded.opals = (loaded.opals || 0) + gift.opals;
        loaded.lastJimmyGift = now;
        if (!loaded.friends) loaded.friends = [];
        if (!loaded.friends.some(f => f.id === JIMMY_CHUBS_FRIEND.id)) {
          loaded.friends = [JIMMY_CHUBS_FRIEND, ...loaded.friends];
        }
        const giftMsg = gift.opals > 0
          ? `Jimmy & Chubs sent you ${gift.opals} opals!`
          : `Jimmy & Chubs sent you ${gift.coins} coins!`;
        timers.push(setTimeout(() => {
          setNotifications(prev => [{
            id: `jimmy-gift-${now}`,
            type: 'gift',
            icon: 'Gift',
            message: giftMsg,
            time: 'Just now',
            read: false,
          }, ...prev]);
        }, 800));
      }

      if (!loaded.friendCode) loaded.friendCode = generatePermanentFriendCode();
      setGameState(loaded);

      // Check for daily login bonus on app open.
      const today = getTodayDateString();
      if (loaded.lastLoginDate !== today && loaded.menuTutorialSeen !== false) {
        timers.push(setTimeout(() => {
          setShowDailyLogin(true);
        }, 1000));
      }
    } else {
      setGameState(getInitialGameState());
    }
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save game state — only once the player is actually in a session.
  // Guarding on user/isGuest/hasLocalSave prevents the bootstrapped
  // getInitialGameState() from being written to localStorage while the player
  // is still on the LoginScreen, which would cause a refresh to skip the
  // LoginScreen and drop them into guest mode.
  useEffect(() => {
    if (gameState && (user || isGuest || hasLocalSave)) {
      saveGameState(gameState);
    }
  }, [gameState, user, isGuest, hasLocalSave]);

  // ── Early returns ─────────────────────────────────────────────────────────

  // Password recovery — supersedes everything else. The session is valid
  // only for changing the password, so render only the reset surface.
  if (isRecovering) {
    return <ResetPasswordScreen />;
  }

  // COPPA age gate — must complete before anything else is shown
  if (!ageGateCompleted) {
    return (
      <AgeGateScreen
        onComplete={(under13) => {
          setIsUnder13(under13);
          setAgeGateCompleted(true);
        }}
        onParentSetup={() => {
          setIsUnder13(true);
          setAgeGateCompleted(true);
          setShowParentAuthFromAgeGate(true);
        }}
      />
    );
  }

  // Parent chose "Set Up Parent Account" from the age gate — show the login
  // screen immediately, before any game-state checks. Once the parent signs in
  // (user becomes non-null) this condition clears and the game loads normally.
  // Tapping "Back to game" shows the guest warning before allowing guest play.
  if (showParentAuthFromAgeGate && !user) {
    // "Back to game" was tapped — show the guest confirmation warning first.
    if (showGuestWarningFromParent) {
      return (
        <AgeGateScreen
          initialPhase="guest-confirm"
          onComplete={(under13) => {
            // Player confirmed guest — enter the game.
            setIsUnder13(under13);
            setShowGuestWarningFromParent(false);
            setShowParentAuthFromAgeGate(false);
          }}
          onParentSetup={() => {
            // Player changed their mind — go back to the LoginScreen.
            setShowGuestWarningFromParent(false);
          }}
        />
      );
    }

    // ParentGate (Apple 1.3 / 5.1.4): challenge before account creation
    // is reachable from the under-13 path.
    if (!parentGatePassed) {
      return (
        <ParentGate
          onPass={() => setParentGatePassed(true)}
          onCancel={() => setShowGuestWarningFromParent(true)}
        />
      );
    }

    return (
      <LoginScreen
        onClose={() => setShowGuestWarningFromParent(true)}
      />
    );
  }

  // Wait for Supabase auth to resolve before rendering
  if (authLoading) return null;

  // Truly new player: no local save, not signed in, hasn't chosen guest
  // Under-13 users are always in guest mode — never show LoginScreen
  if (!user && !isGuest && !hasLocalSave && !isUnder13) {
    return <LoginScreen />;
  }

  if (!gameState) return null;

  const _hasAnyEgg = !!(gameState.incubatorEgg || (gameState.nurseryEggs && gameState.nurseryEggs.length > 0));

  // ── No axolotl, no eggs → first-start or post-release ──
  if (!gameState.axolotl && !_hasAnyEgg) {
    if (showHatchingIntro) {
      return (
        <HatchingIntroScreen
          onComplete={(name) => {
            setShowHatchingIntro(false);
            handleStart(name);
          }}
        />
      );
    }
    return <WelcomeScreen onStart={() => setShowHatchingIntro(true)} />;
  }

  // ── Nursery hatch animation (any context) ──
  if (hatchingNurseryEggId) {
    const hatchingEgg =
      gameState.incubatorEgg?.id === hatchingNurseryEggId
        ? gameState.incubatorEgg
        : (gameState.nurseryEggs ?? []).find(e => e.id === hatchingNurseryEggId);
    return (
      <HatchingIntroScreen
        rarity={hatchingEgg?.rarity}
        onComplete={(name) => {
          handleHatchEgg(hatchingNurseryEggId, name);
          setHatchingNurseryEggId(null);
          setActiveModal(null);
          setShowEggsPanel(false);
          setShowHamburgerMenu(false);
          setCurrentScreen('home');
        }}
      />
    );
  }

  // ── No axolotl, but egg(s) are waiting (post-rebirth) → nursery screen ──
  if (!gameState.axolotl && _hasAnyEgg) {
    return (
      <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-0 sm:p-4">
        <div className="w-full h-full sm:max-h-[calc(100vh-2rem)] max-w-md relative" style={{ height: '100%', maxHeight: '100vh' }}>
          <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 rounded-none sm:rounded-[2rem] blur opacity-40 z-0" />
          <div className="relative z-10 bg-white rounded-none sm:rounded-[2rem] shadow-2xl border-0 sm:border border-white/60 overflow-hidden" style={{ height: '100%' }}>
            <EggsPanel
              onClose={() => {}}
              incubatorEgg={gameState.incubatorEgg}
              nurseryEggs={gameState.nurseryEggs || []}
              nurseryUnlockedSlots={gameState.nurseryUnlockedSlots ?? GAME_CONFIG.nurserySlotsOpen}
              axolotl={null}
              onHatch={(eggId) => handleHatchEgg(eggId, '')}
              onStartHatchAnimation={(eggId) => setHatchingNurseryEggId(eggId)}
              onMoveToIncubator={handleMoveToIncubator}
              onBoost={handleBoostEgg}
              onGift={handleGiftEgg}
              onDiscard={handleDiscardEgg}
              onUnlockSlot={handleUnlockNurserySlot}
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
    return <NamingScreen onComplete={handleNameAxolotl} />;
  }

  // All null-axolotl cases are handled above; this guard narrows TypeScript.
  if (!gameState.axolotl) return null;

  const { axolotl, coins, customization, friends, lineage } = gameState;
  const opals = gameState.opals || 0;
  const showRebirthButton = canRebirth(axolotl);

  // Calculate XP and level
  const currentLevel = calculateLevel(axolotl.experience);
  const nextLevelXP = getXPForNextLevel(currentLevel);
  const currentLevelXP = getCurrentLevelXP(axolotl.experience);

  return (
    <>
      <GameScreen
        gameState={gameState}
        setGameState={setGameState}
        axolotl={axolotl}
        isUnder13={isUnder13}
        coins={coins}
        opals={opals}
        customization={customization}
        friends={friends}
        lineage={lineage}
        showRebirthButton={showRebirthButton}
        currentLevel={currentLevel}
        currentLevelXP={currentLevelXP}
        nextLevelXP={nextLevelXP}
        syncStatus={syncStatus}
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        showHamburgerMenu={showHamburgerMenu}
        setShowHamburgerMenu={setShowHamburgerMenu}
        showXPBar={showXPBar}
        setShowXPBar={setShowXPBar}
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
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        shopSection={shopSection}
        setShopSection={setShopSection}
        activeGame={activeGame}
        setActiveGame={setActiveGame}
        tutorialLockMode={tutorialLockMode}
        lockedActionButtons={lockedActionButtons}
        tutorialAllowed={tutorialAllowed}
        swipeTutDoneRef={swipeTutDoneRef}
        mgTutPhase={mgTutPhase}
        setMgTutPhase={setMgTutPhase}
        showMenuTutorial={showMenuTutorial}
        setHatchingNurseryEggId={setHatchingNurseryEggId}
        notifications={notifications}
        setNotifications={setNotifications}
        hasPendingPokes={hasPendingPokes}
        setHasPendingPokes={setHasPendingPokes}
        unreadCount={unreadCount}
        hasNotifications={hasNotifications}
        setShowSpinWheel={setShowSpinWheel}
        setShowDailyLogin={setShowDailyLogin}
        playMode={playMode}
        setPlayMode={setPlayMode}
        cleaningMode={cleaningMode}
        setCleaningMode={setCleaningMode}
        setShowWaterChangeModal={setShowWaterChangeModal}
        onRegisterCenterAquarium={handleRegisterCenterAquarium}
        handleFeed={handleFeed}
        handleEatFood={handleEatFood}
        handlePlayTap={handlePlayTap}
        handleCleanPoop={handleCleanPoop}
        handleEquipDecoration={handleEquipDecoration}
        handleUpdateDecorationPosition={handleUpdateDecorationPosition}
        handleUpdateDecorationScale={handleUpdateDecorationScale}
        handleRemoveDecorationInstance={handleRemoveDecorationInstance}
        handleEquipFilter={handleEquipFilter}
        handleUseTreatmentFromInventory={handleUseTreatmentFromInventory}
        handleDeployShrimpFromInventory={handleDeployShrimpFromInventory}
        handleHatchEgg={handleHatchEgg}
        handleMoveToIncubator={handleMoveToIncubator}
        handleBoostEgg={handleBoostEgg}
        handleGiftEgg={handleGiftEgg}
        handleDiscardEgg={handleDiscardEgg}
        handleUnlockNurserySlot={handleUnlockNurserySlot}
        handleReleaseAxolotl={handleReleaseAxolotl}
        handleClaimAchievement={handleClaimAchievement}
        handleUnlockGames={handleUnlockGames}
        handleRefillEnergy={handleRefillEnergy}
        handleAddFriend={handleAddFriend}
      />

      <ModalManager
        gameState={gameState}
        setGameState={setGameState}
        axolotl={axolotl}
        coins={coins}
        opals={opals}
        friends={friends}
        lineage={lineage}
        showRebirthButton={showRebirthButton}
        user={user ?? null}
        isGuest={isGuest}
        isUnder13={isUnder13}
        signOut={signOut}
        deleteAccount={deleteAccount}
        onCenterAquarium={handleCenterAquarium}
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        showWaterChangeModal={showWaterChangeModal}
        setShowWaterChangeModal={setShowWaterChangeModal}
        showJimmyAquarium={showJimmyAquarium}
        setShowJimmyAquarium={setShowJimmyAquarium}
        showJuvenileUnlock={showJuvenileUnlock}
        setShowJuvenileUnlock={setShowJuvenileUnlock}
        showLevel7Unlock={showLevel7Unlock}
        setShowLevel7Unlock={setShowLevel7Unlock}
        showShrimpTutorialIntro={showShrimpTutorialIntro}
        setShowShrimpTutorialIntro={setShowShrimpTutorialIntro}
        showShrimpInfoModal={showShrimpInfoModal}
        setShowShrimpInfoModal={setShowShrimpInfoModal}
        shrimpTutorialShopPhase={shrimpTutorialShopPhase}
        setShrimpTutorialShopPhase={setShrimpTutorialShopPhase}
        showMenuTutorial={showMenuTutorial}
        showMenuTutorialPrompt={showMenuTutorialPrompt}
        onStartMenuTutorial={() => {
          // Close everything and return to the aquarium before starting the tour
          // so the overlay always begins from a clean home-screen state.
          setActiveModal(null);
          setShowHamburgerMenu(false);
          setCurrentScreen('home');
          setShowNotifPanel(false);
          setShowInventoryPanel(false);
          setShowEggsPanel(false);
          setShowAchievementsPanel(false);
          setShowHowToPlayPanel(false);
          handleStartMenuTutorial();
        }}
        showMenuTutorialComplete={showMenuTutorialComplete}
        setShowMenuTutorialComplete={setShowMenuTutorialComplete}
        showRebirthReady={showRebirthReady}
        setShowRebirthReady={setShowRebirthReady}
        conflictSaves={conflictSaves}
        setConflictSaves={setConflictSaves}
        onForcePushToCloud={forcePush}
        showAuthOverlay={showAuthOverlay}
        setShowAuthOverlay={setShowAuthOverlay}
        showSpinWheel={showSpinWheel}
        setShowSpinWheel={setShowSpinWheel}
        showDailyLogin={showDailyLogin}
        setShowDailyLogin={setShowDailyLogin}
        showHamburgerMenu={showHamburgerMenu}
        setShowHamburgerMenu={setShowHamburgerMenu}
        shopSection={shopSection}
        setShopSection={setShopSection}
        activeGame={activeGame}
        levelUpInfo={levelUpInfo}
        setLevelUpInfo={setLevelUpInfo}
        delayNextTutorial={delayNextTutorial}
        onWaterChange={handleWaterChange}
        onBuyCoins={handleBuyCoins}
        onBuyFilter={handleBuyFilter}
        onEquipFilter={handleEquipFilter}
        onBuyShrimp={handleBuyShrimp}
        onBuyTreatment={handleBuyTreatment}
        onStoreTreatment={handleStoreTreatment}
        onStoreShrimpInInventory={handleStoreShrimpInInventory}
        onBuyDecoration={handlePurchase}
        onEquipDecoration={handleEquipDecoration}
        onAddFriend={handleAddFriend}
        onRemoveFriend={handleRemoveFriend}
        onBreed={handleBreed}
        onGiftFriend={handleGiftFriend}
        onPokeFriend={handlePokeFriend}
        onRebirth={handleRebirth}
        onHatchEgg={handleHatchEgg}
        onMoveToIncubator={handleMoveToIncubator}
        onBoostEgg={handleBoostEgg}
        onGiftEgg={handleGiftEgg}
        onDiscardEgg={handleDiscardEgg}
        onUnlockNurserySlot={handleUnlockNurserySlot}
        onReleaseAxolotl={handleReleaseAxolotl}
        onMiniGameEnd={handleMiniGameEnd}
        onMiniGameApplyReward={handleMiniGameApplyReward}
        onDeductEnergy={handleDeductEnergy}
        onClaimAchievement={handleClaimAchievement}
        onUnlockGames={handleUnlockGames}
        onRefillEnergy={handleRefillEnergy}
        onSpinWheel={handleSpinWheel}
        onDailyLoginClaim={handleDailyLoginClaim}
      />
    </>
  );
}
