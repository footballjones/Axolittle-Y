/**
 * ModalManager — owns all modal/overlay rendering for the main game.
 *
 * Extracted from App.tsx to reduce its size. This component is purely a
 * rendering concern: all state and handlers are owned by App.tsx and passed
 * in as props. No game logic lives here.
 */

import React, { memo, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'motion/react';

import { GameState, Axolotl, Friend, SecondaryStats } from '../types/game';
import { GameResult } from '../minigames/types';
import { generatePermanentFriendCode } from '../utils/storage';
import { canSpinToday } from '../utils/dailySystem';

// Modals
import { WaterChangeModal } from './WaterChangeModal';
import { ShopModal } from './ShopModal';
import { SocialModal } from './SocialModal';
import { JimmyChubsAquarium } from './JimmyChubsAquarium';
import { RebirthModal } from './RebirthModal';
import { StatsModal } from './StatsModal';
import { SettingsModal } from './SettingsModal';
import { LoginScreen } from './LoginScreen';
import { ParentGate } from './ParentGate';
import { SyncConflictModal } from './SyncConflictModal';
import { WellbeingCompleteModal } from './WellbeingCompleteModal';
import { JuvenileUnlockModal } from './JuvenileUnlockModal';
import { Level7UnlockModal } from './Level7UnlockModal';
import { ShrimpTutorialIntroModal, ShrimpInfoModal } from './ShrimpTutorialModal';
import { RebirthReadyModal } from './RebirthReadyModal';
import { LevelUpOverlay } from './LevelUpOverlay';
import { SpinWheel } from './SpinWheel';
import { DailyLoginBonus } from './DailyLoginBonus';

// Mini-games
import { KeepeyUpey } from '../minigames/KeepeyUpey';
import { MathRush } from '../minigames/MathRush';
import { AxolotlStacker } from '../minigames/AxolotlStacker';
import { CoralCode } from '../minigames/CoralCode';
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
  deleteAccount: () => Promise<{ error: string | null }>;

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
  setShowHamburgerMenu: (v: boolean) => void;
  shopSection: 'coins' | 'opals' | 'wellbeing' | null;
  setShopSection: (v: 'coins' | 'opals' | 'wellbeing' | null) => void;
  activeGame: string | null;
  levelUpInfo: { level: number } | null;
  setLevelUpInfo: (v: { level: number } | null) => void;

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
  onGiftFriend: (friendId: string, coins: number, opals: number) => Promise<string | null>;
  onPokeFriend: (friendId: string) => void;
  onSendSticker?: (friendId: string, stickerId: string) => Promise<string | null>;
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

function ModalManagerInner({
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
  deleteAccount,
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
  setShowHamburgerMenu,
  shopSection,
  setShopSection,
  activeGame,
  levelUpInfo,
  setLevelUpInfo,
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
  onSendSticker,
  onRebirth,
  onMiniGameEnd,
  onMiniGameApplyReward,
  onDeductEnergy,
  onClaimAchievement: _onClaimAchievement,
  onUnlockGames: _onUnlockGames,
  onRefillEnergy: _onRefillEnergy,
  onSpinWheel,
  onDailyLoginClaim,
}: ModalManagerProps) {
  // ParentGate state for the in-game auth overlay path. The gate only fires
  // for under-13 devices; over-13 users go straight to LoginScreen as before.
  // Reset whenever the overlay closes so the next open re-prompts.
  const [parentGatePassed, setParentGatePassed] = useState(false);
  useEffect(() => {
    if (!showAuthOverlay) setParentGatePassed(false);
  }, [showAuthOverlay]);

  // Record per-game personal best before delegating to the parent's
  // game-end handler. activeGame is still the just-finished game's ID at
  // this point — the parent's handler clears it afterward.
  const recordPBAndEnd = (result: GameResult) => {
    if (activeGame) {
      setGameState((s) => {
        if (!s) return s;
        const existing = s.personalBests?.[activeGame] ?? 0;
        if (result.score <= existing) return s;
        return {
          ...s,
          personalBests: { ...(s.personalBests ?? {}), [activeGame]: result.score },
        };
      });
    }
    onMiniGameEnd(result);
  };

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
          onSendSticker={onSendSticker}
          onVisitJimmy={() => {
            setActiveModal(null);
            setShowJimmyAquarium(true);
          }}
          lineage={lineage}
          isUnder13={isUnder13}
          userId={user?.id ?? null}
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
          userId={user?.id ?? null}
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
          onDeleteAccount={deleteAccount}
        />
      )}

      {/* In-game sign-in overlay. Under-13 devices must pass the ParentGate
          (Apple 1.3 / 5.1.4) before reaching the account-creation surface. */}
      {showAuthOverlay && (
        isUnder13 && !parentGatePassed
          ? (
            <ParentGate
              onPass={() => setParentGatePassed(true)}
              onCancel={() => setShowAuthOverlay(false)}
            />
          )
          : <LoginScreen onClose={() => setShowAuthOverlay(false)} />
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

      {/* Wellbeing completion modal — grants 5 opals */}
      <AnimatePresence>
        {gameState?.onboardingProgress === 'wellbeing_reward' &&
          gameState?.axolotl && (
          <WellbeingCompleteModal
            axolotlName={gameState.axolotl.name}
            onCollect={() =>
              setGameState(s =>
                s ? { ...s, onboardingProgress: 'complete', opals: (s.opals ?? 0) + 5 } : s
              )
            }
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
              setGameState(s => s ? { ...s, seenMilestones: [...(s.seenMilestones ?? []), 'juvenile_unlock'] } : s);
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
              setGameState(s => s ? { ...s, seenMilestones: [...(s.seenMilestones ?? []), 'level7_unlock'] } : s);
            }}
            onOpenSocial={isUnder13 ? undefined : () => {
              setShowLevel7Unlock(false);
              setGameState(s => s ? { ...s, seenMilestones: [...(s.seenMilestones ?? []), 'level7_unlock'] } : s);
              setActiveModal('social');
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
              setGameState(s => s ? { ...s, seenMilestones: [...(s.seenMilestones ?? []), 'shrimp_tutorial'] } : s);
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
            onEnd={recordPBAndEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
            soundEnabled={gameState.soundEnabled !== false}
            noEnergyMultiplier={0.25}
            personalBest={gameState.personalBests?.[activeGame] ?? 0}
          />
        )}
        {activeGame === 'math-rush' && (
          <MathRush
            onEnd={recordPBAndEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
            soundEnabled={gameState.soundEnabled !== false}
            noEnergyMultiplier={0.25}
            personalBest={gameState.personalBests?.[activeGame] ?? 0}
          />
        )}
        {activeGame === 'axolotl-stacker' && (
          <AxolotlStacker
            onEnd={recordPBAndEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
            soundEnabled={gameState.soundEnabled !== false}
            noEnergyMultiplier={0.25}
            personalBest={gameState.personalBests?.[activeGame] ?? 0}
          />
        )}
        {activeGame === 'coral-code' && (
          <CoralCode
            onEnd={recordPBAndEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
            soundEnabled={gameState.soundEnabled !== false}
            noEnergyMultiplier={0.25}
            personalBest={gameState.personalBests?.[activeGame] ?? 0}
          />
        )}
        {activeGame === 'fishing' && (
          <Fishing
            onEnd={recordPBAndEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
            strength={gameState.axolotl?.secondaryStats?.strength || 0}
            speed={gameState.axolotl?.secondaryStats?.speed || 0}
            soundEnabled={gameState.soundEnabled !== false}
            noEnergyMultiplier={0.25}
            personalBest={gameState.personalBests?.[activeGame] ?? 0}
          />
        )}
        {activeGame === 'bite-tag' && (
          <BiteTag
            onEnd={recordPBAndEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
            speed={gameState.axolotl?.secondaryStats?.speed || 0}
            stamina={gameState.axolotl?.secondaryStats?.stamina || 0}
            soundEnabled={gameState.soundEnabled !== false}
            noEnergyMultiplier={0.25}
            personalBest={gameState.personalBests?.[activeGame] ?? 0}
          />
        )}
        {activeGame === 'tide-tiles' && (
          <TideTiles
            onEnd={recordPBAndEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
            soundEnabled={gameState.soundEnabled !== false}
            noEnergyMultiplier={0.25}
            personalBest={gameState.personalBests?.[activeGame] ?? 0}
          />
        )}
        {activeGame === 'bubble-line-up' && (
          <BubbleLineUp
            onEnd={recordPBAndEnd}
            onDeductEnergy={onDeductEnergy}
            onApplyReward={onMiniGameApplyReward}
            energy={gameState.energy}
            soundEnabled={gameState.soundEnabled !== false}
            noEnergyMultiplier={0.25}
            personalBest={gameState.personalBests?.[activeGame] ?? 0}
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
              setGameState(s => s ? { ...s, seenMilestones: [...(s.seenMilestones ?? []), 'rebirth_ready'] } : s);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Custom equality — eliminates 5-second wellbeing-tick re-renders ───────────
//
// The tick updates axolotl.stats, energy, and lastEnergyUpdate every 5 s.
// None of those values are rendered by ModalManager (modals show name/stage/
// economy/settings, not live stat bars or energy counters). By comparing only
// the fields this component actually renders we skip every tick-only re-render
// while still re-rendering when a modal opens, economy changes, etc.
function modalManagerPropsAreEqual(
  prev: ModalManagerProps,
  next: ModalManagerProps,
): boolean {
  // ── Primitive / boolean props (all stable between ticks) ──────────────────
  if (prev.coins          !== next.coins)          return false;
  if (prev.opals          !== next.opals)          return false;
  if (prev.showRebirthButton !== next.showRebirthButton) return false;
  if (prev.activeModal    !== next.activeModal)    return false;
  if (prev.activeGame     !== next.activeGame)     return false;
  if (prev.levelUpInfo    !== next.levelUpInfo)    return false;
  if (prev.conflictSaves  !== next.conflictSaves)  return false;
  if (prev.user           !== next.user)           return false;
  if (prev.isGuest        !== next.isGuest)        return false;
  if (prev.isUnder13      !== next.isUnder13)      return false;
  if (prev.showWaterChangeModal     !== next.showWaterChangeModal)     return false;
  if (prev.showJimmyAquarium        !== next.showJimmyAquarium)        return false;
  if (prev.showJuvenileUnlock       !== next.showJuvenileUnlock)       return false;
  if (prev.showLevel7Unlock         !== next.showLevel7Unlock)         return false;
  if (prev.showShrimpTutorialIntro  !== next.showShrimpTutorialIntro)  return false;
  if (prev.showShrimpInfoModal      !== next.showShrimpInfoModal)      return false;
  if (prev.shrimpTutorialShopPhase  !== next.shrimpTutorialShopPhase)  return false;
  if (prev.showRebirthReady  !== next.showRebirthReady)  return false;
  if (prev.showAuthOverlay   !== next.showAuthOverlay)   return false;
  if (prev.showSpinWheel     !== next.showSpinWheel)     return false;
  if (prev.showDailyLogin    !== next.showDailyLogin)    return false;
  if (prev.shopSection       !== next.shopSection)       return false;
  if (prev.friends           !== next.friends)           return false;
  if (prev.lineage           !== next.lineage)           return false;

  // ── axolotl: compare only fields rendered by modals (not stats) ───────────
  if (prev.axolotl !== next.axolotl) {
    if (prev.axolotl.name            !== next.axolotl.name)            return false;
    if (prev.axolotl.stage           !== next.axolotl.stage)           return false;
    if (prev.axolotl.generation      !== next.axolotl.generation)      return false;
    if (prev.axolotl.secondaryStats  !== next.axolotl.secondaryStats)  return false;
  }

  // ── gameState: only fields rendered by modals ─────────────────────────────
  // Deliberately excludes axolotl.stats / energy / lastEnergyUpdate so the
  // 5-second wellbeing tick does not trigger a re-render of this subtree.
  if (prev.gameState !== next.gameState) {
    const pg = prev.gameState;
    const ng = next.gameState;
    // Economy — SpinWheel + DailyLoginBonus are always in the tree
    if (pg.coins                !== ng.coins)                return false;
    if (pg.opals                !== ng.opals)                return false;
    if (pg.lastSpinDate         !== ng.lastSpinDate)         return false;
    if (pg.lastLoginDate        !== ng.lastLoginDate)        return false;
    if (pg.loginStreak          !== ng.loginStreak)          return false;
    if (pg.lastMissForgivenDate !== ng.lastMissForgivenDate) return false;
    // Shop inventory
    if (pg.ownedFilters         !== ng.ownedFilters)         return false;
    if (pg.filterTier           !== ng.filterTier)           return false;
    if (pg.equippedFilter       !== ng.equippedFilter)       return false;
    if (pg.unlockedDecorations  !== ng.unlockedDecorations)  return false;
    if (pg.customization        !== ng.customization)        return false;
    // Social
    if (pg.friendCode           !== ng.friendCode)           return false;
    // Settings
    if (pg.musicEnabled         !== ng.musicEnabled)         return false;
    if (pg.soundEnabled         !== ng.soundEnabled)         return false;
    // Stats modal
    if (pg.pendingStatPoints    !== ng.pendingStatPoints)    return false;
    // Eggs (Hamburger sub-panels)
    if (pg.nurseryEggs          !== ng.nurseryEggs)          return false;
    // Onboarding / tutorial
    if (pg.onboardingProgress !== ng.onboardingProgress) return false;
    if (pg.seenMilestones     !== ng.seenMilestones)     return false;
    // Mini-game energy — only relevant when a game is actually running
    if (prev.activeGame !== null && pg.energy !== ng.energy) return false;
  }

  return true;
}

export const ModalManager = memo(ModalManagerInner, modalManagerPropsAreEqual);
