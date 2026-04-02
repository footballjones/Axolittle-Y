/**
 * Menu Tutorial Overlay — walks the player through every menu item.
 *
 * Phase 0: Aquarium screen — spotlight the hamburger button, prompt to open.
 * Phases 1-9: Inside the menu — spotlight each tile with a blurb, player taps "Got it" to advance.
 * Phase 10: Prompt to close the menu.
 *
 * Uses createPortal to escape any transform stacking context.
 */

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { GameIcon } from './icons';

interface MenuTutorialOverlayProps {
  /** Whether the hamburger menu is currently open */
  menuOpen: boolean;
  /** Called to open the hamburger menu */
  onOpenMenu: () => void;
  /** Called when the full tutorial is complete (menu closed by user) */
  onComplete: () => void;
  /** Called to open the spin wheel modal during the tutorial */
  onOpenSpinWheel: () => void;
  /** Called to open the daily bonus modal during the tutorial */
  onOpenDailyBonus: () => void;
  /** Becomes true once the user has spun the wheel */
  spinDone: boolean;
  /** Becomes true once the user has claimed the daily bonus */
  dailyClaimDone: boolean;
}

// Each step: CSS selector (queried inside the menu) + icon (Lucide name) + title + description
const MENU_STEPS: Array<{
  selector: string;
  icon: string;
  title: string;
  desc: string;
  actionLabel?: string; // If set, button shows this instead of "Got it" and triggers an action
}> = [
  { selector: '[data-menu-id="notifications"]', icon: 'Bell',       title: 'Notifications', desc: 'Check alerts and updates about your axolotl here.' },
  { selector: '[data-menu-id="wheel-spin"]',    icon: 'Dices',      title: 'Wheel Spin',    desc: 'Spin once a day for free coins or opals. Every spin counts — let\'s try it now!', actionLabel: 'Spin it!' },
  { selector: '[data-menu-id="daily-bonus"]',   icon: 'Gift',       title: 'Daily Bonus',   desc: 'Log in every day to earn streak rewards. Your first reward is waiting — go claim it!', actionLabel: 'Claim it!' },
  { selector: '[data-menu-id="stats"]',         icon: 'BarChart2',  title: 'Stats',         desc: 'View and assign stat points to make your axolotl stronger.' },
  { selector: '[data-menu-id="eggs"]',          icon: 'Egg',        title: 'Eggs',          desc: 'Manage your eggs and hatch new axolotls.' },
  { selector: '[data-menu-id="social"]',        icon: 'Users',      title: 'Social',        desc: 'Add friends and visit their aquariums.' },
  { selector: '[data-menu-id="inventory"]',     icon: 'Backpack',   title: 'Inventory',     desc: 'Use items like shrimp and water treatments.' },
  { selector: '[data-menu-id="how-to-play"]',   icon: 'HelpCircle', title: 'How to Play',   desc: 'Tips and guides for taking care of your axolotl.' },
  { selector: '[data-menu-id="achievements"]',  icon: 'Trophy',     title: 'Achievements',  desc: 'Track your progress and earn badges.' },
];

