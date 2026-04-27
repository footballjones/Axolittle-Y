/**
 * ParentGate — interstitial shown to under-13 players before they can reach
 * any path that creates or signs into an adult account. Apple Guideline 1.3 /
 * 5.1.4 require a challenge "outside a young child's ability" before features
 * intended for adults (account creation, external links, purchases).
 *
 * Pattern: simple addition (two-digit + one-digit) — accepted across the
 * Kids category, accessible to adults under cognitive load, opaque to the
 * pre-arithmetic children we're filtering. Soft retry on wrong answers
 * (regenerate the problem; no hard kick-out, since the gate's job is filtering
 * children, not random guessers).
 */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { track } from '../utils/telemetry';

interface Problem {
  a: number;
  b: number;
  answer: number;
}

function generateProblem(): Problem {
  // (10–99) + (1–9). Cryptographically random so the sequence is not predictable.
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  const a = 10 + (bytes[0] % 90);
  const b = 1 + (bytes[1] % 9);
  return { a, b, answer: a + b };
}

interface Props {
  /** Called when the parent solves the challenge. */
  onPass: () => void;
  /** Called when the parent backs out. */
  onCancel: () => void;
}

export function ParentGate({ onPass, onCancel }: Props) {
  const [problem, setProblem] = useState<Problem>(() => generateProblem());
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(0);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    track('parent_gate_shown');
  }, []);

  const submit = () => {
    const guess = parseInt(input, 10);
    if (Number.isNaN(guess)) return;
    setAttempts(n => n + 1);
    if (guess === problem.answer) {
      track('parent_gate_passed', { attempts: attempts + 1 });
      onPass();
      return;
    }
    track('parent_gate_failed', { attempts: attempts + 1 });
    setProblem(generateProblem());
    setInput('');
    setShake(s => s + 1);
  };

  const tap = (digit: string) => {
    if (digit === 'back') {
      setInput(s => s.slice(0, -1));
      return;
    }
    if (digit === 'enter') {
      submit();
      return;
    }
    setInput(s => (s.length >= 4 ? s : s + digit));
  };

  const showError = attempts > 0 && input === '';

  const keys: Array<{ label: string; value: string; wide?: boolean }> = useMemo(
    () => [
      { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' },
      { label: '4', value: '4' }, { label: '5', value: '5' }, { label: '6', value: '6' },
      { label: '7', value: '7' }, { label: '8', value: '8' }, { label: '9', value: '9' },
      { label: '⌫', value: 'back' }, { label: '0', value: '0' }, { label: 'OK', value: 'enter' },
    ],
    [],
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
      style={{ background: 'linear-gradient(180deg, #0b1220 0%, #131b2e 100%)' }}
    >
      {/* Cancel — top-left, deliberately understated */}
      <button
        onClick={() => { track('parent_gate_cancelled', { attempts }); onCancel(); }}
        className="absolute top-4 left-4 text-white/45 hover:text-white/70 text-sm font-semibold"
        aria-label="Go back"
      >
        ← Back
      </button>

      <motion.div
        key={shake}
        initial={shake > 0 ? { x: 0 } : false}
        animate={shake > 0 ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm rounded-3xl p-6 border border-white/10"
        style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.97), rgba(15,23,42,0.97))' }}
      >
        <div className="text-center mb-5">
          <p className="text-cyan-300/70 text-[11px] font-bold uppercase tracking-[0.18em] mb-2">
            Ask a parent
          </p>
          <h1 className="text-xl font-black text-white mb-2">
            Parents only beyond this point
          </h1>
          <p className="text-white/55 text-sm leading-relaxed">
            To continue, please solve the problem below.
          </p>
        </div>

        {/* Problem */}
        <div
          className="rounded-2xl p-5 mb-3 text-center"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-white/85 text-3xl font-black tracking-wide select-none">
            {problem.a} + {problem.b} = ?
          </p>
        </div>

        {/* Input display */}
        <div
          className="rounded-xl px-4 py-3 mb-3 min-h-[48px] flex items-center justify-center"
          style={{
            background: 'rgba(6,13,26,0.8)',
            border: `1px solid ${showError ? 'rgba(248,113,113,0.45)' : 'rgba(56,189,248,0.2)'}`,
          }}
          aria-live="polite"
          aria-label="Your answer"
        >
          <span className={`font-black text-2xl tracking-wider ${input ? 'text-cyan-100' : 'text-cyan-300/25'}`}>
            {input || 'Enter answer'}
          </span>
        </div>

        {showError && (
          <p className="text-red-400/90 text-xs font-medium text-center mb-2">
            Not quite — try this one.
          </p>
        )}

        {/* Numeric keypad — disables paste/autofill paths a child could shortcut. */}
        <div className="grid grid-cols-3 gap-2">
          {keys.map(k => (
            <motion.button
              key={k.label}
              onClick={() => tap(k.value)}
              whileTap={{ scale: 0.94 }}
              className="py-3 rounded-xl text-lg font-black"
              style={{
                background: k.value === 'enter'
                  ? 'linear-gradient(135deg, #22d3ee, #3b82f6)'
                  : 'rgba(255,255,255,0.06)',
                color: k.value === 'enter' ? '#fff' : 'rgba(255,255,255,0.85)',
                border: k.value === 'enter' ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
              aria-label={k.value === 'back' ? 'Backspace' : k.value === 'enter' ? 'Submit' : `Digit ${k.label}`}
            >
              {k.label}
            </motion.button>
          ))}
        </div>

        <p className="text-white/30 text-[10px] text-center mt-5 leading-relaxed">
          This step keeps younger players from creating accounts on their own.
        </p>
      </motion.div>
    </div>
  );
}
