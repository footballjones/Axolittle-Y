import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axolotlImg from '../../assets/axolotl.png';
import startingEggImg from '../../assets/eggs/Starting egg.png';

const TAP_THRESHOLD = 5;

type Phase = 'tapping' | 'hatching' | 'naming';

interface Props {
  onComplete: (name: string) => void;
}

// Deterministic particle spread so renders are stable
const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const radius = 140 + (i % 4) * 30;
  const colors = ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa', '#fb923c', '#c084fc'];
  return {
    id: i,
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    size: 8 + (i % 5) * 4,
    color: colors[i % colors.length],
  };
});

export function HatchingIntroScreen({ onComplete }: Props) {
  const [tapCount, setTapCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('tapping');
  const [name, setName] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const progress = tapCount / TAP_THRESHOLD;
  const crackLevel = tapCount >= 4 ? 3 : tapCount >= 3 ? 2 : tapCount >= 1 ? 1 : 0;

  const handleEggTap = useCallback(() => {
    if (phase !== 'tapping') return;
    const next = tapCount + 1;
    setShakeTrigger(t => t + 1);
    setTapCount(next);
    if (next >= TAP_THRESHOLD) {
      setPhase('hatching');
      setTimeout(() => setPhase('naming'), 2600);
    }
  }, [phase, tapCount]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onComplete(trimmed);
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0c1824 0%, #0f2035 45%, #142840 100%)' }}
    >
      {/* ── Ambient scene ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Pulsing depth glow */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: '25%', width: 320, height: 320,
            background: 'radial-gradient(circle, rgba(56,100,200,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
          animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.25, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Light rays */}
        {[12, 32, 55, 78].map((x, i) => (
          <motion.div
            key={`ray-${i}`}
            className="absolute top-0"
            style={{
              left: `${x}%`, width: 45, height: '55%',
              background: 'linear-gradient(180deg, rgba(100,180,255,0.045) 0%, transparent 100%)',
              transform: `skewX(${i % 2 === 0 ? -7 : 7}deg)`,
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.9 }}
          />
        ))}
        {/* Rising bubbles */}
        {[8, 22, 38, 58, 74, 91].map((x, i) => (
          <motion.div
            key={`bub-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${x}%`,
              width: 4 + (i % 3) * 3, height: 4 + (i % 3) * 3,
              border: '1px solid rgba(150,220,255,0.22)',
              background: 'radial-gradient(circle at 30% 30%, rgba(200,240,255,0.12), transparent)',
              bottom: -20,
            }}
            animate={{ y: -900, opacity: [0, 0.65, 0] }}
            transition={{ duration: 8 + i * 1.5, repeat: Infinity, ease: 'easeOut', delay: i * 1.3 }}
          />
        ))}
        {/* Kelp */}
        {[6, 16, 84, 94].map((x, i) => (
          <motion.div
            key={`kelp-${i}`}
            className="absolute bottom-0"
            style={{
              left: `${x}%`, width: 7,
              height: 50 + (i * 22) % 40,
              borderRadius: '4px 4px 0 0',
              background: 'linear-gradient(to top, rgba(16,185,129,0.22), rgba(52,211,153,0.04))',
            }}
            animate={{ skewX: [-3, 3, -3] }}
            transition={{ duration: 3.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
          />
        ))}
        {/* Sandy floor tint */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8"
          style={{ background: 'linear-gradient(to top, rgba(180,150,100,0.07), transparent)' }}
        />
      </div>

      {/* ── Phase content ── */}
      <AnimatePresence mode="wait">

        {/* ═══ TAPPING ═══ */}
        {phase === 'tapping' && (
          <motion.div
            key="tapping"
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.45 }}
          >
            {/* Title */}
            <p className="text-cyan-100/90 font-black text-xl mb-1 text-center drop-shadow-lg">
              A mysterious egg appeared!
            </p>
            <motion.p
              className="text-white/55 text-sm mb-14 text-center"
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              Tap it to help it hatch
            </motion.p>

            {/* Egg area */}
            <div className="relative flex items-center justify-center" style={{ width: 180, height: 220 }}>
              {/* Glow rings */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 170, height: 170,
                  background: `radial-gradient(ellipse, rgba(168,85,247,${0.15 + progress * 0.38}) 0%, transparent 70%)`,
                }}
                animate={{ scale: [1, 1.35, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 200, height: 200,
                  background: `radial-gradient(ellipse, rgba(100,180,255,${0.08 + progress * 0.15}) 0%, transparent 60%)`,
                }}
                animate={{ scale: [1.2, 1, 1.2] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Egg outer float */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center cursor-pointer select-none"
                animate={{ y: [0, -11, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                onClick={handleEggTap}
              >
                {/* Egg inner — remounts on each tap for spring shake */}
                <motion.div
                  key={shakeTrigger}
                  initial={shakeTrigger > 0 ? { scale: 1.09 } : {}}
                  animate={shakeTrigger > 0 ? {
                    rotate: [0, 15, -12, 9, -6, 3, 0],
                    scale: [1.09, 1.06, 1.04, 1.02, 1.01, 1, 1],
                  } : { rotate: 0, scale: 1 }}
                  transition={{ duration: 0.52, ease: 'easeOut' }}
                  whileTap={{ scale: 0.91 }}
                  style={{ position: 'relative', width: 228, height: 290 }}
                >
                  {/* Egg image */}
                  <img
                    src={startingEggImg}
                    alt="egg"
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      objectFit: 'contain',
                      filter: `drop-shadow(0 0 ${12 + progress * 32}px rgba(168,85,247,${0.4 + progress * 0.45}))`,
                    }}
                  />
                  {/* Crack SVG layer 1 */}
                  {crackLevel >= 1 && (
                    <motion.svg initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      width="100%" height="100%" viewBox="0 0 110 140"
                      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                      <path d="M56,34 L52,58 L61,76 L55,102" stroke="rgba(110,35,170,0.52)" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </motion.svg>
                  )}
                  {/* Crack SVG layer 2 */}
                  {crackLevel >= 2 && (
                    <motion.svg initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      width="100%" height="100%" viewBox="0 0 110 140"
                      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                      <path d="M37,50 L44,66 L38,82" stroke="rgba(110,35,170,0.42)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      <path d="M76,46 L70,64 L75,80" stroke="rgba(110,35,170,0.42)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </motion.svg>
                  )}
                  {/* Crack SVG layer 3 */}
                  {crackLevel >= 3 && (
                    <motion.svg initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      width="100%" height="100%" viewBox="0 0 110 140"
                      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                      <path d="M50,27 L45,50 L54,63 L47,84" stroke="rgba(130,50,200,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      <path d="M67,30 L73,56 L64,72" stroke="rgba(130,50,200,0.46)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </motion.svg>
                  )}
                </motion.div>
              </motion.div>
            </div>

          </motion.div>
        )}

        {/* ═══ HATCHING ═══ */}
        {phase === 'hatching' && (
          <motion.div
            key="hatching"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
          >
            {/* Burst particles */}
            {PARTICLES.map(p => (
              <motion.div
                key={p.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: p.size, height: p.size,
                  background: p.color,
                  boxShadow: `0 0 8px ${p.color}`,
                  top: '50%', left: '50%',
                  marginTop: -p.size / 2, marginLeft: -p.size / 2,
                }}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
                transition={{ duration: 0.95, ease: 'easeOut', delay: 0.08 }}
              />
            ))}

            {/* White flash */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'white' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.55, times: [0, 0.22, 1] }}
            />

            {/* Egg shattering */}
            <motion.div
              style={{ width: 228, height: 290, position: 'absolute' }}
              animate={{ scale: [1, 1.45, 0.15, 0], rotate: [0, -22, 22, 0], opacity: [1, 1, 0.4, 0] }}
              transition={{ duration: 0.75, ease: 'easeInOut' }}
            >
              <img
                src={startingEggImg}
                alt="egg"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 0 40px rgba(168,85,247,0.95))',
                }}
              />
            </motion.div>

            {/* Axolotl pops in */}
            <motion.img
              src={axolotlImg}
              alt="Your axolotl!"
              style={{
                width: 230, height: 'auto', position: 'absolute',
                filter: 'drop-shadow(0 0 32px rgba(100,200,255,0.6))',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.35, 1], opacity: 1 }}
              transition={{ delay: 0.58, duration: 0.92, ease: [0.175, 0.885, 0.32, 1.275] }}
            />

            {/* "It hatched!" text */}
            <motion.div
              className="absolute text-center"
              style={{ bottom: '18%' }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.45 }}
            >
              <p className="text-white font-black text-2xl drop-shadow-lg">✨ It hatched! ✨</p>
            </motion.div>
          </motion.div>
        )}

        {/* ═══ NAMING ═══ */}
        {phase === 'naming' && (
          <motion.div
            key="naming"
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Floating axolotl */}
            <div className="flex-1 flex items-center justify-center">
              <motion.img
                src={axolotlImg}
                alt="Your axolotl"
                style={{
                  width: 230, height: 'auto',
                  filter: 'drop-shadow(0 0 30px rgba(100,200,255,0.45))',
                }}
                animate={{ y: [0, -14, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            {/* Name card — slides up */}
            <motion.div
              className="rounded-t-3xl px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
              style={{
                background: 'linear-gradient(180deg, rgba(30,27,75,0.97), rgba(20,15,55,0.99))',
                border: '1.5px solid rgba(167,139,250,0.3)',
                borderBottom: 'none',
                boxShadow: '0 -16px 50px rgba(80,0,200,0.22)',
              }}
              initial={{ y: 340 }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300, delay: 0.18 }}
            >
              <h2 className="text-white font-black text-2xl text-center mb-1">What's their name?</h2>
              <p className="text-violet-300/75 text-sm text-center mb-5">
                Give your axolotl a name to begin!
              </p>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter a name..."
                maxLength={20}
                className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none mb-4"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1.5px solid rgba(167,139,250,0.35)',
                }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
              <motion.button
                onClick={handleSubmit}
                disabled={!name.trim()}
                className="w-full py-4 rounded-xl font-black text-white text-lg disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
                whileTap={{ scale: 0.97 }}
              >
                Let's Go! 🎉
              </motion.button>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
