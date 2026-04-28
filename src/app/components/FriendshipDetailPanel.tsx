/**
 * FriendshipDetailPanel — bottom-sheet that shows a single friendship's
 * progress, what's unlocked, and what's coming. Opened by tapping a
 * FriendshipRing.
 *
 * Locked-feature placeholders ("Hatch Together unlocks at level 3") are
 * shown for unlocks that ship in subsequent phases. They tell players what
 * to expect without promising fictional rewards.
 */

import { motion } from 'motion/react';
import { X, Egg, Sparkles, ShoppingBag, Crown, Lock } from 'lucide-react';
import { FriendshipRing } from './FriendshipRing';
import { xpWithinFriendshipLevel, xpSpanForFriendshipLevel } from '../services/supabase';

interface FriendshipDetailPanelProps {
  friendName: string;
  level: number;
  totalXp: number;
  capReachedToday: boolean;
  onClose: () => void;
}

interface UnlockSpec {
  level: number;
  icon: React.ElementType;
  title: string;
  description: string;
}

const UNLOCKS: UnlockSpec[] = [
  { level: 3,  icon: Egg,         title: 'Hatch Together',   description: 'Breed your axolotls to make a special egg.' },
  { level: 5,  icon: Sparkles,    title: 'Bonded Decoration', description: 'A unique decoration only the two of you have.' },
  { level: 7,  icon: ShoppingBag, title: 'Rare-Egg Trade',    description: 'Swap rare eggs with this friend.' },
  { level: 10, icon: Crown,       title: 'Best Friends',      description: 'A unique decoration that sparkles only at max.' },
];

export function FriendshipDetailPanel({ friendName, level, totalXp, capReachedToday, onClose }: FriendshipDetailPanelProps) {
  const within = xpWithinFriendshipLevel(totalXp, level);
  const span = xpSpanForFriendshipLevel(level);
  const isMax = level >= 10;

  // Progress text: "12 / 25 XP" or "Max level"
  const progressText = isMax ? 'Max level reached!' : `${within} / ${span} XP to level ${level + 1}`;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="relative w-full max-w-md rounded-t-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
          border: '1.5px solid rgba(167,139,250,0.35)',
          borderBottom: 'none',
          boxShadow: '0 -16px 48px rgba(80,0,200,0.35)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1.5 active:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white/70" strokeWidth={2.5} />
        </button>

        {/* Header — ring + name + progress */}
        <div className="px-5 pt-2 pb-5 flex flex-col items-center gap-3">
          <FriendshipRing level={level} totalXp={totalXp} size={88} strokeWidth={6} />
          <div className="text-center">
            <div className="text-[10px] font-black tracking-widest uppercase text-violet-300/70">Friendship with</div>
            <div className="text-white font-black text-xl mt-0.5">{friendName}</div>
            <div className="text-violet-200/80 text-[12px] font-bold mt-1.5">
              {isMax ? '⭐ Max level' : `Level ${level}`}
            </div>
          </div>

          {/* Progress bar (linear, complement to the ring) */}
          {!isMax && (
            <div className="w-full max-w-xs">
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #a78bfa, #f472b6)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(within / (span ?? 1)) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-violet-300/70 font-medium">{progressText}</span>
                {capReachedToday && (
                  <span className="text-[9px] font-black text-amber-300 uppercase tracking-wider">Daily cap reached</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Unlock list */}
        <div className="px-4 pb-5 space-y-1.5">
          <div className="text-[10px] font-black tracking-widest uppercase text-violet-300/70 px-1 mb-2">Unlocks</div>
          {UNLOCKS.map((u) => {
            const unlocked = level >= u.level;
            const Icon = u.icon;
            return (
              <div
                key={u.level}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{
                  background: unlocked ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.04)',
                  border: unlocked ? '1px solid rgba(167,139,250,0.45)' : '1px solid rgba(255,255,255,0.08)',
                  opacity: unlocked ? 1 : 0.65,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: unlocked ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)',
                    border: unlocked ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {unlocked ? (
                    <Icon className="w-4 h-4 text-violet-200" strokeWidth={2} />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-white/40" strokeWidth={2.5} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-black text-[12px]">{u.title}</span>
                    <span
                      className="text-[8px] font-black px-1.5 py-0.5 rounded-full"
                      style={{
                        background: unlocked ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.08)',
                        color: unlocked ? '#e9d5ff' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      Lv {u.level}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-white/55 mt-0.5 leading-snug">{u.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
