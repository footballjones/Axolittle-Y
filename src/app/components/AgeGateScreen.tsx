/**
 * AgeGateScreen — COPPA compliance gate shown once on first launch.
 *
 * - Under 13 → guest-only mode: no account creation, social features hidden.
 *   No personal information is sent to our servers for these users.
 *   A parent/guardian can optionally sign in from Settings to unlock social
 *   features on behalf of the child.
 * - 13 and over → full experience.
 *
 * The result is stored in localStorage only (never synced to Supabase) so
 * we never transmit age data for any user.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const AGE_GATE_KEY = 'axolittle-age-gate';

export interface AgeGateResult {
  completed: boolean;
  isUnder13: boolean;
}

export function loadAgeGate(): AgeGateResult | null {
  try {
    const raw = localStorage.getItem(AGE_GATE_KEY);
    return raw ? (JSON.parse(raw) as AgeGateResult) : null;
  } catch {
    return null;
  }
}

function saveAgeGate(result: AgeGateResult) {
  localStorage.setItem(AGE_GATE_KEY, JSON.stringify(result));
}

interface Props {
  onComplete: (isUnder13: boolean) => void;
  /** Called when a parent wants to sign in during the age gate flow. */
  onParentSetup?: () => void;
  /** Start the flow at a specific phase (default: 'age-picker'). */
  initialPhase?: Phase;
}

const CURRENT_YEAR = new Date().getFullYear();
// Offer birth years from 3 years old up to 100 years old
const YEARS = Array.from({ length: 98 }, (_, i) => CURRENT_YEAR - 3 - i);

type Phase = 'age-picker' | 'under13-notice' | 'guest-confirm' | 'parent-setup';

const GUEST_MISSING = [
  'Add and visit friends',
  'Breed axolotls with other players',
  'Send and receive egg gifts',
  'Cloud save across devices',
];

