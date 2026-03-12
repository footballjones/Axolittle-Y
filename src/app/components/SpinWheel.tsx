/**
 * Daily Spin Wheel — rebuilt from scratch
 * 8 coin sections + 2 small opal sections (5% opal chance total)
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { canSpinToday } from '../utils/dailySystem';

interface SpinWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSpin: (reward: { type: 'coins' | 'opals'; amount: number }) => void;
  lastSpinDate?: string;
  coins: number;
  opals: number;
}

// ─── Geometry constants ───────────────────────────────────────────────────────
const CX = 150;
const CY = 150;
const R  = 136; // outer radius of slices
const HUB_R = 24; // center hub radius

// Each opal slot = 2.5 % of 360° → 9° arc
// 2 opal slots × 2.5 % = 5 % total opal chance
const OPAL_DEG  = 9;
const N_COINS   = 8;
const COIN_DEG  = (360 - OPAL_DEG * 2) / N_COINS; // ≈ 42.75°

// ─── Section definitions (clockwise from top) ─────────────────────────────────
type SectionType = 'coins' | 'opals';

interface SectionDef {
  type: SectionType;
  amount: number;
}

// 4 coins → opal → 4 coins → opal
const DEFS: SectionDef[] = [
  { type: 'coins', amount: 15 },
  { type: 'coins', amount: 20 },
  { type: 'coins', amount: 25 },
  { type: 'coins', amount: 30 },
  { type: 'opals', amount: 5  },
  { type: 'coins', amount: 35 },
  { type: 'coins', amount: 40 },
  { type: 'coins', amount: 45 },
  { type: 'coins', amount: 50 },
  { type: 'opals', amount: 10 },
];

// Alternating amber shades for coin sections
const COIN_LIGHT = '#FDE68A'; // amber-200
const COIN_DARK  = '#F59E0B'; // amber-400
const COIN_FILL  = (i: number) => (i % 2 === 0 ? COIN_LIGHT : COIN_DARK);

// ─── SVG helpers ──────────────────────────────────────────────────────────────
/** Convert polar (degrees from top, clockwise) to SVG cartesian */
function toXY(deg: number, r: number = R): [number, number] {
  const rad = (deg - 90) * (Math.PI / 180);
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/** Build SVG path for a pie slice */
function slicePath(startDeg: number, endDeg: number): string {
  const [x1, y1] = toXY(startDeg);
  const [x2, y2] = toXY(endDeg);
  const large     = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SpinWheel({ isOpen, onClose, onSpin, lastSpinDate }: SpinWheelProps) {
  const [spinning,  setSpinning]  = useState(false);
  const [rotation,  setRotation]  = useState(0);
  const [result,    setResult]    = useState<{ type: SectionType; amount: number } | null>(null);

  const eligible = canSpinToday(lastSpinDate) && !spinning;

  // Build fully-computed sections once
  const sections = useMemo(() => {
    let cursor = 0;
    let coinIdx = 0;
    return DEFS.map((def) => {
      const deg       = def.type === 'opals' ? OPAL_DEG : COIN_DEG;
      const startDeg  = cursor;
      const endDeg    = cursor + deg;
      const centerDeg = cursor + deg / 2;
      const fillColor = def.type === 'opals' ? null : COIN_FILL(coinIdx);
      if (def.type === 'coins') coinIdx++;
      cursor += deg;
      return { ...def, startDeg, endDeg, centerDeg, fillColor };
    });
  }, []);

  const handleSpin = useCallback(() => {
    if (!eligible) return;
    setSpinning(true);
    setResult(null);

    // ── pick winner ─────────────────────────────────────────
    // 5 % opal, 95 % coins — pure random, no weighted arrays
    const hitOpal = Math.random() < 0.05;
    const pool    = sections.filter(s => s.type === (hitOpal ? 'opals' : 'coins'));
    const winner  = pool[Math.floor(Math.random() * pool.length)];

    // ── rotation math ────────────────────────────────────────
    // Pointer sits at 0° (top). We need winner.centerDeg to land at 0°.
    // Rotating the wheel CW by X means a point at angle A appears at (A + X) mod 360.
    // We want: (winner.centerDeg + X) ≡ 0  →  X = (360 - winner.centerDeg) % 360
    const currentMod  = ((rotation % 360) + 360) % 360;
    const targetAngle = (360 - winner.centerDeg) % 360;
    let   diff        = (targetAngle - currentMod + 360) % 360;
    if (diff < 30) diff += 360; // guarantee the wheel travels visibly
    const spins         = 7 + Math.floor(Math.random() * 4); // 7–10 full rotations
    const targetRotation = rotation + diff + spins * 360;

    setRotation(targetRotation);

    setTimeout(() => {
      setSpinning(false);
      const reward = { type: winner.type, amount: winner.amount };
      setResult(reward);
      onSpin(reward);
    }, 4200);
  }, [eligible, rotation, sections, onSpin]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[9998] bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          >
            <div
              className="w-full max-w-sm pointer-events-auto rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #1e1b4b 0%, #2e1065 60%, #1e1b4b 100%)',
                border: '1.5px solid rgba(139,92,246,0.35)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-5 pt-5 pb-1">
                <div>
                  <h2 className="text-white font-black text-lg leading-tight">Daily Spin</h2>
                  <p className="text-violet-300/70 text-xs mt-0.5">
                    {canSpinToday(lastSpinDate)
                      ? '5% chance of rare opals!'
                      : 'Come back tomorrow!'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/40 hover:text-white/80 transition-colors p-1"
                  type="button"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {/* ── Wheel ── */}
              <div className="relative flex justify-center items-center py-4">
                {/* Pointer arrow (points down into wheel) */}
                <div
                  className="absolute z-20"
                  style={{
                    top: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft:  '11px solid transparent',
                    borderRight: '11px solid transparent',
                    borderTop:   '20px solid #fff',
                    filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
                  }}
                />

                {/* Wheel ring */}
                <div
                  className="rounded-full"
                  style={{
                    padding: 4,
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.6), rgba(30,27,75,0.8))',
                    boxShadow: '0 0 32px rgba(139,92,246,0.3), 0 0 0 1px rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="rounded-full overflow-hidden" style={{ width: 288, height: 288 }}>
                    <svg
                      width="288"
                      height="288"
                      viewBox="0 0 300 300"
                      style={{ display: 'block' }}
                    >
                      <defs>
                        {/* Opal gradient */}
                        <linearGradient id="sw-opal" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%"   stopColor="#22D3EE" />
                          <stop offset="100%" stopColor="#7C3AED" />
                        </linearGradient>
                        {/* Opal glow filter */}
                        <filter id="sw-glow">
                          <feGaussianBlur stdDeviation="2" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      {/* ── Rotating group ── */}
                      <motion.g
                        style={{ transformOrigin: `${CX}px ${CY}px` }}
                        animate={{ rotate: rotation }}
                        transition={
                          spinning
                            ? { duration: 4.2, ease: [0.05, 0.8, 0.2, 1.0] }
                            : { duration: 0 }
                        }
                      >
                        {/* Dark background circle */}
                        <circle cx={CX} cy={CY} r={R + 2} fill="#0f0a1e" />

                        {/* Sections */}
                        {sections.map((s, i) => {
                          const isOpal = s.type === 'opals';
                          return (
                            <g key={i}>
                              <path
                                d={slicePath(s.startDeg, s.endDeg)}
                                fill={isOpal ? 'url(#sw-opal)' : s.fillColor!}
                                stroke="rgba(0,0,0,0.35)"
                                strokeWidth="1.5"
                              />

                              {/* Coin amount label */}
                              {!isOpal && (() => {
                                const [lx, ly] = toXY(s.centerDeg, R * 0.6);
                                return (
                                  <text
                                    x={lx}
                                    y={ly}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize="10.5"
                                    fontWeight="800"
                                    fontFamily="system-ui, sans-serif"
                                    fill="rgba(0,0,0,0.75)"
                                    transform={`rotate(${s.centerDeg}, ${lx}, ${ly})`}
                                  >
                                    {s.amount}
                                  </text>
                                );
                              })()}

                              {/* Opal slot indicator — two small diamonds */}
                              {isOpal && (() => {
                                const [dx, dy] = toXY(s.centerDeg, R * 0.68);
                                return (
                                  <g filter="url(#sw-glow)">
                                    <circle cx={dx} cy={dy} r={3.5} fill="white" opacity={0.95} />
                                  </g>
                                );
                              })()}
                            </g>
                          );
                        })}

                        {/* Spoke lines at section borders */}
                        {sections.map((s, i) => {
                          const [sx, sy] = toXY(s.startDeg, R);
                          return (
                            <line
                              key={`spoke-${i}`}
                              x1={CX} y1={CY}
                              x2={sx} y2={sy}
                              stroke="rgba(0,0,0,0.4)"
                              strokeWidth="1"
                            />
                          );
                        })}

                        {/* Center hub */}
                        <circle
                          cx={CX} cy={CY} r={HUB_R + 4}
                          fill="#0f0a1e"
                          stroke="rgba(139,92,246,0.5)"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={CX} cy={CY} r={HUB_R}
                          fill="url(#sw-opal)"
                          opacity={0.25}
                        />
                        <text
                          x={CX} y={CY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="18"
                        >
                          🎰
                        </text>
                      </motion.g>
                    </svg>
                  </div>
                </div>
              </div>

              {/* ── Result ── */}
              <div className="px-5" style={{ minHeight: 72 }}>
                <AnimatePresence>
                  {result && (
                    <motion.div
                      className="rounded-2xl px-4 py-3 flex items-center gap-3"
                      style={{
                        background: result.type === 'opals'
                          ? 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(124,58,237,0.22))'
                          : 'linear-gradient(135deg, rgba(253,230,138,0.18), rgba(245,158,11,0.18))',
                        border: `1px solid ${result.type === 'opals' ? 'rgba(139,92,246,0.45)' : 'rgba(245,158,11,0.4)'}`,
                      }}
                      initial={{ opacity: 0, y: 8, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0,  scale: 1    }}
                      exit={{    opacity: 0, y: 8,  scale: 0.92 }}
                    >
                      <span className="text-2xl">
                        {result.type === 'opals' ? '💎' : '🪙'}
                      </span>
                      <div>
                        <p className="text-white font-black text-sm leading-tight">
                          +{result.amount} {result.type === 'opals' ? 'Opals' : 'Coins'}
                        </p>
                        <p className="text-xs mt-0.5" style={{
                          color: result.type === 'opals' ? '#67e8f9' : '#fcd34d',
                        }}>
                          {result.type === 'opals' ? 'Rare reward! 🎉' : 'Nice spin!'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Spin button ── */}
              <div className="px-5 pt-3 pb-6">
                <motion.button
                  onClick={eligible ? handleSpin : onClose}
                  disabled={spinning}
                  className="w-full py-3.5 rounded-xl font-black text-base text-white transition-all disabled:cursor-not-allowed"
                  style={{
                    background: eligible
                      ? 'linear-gradient(135deg, #7C3AED, #4F46E5)'
                      : 'rgba(255,255,255,0.08)',
                    opacity: spinning ? 0.75 : 1,
                    border: eligible
                      ? '1px solid rgba(167,139,250,0.45)'
                      : '1px solid rgba(255,255,255,0.08)',
                  }}
                  whileTap={eligible ? { scale: 0.97 } : {}}
                >
                  {spinning
                    ? 'Spinning…'
                    : canSpinToday(lastSpinDate)
                      ? 'SPIN!'
                      : 'Come Back Tomorrow'}
                </motion.button>
                {!canSpinToday(lastSpinDate) && !spinning && (
                  <p className="text-center text-violet-400/50 text-xs mt-2">
                    Next spin available tomorrow 🌅
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
