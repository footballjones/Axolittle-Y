/**
 * Jimmy & Chubs's Aquarium — preset friend's special aquarium view.
 * Two axolotls live here: Jimmy & Chubs (both swim to wherever you tap).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import axolotlImg from '../../assets/axolotl.png';
import castleImg from '../../assets/jimmy-chubs/Jimmy and Chubs castle.png';

interface Pos { x: number; y: number }

// Chubs wanders to a new random spot every 2.5–5 seconds
function randomPos(excludeX?: number): Pos {
  let x = 15 + Math.random() * 65;
  // Keep some horizontal separation from Jimmy if supplied
  if (excludeX !== undefined && Math.abs(x - excludeX) < 15) {
    x = x > 50 ? x - 20 : x + 20;
  }
  return { x: Math.max(10, Math.min(85, x)), y: 25 + Math.random() * 45 };
}

interface Props {
  onBack: () => void;
}

export function JimmyChubsAquarium({ onBack }: Props) {
  // Stable bioluminescent particle data — generated once on mount
  const particles = useMemo(() => {
    const colors = [
      'rgba(56,189,248,1)',   // cyan
      'rgba(139,92,246,1)',   // violet
      'rgba(52,211,153,1)',   // teal
      'rgba(167,243,208,1)',  // mint
      'rgba(196,181,253,1)',  // lavender
      'rgba(103,232,249,1)',  // sky
    ];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: 3 + Math.random() * 93,
      y: 6 + Math.random() * 85,
      size: 2.5 + Math.random() * 3.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulseDuration: 2.2 + Math.random() * 3,
      driftY: -(3 + Math.random() * 9),
      driftX: (Math.random() - 0.5) * 7,
      delay: Math.random() * 5,
    }));
  }, []);

  const [jimmyPos, setJimmyPos] = useState<Pos>({ x: 30, y: 50 });
  const [chubsPos, setChubsPos] = useState<Pos>({ x: 65, y: 40 });
  const [ripple, setRipple] = useState<(Pos & { id: number }) | null>(null);
  const rippleIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const chubsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule next Chubs autonomous wander
  const scheduleChubs = useCallback((currentJimmyX: number) => {
    if (chubsTimerRef.current) clearTimeout(chubsTimerRef.current);
    const delay = 2500 + Math.random() * 2500;
    chubsTimerRef.current = setTimeout(() => {
      setChubsPos(prev => {
        const next = randomPos(currentJimmyX);
        if (Math.abs(next.x - prev.x) < 8 && Math.abs(next.y - prev.y) < 8) {
          next.x = next.x > 50 ? next.x - 15 : next.x + 15;
        }
        return next;
      });
      scheduleChubs(currentJimmyX);
    }, delay);
  }, []);

  useEffect(() => {
    scheduleChubs(jimmyPos.x);
    return () => { if (chubsTimerRef.current) clearTimeout(chubsTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = Math.max(8, Math.min(90, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(15, Math.min(82, ((clientY - rect.top) / rect.height) * 100));

    setJimmyPos({ x, y });

    // Chubs swims near the same spot with a small random offset
    const chubsX = Math.max(8, Math.min(90, x + (Math.random() * 16 - 8)));
    const chubsY = Math.max(15, Math.min(82, y + (Math.random() * 12 - 6)));
    setChubsPos({ x: chubsX, y: chubsY });

    // Ripple
    const id = ++rippleIdRef.current;
    setRipple({ x, y, id });
    setTimeout(() => setRipple(r => (r?.id === id ? null : r)), 700);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#041428' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 z-10 relative"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
        style={{ background: 'rgba(4,20,40,0.85)', borderBottom: '1px solid rgba(56,189,248,0.12)' }}
      >
        <motion.button
          onClick={onBack}
          whileTap={{ scale: 0.9 }}
          className="flex items-center justify-center w-8 h-8 rounded-full"
          style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.2)' }}
        >
          <ArrowLeft className="w-4 h-4 text-cyan-300" strokeWidth={2.5} />
        </motion.button>

        <div>
          <p className="text-[10px] text-cyan-400/60 font-bold tracking-widest uppercase leading-none mb-0.5">
            Visiting
          </p>
          <h2 className="text-white font-black text-base leading-none">
            Jimmy &amp; Chubs's Aquarium
          </h2>
        </div>

        {/* Name badges */}
        <div className="ml-auto flex gap-1.5">
          <span
            className="text-[9px] font-black px-2 py-0.5 rounded-full text-cyan-300"
            style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.25)' }}
          >
            Jimmy
          </span>
          <span
            className="text-[9px] font-black px-2 py-0.5 rounded-full text-violet-300"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            Chubs
          </span>
        </div>
      </div>

      {/* Aquarium */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{ cursor: 'crosshair' }}
        onClick={handleTap}
        onTouchStart={handleTap}
      >
        {/* Background image */}
        <img
          src={`${import.meta.env.BASE_URL}aquarium-bg.png`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />

        {/* Subtle tint */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(4,20,60,0.06)' }}
        />

        {/* Bioluminescent particles */}
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              boxShadow: `0 0 ${p.size * 2.5}px ${p.size * 1.5}px ${p.color.replace(',1)', ',0.55)')}`,
              zIndex: 1,
            }}
            animate={{
              opacity: [0.08, 1, 0.08],
              scale: [0.5, 1.4, 0.5],
              y: [0, p.driftY, 0],
              x: [0, p.driftX, 0],
            }}
            transition={{
              duration: p.pulseDuration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: p.delay,
            }}
          />
        ))}

        {/* Castle decoration — large, centered, behind axolotls */}
        <img
          src={castleImg}
          alt=""
          draggable={false}
          className="absolute pointer-events-none select-none"
          style={{
            bottom: '11%',
            left: '50%',
            transform: 'translateX(-50%) scaleY(1.32)',
            width: '91%',
            maxWidth: 548,
            objectFit: 'contain',
            filter: 'brightness(0.78) saturate(0.85) drop-shadow(0 8px 24px rgba(0,40,80,0.7))',
            opacity: 0.88,
            zIndex: 2,
          }}
        />

        {/* Ripple on tap */}
        {ripple && (
          <motion.div
            key={ripple.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: `${ripple.x}%`,
              top: `${ripple.y}%`,
              width: 40,
              height: 40,
              marginLeft: -20,
              marginTop: -20,
              border: '2px solid rgba(56,189,248,0.7)',
            }}
            initial={{ scale: 0.3, opacity: 0.9 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}

        {/* ── Jimmy (cyan tint) ── */}
        <motion.div
          animate={{ left: `${jimmyPos.x}%`, top: `${jimmyPos.y}%` }}
          transition={{ type: 'spring', stiffness: 55, damping: 14 }}
          className="absolute pointer-events-none"
          style={{ transform: 'translate(-50%, -50%)', zIndex: 10 }}
        >
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse, rgba(56,189,248,0.3) 0%, transparent 70%)',
              width: 140,
              height: 140,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%,-50%)',
            }}
          />
          <motion.img
            src={axolotlImg}
            alt="Jimmy"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 104, height: 104, objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.5))' }}
          />
          <p
            className="text-center text-[8px] font-black text-cyan-200 mt-0.5 leading-none"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
          >
            Jimmy
          </p>
        </motion.div>

        {/* ── Chubs (violet tint) ── */}
        <motion.div
          animate={{ left: `${chubsPos.x}%`, top: `${chubsPos.y}%` }}
          transition={{ type: 'spring', stiffness: 35, damping: 11 }}
          className="absolute pointer-events-none"
          style={{ transform: 'translate(-50%, -50%)', zIndex: 10 }}
        >
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse, rgba(139,92,246,0.3) 0%, transparent 70%)',
              width: 140,
              height: 140,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%,-50%)',
            }}
          />
          <motion.img
            src={axolotlImg}
            alt="Chubs"
            animate={{ y: [0, -4, 0], rotate: [0, 2, 0, -2, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 96,
              height: 96,
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.5)) hue-rotate(40deg)',
            }}
          />
          <p
            className="text-center text-[8px] font-black text-violet-300 mt-0.5 leading-none"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
          >
            Chubs
          </p>
        </motion.div>

        {/* Tap hint */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <span
            className="text-[10px] text-cyan-200/50 font-medium px-3 py-1 rounded-full"
            style={{ background: 'rgba(4,20,40,0.6)' }}
          >
            Tap anywhere to guide Jimmy &amp; Chubs
          </span>
        </div>
      </div>
    </div>
  );
}
