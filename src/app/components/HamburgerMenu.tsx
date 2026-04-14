/**
 * HamburgerMenu — the "Axopedia" full-screen popup menu and all its sub-panels.
 *
 * Extracted from App.tsx → GameScreen.tsx. Purely a rendering concern:
 * all state and handlers are owned higher up and passed in as props.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  ChevronDown,
  Settings,
  Gift,
  Dices,
  BarChart2,
  Egg as EggIcon,
  Users,
  Backpack,
  HelpCircle,
  Trophy,
  Bell,
  Sparkles,
} from 'lucide-react';

import { GameState } from '../types/game';
import { GameNotification } from '../data/notifications';
import { ALL_ACHIEVEMENTS } from '../data/achievements';
import { GAME_CONFIG } from '../config/game';
import { canSpinToday, canClaimDailyLogin } from '../utils/dailySystem';

import { GameIcon } from './icons';
import { DecorationsPanel } from './DecorationsPanel';
import { EggsPanel } from './EggsPanel';
import { AchievementCenter } from './AchievementCenter';

// ── Prop types ───────────────────────────────────────────────────────────────

export interface HamburgerMenuProps {
  // Game state
  gameState: GameState;
  coins: number;
  opals: number;
  showRebirthButton: boolean;

  // Menu panel state
  setShowHamburgerMenu: (v: boolean) => void;
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

  // Navigation
  setActiveModal: (modal: 'shop' | 'social' | 'rebirth' | 'stats' | 'settings' | null) => void;
  setShowSpinWheel: (v: boolean) => void;
  setShowDailyLogin: (v: boolean) => void;

  // Social
  hasPendingPokes: boolean;
  setHasPendingPokes: React.Dispatch<React.SetStateAction<boolean>>;
  notifications: GameNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<GameNotification[]>>;
  unreadCount: number;

  // Inventory / decoration handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEquipFilter: (filterId: any) => void;
  onEquipDecoration: (decorationId: string) => void;
  onUseTreatmentFromInventory: (treatmentId: string) => void;
  onDeployShrimpFromInventory: (count: number) => void;

  // Egg handlers
  onHatchEgg: (eggId: string, name: string) => void;
  onStartHatchAnimation: (eggId: string) => void;
  onMoveToIncubator: (eggId: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBoostEgg: (eggId: any) => void;
  onGiftEgg: (eggId: string) => void;
  onDiscardEgg: (eggId: string) => void;
  onUnlockNurserySlot: () => void;
  onReleaseAxolotl: () => void;

  // Achievement handler
  onClaimAchievement: (achievementId: string) => void;

  /** Used for "Add back" on friend_add notifications. */
  onAddFriend: (code: string) => Promise<string | null>;

  /** When true (menu tutorial running), tile taps that open sub-panels are suppressed. */
  isTutorialActive?: boolean;

  /** When true (under-13 COPPA guest), Social tile is hidden. */
  isUnder13?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function HamburgerMenu({
  gameState,
  coins,
  opals,
  showRebirthButton,
  setShowHamburgerMenu,
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
  setActiveModal,
  setShowSpinWheel,
  setShowDailyLogin,
  hasPendingPokes,
  setHasPendingPokes,
  notifications,
  setNotifications,
  unreadCount,
  onEquipFilter,
  onEquipDecoration,
  onUseTreatmentFromInventory,
  onDeployShrimpFromInventory,
  onHatchEgg,
  onStartHatchAnimation,
  onMoveToIncubator,
  onBoostEgg,
  onGiftEgg,
  onDiscardEgg,
  onUnlockNurserySlot,
  onReleaseAxolotl,
  onClaimAchievement,
  onAddFriend,
  isTutorialActive = false,
  isUnder13 = false,
}: HamburgerMenuProps) {
  const [highlightAchievementId, setHighlightAchievementId] = useState<string | null>(null);

  return (
    <>
      {/* Blurred backdrop */}
      <motion.div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={() => { if (isTutorialActive) return; setShowHamburgerMenu(false); setShowNotifPanel(false); setShowHowToPlayPanel(false); setShowInventoryPanel(false); setShowEggsPanel(false); }}
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
              data-menu-id="notifications"
              onClick={() => { if (isTutorialActive) return; setShowNotifPanel(prev => !prev); }}
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
              <Bell className="w-5 h-5 text-indigo-400" strokeWidth={2} />
            </motion.button>
            {/* Settings button */}
            <motion.button
              onClick={() => { if (isTutorialActive) return; setActiveModal('settings'); setShowHamburgerMenu(false); setShowNotifPanel(false); }}
              className="rounded-full p-2 border border-indigo-200/60 bg-white/50 active:bg-white/80 backdrop-blur-sm"
              whileTap={{ scale: 0.85 }}
            >
              <Settings className="w-5 h-5 text-indigo-400" strokeWidth={2.5} />
            </motion.button>
            {/* Close button */}
            <motion.button
              data-menu-id="close"
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
              data-menu-id="wheel-spin"
              onClick={() => setShowSpinWheel(true)}
              className="group relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.75) 0%, rgba(124,58,237,0.55) 100%)',
                border: '1px solid rgba(124,58,237,0.45)',
              }}
              whileTap={{ scale: 0.93 }}
            >
              <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
              <Dices className="w-8 h-8 text-violet-700" strokeWidth={1.5} />
              <span className="text-[11px] font-bold text-violet-800 tracking-wider uppercase">Wheel Spin</span>
              {gameState && canSpinToday(gameState.lastSpinDate) && (
                <motion.div
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center"
                  style={{ boxShadow: '0 0 8px 2px rgba(239,68,68,0.7)' }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="text-white font-black" style={{ fontSize: 9 }}>!</span>
                </motion.div>
              )}
            </motion.button>

            {/* DAILY LOGIN */}
            <motion.button
              data-menu-id="daily-bonus"
              onClick={() => setShowDailyLogin(true)}
              className="group relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.75) 0%, rgba(217,119,6,0.55) 100%)',
                border: '1px solid rgba(217,119,6,0.45)',
              }}
              whileTap={{ scale: 0.93 }}
            >
              <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
              <Gift className="w-8 h-8 text-amber-700" strokeWidth={1.5} />
              <span className="text-[11px] font-bold text-amber-800 tracking-wider uppercase">Daily Bonus</span>
              {gameState && canClaimDailyLogin(gameState.lastLoginDate) && (
                <motion.div
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center"
                  style={{ boxShadow: '0 0 8px 2px rgba(239,68,68,0.7)' }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="text-white font-black" style={{ fontSize: 9 }}>!</span>
                </motion.div>
              )}
            </motion.button>

            {/* STATS */}
            <motion.button
              data-menu-id="stats"
              onClick={() => { if (isTutorialActive) return; setActiveModal('stats'); setShowHamburgerMenu(false); setShowNotifPanel(false); }}
              className="group relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.75) 0%, rgba(2,132,199,0.6) 100%)', border: '1px solid rgba(2,132,199,0.45)' }}
              whileTap={{ scale: 0.93 }}
            >
              <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
              <BarChart2 className="w-8 h-8 text-sky-700" strokeWidth={1.5} />
              <span className="text-[11px] font-bold text-sky-800 tracking-wider uppercase">Stats</span>
              {(gameState?.pendingStatPoints ?? 0) > 0 && (
                <motion.div
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center"
                  style={{ boxShadow: '0 0 8px 2px rgba(251,191,36,0.8)' }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="text-white font-black" style={{ fontSize: 9 }}>+</span>
                </motion.div>
              )}
            </motion.button>

            {/* EGGS */}
            <motion.button
              data-menu-id="eggs"
              onClick={() => { if (isTutorialActive) return; setShowEggsPanel(true); }}
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
              <EggIcon className="w-8 h-8 text-indigo-700" strokeWidth={1.5} />
              <span className="text-[11px] font-bold text-indigo-800 tracking-wider uppercase">Eggs</span>
            </motion.button>

            {/* SOCIAL — hidden for under-13 COPPA users */}
            {!isUnder13 && (
              <motion.button
                data-menu-id="social"
                onClick={() => { if (isTutorialActive) return; setActiveModal('social'); setShowHamburgerMenu(false); setShowNotifPanel(false); setHasPendingPokes(false); }}
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
                <Users className="w-8 h-8 text-pink-700" strokeWidth={1.5} />
                <span className="text-[11px] font-bold text-pink-800 tracking-wider uppercase">Social</span>
              </motion.button>
            )}

            {/* INVENTORY */}
            <motion.button
              data-menu-id="inventory"
              onClick={() => { if (isTutorialActive) return; setShowInventoryPanel(true); setShowHowToPlayPanel(false); setShowAchievementsPanel(false); setShowEggsPanel(false); }}
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
              <Backpack className="w-8 h-8 text-teal-700" strokeWidth={1.5} />
              <span className="text-[11px] font-bold text-teal-800 tracking-wider uppercase">Inventory</span>
            </motion.button>

            {/* HOW TO PLAY */}
            <motion.button
              data-menu-id="how-to-play"
              onClick={() => { if (isTutorialActive) return; setShowHowToPlayPanel(true); }}
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
              <HelpCircle className="w-8 h-8 text-cyan-700" strokeWidth={1.5} />
              <span className="text-[11px] font-bold text-cyan-800 tracking-wider uppercase">How to Play</span>
            </motion.button>

            {/* ACHIEVEMENTS */}
            {(() => {
              const unlockedCount = (gameState?.achievements ?? []).length;
              const totalCount = ALL_ACHIEVEMENTS.length;
              return (
                <motion.button
                  data-menu-id="achievements"
                  onClick={() => { if (isTutorialActive) return; setShowAchievementsPanel(true); setShowHowToPlayPanel(false); setShowInventoryPanel(false); setShowEggsPanel(false); }}
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
                  <Trophy className="w-8 h-8 text-amber-700" strokeWidth={1.5} />
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
              {showRebirthButton ? <Sparkles className="w-8 h-8 text-violet-600" strokeWidth={1.5} /> : <EggIcon className="w-8 h-8 text-slate-400" strokeWidth={1.5} />}
              <div className="flex flex-col items-start">
                <span className={`text-[13px] font-black tracking-wider uppercase ${showRebirthButton ? 'text-violet-700' : 'text-slate-400'}`}>
                  {showRebirthButton ? 'Rebirth Available' : 'Rebirth'}
                </span>
                <span className={`text-[9px] font-medium ${showRebirthButton ? 'text-violet-500/80' : 'text-slate-400/80'}`}>
                  {showRebirthButton ? 'Start a new generation' : 'Reach Elder \u2022 Level 30'}
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
                  { icon: 'Utensils', color: 'rgba(16,185,129,0.12)', border: 'rgba(52,211,153,0.18)', title: 'Keep Your Axolotl Fed', tip: "Tap Feed to drop blood worms. Your axolotl swims up and eats them. Hunger drops over time \u2014 don\u2019t let it bottom out!" },
                  { icon: 'Gamepad2', color: 'rgba(139,92,246,0.12)', border: 'rgba(167,139,250,0.18)', title: 'Play Mini Games', tip: 'Head to Mini Games to earn XP and coins. Level up your axolotl to unlock the ability to rebirth at Level 30.' },
                  { icon: 'Sparkles', color: 'rgba(14,165,233,0.12)', border: 'rgba(56,189,248,0.18)', title: 'Clean the Tank', tip: "Tap Clean to remove poops and keep the tank clean. If cleanliness drops below 50% for more than a day, it will start to affect water quality." },
                  { icon: 'Droplets', color: 'rgba(99,102,241,0.12)', border: 'rgba(129,140,248,0.18)', title: 'Change the Water', tip: 'You can change the water in the aquarium to clean it, but doing so will lock mini games for 2 hours. The lock can be sped up by spending opals.' },
                  { icon: 'Sprout', color: 'rgba(34,197,94,0.12)', border: 'rgba(74,222,128,0.18)', title: 'Evolve Through 4 Stages', tip: 'Your axolotl grows from Hatchling \u2192 Sprout \u2192 Guardian \u2192 Elder. Keep all stats high to evolve faster. Eggs hatch into Hatchling at Level 1.' },
                  { icon: 'RefreshCw', color: 'rgba(168,85,247,0.12)', border: 'rgba(216,180,254,0.18)', title: 'Rebirth for Bonuses', tip: 'At Elder stage (Level 30) you can Rebirth \u2014 start a new generation with bonus coins and inherited colour traits.' },
                  { icon: 'ShoppingCart', color: 'rgba(245,158,11,0.12)', border: 'rgba(251,191,36,0.18)', title: 'Customize Your Tank', tip: 'Tap the Shop button in the Aquarium to buy decorations, plants, and filters. Unlock backgrounds with opals.' },
                  { icon: 'Users', color: 'rgba(236,72,153,0.12)', border: 'rgba(244,114,182,0.18)', title: 'Play with Friends', tip: 'Add friends via code in Social. Poke them, visit their tanks, or hatch eggs together.' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.045 }}
                    className="flex gap-3 px-4 py-3.5 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${item.border}` }}
                  >
                    <span className="flex-shrink-0 mt-0.5 text-slate-500"><GameIcon name={item.icon} size={22} /></span>
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
                ownedFilters={gameState?.ownedFilters ?? (gameState?.filterTier ? [gameState.filterTier] : [])}
                equippedFilter={gameState?.equippedFilter ?? gameState?.filterTier}
                storedTreatments={gameState?.storedTreatments ?? {}}
                storedShrimp={gameState?.storedShrimp ?? 0}
                onEquipFilter={onEquipFilter}
                onUseTreatmentFromInventory={onUseTreatmentFromInventory}
                onDeployShrimpFromInventory={onDeployShrimpFromInventory}
                onClose={() => setShowInventoryPanel(false)}
                onEquip={onEquipDecoration}
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
              nurseryUnlockedSlots={gameState?.nurseryUnlockedSlots ?? GAME_CONFIG.nurserySlotsOpen}
              axolotl={gameState?.axolotl || null}
              onHatch={onHatchEgg}
              onStartHatchAnimation={onStartHatchAnimation}
              onReleaseAxolotl={onReleaseAxolotl}
              onMoveToIncubator={onMoveToIncubator}
              onBoost={onBoostEgg}
              onGift={onGiftEgg}
              onDiscard={onDiscardEgg}
              onUnlockSlot={onUnlockNurserySlot}
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
                  <Trophy className="w-5 h-5 text-amber-400" strokeWidth={2} />
                  <h3 className="text-white font-bold text-base">Achievement Center</h3>
                </div>
                <motion.button
                  onClick={() => { setShowAchievementsPanel(false); setHighlightAchievementId(null); }}
                  className="rounded-full p-2 border border-white/20 bg-white/10 active:bg-white/20"
                  whileTap={{ scale: 0.85 }}
                >
                  <X className="w-4 h-4 text-white/80" strokeWidth={2.5} />
                </motion.button>
              </div>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                <AchievementCenter gameState={gameState} onClaim={onClaimAchievement} highlightId={highlightAchievementId} />
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
                <div className="flex items-center gap-2">
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
                  {notifications.length > 0 && (
                    <motion.button
                      onClick={() => setNotifications([])}
                      className="flex items-center gap-1.5 text-[10px] text-red-400 active:text-red-600 border border-red-200/50 bg-white/40 rounded-full px-3 py-1.5"
                      whileTap={{ scale: 0.92 }}
                    >
                      <X className="w-3 h-3" strokeWidth={2.5} />
                      Clear all
                    </motion.button>
                  )}
                </div>
              </div>
              <div className="h-px mx-5 flex-shrink-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.35),transparent)' }} />

              {/* Notification list */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                    <Bell className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
                    <p className="text-slate-500 text-sm">No notifications yet</p>
                  </div>
                ) : notifications.map((notif, i) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 w-full px-4 py-3 rounded-2xl"
                    style={{
                      background: !notif.read
                        ? 'linear-gradient(135deg, rgba(221,214,254,0.7) 0%, rgba(186,230,253,0.5) 100%)'
                        : 'rgba(255,255,255,0.45)',
                      border: !notif.read ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(203,213,225,0.4)',
                    }}
                  >
                    {/* Tappable main area */}
                    <button
                      className="flex items-center gap-3 flex-1 text-left min-w-0"
                      onClick={() => {
                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                        if (notif.type === 'poke' || notif.type === 'gift') {
                          setActiveModal('social');
                          setShowHamburgerMenu(false);
                          setShowNotifPanel(false);
                          setHasPendingPokes(false);
                        } else if (notif.type === 'achievement' && notif.metadata?.achievementId) {
                          setHighlightAchievementId(notif.metadata.achievementId);
                          setShowAchievementsPanel(true);
                          setShowNotifPanel(false);
                        }
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                        style={{ background: !notif.read ? 'rgba(221,214,254,0.6)' : 'rgba(241,245,249,0.8)' }}
                      >
                        <GameIcon name={notif.icon} size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] leading-snug ${!notif.read ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>{notif.message}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{notif.time}</p>
                        {/* Add back button for friend_add notifications */}
                        {notif.type === 'friend' && notif.metadata?.friendCode && (
                          <motion.button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await onAddFriend(notif.metadata!.friendCode!);
                              setNotifications(prev => prev.filter(n => n.id !== notif.id));
                            }}
                            className="mt-1.5 px-3 py-1 rounded-lg text-[10px] font-bold text-white"
                            style={{ background: 'linear-gradient(110deg, #6366f1 0%, #8b5cf6 100%)' }}
                            whileTap={{ scale: 0.93 }}
                          >
                            Add back
                          </motion.button>
                        )}
                      </div>
                    </button>
                    {/* Right-side controls */}
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-violet-500 shadow-sm shadow-violet-400/60 mt-1" />
                      )}
                      <motion.button
                        onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                        className="w-5 h-5 rounded-full flex items-center justify-center bg-white/60 border border-slate-200/60 active:bg-white"
                        whileTap={{ scale: 0.85 }}
                      >
                        <X className="w-3 h-3 text-slate-400" strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
