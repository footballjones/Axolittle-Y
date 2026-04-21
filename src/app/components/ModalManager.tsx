/**
 * ModalManager — owns all modal/overlay rendering for the main game.
 *
 * Extracted from App.tsx to reduce its size. This component is purely a
 * rendering concern: all state and handlers are owned by App.tsx and passed
 * in as props. No game logic lives here.
 */

import React from 'react';
import type { User } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'motion/react';

import { GameState, Axolotl, Friend, SecondaryStats } from '../types/game';
import { GameResult } from '../minigames/types';
import { generatePermanentFriendCode } from '../utils/storage';
import { canSpinToday, canClaimDailyLogin } from '../utils/dailySystem';

// Modals
import { WaterChangeModal } from './WaterChangeModal';
import { ShopModal } from './ShopModal';
import { SocialModal } from './SocialModal';
import { JimmyChubsAquarium } from './JimmyChubsAquarium';
import { RebirthModal } from './RebirthModal';
import { StatsModal } from './StatsModal';
import { SettingsModal } from './SettingsModal';
import { LoginScreen } from './LoginScreen';
import { SyncConflictModal } from './SyncConflictModal';
import { WellbeingIntroModal } from './WellbeingIntroModal';
import { WellbeingCompleteModal } from './WellbeingCompleteModal';
import { MenuTutorialOverlay } from './MenuTutorialOverlay';
import { MenuTutorialPrompt } from './MenuTutorialPrompt';
import { MenuTutorialCompleteModal } from './MenuTutorialCompleteModal';
import { JuvenileUnlockModal } from './JuvenileUnlockModal';
import { Level7UnlockModal } from './Level7UnlockModal';
import { ShrimpTutorialIntroModal, ShrimpInfoModal } from './ShrimpTutorialModal';
import { RebirthReadyModal } from './RebirthReadyModal';
import { LevelUpOverlay } from './LevelUpOverlay';
import { SpinWheel } from './SpinWheel';
import { DailyLoginBonus } from './DailyLoginBonus';

// Mini-games
import { KeepeyUpey } from '../minigames/KeepeyUpey';
import { FlappyFishHooks } from '../minigames/FlappyFishHooks';
import { MathRush } from '../minigames/MathRush';
import { AxolotlStacker } from '../minigames/AxolotlStacker';
import { CoralCode } from '../minigames/CoralCode';
import { TreasureHuntCave } from '../minigames/TreasureHuntCave';
import { Fishing } from '../minigames/Fishing';
import { BiteTag } from '../minigames/BiteTag';
import { TideTiles } from '../minigames/TideTiles';
import { BubbleLineUp } from '../minigames/BubbleLineUp';

// ── Prop types ────────────────────────────────────────────────────────────────

export interface ModalManagerProps {
  // Core game state
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  axolotl: Axolotl;
  coins: number;
  opals: number;
  friends: Friend[];
  lineage: Axolotl[];
  showRebirthButton: boolean;

  // Auth
  user: User | null;
  isGuest: boolean;
  isUnder13?: boolean;
  signOut: () => Promise<void>;

  // Aquarium scroll centering (used by WellbeingIntroModal)
  onCenterAquarium: () => void;

  // ── Modal visibility state ───────────────────────────────────────────────
  activeModal: 'shop' | 'social' | 'rebirth' | 'stats' | 'settings' | null;
  setActiveModal: (modal: 'shop' | 'social' | 'rebirth' | 'stats' | 'settings' | null) => void;
  showWaterChangeModal: boolean;
  setShowWaterChangeModal: (v: boolean) => void;
  showJimmyAquarium: boolean;
  setShowJimmyAquarium: (v: boolean) => void;
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
  showMenuTutorialPrompt: boolean;
  onStartMenuTutorial: () => void;
  showMenuTutorialComplete: boolean;
  setShowMenuTutorialComplete: (v: boolean) => void;
  showRebirthReady: boolean;
  setShowRebirthReady: (v: boolean) => void;
  conflictSaves: { local: GameState; cloud: GameState } | null;
  setConflictSaves: (v: { local: GameState; cloud: GameState } | null) => void;
  onForcePushToCloud: (state: GameState) => void;
  showAuthOverlay: boolean;
  setShowAuthOverlay: (v: boolean) => void;
  showSpinWheel: boolean;
  setShowSpinWheel: (v: boolean) => void;
  showDailyLogin: boolean;
  setShowDailyLogin: (v: boolean) => void;
  showHamburgerMenu: boolean;
  setShowHamburgerMenu: (v: boolean) => void;
  shopSection: 'coins' | 'opals' | 'wellbeing' | null;
  setShopSection: (v: 'coins' | 'opals' | 'wellbeing' | null) => void;
  activeGame: string | null;
  levelUpInfo: { level: number } | null;
  setLevelUpInfo: (v: { level: number } | null) => void;

