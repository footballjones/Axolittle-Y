/**
 * FriendshipRing — small SVG progress ring overlaid on a friend avatar.
 *
 * Shows the friendship level (number) in the center and a circular progress
 * arc representing XP within the current level. At level 10 the ring
 * displays a star instead of a fill — there's nowhere left to climb.
 *
 * Designed to sit in a 36–48px slot. Pure SVG, no external deps.
 */

import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { xpWithinFriendshipLevel, xpSpanForFriendshipLevel } from '../services/supabase';

interface FriendshipRingProps {
  level: number;
  totalXp: number;
  /** Size in pixels (square). Default 36. */
  size?: number;
  /** Stroke thickness in pixels. Default 3. */
  strokeWidth?: number;
  /** Tap handler — typically opens the FriendshipDetailPanel. */
  onTap?: () => void;
}

const LEVEL_COLORS: Record<number, { ring: string; fill: string; text: string }> = {
  0:  { ring: '#94a3b8', fill: '#cbd5e1', text: '#475569' },  // slate
  1:  { ring: '#94a3b8', fill: '#cbd5e1', text: '#475569' },
  2:  { ring: '#67e8f9', fill: '#a5f3fc', text: '#0e7490' },  // cyan — welcome bonus tier
  3:  { ring: '#86efac', fill: '#bbf7d0', text: '#15803d' },  // green — breeding unlock
  4:  { ring: '#86efac', fill: '#bbf7d0', text: '#15803d' },
  5:  { ring: '#fcd34d', fill: '#fde68a', text: '#a16207' },  // amber — bonded deco unlock
  6:  { ring: '#fcd34d', fill: '#fde68a', text: '#a16207' },
  7:  { ring: '#f9a8d4', fill: '#fbcfe8', text: '#be185d' },  // pink — rare-egg trade unlock
  8:  { ring: '#f9a8d4', fill: '#fbcfe8', text: '#be185d' },
  9:  { ring: '#c4b5fd', fill: '#ddd6fe', text: '#6d28d9' },  // violet
  10: { ring: '#fde047', fill: '#fef3c7', text: '#78350f' },  // gold — max
};

export function FriendshipRing({ level, totalXp, size = 36, strokeWidth = 3, onTap }: FriendshipRingProps) {
  const colors = LEVEL_COLORS[level] ?? LEVEL_COLORS[0];
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Progress arc: fraction of the current level filled.
  const within = xpWithinFriendshipLevel(totalXp, level);
  const span = xpSpanForFriendshipLevel(level);
  const progress = span ? Math.min(1, within / span) : 1;
  const dashOffset = circumference * (1 - progress);

  const isMax = level >= 10;

  const Wrapper = onTap ? motion.button : 'div';
  const wrapperProps = onTap
    ? { onClick: onTap, whileTap: { scale: 0.92 } as const, 'aria-label': `Friendship level ${level}` }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, padding: 0, background: 'transparent', border: 'none' }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.25)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        {!isMax && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
        )}
        {/* Max-level full ring */}
        {isMax && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={strokeWidth}
          />
        )}
        {/* Center fill */}
        <circle cx={size / 2} cy={size / 2} r={radius - strokeWidth} fill={colors.fill} />
      </svg>
      {/* Level number / max star */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: size, height: size }}>
        {isMax ? (
          <Star className="w-1/2 h-1/2" style={{ color: colors.text }} fill={colors.text} strokeWidth={0} />
        ) : (
          <span
            className="font-black leading-none"
            style={{ color: colors.text, fontSize: size * 0.42 }}
          >
            {level}
          </span>
        )}
      </div>
    </Wrapper>
  );
}
