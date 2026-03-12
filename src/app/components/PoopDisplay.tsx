import { motion } from 'motion/react';
import { PoopItem } from '../types/game';
import { useMemo } from 'react';

interface PoopDisplayProps {
  poop: PoopItem;
  cleaningMode?: boolean;
  onClean?: (id: string) => void;
}

export function PoopDisplay({ poop, cleaningMode, onClean }: PoopDisplayProps) {
  // Slight random tilt per poop instance, stable across renders
  const tilt = useMemo(() => (((parseInt(poop.id.slice(-4), 16) % 40) - 20)), [poop.id]);
  // Slightly randomise scale so poops don't all look identical
  const scale = useMemo(() => 0.85 + (parseInt(poop.id.slice(-2), 16) % 30) / 100, [poop.id]);

  const handleClick = (e: React.MouseEvent) => {
    if (!cleaningMode || !onClean) return;
    e.stopPropagation(); // Don't trigger aquarium click-to-move
    onClean(poop.id);
  };

  return (
    <div
      className={cleaningMode ? 'cursor-pointer' : undefined}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: `${poop.x}%`,
        bottom: '10%',
        transform: `translateX(-50%) rotate(${tilt}deg) scale(${scale})`,
        zIndex: 20,
        pointerEvents: cleaningMode ? 'auto' : 'none',
      }}
    >
      {/* Cleaning mode: pulsing amber ring + "🧹 tap!" badge */}
      {cleaningMode && (
        <>
          <motion.div
            style={{
              position: 'absolute',
              inset: -10,
              borderRadius: '50%',
              border: '2.5px solid rgba(251,191,36,0.9)',
              pointerEvents: 'none',
            }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.88, 1.12, 0.88] }}
            transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            style={{
              position: 'absolute',
              top: -28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(254,243,199,0.97)',
              border: '1.5px solid rgba(251,191,36,0.7)',
              borderRadius: 12,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 800,
              color: '#92400e',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(251,191,36,0.3)',
            }}
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            🧹 Tap!
          </motion.div>
        </>
      )}
      {/* Real axolotl poop: long coiled/curved sausage, dark olive-brown */}
      <svg
        width="62"
        height="42"
        viewBox="0 0 120 50"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`poop-grad-${poop.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#5a3a1a" />
            <stop offset="40%"  stopColor="#6b4520" />
            <stop offset="100%" stopColor="#3d2510" />
          </linearGradient>
          <filter id={`poop-shadow-${poop.id}`}>
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
            <feOffset dx="0" dy="2" result="offset" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main body: gently S-curved elongated sausage */}
        <path
          d="M 5 25 C 18 10, 35 8, 50 20 S 75 35, 90 25 S 108 12, 115 17"
          stroke={`url(#poop-grad-${poop.id})`}
          strokeWidth="28.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `url(#poop-shadow-${poop.id})` }}
        />

        {/* Slightly lighter centre highlight to give depth */}
        <path
          d="M 15 22 C 30 11, 48 10, 62 20 S 82 30, 98 22"
          stroke="rgba(120, 70, 30, 0.5)"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Subtle segmentation lines */}
        {[28, 48, 68, 88].map((cx, i) => (
          <line
            key={i}
            x1={cx} y1="16"
            x2={cx + 2} y2="28"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}

        {/* Small tip at right end */}
        <path
          d="M 112 16 C 117 12, 121 16, 119 22"
          stroke="#3d2510"
          strokeWidth="15.6"
          fill="none"
          strokeLinecap="round"
        />

        {/* Tiny wavy steam lines — subtle */}
        <path
          d="M 35 7 C 33 4, 36 2, 34 0"
          stroke="rgba(180,140,80,0.25)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 58 5 C 56 2, 59 0, 57 -2"
          stroke="rgba(180,140,80,0.25)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