export function MenuTutorialOverlay({ menuOpen, onOpenMenu, onComplete, onOpenSpinWheel, onOpenDailyBonus, spinDone, dailyClaimDone }: MenuTutorialOverlayProps) {
  // phase: 0 = "open menu", 1-9 = menu items, 10 = "close menu"
  // phase 100 = waiting for user to spin wheel, phase 101 = waiting for daily claim
  const [phase, setPhase] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const measureTimer = useRef<ReturnType<typeof setTimeout>>();

  // Measure the target element for the current phase
  const measure = useCallback(() => {
    let el: HTMLElement | null = null;
    if (phase === 0) {
      el = document.querySelector('[data-menu-id="hamburger"]');
    } else if (phase >= 1 && phase <= 9) {
      el = document.querySelector(MENU_STEPS[phase - 1].selector);
    } else if (phase === 10) {
      el = document.querySelector('[data-menu-id="close"]');
    }
    if (el) {
      setTargetRect(el.getBoundingClientRect());
      foundRef.current = true;
    }
  }, [phase]);

  // Re-measure when phase changes or menu open state changes
  const foundRef = useRef(false);
  useLayoutEffect(() => {
    setTargetRect(null);
    foundRef.current = false;
    let attempts = 0;
    const tryMeasure = () => {
      measure();
      attempts++;
      // Keep retrying until element found or max attempts
      if (!foundRef.current && attempts < 8) {
        measureTimer.current = setTimeout(tryMeasure, 200);
      }
    };
    measureTimer.current = setTimeout(tryMeasure, 150);
    window.addEventListener('resize', measure);
    return () => {
      if (measureTimer.current) clearTimeout(measureTimer.current);
      window.removeEventListener('resize', measure);
    };
  }, [phase, menuOpen, measure]);

  // When phase 0 and user opens the menu, advance to phase 1
  useEffect(() => {
    if (phase === 0 && menuOpen) {
      setPhase(1);
    }
  }, [phase, menuOpen]);

  // When phase 10 and user closes menu, tutorial is done
  useEffect(() => {
    if (phase === 10 && !menuOpen) {
      onComplete();
    }
  }, [phase, menuOpen, onComplete]);

  const handleNext = () => {
    if (phase === 2) {
      // Wheel Spin — open the wheel and wait for a spin
      onOpenSpinWheel();
      setPhase(100);
    } else if (phase === 3) {
      // Daily Bonus — open it and wait for a claim
      onOpenDailyBonus();
      setPhase(101);
    } else if (phase >= 1 && phase <= 8) {
      setPhase(phase + 1);
    } else if (phase === 9) {
      setPhase(10); // "close the menu" phase
    }
  };

  // Advance out of wait phases once the actions are completed
  useEffect(() => {
    if (phase === 100 && spinDone) setPhase(3);
  }, [phase, spinDone]);

  useEffect(() => {
    if (phase === 101 && dailyClaimDone) setPhase(4);
  }, [phase, dailyClaimDone]);

  // Wait phases — no spotlight, just a floating prompt
  if (phase === 100 || phase === 101) {
    const isSpinWait = phase === 100;
    const banner = (
      <motion.div
        className="fixed left-0 right-0 flex justify-center pointer-events-none"
        // Spin-wait: top of screen so it doesn't cover the wheel
        // Daily-claim-wait: bottom, above the action buttons
        style={isSpinWait
          ? { top: 'max(1rem, env(safe-area-inset-top))', zIndex: 10003 }
          : { bottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4.5rem))', zIndex: 10003 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div
          className="mx-4 rounded-2xl px-5 py-3.5 text-center"
          style={{
            background: 'rgba(255,255,255,0.97)',
            border: '2px solid rgba(99,102,241,0.6)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
            maxWidth: 280,
          }}
        >
          <p className="text-sm font-black text-slate-800 mb-0.5">
            {isSpinWait ? 'Spin to win!' : 'Claim your reward!'}
          </p>
          <p className="text-xs text-slate-500">
            {isSpinWait
              ? 'Give the wheel a spin to continue the tour.'
              : 'Claim your daily bonus to continue the tour.'}
          </p>
        </div>
      </motion.div>
    );
    return createPortal(banner, document.body);
  }

  if (!targetRect) return null;

  const pad = 6;
  const r = targetRect;

  // Determine bubble position — place it below or above the target
  const spaceBelow = window.innerHeight - r.bottom;
  const spaceAbove = r.top;
  const placeBelow = spaceBelow > 180 || spaceBelow > spaceAbove;

  // For the "open menu" phase (0) and "close menu" phase (10) use a pointer style
  const isPromptPhase = phase === 0 || phase === 10;
  const currentStep = phase >= 1 && phase <= 9 ? MENU_STEPS[phase - 1] : null;

  const overlay = (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        className="fixed inset-0"
        style={{ zIndex: 10003, pointerEvents: 'none' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* 4-strip spotlight dim */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(0, r.top - pad), background: 'rgba(0,0,0,0.6)', pointerEvents: 'auto' }} onClick={e => e.stopPropagation()} />
        <div style={{ position: 'absolute', top: r.bottom + pad, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', pointerEvents: 'auto' }} onClick={e => e.stopPropagation()} />
        <div style={{ position: 'absolute', top: r.top - pad, left: 0, width: Math.max(0, r.left - pad), height: r.height + pad * 2, background: 'rgba(0,0,0,0.6)', pointerEvents: 'auto' }} onClick={e => e.stopPropagation()} />
        <div style={{ position: 'absolute', top: r.top - pad, left: r.right + pad, right: 0, height: r.height + pad * 2, background: 'rgba(0,0,0,0.6)', pointerEvents: 'auto' }} onClick={e => e.stopPropagation()} />

        {/* Pulsing ring around target */}
        <motion.div
          className="absolute rounded-2xl pointer-events-none"
          style={{
            top: r.top - pad,
            left: r.left - pad,
            width: r.width + pad * 2,
            height: r.height + pad * 2,
            border: '2.5px solid rgba(99,102,241,0.8)',
          }}
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(99,102,241,0.3)',
              '0 0 12px 4px rgba(99,102,241,0.4)',
              '0 0 0 0 rgba(99,102,241,0.3)',
            ],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Speech bubble */}
        {(() => {
          // Position the bubble so the caret points directly at the target center
          const targetCenterX = r.left + r.width / 2;
          const bubbleW = 250;
          // Clamp bubble so it stays on screen with 12px margin
          const bubbleLeft = Math.max(12, Math.min(window.innerWidth - bubbleW - 12, targetCenterX - bubbleW / 2));
          // Caret offset within the bubble to align with target center
          const caretLeft = Math.max(20, Math.min(bubbleW - 20, targetCenterX - bubbleLeft));

          return (
        <motion.div
          className="absolute flex flex-col items-start pointer-events-auto"
          style={{
            ...(placeBelow
              ? { top: r.bottom + pad + 12 }
              : { bottom: window.innerHeight - r.top + pad + 12 }),
            left: bubbleLeft,
            width: bubbleW,
          }}
          initial={{ opacity: 0, y: placeBelow ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Caret pointing up at target */}
          {placeBelow && (
            <div className="-mb-px" style={{ marginLeft: caretLeft - 8 }}>
              <div style={{
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: '9px solid rgba(255,255,255,0.97)',
              }} />
            </div>
          )}

          {/* Bubble content */}
          <div
            className="w-full rounded-2xl px-4 py-3 text-center"
            style={{
              background: 'rgba(255,255,255,0.97)',
              border: '2px solid rgba(99,102,241,0.6)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
            }}
          >
            {isPromptPhase ? (
              <>
                <p className="text-sm font-bold text-slate-800 mb-1">
                  {phase === 0 ? 'Tap to open the menu!' : 'Great! Now close the menu.'}
                </p>
                <p className="text-xs text-slate-500">
                  {phase === 0 ? 'Let\'s explore what\'s inside.' : 'You\'re all set!'}
                </p>
              </>
            ) : currentStep && (
              <>
                <div className="flex justify-center mb-1 text-indigo-500"><GameIcon name={currentStep.icon} size={24} /></div>
                <p className="text-sm font-black text-slate-800 mb-1">{currentStep.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{currentStep.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">{phase}/9</span>
                  <button
                    onClick={handleNext}
                    className="px-5 py-1.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: currentStep?.actionLabel
                      ? 'linear-gradient(110deg, #f59e0b 0%, #ef4444 100%)'
                      : 'linear-gradient(110deg, #6366f1 0%, #8b5cf6 100%)' }}
                  >
                    {currentStep?.actionLabel ?? (phase === 9 ? 'Done' : 'Got it')}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Caret pointing down at target (when bubble is above target) */}
          {!placeBelow && (
            <div className="-mt-px" style={{ marginLeft: caretLeft - 8 }}>
              <div style={{
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '9px solid rgba(255,255,255,0.97)',
              }} />
            </div>
          )}
        </motion.div>
          );
        })()}
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