  // Tutorial helpers
  delayNextTutorial: (ms: number) => void;

  // ── Game action handlers ─────────────────────────────────────────────────
  onWaterChange: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBuyCoins: (pack: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBuyFilter: (filter: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEquipFilter: (filterId: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBuyShrimp: (pack: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBuyTreatment: (treatment: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onStoreTreatment: (treatment: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onStoreShrimpInInventory: (pack: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBuyDecoration: (id: any) => void;
  onEquipDecoration: (decorationId: string) => void;
  onAddFriend: (code: string) => Promise<string | null>;
  onRemoveFriend: (friendId: string) => void;
  onBreed: (friendId: string) => void;
  onGiftFriend: (friendId: string, coins: number, opals: number) => void;
  onPokeFriend: (friendId: string) => void;
  onRebirth: () => void;
  onHatchEgg: (eggId: string, name: string) => void;
  onMoveToIncubator: (eggId: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBoostEgg: (eggId: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGiftEgg: (eggId: any, friendId: any) => void;
  onDiscardEgg: (eggId: string) => void;
  onUnlockNurserySlot: () => void;
  onReleaseAxolotl: () => void;
  onMiniGameEnd: (result: GameResult) => void;
  onMiniGameApplyReward: (coins: number, opals?: number) => void;
  onDeductEnergy: () => void;
  onClaimAchievement: (achievementId: string) => void;
  onUnlockGames: () => void;
  onRefillEnergy: () => void;
  onSpinWheel: (reward: { type: 'coins' | 'opals'; amount: number }) => void;
  onDailyLoginClaim: (reward: { coins: number; opals?: number; decoration?: string }) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ModalManager({
  gameState,
  setGameState,
  axolotl,
  coins,
  opals,
  friends,
  lineage,
  showRebirthButton,
  user,
  isGuest,
  isUnder13 = false,
  signOut,
  onCenterAquarium,
  activeModal,
  setActiveModal,
  showWaterChangeModal,
  setShowWaterChangeModal,
  showJimmyAquarium,
  setShowJimmyAquarium,
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
  onStartMenuTutorial,
  showMenuTutorialComplete,
  setShowMenuTutorialComplete,
  showRebirthReady,
  setShowRebirthReady,
  conflictSaves,
  setConflictSaves,
  onForcePushToCloud,
  showAuthOverlay,
  setShowAuthOverlay,
  showSpinWheel,
  setShowSpinWheel,
  showDailyLogin,
  setShowDailyLogin,
  showHamburgerMenu: _showHamburgerMenu,
  setShowHamburgerMenu,
  shopSection,
  setShopSection,
  activeGame,
  levelUpInfo,
  setLevelUpInfo,
  delayNextTutorial,
  onWaterChange,
  onBuyCoins,
  onBuyFilter,
  onEquipFilter,
  onBuyShrimp,
  onBuyTreatment,
  onStoreTreatment,
  onStoreShrimpInInventory,
  onBuyDecoration,
  onEquipDecoration,
  onAddFriend,
  onRemoveFriend,
  onBreed,
  onGiftFriend,
  onPokeFriend,
  onRebirth,
  onMiniGameEnd,
  onMiniGameApplyReward,
  onDeductEnergy,
  onClaimAchievement: _onClaimAchievement,
  onUnlockGames,
  onRefillEnergy,
  onSpinWheel,
  onDailyLoginClaim,
}: ModalManagerProps) {
  return (
    <>
      {/* Water Change Confirmation Modal */}
      {showWaterChangeModal && (
        <WaterChangeModal
          onClose={() => setShowWaterChangeModal(false)}
          onConfirm={onWaterChange}
          coins={coins}
        />
      )}

      {/* ── activeModal slots ── */}
      {activeModal === 'shop' && (
        <ShopModal
          onClose={() => { setActiveModal(null); setShopSection(null); }}
          coins={coins}
          opals={opals}
          onBuyCoins={onBuyCoins}
          onBuyFilter={onBuyFilter}
          onEquipFilter={onEquipFilter}
          onBuyShrimp={(pack) => {
            onBuyShrimp(pack);
            if (shrimpTutorialShopPhase === 'buy') {
              setShrimpTutorialShopPhase(false);
              setActiveModal(null);
              setShowShrimpInfoModal(true);
            }
          }}
          highlightShrimpInfo={shrimpTutorialShopPhase === 'info'}
          onShrimpInfoRead={() => setShrimpTutorialShopPhase('buy')}
          onBuyTreatment={onBuyTreatment}
          initialSection={shopSection}
          highlightShrimp={shrimpTutorialShopPhase === 'buy'}
          ownedFilters={gameState?.ownedFilters ?? (gameState?.filterTier ? [gameState.filterTier] : [])}
          equippedFilter={gameState?.equippedFilter ?? gameState?.filterTier}
          ownedDecos={gameState?.unlockedDecorations ?? []}
          equippedDecos={gameState?.customization?.decorations?.map(d => d.decorationId) ?? []}
          activeBackground={gameState?.customization?.backgroundId ?? ''}
          onBuyDecoration={onBuyDecoration}
          onEquipDecoration={onEquipDecoration}
          onStoreTreatment={onStoreTreatment}
          onStoreShrimpInInventory={(pack) => {
            onStoreShrimpInInventory(pack);
            if (shrimpTutorialShopPhase === 'buy') {
              setShrimpTutorialShopPhase(false);
              setActiveModal(null);
              setShowShrimpInfoModal(true);
            }
          }}
        />
      )}

      {activeModal === 'social' && (
        <SocialModal
          onClose={() => setActiveModal(null)}
          axolotl={axolotl}
          friendCode={gameState.friendCode ?? ''}
          friends={friends}
          onAddFriend={onAddFriend}
          onRemoveFriend={onRemoveFriend}
          onBreed={onBreed}
          onGiftFriend={onGiftFriend}
          onPokeFriend={onPokeFriend}
          onVisitJimmy={() => {
            setActiveModal(null);
            setShowJimmyAquarium(true);
          }}
          lineage={lineage}
          isUnder13={isUnder13}
        />
      )}

      {/* Jimmy & Chubs aquarium */}
      <AnimatePresence>
        {showJimmyAquarium && (
          <motion.div
            key="jimmy-aquarium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          >
            <JimmyChubsAquarium onBack={() => setShowJimmyAquarium(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {activeModal === 'rebirth' && showRebirthButton && (
        <RebirthModal
          onClose={() => setActiveModal(null)}
          onConfirm={onRebirth}
          currentAxolotl={axolotl}
        />
      )}

      {activeModal === 'stats' && (
        <StatsModal
          onClose={() => setActiveModal(null)}
          stats={axolotl.secondaryStats}
          name={axolotl.name}
          pendingPoints={gameState?.pendingStatPoints ?? 0}
          onAllocateStat={(stat: keyof SecondaryStats) => {
            setGameState(prev => {
              if (!prev?.axolotl) return prev;
              if ((prev.pendingStatPoints ?? 0) <= 0) return prev;
              const updatedStats = {
                ...prev.axolotl.secondaryStats,
                [stat]: Math.min(100, prev.axolotl.secondaryStats[stat] + 1),
              };
              const remaining = (prev.pendingStatPoints ?? 0) - 1;
              if (remaining === 0) setTimeout(() => setActiveModal(null), 300);
              return {
                ...prev,
                pendingStatPoints: remaining,
                axolotl: { ...prev.axolotl, secondaryStats: updatedStats },
              };
            });
          }}
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
          soundEffectsEnabled={gameState?.soundEnabled !== false}
          onSoundToggle={(enabled) => {
            setGameState(prev => prev ? { ...prev, soundEnabled: enabled } : null);
          }}
          username={user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? null}
          isGuest={isGuest || !user}
          isUnder13={isUnder13}
          onSignOut={async () => {
            await signOut();
            setActiveModal(null);
          }}
          onSignIn={() => {
            setActiveModal(null);
            setShowAuthOverlay(true);
          }}
        />
      )}

      {/* In-game sign-in overlay */}
      {showAuthOverlay && (
        <LoginScreen onClose={() => setShowAuthOverlay(false)} />
      )}

      {/* Cloud save conflict resolution */}
      {conflictSaves && (
        <SyncConflictModal
          localState={conflictSaves.local}
          cloudState={conflictSaves.cloud}
          onKeepLocal={() => {
            if (conflictSaves?.local) onForcePushToCloud(conflictSaves.local);
            setConflictSaves(null);
          }}
          onUseCloud={() => {
            let state = conflictSaves.cloud;
            if (!state.friendCode) state = { ...state, friendCode: generatePermanentFriendCode() };
            setGameState(state);
            setConflictSaves(null);
          }}
        />
      )}

      {/* Wellbeing intro modal */}
      <AnimatePresence>
        {gameState?.wellbeingIntroSeen === false &&
          gameState?.tutorialStep === 'feed' &&
          gameState?.axolotl && (
          <WellbeingIntroModal
            axolotlName={gameState.axolotl.name}
            onStart={() => {
              onCenterAquarium();
              setGameState(s => s ? { ...s, wellbeingIntroSeen: true } : s);
            }}
          />
        )}
      </AnimatePresence>

      {/* Wellbeing completion modal — grants 5 opals */}
      <AnimatePresence>
        {gameState?.waterTutorialSeen === true &&
          gameState?.wellbeingCompleteSeen === false &&
          gameState?.axolotl && (
          <WellbeingCompleteModal
            axolotlName={gameState.axolotl.name}
            onCollect={() =>
              setGameState(s =>
                s ? { ...s, wellbeingCompleteSeen: true, opals: (s.opals ?? 0) + 5 } : s
              )
            }
          />
        )}
      </AnimatePresence>

      {/* Menu tutorial prompt — shown on aquarium whenever tour is pending */}
      <AnimatePresence>
        {showMenuTutorialPrompt && !showMenuTutorial && (
          <MenuTutorialPrompt onStart={onStartMenuTutorial} />
        )}
      </AnimatePresence>

      {/* Menu tutorial overlay */}
      {showMenuTutorial && (
        <MenuTutorialOverlay
          menuOpen={_showHamburgerMenu}
          onOpenMenu={() => setShowHamburgerMenu(true)}
          onComplete={() => {
            setShowMenuTutorialComplete(true);
          }}
        />
      )}

      {/* Menu tutorial completion modal — grants 10 opals */}
      <AnimatePresence>
        {showMenuTutorialComplete && (
          <MenuTutorialCompleteModal
            onCollect={() => {
              setShowMenuTutorialComplete(false);
              setGameState(s =>
                s ? { ...s, menuTutorialSeen: true, opals: (s.opals ?? 0) + 10 } : s
              );
              delayNextTutorial(1500);
            }}
          />
        )}
      </AnimatePresence>

      {/* Juvenile stage unlock modal */}
      <AnimatePresence>
        {showJuvenileUnlock && gameState?.axolotl && (
          <JuvenileUnlockModal
            axolotlName={gameState.axolotl.name}
            onClose={() => {
              setShowJuvenileUnlock(false);
              setGameState(s => s ? { ...s, juvenileUnlockSeen: true } : s);
            }}
          />
        )}
      </AnimatePresence>

      {/* Level 7 games unlock modal */}
      <AnimatePresence>
        {showLevel7Unlock && (
          <Level7UnlockModal
            onClose={() => {
              setShowLevel7Unlock(false);
              setGameState(s => s ? { ...s, level7UnlockSeen: true } : s);
            }}
          />
        )}
      </AnimatePresence>

      {/* Level 11 — Ghost Shrimp tutorial intro (grants 10 opals) */}
      <AnimatePresence>
        {showShrimpTutorialIntro && (
          <ShrimpTutorialIntroModal
            onOpenShop={() => {
              setShowShrimpTutorialIntro(false);
              setShrimpTutorialShopPhase('info');
              setShopSection('wellbeing');
              setActiveModal('shop');
            }}
          />
        )}
      </AnimatePresence>

      {/* Level 11 — Ghost Shrimp info popup (shown after first purchase) */}
      <AnimatePresence>
        {showShrimpInfoModal && (
          <ShrimpInfoModal
            onClose={() => {
              setShowShrimpInfoModal(false);
              setGameState(s => s ? { ...s, shrimpTutorialSeen: true } : s);
            }}
          />
        )}
      </AnimatePresence>

      {/* Level-up fanfare overlay */}
      <AnimatePresence>
        {levelUpInfo && (
          <LevelUpOverlay
            key={levelUpInfo.level}
            level={levelUpInfo.level}
            onAssignStat={() => {
              setLevelUpInfo(null);
              setActiveModal('stats');
              setShowHamburgerMenu(false);
            }}
            onDismiss={() => setLevelUpInfo(null)}
          />
        )}
      </AnimatePresence>

      {/* Mini-Games */}
      <AnimatePresence>
        {activeGame === 'keepey-upey' && (
          <KeepeyUpey
            onEnd={onMiniGameEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
            soundEnabled={gameState.soundEnabled !== false}
          />
        )}
        {activeGame === 'fish-hooks' && (
          <FlappyFishHooks
            onEnd={onMiniGameEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'math-rush' && (
          <MathRush
            onEnd={onMiniGameEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'axolotl-stacker' && (
          <AxolotlStacker
            onEnd={onMiniGameEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'coral-code' && (
          <CoralCode
            onEnd={onMiniGameEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'treasure-hunt' && (
          <TreasureHuntCave
            onEnd={onMiniGameEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'fishing' && (
          <Fishing
            onEnd={onMiniGameEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
            strength={gameState.axolotl?.secondaryStats?.strength || 0}
            speed={gameState.axolotl?.secondaryStats?.speed || 0}
          />
        )}
        {activeGame === 'bite-tag' && (
          <BiteTag
            onEnd={onMiniGameEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
            speed={gameState.axolotl?.secondaryStats?.speed || 0}
            stamina={gameState.axolotl?.secondaryStats?.stamina || 0}
          />
        )}
        {activeGame === 'tide-tiles' && (
          <TideTiles
            onEnd={onMiniGameEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
          />
        )}
        {activeGame === 'bubble-line-up' && (
          <BubbleLineUp
            onEnd={onMiniGameEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
          />
        )}
      </AnimatePresence>

      {/* Daily Features */}
      <SpinWheel
        isOpen={showSpinWheel}
        onClose={() => setShowSpinWheel(false)}
        onSpin={(reward) => {
          onSpinWheel(reward);
        }}
        lastSpinDate={gameState.lastSpinDate}
        coins={gameState.coins}
        opals={gameState.opals || 0}
      />
      <DailyLoginBonus
        isOpen={showDailyLogin}
        onClose={() => {
          setShowDailyLogin(false);
          if (canSpinToday(gameState.lastSpinDate)) {
            setTimeout(() => setShowSpinWheel(true), 400);
          }
        }}
        onClaim={(reward) => {
          onDailyLoginClaim(reward);
        }}
        tutorialMode={false}
        lastLoginDate={gameState.lastLoginDate}
        loginStreak={gameState.loginStreak}
        lastMissForgivenDate={gameState.lastMissForgivenDate}
        coins={gameState.coins}
        opals={gameState.opals || 0}
      />

      {/* Level 30 — Rebirth Ready popup */}
      <AnimatePresence>
        {showRebirthReady && (
          <RebirthReadyModal
            onClose={() => {
              setShowRebirthReady(false);
              setGameState(s => s ? { ...s, rebirthReadySeen: true } : s);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
