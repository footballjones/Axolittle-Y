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
}

const CURRENT_YEAR = new Date().getFullYear();
// Offer birth years from 3 years old up to 100 years old
const YEARS = Array.from({ length: 98 }, (_, i) => CURRENT_YEAR - 3 - i);

type Phase = 'age-picker' | 'under13-notice' | 'parent-setup';

export function AgeGateScreen({ onComplete, onParentSetup }: Props) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('age-picker');

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

  const handleUnder13Confirm = () => {
    const result: AgeGateResult = { completed: true, isUnder13: true };
    saveAgeGate(result);
    onComplete(true);
  };

  const handleParentSetupClick = () => {
    // Save guest state first so the child can play; parent login handled separately
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
              {/* Axolotl emoji header */}
              <div className="text-center mb-5">
                <div className="text-5xl mb-3">🦎</div>
                <h1 className="text-2xl font-black text-white mb-1">Welcome to Axolittle!</h1>
                <p className="text-white/55 text-sm">Before we begin, what year were you born?</p>
              </div>

              {/* Year selector */}
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
                <div className="text-5xl mb-3">👋</div>
                <h2 className="text-xl font-black text-white mb-2">Hey there!</h2>
                <p className="text-white/70 text-sm leading-relaxed">
                  Players under 13 enjoy the full game in <span className="text-cyan-300 font-bold">guest mode</span>.
                </p>
              </div>

              <div
                className="rounded-2xl p-4 mb-4 space-y-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-white/80 text-sm font-semibold mb-1">In guest mode you can:</p>
                {['Care for your axolotl 🦎', 'Play all 8 mini-games 🎮', 'Hatch eggs & grow your lineage 🥚', 'Collect decorations & upgrades ✨'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                    <p className="text-white/65 text-sm">{item}</p>
                  </div>
                ))}
              </div>

              {/* Parent setup callout */}
              <div
                className="rounded-2xl p-3 mb-4"
                style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)' }}
              >
                <p className="text-yellow-200/80 text-xs leading-relaxed">
                  <span className="font-bold text-yellow-200">Want friend features?</span> A parent or guardian can create an account to unlock social features.
                </p>
              </div>

              <motion.button
                onClick={handleUnder13Confirm}
                className="w-full py-3.5 rounded-2xl font-black text-base text-white mb-2"
                style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)' }}
                whileTap={{ scale: 0.97 }}
              >
                Let's Play!
              </motion.button>

              <motion.button
                onClick={() => setPhase('parent-setup')}
                className="w-full py-3 rounded-2xl font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
                whileTap={{ scale: 0.97 }}
              >
                Parent / Guardian Setup
              </motion.button>
            </div>
          </motion.div>
        )}

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
                <div className="text-5xl mb-3">🔐</div>
                <h2 className="text-xl font-black text-white mb-2">Parent / Guardian</h2>
                <p className="text-white/65 text-sm leading-relaxed">
                  Create a free account to unlock friend features for your child.
                </p>
              </div>

              <div
                className="rounded-2xl p-4 mb-5 space-y-3"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {[
                  ['👤', 'Your account, your control', 'You decide if social features are on.'],
                  ['🔒', 'No data from your child', 'We never collect personal information from players under 13.'],
                  ['👫', 'Friend features unlocked', 'Your child can add friends, visit tanks, and breed axolotls.'],
                ].map(([icon, title, desc]) => (
                  <div key={title} className="flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5">{icon}</span>
                    <div>
                      <p className="text-white/85 text-sm font-semibold">{title}</p>
                      <p className="text-white/45 text-xs">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <motion.button
                onClick={handleParentSetupClick}
                className="w-full py-3.5 rounded-2xl font-black text-base text-white mb-2"
                style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)' }}
                whileTap={{ scale: 0.97 }}
              >
                Create / Sign In
              </motion.button>

              <motion.button
                onClick={() => setPhase('under13-notice')}
                className="w-full py-3 rounded-2xl font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}
                whileTap={{ scale: 0.97 }}
              >
                Back
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
