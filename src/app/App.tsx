import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Axolotl, Friend, FoodItem } from './types/game';
import { 
  generateAxolotl, 
  updateStats, 
  feedAxolotl, 
  playWithAxolotl, 
  cleanAquarium,
  checkEvolution,
  canRebirth,
  breedAxolotls,
  calculateLevel,
  getXPForNextLevel,
  getCurrentLevelXP,
  updateShrimp,
} from './utils/gameLogic';
import { createRebirthEgg, createBreedingEgg, hatchEgg, isEggReady } from './utils/eggs';
import { loadGameState, saveGameState, getInitialGameState, generateFriendCode } from './utils/storage';
import { BACKGROUND_COLORS, getDecorationById, DECORATIONS } from './data/decorations';
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
import { XPBar } from './components/XPBar';
import { FoodDisplay } from './components/FoodDisplay';
import { EggsPanel } from './components/EggsPanel';
import { DecorationsPanel } from './components/DecorationsPanel';
import { SpinWheel } from './components/SpinWheel';
import { DailyLoginBonus } from './components/DailyLoginBonus';
import { Coins, Sparkles, Menu, X, Check, ChevronDown, ShoppingCart, Gamepad2, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_NOTIFICATIONS, GameNotification } from './data/notifications';
import { KeepeyUpey } from './minigames/KeepeyUpey';
import { FlappyFishHooks } from './minigames/FlappyFishHooks';
import { MathRush } from './minigames/MathRush';
import { AxolotlStacker } from './minigames/AxolotlStacker';
import { CoralCode } from './minigames/CoralCode';
import { TreasureHuntCave } from './minigames/TreasureHuntCave';
import { Fishing } from './minigames/Fishing';
import { BiteTag } from './minigames/BiteTag';
import { GameResult } from './minigames/types';
import { useGameActions } from './hooks/useGameActions';
import { useMenuState } from './hooks/useMenuState';
import { getTodayDateString, calculateLoginStreak, canSpinToday, canClaimDailyLogin } from './utils/dailySystem';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [hasPendingPokes, setHasPendingPokes] = useState(true);
  const [notifications, setNotifications] = useState<GameNotification[]>(INITIAL_NOTIFICATIONS);
  const [notificationsExpanded, setNotificationsExpanded] = useState(true);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showDailyLogin, setShowDailyLogin] = useState(false);
  const [clickTarget, setClickTarget] = useState<{ x: number; y: number; timestamp: number } | null>(null);
  
  // Menu state from hook
  const menuState = useMenuState();
  const {
    activeModal,
    setActiveModal,
    showInfo,
    setShowInfo,
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
    decorationsTab,
    setDecorationsTab,
    currentScreen,
    setCurrentScreen,
    activeGame,
    setActiveGame,
    shopSection,
    setShopSection,
    closeAllPanels,
  } = menuState;
  
  // Game actions from hook
  const gameActions = useGameActions({
    gameState,
    setGameState,
    setNotifications,
    setActiveModal,
    setActiveGame,
    setCurrentScreen,
  });
  
  const {
    handleFeed,
    handleEatFood,
    handlePlay,
    handleClean,
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
  } = gameActions;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const aquariumScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const hasInitiallyScrolled = useRef(false);
  const isCenteringScroll = useRef(false);

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
      
      // Update energy and timestamp
      loaded.energy = Math.floor(newEnergy);
      loaded.lastEnergyUpdate = now;
      
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
  }, []);

  // Auto-save game state
  useEffect(() => {
    if (gameState) {
      saveGameState(gameState);
    }
  }, [gameState]);

  // Update stats periodically
  useEffect(() => {
    if (!gameState?.axolotl) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        if (!prev?.axolotl) return prev;
        
        // Update shrimp consumption first
        const stateWithUpdatedShrimp = updateShrimp(prev);
        
        // Update stats (pass gameState for shrimp effects)
        const statsResult = updateStats(prev.axolotl, stateWithUpdatedShrimp);
        let updated = checkEvolution(statsResult.axolotl);
        
        // Merge any gameState updates (like cleanlinessLowSince)
        const gameStateUpdates = statsResult.gameState || {};

        // Energy regen using timestamp-based calculation to preserve fractional energy
        const now = Date.now();
        const lastUpdate = stateWithUpdatedShrimp.lastEnergyUpdate || now;
        const elapsedSeconds = (now - lastUpdate) / 1000;
        
        const energyRegenRate = GAME_CONFIG.energyRegenRate / 3600; // per second
        const maxEnergy = stateWithUpdatedShrimp.maxEnergy || GAME_CONFIG.energyMax;
        const currentEnergy = stateWithUpdatedShrimp.energy || 0;
        
        // Calculate new energy with fractional precision
        const energyGained = energyRegenRate * elapsedSeconds;
        const newEnergy = Math.min(maxEnergy, currentEnergy + energyGained);
        
        // Only floor when storing (for display), but track fractional progress via timestamp
        // This ensures energy accumulates properly even with small increments

        return {
          ...stateWithUpdatedShrimp,
          ...gameStateUpdates, // Merge cleanlinessLowSince and any other gameState updates
          axolotl: updated,
          energy: Math.floor(newEnergy), // Floor only for display/storage
          maxEnergy: maxEnergy,
          lastEnergyUpdate: now, // Update timestamp to track fractional progress
        };
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [gameState?.axolotl?.id]);

  const handleStart = useCallback((name: string) => {
    const newAxolotl = generateAxolotl(name);
    setGameState(prev => ({
      ...(prev || getInitialGameState()),
      axolotl: newAxolotl,
    }));
  }, []);

  const handleSpinWheel = useCallback((reward: { type: 'coins' | 'opals'; amount: number }) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const today = getTodayDateString();
      const newCoins = reward.type === 'coins' ? prev.coins + reward.amount : prev.coins;
      const newOpals = reward.type === 'opals' ? (prev.opals || 0) + reward.amount : prev.opals;
      
      setNotifications(prevNotifs => [...prevNotifs, {
        id: `notif-${Date.now()}`,
        type: 'milestone',
        emoji: reward.type === 'opals' ? '🪬' : '🪙',
        message: `Won ${reward.amount} ${reward.type === 'opals' ? 'Opals' : 'Coins'} from spin wheel!`,
        time: 'now',
        read: false,
      }]);
      
      return {
        ...prev,
        coins: newCoins,
        opals: newOpals,
        lastSpinDate: today,
      };
    });
  }, []);

  const handleDailyLoginClaim = useCallback((reward: { coins: number; opals?: number; decoration?: string }) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      const today = getTodayDateString();
      const { streak: newStreak } = calculateLoginStreak(prev.lastLoginDate, prev.loginStreak || 0);
      
      const newCoins = prev.coins + reward.coins;
      const newOpals = (prev.opals || 0) + (reward.opals || 0);
      const newUnlockedDecorations = reward.decoration 
        ? [...prev.unlockedDecorations, reward.decoration]
        : prev.unlockedDecorations;
      
      setNotifications(prevNotifs => [...prevNotifs, {
        id: `notif-${Date.now()}`,
        type: 'milestone',
        emoji: '🎁',
        message: `Daily login bonus: ${reward.coins} coins${reward.opals ? ` + ${reward.opals} opals` : ''}!`,
        time: 'now',
        read: false,
      }]);
      
      return {
        ...prev,
        coins: newCoins,
        opals: newOpals,
        lastLoginDate: today,
        lastLoginBonusDate: today,
        loginStreak: newStreak,
        unlockedDecorations: newUnlockedDecorations,
      };
    });
  }, []);

  // All other handlers are now in useGameActions hook

  // Show welcome screen if no axolotl
  if (!gameState || !gameState.axolotl) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  const { axolotl, coins, unlockedDecorations, customization, friends, lineage } = gameState;
  const opals = gameState.opals || 0; // Default to 0 if not set
  const showRebirthButton = axolotl ? canRebirth(axolotl) : false;
  const unreadCount = notifications.filter(n => !n.read).length;
  const hasNotifications = unreadCount > 0 || hasPendingPokes;

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
                <div className="flex items-center gap-2">
                  {/* Level badge — filled XP bar pill */}
                  <motion.button
                    onClick={() => setShowXPBar(!showXPBar)}
                    className="relative flex-shrink-0 rounded-lg overflow-hidden border border-white/30 backdrop-blur-sm"
                    style={{ width: 70, height: 27.5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Track */}
                    <div className="absolute inset-0 bg-white/15" />
                    {/* Fill */}
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-400/80 via-cyan-400/80 to-sky-400/80 transition-all duration-700"
                      style={{ width: `${(currentLevelXP / nextLevelXP) * 100}%` }}
                    />
                    {/* Shimmer */}
                    <motion.div
                      className="absolute inset-y-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                      style={{ width: '40%' }}
                    />
                    {/* Label */}
                    <span className="absolute inset-0 flex items-center justify-center text-white font-black tracking-tight drop-shadow-[0_0_4px_rgba(0,0,0,0.4)]" style={{ fontSize: '12.5px' }}>
                      Lv.{currentLevel}
                    </span>
                  </motion.button>

                  {/* Axolotl Name */}
                  <h1 className="font-bold text-white tracking-tight truncate flex-1 min-w-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" style={{ fontSize: '20px' }}>{axolotl.name}</h1>

                  {/* Compact currency counters */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <motion.button
                      onClick={() => { setShopSection('opals'); setActiveModal('shop'); }}
                      className="flex items-center gap-0.5 bg-white/15 backdrop-blur-sm rounded-md border border-white/20 hover:bg-white/25 transition-colors cursor-pointer"
                      style={{ padding: '0.15625rem 0.46875rem' }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Sparkles className="text-cyan-200" style={{ width: '15px', height: '15px' }} strokeWidth={2.5} />
                      <span className="text-white font-semibold tabular-nums" style={{ fontSize: '13.75px' }}>{opals}</span>
                    </motion.button>
                    <motion.button
                      onClick={() => { setShopSection('coins'); setActiveModal('shop'); }}
                      className="flex items-center gap-0.5 bg-white/15 backdrop-blur-sm rounded-md border border-white/20 hover:bg-white/25 transition-colors cursor-pointer"
                      style={{ padding: '0.15625rem 0.46875rem' }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Coins className="text-amber-200" style={{ width: '15px', height: '15px' }} strokeWidth={2.5} />
                      <span className="text-white font-semibold tabular-nums" style={{ fontSize: '13.75px' }}>{coins}</span>
                    </motion.button>
                  </div>
                  
                  {/* Hamburger Menu Button */}
                  <motion.button
                    ref={menuButtonRef}
                    onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
                    className="relative bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all border border-white/30 flex-shrink-0"
                    style={{ padding: '0.46875rem' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Menu"
                  >
                    {showHamburgerMenu ? (
                      <X className="text-white" style={{ width: '20px', height: '20px' }} strokeWidth={2.5} />
                    ) : (
                      <Menu className="text-white" style={{ width: '20px', height: '20px' }} strokeWidth={2.5} />
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
                <div className="flex justify-between items-center mt-1 gap-3">
                  <motion.button
                    onClick={() => { setCurrentScreen('home'); setShowHamburgerMenu(false); }}
                    className="relative bg-white/[0.02] backdrop-blur-md border-2 border-white/50 rounded-xl active:bg-white/15 transition-all flex-1 overflow-hidden"
                    style={{ 
                      padding: '5.6px',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    whileTap={{ scale: 0.93 }}
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, delay: 3 }}
                    title="Home"
                  >
                    {/* Glass highlight effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none rounded-xl" />
                    {/* Inner border for glass depth */}
                    <div className="absolute inset-[2px] border border-white/20 rounded-lg pointer-events-none" />
                    <Home className="relative z-10 text-white mx-auto drop-shadow-lg" style={{ width: '40px', height: '40px' }} strokeWidth={2.5} />
                  </motion.button>
                  <motion.button
                    onClick={() => setCurrentScreen('games')}
                    className={`relative bg-white/[0.02] backdrop-blur-md border-2 border-white/50 rounded-xl active:bg-white/15 transition-all flex-1 overflow-hidden ${currentScreen === 'games' ? 'opacity-60' : ''}`}
                    style={{ 
                      padding: '8.4px',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    whileTap={{ scale: 0.93 }}
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    title="Mini Games"
                  >
                    {/* Glass highlight effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none rounded-xl" />
                    {/* Inner border for glass depth */}
                    <div className="absolute inset-[2px] border border-white/20 rounded-lg pointer-events-none" />
                    <Gamepad2 className="relative z-10 text-white mx-auto drop-shadow-lg" style={{ width: '40px', height: '40px' }} strokeWidth={2.5} />
                  </motion.button>
                  <motion.button
                    onClick={() => setActiveModal('shop')}
                    className="relative bg-white/[0.02] backdrop-blur-md border-2 border-white/50 rounded-xl active:bg-white/15 transition-all flex-1 overflow-hidden"
                    style={{ 
                      padding: '5.6px',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    whileTap={{ scale: 0.93 }}
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, delay: 1.5 }}
                    title="Shop"
                  >
                    {/* Glass highlight effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none rounded-xl" />
                    {/* Inner border for glass depth */}
                    <div className="absolute inset-[2px] border border-white/20 rounded-lg pointer-events-none" />
                    <ShoppingCart className="relative z-10 text-white mx-auto drop-shadow-lg" style={{ width: '40px', height: '40px' }} strokeWidth={2.5} />
                  </motion.button>
                </div>
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
                            fontSize: '1.65rem',
                            lineHeight: 1,
                            background: 'linear-gradient(110deg, #7c3aed 0%, #0ea5e9 55%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          Axopedia
                        </h2>
                        <p className="text-indigo-400/70 text-[10px] tracking-widest uppercase mt-0.5 font-semibold">Your aquatic universe</p>
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
                        {/* Close button */}
                        <motion.button
                          onClick={() => { setShowHamburgerMenu(false); setShowNotifPanel(false); setShowHowToPlayPanel(false); setShowInventoryPanel(false); setShowEggsPanel(false); }}
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
                    <div className="flex-1 overflow-y-auto overscroll-contain px-3.5 py-3.5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                      <div className="grid grid-cols-2 gap-2.5">

                        {/* DECORATIONS */}
                        <motion.button
                          onClick={() => { setShowInventoryPanel(true); setDecorationsTab('store'); }}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
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

                        {/* EGGS */}
                        <motion.button
                          onClick={() => setShowEggsPanel(true)}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
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

                        {/* SPIN WHEEL */}
                        <motion.button
                          onClick={() => setShowSpinWheel(true)}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
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
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
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
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.75) 0%, rgba(2,132,199,0.6) 100%)', border: '1px solid rgba(2,132,199,0.45)' }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">📊</span>
                          <span className="text-[11px] font-bold text-sky-800 tracking-wider uppercase">Stats</span>
                        </motion.button>

                        {/* SOCIAL */}
                        <motion.button
                          onClick={() => { setActiveModal('social'); setShowHamburgerMenu(false); setShowNotifPanel(false); setHasPendingPokes(false); }}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
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

                        {/* HOW TO PLAY */}
                        <motion.button
                          onClick={() => setShowHowToPlayPanel(true)}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
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

                        {/* SETTINGS */}
                        <motion.button
                          onClick={() => { setActiveModal('settings'); setShowHamburgerMenu(false); setShowNotifPanel(false); }}
                          className="group relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, rgba(100,116,139,0.75) 0%, rgba(71,85,105,0.6) 100%)', border: '1px solid rgba(71,85,105,0.45)' }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[2rem]">⚙️</span>
                          <span className="text-[11px] font-bold text-slate-700 tracking-wider uppercase">Settings</span>
                        </motion.button>

                        {/* REBIRTH — full-width when available */}
                        {showRebirthButton && (
                          <motion.button
                            onClick={() => { setActiveModal('rebirth'); setShowHamburgerMenu(false); setShowNotifPanel(false); }}
                            className="col-span-2 group relative flex flex-row items-center justify-center gap-3 py-4 rounded-2xl overflow-hidden"
                            style={{ background: 'linear-gradient(110deg, rgba(233,213,255,0.88) 0%, rgba(216,180,254,0.82) 35%, rgba(251,207,232,0.82) 70%, rgba(253,186,116,0.75) 100%)', border: '1px solid rgba(192,132,252,0.5)' }}
                            whileTap={{ scale: 0.96 }}
                          >
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                              animate={{ x: ['-100%', '180%'] }}
                              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
                              style={{ width: '40%' }}
                            />
                            <span className="text-[2rem]">✨</span>
                            <div className="flex flex-col items-start">
                              <span className="text-[13px] font-black text-violet-700 tracking-wider uppercase">Rebirth Available</span>
                              <span className="text-[9px] text-violet-500/80 font-medium">Start a new generation</span>
                            </div>
                          </motion.button>
                        )}
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
                        // Use timestamp to ensure each click is unique and triggers movement
                        setClickTarget({ x: clampedX, y: clampedY, timestamp: Date.now() });
                      }}
                    >
                      <AquariumBackground
                        background={customization.background}
                        decorations={customization.decorations}
                      />
                      {/* Food Items */}
                      {(gameState.foodItems || []).map(food => (
                        <FoodDisplay key={food.id} food={food} />
                      ))}
                      
                      {/* Axolotl */}
                      <div className="absolute inset-0 z-10 pointer-events-none">
                        <AxolotlDisplay 
                          axolotl={axolotl} 
                          foodItems={gameState.foodItems || []}
                          onEatFood={handleEatFood}
                          clickTarget={clickTarget}
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

                  {/* Floating Action Buttons */}
                  <div className="absolute bottom-0 left-0 right-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    {/* Gradient fade behind buttons */}
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/50 via-purple-900/20 to-transparent pointer-events-none" />
                    <div className="relative px-2">
                      <ActionButtons
                        onFeed={handleFeed}
                        onPlay={handlePlay}
                        onClean={handleClean}
                        onWaterChange={handleWaterChange}
                        onRebirth={() => setActiveModal('rebirth')}
                        canRebirth={showRebirthButton}
                        isHungerFull={axolotl.stats.hunger >= 100}
                        stats={axolotl.stats}
                      />
                    </div>
                  </div>
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
                  onSelectGame={(gameId) => {
                    if (!gameState) return;
                    
                    // Store whether energy was available when game started
                    const hadEnergyAtStart = gameState.energy > 0;
                    
                    // Deduct energy when game starts (only if energy > 0)
                    setGameState(prev => {
                      if (!prev || prev.energy <= 0) return prev;
                      
                      // Calculate current energy with fractional precision before deducting
                      const now = Date.now();
                      const lastUpdate = prev.lastEnergyUpdate || now;
                      const elapsedSeconds = (now - lastUpdate) / 1000;
                      const energyRegenRate = GAME_CONFIG.energyRegenRate / 3600; // per second
                      const maxEnergy = prev.maxEnergy || GAME_CONFIG.energyMax;
                      const currentEnergy = prev.energy || 0;
                      const energyGained = energyRegenRate * elapsedSeconds;
                      const energyBeforeDeduction = Math.min(maxEnergy, currentEnergy + energyGained);
                      
                      return {
                        ...prev,
                        energy: Math.max(0, Math.floor(energyBeforeDeduction) - 1),
                        lastEnergyUpdate: now, // Update timestamp after energy consumption
                        // Store flag to track if energy was used (for reward calculation)
                        _lastGameHadEnergy: true,
                      };
                    });
                    
                    // If no energy, still set flag to false
                    if (!hadEnergyAtStart) {
                      setGameState(prev => prev ? { ...prev, _lastGameHadEnergy: false } : prev);
                    }
                    
                    // Start the game - change screen to hide menu
                    setActiveGame(gameId);
                    setCurrentScreen('home'); // Hide games menu when game starts
                  }}
                  energy={gameState.energy}
                  maxEnergy={gameState.maxEnergy}
                  lastEnergyUpdate={gameState.lastEnergyUpdate}
                />
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'shop' && (
        <ShopModal
          onClose={() => { setActiveModal(null); setShopSection(null); }}
          coins={coins}
          opals={opals}
          unlockedDecorations={unlockedDecorations}
          onPurchase={handlePurchase}
          onEquip={handleEquipDecoration}
          equippedDecorations={customization.decorations}
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
          lineage={lineage}
        />
      )}

      {activeModal === 'rebirth' && showRebirthButton && (
        <RebirthModal
          onClose={() => setActiveModal(null)}
          onConfirm={handleRebirth}
          currentAxolotl={axolotl}
        />
      )}

      {activeModal === 'stats' && (
        <StatsModal
          onClose={() => setActiveModal(null)}
          stats={axolotl.secondaryStats}
          name={axolotl.name}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          onClose={() => setActiveModal(null)}
          onResetGame={() => {
            localStorage.clear();
            setGameState(null);
          }}
        />
      )}

      {/* Mini-Games */}
      <AnimatePresence>
        {activeGame === 'keepey-upey' && gameState && (
          <KeepeyUpey
            onEnd={handleMiniGameEnd}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'fish-hooks' && gameState && (
          <FlappyFishHooks
            onEnd={handleMiniGameEnd}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'math-rush' && gameState && (
          <MathRush
            onEnd={handleMiniGameEnd}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'axolotl-stacker' && gameState && (
          <AxolotlStacker
            onEnd={handleMiniGameEnd}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'coral-code' && gameState && (
          <CoralCode
            onEnd={handleMiniGameEnd}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'treasure-hunt' && gameState && (
          <TreasureHuntCave
            onEnd={handleMiniGameEnd}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'fishing' && gameState && (
          <Fishing
            onEnd={handleMiniGameEnd}
            energy={gameState.energy}
            strength={gameState.axolotl?.secondaryStats?.strength || 0}
            speed={gameState.axolotl?.secondaryStats?.speed || 0}
          />
        )}
        {activeGame === 'bite-tag' && gameState && (
          <BiteTag
            onEnd={handleMiniGameEnd}
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