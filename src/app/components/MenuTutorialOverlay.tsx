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

interface MenuTutorialOverlayProps {
  /** Whether the hamburger menu is currently open */
  menuOpen: boolean;
  /** Called to open the hamburger menu */
  onOpenMenu: () => void;
  /** Called when the full tutorial is complete (menu closed by user) */
  onComplete: () => void;
}

// Each step: CSS selector (queried inside the menu) + emoji + title + description
const MENU_STEPS: Array<{
  selector: string;
  emoji: string;
  title: string;
  desc: string;
}> = [
  { selector: '[data-menu-id="notifications"]', emoji: '🔔', title: 'Notifications', desc: 'Check alerts and updates about your axolotl here.' },
  { selector: '[data-menu-id="wheel-spin"]',    emoji: '🎰', title: 'Wheel Spin',    desc: 'Spin daily for free coins or opals!' },
  { selector: '[data-menu-id="daily-bonus"]',   emoji: '🎁', title: 'Daily Bonus',   desc: 'Log in every day to earn streak rewards.' },
  { selector: '[data-menu-id="stats"]',         emoji: '📊', title: 'Stats',         desc: 'View and assign stat points to make your axolotl stronger.' },
  { selector: '[data-menu-id="eggs"]',          emoji: '🥚', title: 'Eggs',          desc: 'Manage your eggs and hatch new axolotls.' },
  { selector: '[data-menu-id="social"]',        emoji: '👥', title: 'Social',        desc: 'Add friends and visit their aquariums.' },
  { selector: '[data-menu-id="inventory"]',     emoji: '🎒', title: 'Inventory',     desc: 'Use items like shrimp and water treatments.' },
  { selector: '[data-menu-id="how-to-play"]',   emoji: '💡', title: 'How to Play',   desc: 'Tips and guides for taking care of your axolotl.' },
  { selector: '[data-menu-id="achievements"]',  emoji: '🏆', title: 'Achievements',  desc: 'Track your progress and earn badges.' },
];

export function MenuTutorialOverlay({ menuOpen, onOpenMenu, onComplete }: MenuTutorialOverlayProps) {
  // phase: 0 = "open menu", 1-9 = menu items, 10 = "close menu"
  const [phase, setPhase] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const measureTimer = useRef<ReturnType<typeof setTimeout>>();

  // Measure the target element for the current phase
  const measure = useCallback(() => {
    if (phase === 0) {
      // Target the hamburger button
      const el = document.querySelector('[data-menu-id="hamburger"]') as HTMLElement | null;
      if (el) setTargetRect(el.getBoundingClientRect());
    } else if (phase >= 1 && phase <= 9) {
      const step = MENU_STEPS[phase - 1];
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) setTargetRect(el.getBoundingClientRect());
    } else if (phase === 10) {
      // Target the close button
      const el = document.querySelector('[data-menu-id="close"]') as HTMLElement | null;
      if (el) setTargetRect(el.getBoundingClientRect());
    }
  }, [phase]);

  // Re-measure when phase changes or menu open state changes
  useLayoutEffect(() => {
    setTargetRect(null);
    measureTimer.current = setTimeout(measure, 150);
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
    if (phase >= 1 && phase <= 8) {
      setPhase(phase + 1);
    } else if (phase === 9) {
      setPhase(10); // "close the menu" phase
    }
  };

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
        <motion.div
          className="absolute flex flex-col items-center pointer-events-auto"
          style={{
            ...(placeBelow
              ? { top: r.bottom + pad + 12 }
              : { bottom: window.innerHeight - r.top + pad + 12 }),
            left: Math.max(16, Math.min(window.innerWidth - 264, r.left + r.width / 2 - 125)),
            width: 250,
          }}
          initial={{ opacity: 0, y: placeBelow ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Caret pointing at target */}
          {placeBelow && (
            <div className="flex justify-center w-full -mb-px">
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
                {phase === 0 && (
                  <motion.span
                    className="inline-block text-2xl mt-1"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    👆
                  </motion.span>
                )}
              </>
            ) : currentStep && (
              <>
                <div className="text-2xl mb-1">{currentStep.emoji}</div>
                <p className="text-sm font-black text-slate-800 mb-1">{currentStep.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{currentStep.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">{phase}/9</span>
                  <button
                    onClick={handleNext}
                    className="px-5 py-1.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(110deg, #6366f1 0%, #8b5cf6 100%)' }}
                  >
                    {phase === 9 ? 'Done' : 'Got it'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Caret pointing up at target (when bubble is below target) */}
          {!placeBelow && (
            <div className="flex justify-center w-full -mt-px">
              <div style={{
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '9px solid rgba(255,255,255,0.97)',
              }} />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