export function AgeGateScreen({ onComplete, onParentSetup, initialPhase = 'age-picker' }: Props) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>(initialPhase);

  const age = selectedYear ? CURRENT_YEAR - selectedYear : null;
  const isUnder13 = age !== null && age < 13;

  const handleContinue = () => {
    if (selectedYear === null) return;
    if (isUnder13) {
      setPhase('under13-notice');
    } else {
      const result: AgeGateResult = { completed: true, isUnder13: false };
      saveAgeGate(result);
      onComplete(false);
    }
  };

  const handleGuestConfirmed = () => {
    const result: AgeGateResult = { completed: true, isUnder13: true };
    saveAgeGate(result);
    onComplete(true);
  };

  const handleParentSetupClick = () => {
    const result: AgeGateResult = { completed: true, isUnder13: true };
    saveAgeGate(result);
    if (onParentSetup) {
      onParentSetup();
    } else {
      onComplete(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 z-[9999]">
      {/* Decorative bubbles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-cyan-400/10 pointer-events-none"
          style={{ width: 40 + i * 20, height: 40 + i * 20, left: `${10 + i * 15}%`, bottom: `${5 + i * 8}%` }}
          animate={{ y: [0, -(30 + i * 10), 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}
        />
      ))}

      <AnimatePresence mode="wait">

        {/* ── Phase 1: Birth year ── */}
        {phase === 'age-picker' && (
          <motion.div
            key="age-picker"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="w-full max-w-sm"
          >
            <div
              className="rounded-3xl p-6 border border-white/10 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.97), rgba(15,23,42,0.97))' }}
            >
              <div className="text-center mb-5">
                <h1 className="text-2xl font-black text-white mb-1">Welcome to Axolittle!</h1>
                <p className="text-white/55 text-sm">Before we begin, what year were you born?</p>
              </div>

              <div className="mb-5">
                <select
                  value={selectedYear ?? ''}
                  onChange={e => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-xl px-4 py-3 text-base font-semibold text-white border border-white/15 appearance-none text-center"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <option value="" disabled>Select your birth year</option>
                  {YEARS.map(y => (
                    <option key={y} value={y} style={{ background: '#1e293b', color: '#fff' }}>{y}</option>
                  ))}
                </select>
              </div>

              <motion.button
                onClick={handleContinue}
                disabled={selectedYear === null}
                className="w-full py-3.5 rounded-2xl font-black text-base transition-all"
                style={{
                  background: selectedYear !== null
                    ? 'linear-gradient(135deg, #22d3ee, #3b82f6)'
                    : 'rgba(255,255,255,0.08)',
                  color: selectedYear !== null ? '#fff' : 'rgba(255,255,255,0.3)',
                  cursor: selectedYear !== null ? 'pointer' : 'not-allowed',
                }}
                whileTap={selectedYear !== null ? { scale: 0.97 } : {}}
              >
                Continue
              </motion.button>

              <p className="text-white/25 text-[10px] text-center mt-4 leading-relaxed">
                We ask your age to comply with children's privacy laws (COPPA).
                This information is stored only on your device and never shared.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Phase 2: Under-13 notice — parent setup is the primary action ── */}
        {phase === 'under13-notice' && (
          <motion.div
            key="under13-notice"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="w-full max-w-sm"
          >
            <div
              className="rounded-3xl p-6 border border-white/10 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.97), rgba(15,23,42,0.97))' }}
            >
              <div className="text-center mb-5">
                <h2 className="text-xl font-black text-white mb-2">
                  Ask a parent before you play!
                </h2>
                <p className="text-white/65 text-sm leading-relaxed">
                  To get the full Axolittle experience, a parent or guardian needs to create a free account.
                </p>
              </div>

              {/* What they unlock */}
              <div
                className="rounded-2xl p-4 mb-5"
                style={{ background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.18)' }}
              >
                <p className="text-cyan-200/80 text-xs font-semibold uppercase tracking-wider mb-3">
                  With a parent account you unlock
                </p>
                {[
                  'Breed axolotls with friends',
                  'Send and receive egg gifts',
                  'Visit friends\' tanks',
                  'Cloud save across devices',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5 mb-2 last:mb-0">
                    <div className="w-4 h-4 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    </div>
                    <p className="text-white/75 text-sm">{item}</p>
                  </div>
                ))}
              </div>

              {/* Primary CTA */}
              <motion.button
                onClick={() => setPhase('parent-setup')}
                className="w-full py-3.5 rounded-2xl font-black text-base text-white mb-4"
                style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)' }}
                whileTap={{ scale: 0.97 }}
              >
                Set Up Parent Account
              </motion.button>

              {/* Secondary — small underlined text */}
              <div className="text-center">
                <button
                  onClick={() => setPhase('guest-confirm')}
                  className="text-white/35 text-xs underline underline-offset-2 hover:text-white/55 transition-colors"
                >
                  Continue as Guest
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Phase 3: Guest confirmation warning ── */}
        {phase === 'guest-confirm' && (
          <motion.div
            key="guest-confirm"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="w-full max-w-sm"
          >
            <div
              className="rounded-3xl p-6 border border-white/10 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.97), rgba(15,23,42,0.97))' }}
            >
              <div className="text-center mb-5">
                <h2 className="text-xl font-black text-white mb-2">
                  Are you sure?
                </h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  Guest mode is missing some of the best parts of the game.
                </p>
              </div>

              {/* Warning list */}
              <div
                className="rounded-2xl p-4 mb-5"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <p className="text-red-300/80 text-xs font-semibold uppercase tracking-wider mb-3">
                  You will miss out on
                </p>
                {GUEST_MISSING.map(item => (
                  <div key={item} className="flex items-center gap-2.5 mb-2 last:mb-0">
                    <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-400 text-[9px] font-black leading-none">X</span>
                    </div>
                    <p className="text-white/70 text-sm">{item}</p>
                  </div>
                ))}
              </div>

              {/* Go back and set up — primary */}
              <motion.button
                onClick={() => {
                  // If we entered from the parent login flow, go back to the
                  // LoginScreen rather than the local parent-setup info screen.
                  if (initialPhase === 'guest-confirm' && onParentSetup) {
                    onParentSetup();
                  } else {
                    setPhase('parent-setup');
                  }
                }}
                className="w-full py-3.5 rounded-2xl font-black text-base text-white mb-2"
                style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)' }}
                whileTap={{ scale: 0.97 }}
              >
                Set Up Parent Account
              </motion.button>

              {/* Confirm guest — secondary */}
              <motion.button
                onClick={handleGuestConfirmed}
                className="w-full py-3 rounded-2xl font-semibold text-sm"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.45)',
                }}
                whileTap={{ scale: 0.97 }}
              >
                I understand, play as Guest
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Phase 4: Parent setup info ── */}
        {phase === 'parent-setup' && (
          <motion.div
            key="parent-setup"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="w-full max-w-sm"
          >
            <div
              className="rounded-3xl p-6 border border-white/10 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.97), rgba(15,23,42,0.97))' }}
            >
              <div className="text-center mb-5">
                <h2 className="text-xl font-black text-white mb-2">Parent / Guardian</h2>
                <p className="text-white/65 text-sm leading-relaxed">
                  Create a free account to unlock friend features for your child.
                </p>
              </div>

              <div
                className="rounded-2xl p-4 mb-5 space-y-4"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {[
                  ['Your account, your control', 'You decide if social features are on.'],
                  ['No data from your child', 'We never collect personal information from players under 13.'],
                  ['Friend features unlocked', 'Your child can add friends, visit tanks, and breed axolotls.'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-white/85 text-sm font-semibold">{title}</p>
                      <p className="text-white/45 text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <motion.button
                onClick={handleParentSetupClick}
                className="w-full py-3.5 rounded-2xl font-black text-base text-white mb-3"
                style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)' }}
                whileTap={{ scale: 0.97 }}
              >
                Create / Sign In
              </motion.button>

              <div className="text-center">
                <button
                  onClick={() => setPhase('under13-notice')}
                  className="text-white/35 text-xs underline underline-offset-2 hover:text-white/55 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
