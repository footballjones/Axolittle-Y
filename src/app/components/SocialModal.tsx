import { useState, useEffect } from 'react';
import { X, Users, Copy, Check, ChevronDown, Heart, Waves, Plus } from 'lucide-react';
import { Axolotl, Friend } from '../types/game';
import { generateFriendCode } from '../utils/storage';
import { motion, AnimatePresence } from 'motion/react';

interface GiftResult {
  coins: number;
  opals: number;
}

function rollGift(): GiftResult {
  const r = Math.random();
  if (r < 0.75) return { coins: 15, opals: 0 };
  if (r < 0.95) return { coins: 40, opals: 0 };
  return { coins: 0, opals: 3 };
}

// ── 18-hour cooldown helpers (localStorage-backed) ────────────────────────────
const SOCIAL_COOLDOWN_MS = 18 * 60 * 60 * 1000; // 18 hours

function getCooldownRemaining(key: string): number {
  const ts = localStorage.getItem(key);
  if (!ts) return 0;
  return Math.max(0, SOCIAL_COOLDOWN_MS - (Date.now() - parseInt(ts, 10)));
}

function recordCooldown(key: string) {
  localStorage.setItem(key, Date.now().toString());
}

function formatCooldown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface SocialModalProps {
  onClose: () => void;
  axolotl: Axolotl;
  friends: Friend[];
  onAddFriend: (code: string) => void;
  onRemoveFriend: (friendId: string) => void;
  onBreed: (friendId: string) => void;
  onGiftFriend: (friendId: string, coins: number, opals: number) => void;
  lineage: Axolotl[];
}

export function SocialModal({ onClose, axolotl, friends, onAddFriend, onRemoveFriend, onBreed, onGiftFriend, lineage }: SocialModalProps) {
  const [friendCode, setFriendCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'lineage'>('friends');
  const [expandedFriend, setExpandedFriend] = useState<string | null>(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [visitingFriend, setVisitingFriend] = useState<Friend | null>(null);
  const [viewingStatsFriend, setViewingStatsFriend] = useState<Friend | null>(null);
  // Short-lived visual feedback states (2–2.5s after action)
  const [justPoked, setJustPoked] = useState<Set<string>>(new Set());
  const [justGifted, setJustGifted] = useState<Record<string, GiftResult>>({});
  // Tick so cooldown timers refresh every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const myCode = generateFriendCode(axolotl);

  const copyCode = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = () => {
    if (friendCode.trim()) {
      onAddFriend(friendCode.trim());
      setFriendCode('');
      setShowAddFriendModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: 'rgba(88,28,135,0.22)', backdropFilter: 'blur(14px)' }}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 24 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Ambient glow orbs */}
        <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(192,132,252,0.35) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-10 -right-8 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.28) 0%, transparent 70%)' }} />

        {/* Main card */}
        <div
          className="relative flex flex-col overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 48%, #fce7f3 100%)',
            border: '1.5px solid rgba(216,180,254,0.55)',
            borderRadius: '28px',
            boxShadow: '0 24px 64px -12px rgba(139,92,246,0.28), 0 8px 24px -4px rgba(244,114,182,0.15), inset 0 1px 0 rgba(255,255,255,0.9)',
            maxHeight: '90vh',
          }}
        >
          {/* Header */}
          <div className="relative flex-shrink-0 px-5 pt-5 pb-4">
            {/* Decorative wave */}
            <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)' }} />

            <div className="flex items-start justify-between">
              <div>
                {/* Wordmark */}
                <h2
                  className="font-black tracking-tight"
                  style={{
                    fontSize: '1.6rem',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 50%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.1,
                  }}
                >
                  Social
                </h2>
                <p className="text-violet-400/70 text-[11px] font-medium mt-0.5">Connect · Hatch Together · Visit</p>
              </div>

              <motion.button
                onClick={onClose}
                className="rounded-full p-2 border border-violet-200/60 active:bg-violet-100/80 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.6)' }}
                whileTap={{ scale: 0.85, rotate: 90 }}
              >
                <X className="w-4 h-4 text-violet-400" strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* Pill tabs */}
            <div
              className="flex gap-1 mt-4 p-1 rounded-2xl"
              style={{ background: 'rgba(216,180,254,0.25)', border: '1px solid rgba(216,180,254,0.35)' }}
            >
              {(['friends', 'lineage'] as const).map(tab => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="relative flex-1 py-1.5 rounded-xl capitalize text-[12px] font-bold transition-colors"
                  style={{ color: activeTab === tab ? '#6d28d9' : 'rgba(139,92,246,0.5)' }}
                  whileTap={{ scale: 0.96 }}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="socialTab"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(139,92,246,0.18)' }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                  <span className="relative z-10">{tab === 'friends' ? '🫧 Friends' : '🌿 Lineage'}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-4 pb-5 pt-3" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
            <AnimatePresence mode="wait">
              {activeTab === 'friends' && (
                <motion.div
                  key="friends"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Friends list */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5 px-0.5">
                      <span className="text-violet-700 text-[11px] font-black tracking-wider uppercase">Friends</span>
                      <div
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-violet-500"
                        style={{ background: 'rgba(216,180,254,0.35)', border: '1px solid rgba(196,181,253,0.4)' }}
                      >
                        {friends.length}
                      </div>
                      <motion.button
                        onClick={() => setShowAddFriendModal(true)}
                        className="rounded-full p-1.5 active:scale-90 flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(167,139,250,0.5), rgba(139,92,246,0.4))',
                          border: '1px solid rgba(139,92,246,0.35)',
                        }}
                        whileTap={{ scale: 0.85 }}
                      >
                        <Plus className="w-3.5 h-3.5 text-violet-600" strokeWidth={2.5} />
                      </motion.button>
                    </div>

                    {friends.length === 0 ? (
                      <motion.div
                        className="flex flex-col items-center justify-center py-10 gap-3 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.5)', border: '1.5px dashed rgba(216,180,254,0.5)' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Users className="w-10 h-10 text-violet-300" strokeWidth={1.5} />
                        </motion.div>
                        <p className="text-violet-400/80 text-[12px] font-medium text-center px-4">
                          No friends yet — share your code to connect!
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-2">
                        {friends.map((friend, index) => {
                          const isExpanded = expandedFriend === friend.id;
                          return (
                            <motion.div
                              key={friend.id}
                              className="overflow-hidden rounded-2xl"
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.06, type: 'spring', stiffness: 320, damping: 26 }}
                              style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(245,240,255,0.82) 100%)',
                                border: isExpanded
                                  ? '1.5px solid rgba(167,139,250,0.55)'
                                  : '1.5px solid rgba(216,180,254,0.45)',
                                boxShadow: isExpanded
                                  ? '0 6px 24px -4px rgba(139,92,246,0.18)'
                                  : '0 2px 10px -3px rgba(139,92,246,0.08)',
                              }}
                            >
                              {/* Shimmer top line */}
                              <motion.div
                                className="h-[1.5px] w-full"
                                style={{ background: 'linear-gradient(90deg, transparent, rgba(196,181,253,0.6), transparent)' }}
                                animate={{ opacity: [0.4, 0.9, 0.4] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
                              />

                              {/* Tappable tile */}
                              <motion.button
                                className="w-full px-3.5 py-3 text-left"
                                onClick={() => setExpandedFriend(isExpanded ? null : friend.id)}
                                whileTap={{ scale: 0.975 }}
                              >
                                <div className="flex items-center gap-3">
                                  {/* Avatar */}
                                  <div className="relative shrink-0">
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center"
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(216,180,254,0.6) 0%, rgba(167,139,250,0.45) 100%)',
                                        border: '1.5px solid rgba(196,181,253,0.5)',
                                        boxShadow: '0 2px 10px rgba(139,92,246,0.18)',
                                      }}
                                    >
                                      <span className="text-base">🦎</span>
                                    </div>
                                    {/* Online dot */}
                                    <div
                                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                                      style={{ background: '#34d399', borderColor: '#f5f3ff', boxShadow: '0 0 6px rgba(52,211,153,0.6)' }}
                                    />
                                  </div>

                                  {/* Name + status */}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-violet-900 text-[13px] truncate" style={{ fontWeight: 700 }}>{friend.name}</div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 4px rgba(52,211,153,0.7)' }} />
                                      <span className="text-emerald-500 text-[10px] font-semibold">Online</span>
                                    </div>
                                  </div>

                                  {/* Chevron pill */}
                                  <div
                                    className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full transition-all"
                                    style={{
                                      background: isExpanded ? 'rgba(139,92,246,0.2)' : 'rgba(216,180,254,0.3)',
                                      border: isExpanded ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(196,181,253,0.45)',
                                    }}
                                  >
                                    <motion.div
                                      animate={{ rotate: isExpanded ? 180 : 0 }}
                                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    >
                                      <ChevronDown className="w-3 h-3 text-violet-400" strokeWidth={2.5} />
                                    </motion.div>
                                  </div>
                                </div>
                              </motion.button>

                              {/* Expandable actions */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                    className="overflow-hidden"
                                  >
                                    {/* Divider */}
                                    <div className="mx-3.5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(196,181,253,0.5), transparent)' }} />

                                    {/* Friend details */}
                                    <div className="px-3.5 py-2.5">
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[10px] text-violet-500/70 font-medium capitalize">
                                          {friend.axolotlName} · Gen {friend.generation} · {friend.stage}
                                        </span>
                                      </div>

                                      {/* Action tiles — row 1: Visit + Stats */}
                                      <div className="grid grid-cols-2 gap-2 mb-2">
                                        <motion.button
                                          onClick={(e) => { e.stopPropagation(); setVisitingFriend(friend); }}
                                          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl"
                                          style={{
                                            background: 'linear-gradient(135deg, rgba(14,165,233,0.18), rgba(6,182,212,0.14))',
                                            border: '1px solid rgba(14,165,233,0.35)',
                                          }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <span className="text-[1.2rem]">🏊</span>
                                          <span className="text-[9px] font-black tracking-wide uppercase text-sky-600">Visit Aquarium</span>
                                        </motion.button>
                                        <motion.button
                                          onClick={(e) => { e.stopPropagation(); setViewingStatsFriend(friend); }}
                                          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl"
                                          style={{
                                            background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.14))',
                                            border: '1px solid rgba(99,102,241,0.35)',
                                          }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <span className="text-[1.2rem]">📊</span>
                                          <span className="text-[9px] font-black tracking-wide uppercase text-indigo-600">View Stats</span>
                                        </motion.button>
                                      </div>

                                      {/* Action tiles — row 2: Poke + Breed */}
                                      <div className="grid grid-cols-2 gap-2 mb-2">
                                        {/* Poke — 18h cooldown */}
                                        {(() => {
                                          const pokeRemaining = getCooldownRemaining(`poke_${friend.id}`);
                                          const isPokeOnCooldown = pokeRemaining > 0;
                                          const justPokedThis = justPoked.has(friend.id);
                                          const pokeActive = justPokedThis || isPokeOnCooldown;
                                          return (
                                            <motion.button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (isPokeOnCooldown || justPokedThis) return;
                                                recordCooldown(`poke_${friend.id}`);
                                                setJustPoked(prev => { const next = new Set(prev); next.add(friend.id); return next; });
                                                setTimeout(() => {
                                                  setJustPoked(prev => { const next = new Set(prev); next.delete(friend.id); return next; });
                                                  setTick(t => t + 1);
                                                }, 2000);
                                              }}
                                              className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl"
                                              style={{
                                                background: pokeActive
                                                  ? 'linear-gradient(135deg, rgba(134,239,172,0.4), rgba(74,222,128,0.3))'
                                                  : 'linear-gradient(135deg, rgba(254,240,138,0.5), rgba(253,224,71,0.35))',
                                                border: pokeActive
                                                  ? '1px solid rgba(74,222,128,0.4)'
                                                  : '1px solid rgba(250,204,21,0.4)',
                                                opacity: isPokeOnCooldown && !justPokedThis ? 0.6 : 1,
                                              }}
                                              whileTap={pokeActive ? {} : { scale: 0.9 }}
                                            >
                                              <span className="text-[1.2rem]">{justPokedThis ? '✨' : '👉'}</span>
                                              <span className="text-[9px] font-black tracking-wide uppercase text-amber-600" style={{ lineHeight: 1.2 }}>
                                                {justPokedThis ? 'Poked!' : isPokeOnCooldown ? formatCooldown(pokeRemaining) : 'Poke'}
                                              </span>
                                            </motion.button>
                                          );
                                        })()}

                                        {/* Breed */}
                                        <motion.button
                                          onClick={() => onBreed(friend.id)}
                                          disabled={axolotl.stage !== 'adult'}
                                          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl"
                                          style={{
                                            background: axolotl.stage === 'adult'
                                              ? 'linear-gradient(135deg, rgba(251,207,232,0.55), rgba(249,168,212,0.4))'
                                              : 'rgba(216,180,254,0.15)',
                                            border: axolotl.stage === 'adult'
                                              ? '1px solid rgba(244,114,182,0.4)'
                                              : '1px solid rgba(216,180,254,0.2)',
                                            opacity: axolotl.stage !== 'adult' ? 0.5 : 1,
                                          }}
                                          whileTap={axolotl.stage === 'adult' ? { scale: 0.9 } : {}}
                                        >
                                          <span className="text-[1.2rem]">🥚</span>
                                          <span className="text-[9px] font-black tracking-wide uppercase text-pink-500">Hatch Together</span>
                                        </motion.button>
                                      </div>

                                      {/* Send Gift - full width, 18h cooldown */}
                                      {(() => {
                                        const giftRemaining = getCooldownRemaining(`gift_${friend.id}`);
                                        const isGiftOnCooldown = giftRemaining > 0;
                                        const justGiftedThis = justGifted[friend.id];
                                        const giftLabel = justGiftedThis
                                          ? justGiftedThis.opals > 0
                                            ? `+${justGiftedThis.opals} Opals! ✨`
                                            : `+${justGiftedThis.coins} Coins! 🪙`
                                          : isGiftOnCooldown
                                            ? formatCooldown(giftRemaining)
                                            : null;
                                        return (
                                          <motion.button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isGiftOnCooldown || justGiftedThis) return;
                                              const gift = rollGift();
                                              onGiftFriend(friend.id, gift.coins, gift.opals);
                                              recordCooldown(`gift_${friend.id}`);
                                              setJustGifted(prev => ({ ...prev, [friend.id]: gift }));
                                              setTimeout(() => {
                                                setJustGifted(prev => {
                                                  const next = { ...prev };
                                                  delete next[friend.id];
                                                  return next;
                                                });
                                                setTick(t => t + 1);
                                              }, 2500);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mb-2"
                                            style={{
                                              background: justGiftedThis || isGiftOnCooldown
                                                ? 'linear-gradient(135deg, rgba(134,239,172,0.45), rgba(74,222,128,0.35))'
                                                : 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.14))',
                                              border: justGiftedThis || isGiftOnCooldown
                                                ? '1px solid rgba(74,222,128,0.45)'
                                                : '1px solid rgba(139,92,246,0.35)',
                                              opacity: isGiftOnCooldown && !justGiftedThis ? 0.6 : 1,
                                            }}
                                            whileTap={justGiftedThis || isGiftOnCooldown ? {} : { scale: 0.95 }}
                                          >
                                            <span className="text-[1rem]">{justGiftedThis || isGiftOnCooldown ? '✅' : '🎁'}</span>
                                            <span
                                              className="text-[10px] font-black tracking-wide uppercase"
                                              style={{ color: justGiftedThis || isGiftOnCooldown ? '#16a34a' : '#6d28d9' }}
                                            >
                                              {giftLabel ?? 'Send Gift'}
                                            </span>
                                          </motion.button>
                                        );
                                      })()}

                                      {/* Delete friend button - full width */}
                                      <motion.button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm(`Remove ${friend.name} from your friends list?`)) {
                                            onRemoveFriend(friend.id);
                                            setExpandedFriend(null);
                                          }
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl"
                                        style={{
                                          background: 'linear-gradient(135deg, rgba(254,226,226,0.6), rgba(252,165,165,0.4))',
                                          border: '1px solid rgba(239,68,68,0.4)',
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <span className="text-[1rem]">🗑️</span>
                                        <span className="text-[10px] font-black tracking-wide uppercase text-red-600">Remove Friend</span>
                                      </motion.button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Your code card */}
                  <div
                    className="rounded-2xl p-3.5"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(245,240,255,0.9) 100%)',
                      border: '1.5px solid rgba(216,180,254,0.5)',
                      boxShadow: '0 4px 16px -4px rgba(139,92,246,0.1)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">🪬</span>
                      <span className="text-violet-700 text-[11px] font-black tracking-wider uppercase">Your Code</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 rounded-xl px-3 py-2 font-mono text-violet-800 text-xs tracking-widest"
                        style={{ background: 'rgba(237,233,254,0.8)', border: '1px solid rgba(196,181,253,0.5)' }}
                      >
                        {myCode}
                      </div>
                      <motion.button
                        onClick={copyCode}
                        className="rounded-xl p-2 active:scale-90"
                        style={{
                          background: copied
                            ? 'linear-gradient(135deg, rgba(134,239,172,0.6), rgba(74,222,128,0.5))'
                            : 'linear-gradient(135deg, rgba(167,139,250,0.5), rgba(139,92,246,0.4))',
                          border: copied ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(139,92,246,0.35)',
                        }}
                        whileTap={{ scale: 0.88 }}
                      >
                        {copied
                          ? <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                          : <Copy className="w-4 h-4 text-violet-600" strokeWidth={2} />
                        }
                      </motion.button>
                    </div>
                  </div>

                </motion.div>
              )}

              {activeTab === 'lineage' && (
                <motion.div
                  key="lineage"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Current axolotl hero card */}
                  <div
                    className="relative rounded-2xl p-4 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(216,180,254,0.55) 0%, rgba(196,181,253,0.4) 50%, rgba(251,207,232,0.4) 100%)',
                      border: '1.5px solid rgba(167,139,250,0.45)',
                      boxShadow: '0 6px 24px -6px rgba(139,92,246,0.2)',
                    }}
                  >
                    {/* Gloss */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)' }} />

                    <div className="relative flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl shadow-lg shrink-0"
                        style={{
                          backgroundColor: axolotl.color + '55',
                          borderColor: axolotl.color + 'aa',
                          boxShadow: `0 4px 16px ${axolotl.color}44`,
                        }}
                      >
                        🦎
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-violet-900 font-black text-base">{axolotl.name}</span>
                          <span
                            className="text-[9px] font-black text-violet-500 px-2 py-0.5 rounded-full capitalize"
                            style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(196,181,253,0.5)' }}
                          >
                            {axolotl.stage}
                          </span>
                        </div>
                        <div className="text-violet-600/70 text-[11px] mt-0.5 font-medium">
                          Generation {axolotl.generation} · {Math.floor(axolotl.age)} min old
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Heart className="w-3 h-3 text-pink-400" fill="#f472b6" strokeWidth={0} />
                          <span className="text-pink-500 text-[10px] font-bold">Current Axolotl</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ancestors */}
                  {lineage.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 px-0.5">
                        <Waves className="w-3.5 h-3.5 text-teal-400" strokeWidth={2} />
                        <span className="text-violet-700 text-[11px] font-black tracking-wider uppercase">Ancestors</span>
                        <div
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-teal-500"
                          style={{ background: 'rgba(204,251,241,0.6)', border: '1px solid rgba(94,234,212,0.4)' }}
                        >
                          {lineage.length}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {lineage.slice().reverse().map((ancestor, index) => (
                          <motion.div
                            key={ancestor.id}
                            className="rounded-2xl p-3.5 flex items-center gap-3"
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            style={{
                              background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(240,253,250,0.8) 100%)',
                              border: '1.5px solid rgba(153,246,228,0.5)',
                              boxShadow: '0 2px 10px -3px rgba(20,184,166,0.1)',
                            }}
                          >
                            <div
                              className="w-10 h-10 rounded-full shrink-0 border-2 shadow-md"
                              style={{
                                backgroundColor: ancestor.color + '55',
                                borderColor: ancestor.color + '99',
                                boxShadow: `0 2px 8px ${ancestor.color}44`,
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-teal-900 font-bold text-[13px] truncate">{ancestor.name}</div>
                              <div className="text-teal-600/70 text-[11px] font-medium">
                                Gen {ancestor.generation} · {Math.floor(ancestor.age)} min lived
                              </div>
                            </div>
                            <div
                              className="text-[10px] font-black text-teal-500 px-2 py-1 rounded-full capitalize shrink-0"
                              style={{ background: 'rgba(204,251,241,0.5)', border: '1px solid rgba(94,234,212,0.4)' }}
                            >
                              Gen {ancestor.generation}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <motion.div
                      className="flex flex-col items-center justify-center py-10 gap-3 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.5)', border: '1.5px dashed rgba(216,180,254,0.5)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.span
                        className="text-4xl"
                        animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                      >
                        🌿
                      </motion.span>
                      <p className="text-violet-400/80 text-[12px] font-medium text-center px-6">
                        No ancestors yet — this is your first generation!
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Visit Aquarium Overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {visitingFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}
            onClick={() => setVisitingFriend(null)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl"
              style={{
                background: 'linear-gradient(160deg, #0c4a6e 0%, #075985 40%, #0369a1 100%)',
                border: '1.5px solid rgba(56,189,248,0.4)',
                boxShadow: '0 24px 64px -12px rgba(2,132,199,0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bubbles decoration */}
              {[
                { size: 'w-24 h-24', pos: '-top-8 -right-8', opacity: 0.08 },
                { size: 'w-16 h-16', pos: 'top-4 -left-6', opacity: 0.06 },
                { size: 'w-32 h-32', pos: '-bottom-12 -left-10', opacity: 0.07 },
              ].map((b, i) => (
                <div
                  key={i}
                  className={`absolute ${b.size} ${b.pos} rounded-full pointer-events-none`}
                  style={{ background: 'white', opacity: b.opacity }}
                />
              ))}

              {/* Aquarium scene */}
              <div className="relative px-5 pt-6 pb-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-sky-200/70 text-[10px] font-bold tracking-widest uppercase mb-0.5">🏊 Visiting</div>
                    <h3 className="text-white font-black text-lg leading-tight">{visitingFriend.name}'s Aquarium</h3>
                  </div>
                  <motion.button
                    onClick={() => setVisitingFriend(null)}
                    className="rounded-full p-1.5 flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                    whileTap={{ scale: 0.85 }}
                  >
                    <X className="w-4 h-4 text-white/80" strokeWidth={2.5} />
                  </motion.button>
                </div>

                {/* Tank window */}
                <div
                  className="relative rounded-2xl overflow-hidden mb-4"
                  style={{
                    background: 'linear-gradient(180deg, rgba(6,182,212,0.25) 0%, rgba(2,132,199,0.15) 60%, rgba(12,74,110,0.4) 100%)',
                    border: '1.5px solid rgba(56,189,248,0.3)',
                    height: '160px',
                  }}
                >
                  {/* Water shimmer */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%, rgba(255,255,255,0.03) 100%)',
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* Floating bubbles */}
                  {[15, 40, 65, 82].map((x, i) => (
                    <motion.div
                      key={i}
                      className="absolute bottom-0 rounded-full"
                      style={{
                        left: `${x}%`,
                        width: `${6 + i * 2}px`,
                        height: `${6 + i * 2}px`,
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                      animate={{ y: [0, -130, 0], opacity: [0, 0.8, 0] }}
                      transition={{
                        duration: 3 + i * 0.7,
                        repeat: Infinity,
                        delay: i * 0.9,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                  {/* Floor seaweed */}
                  <div className="absolute bottom-2 left-4 text-2xl select-none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🌿</div>
                  <div className="absolute bottom-2 right-6 text-xl select-none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🪸</div>
                  {/* Axolotl */}
                  <motion.div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                    animate={{ y: [-4, 4, -4] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <span className="text-5xl select-none" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}>🦎</span>
                    <div
                      className="text-white font-black text-[11px] px-2.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                      {visitingFriend.axolotlName}
                    </div>
                  </motion.div>
                </div>

                {/* Friend info pills */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: visitingFriend.axolotlName, icon: '🦎' },
                    { label: `Gen ${visitingFriend.generation}`, icon: '🌿' },
                    { label: visitingFriend.stage.charAt(0).toUpperCase() + visitingFriend.stage.slice(1), icon: '⭐' },
                  ].map(({ label, icon }) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
                    >
                      <span className="text-[10px]">{icon}</span>
                      <span className="text-white/80 text-[10px] font-bold capitalize">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── View Stats Overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingStatsFriend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}
            onClick={() => setViewingStatsFriend(null)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl"
              style={{
                background: 'linear-gradient(160deg, #faf5ff 0%, #ede9fe 50%, #fce7f3 100%)',
                border: '1.5px solid rgba(167,139,250,0.45)',
                boxShadow: '0 24px 64px -12px rgba(139,92,246,0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="relative px-5 py-4 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4f46e5 100%)' }}
              >
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }} />
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="text-violet-200/70 text-[10px] font-bold tracking-widest uppercase mb-0.5">📊 Profile</div>
                    <h3 className="text-white font-black text-lg leading-tight">{viewingStatsFriend.name}</h3>
                  </div>
                  <motion.button
                    onClick={() => setViewingStatsFriend(null)}
                    className="rounded-full p-1.5 flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                    whileTap={{ scale: 0.85 }}
                  >
                    <X className="w-4 h-4 text-white/80" strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-3">
                {/* Axolotl profile row */}
                <div
                  className="flex items-center gap-3 rounded-2xl p-3"
                  style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(216,180,254,0.4)' }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, rgba(216,180,254,0.5), rgba(167,139,250,0.4))', border: '1.5px solid rgba(167,139,250,0.4)' }}
                  >
                    🦎
                  </div>
                  <div>
                    <div className="text-violet-900 font-black text-sm">{viewingStatsFriend.axolotlName}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-[9px] font-black text-violet-500 px-2 py-0.5 rounded-full capitalize"
                        style={{ background: 'rgba(237,233,254,0.8)', border: '1px solid rgba(196,181,253,0.4)' }}
                      >
                        {viewingStatsFriend.stage}
                      </span>
                      <span
                        className="text-[9px] font-black text-indigo-500 px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(238,242,255,0.8)', border: '1px solid rgba(165,180,252,0.4)' }}
                      >
                        Gen {viewingStatsFriend.generation}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stage progress */}
                {(() => {
                  const stages: Friend['stage'][] = ['baby', 'juvenile', 'adult', 'elder'];
                  const currentIdx = stages.indexOf(viewingStatsFriend.stage);
                  return (
                    <div
                      className="rounded-2xl p-3"
                      style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(216,180,254,0.4)' }}
                    >
                      <div className="text-[10px] font-black text-violet-500/80 tracking-widest uppercase mb-2.5">Life Stage</div>
                      <div className="flex items-center justify-between gap-1">
                        {stages.map((s, i) => {
                          const isActive = i === currentIdx;
                          const isPast = i < currentIdx;
                          const stageEmojis = ['🥚', '🌱', '🦎', '👑'];
                          return (
                            <div key={s} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className="w-full h-1.5 rounded-full"
                                style={{
                                  background: isPast || isActive
                                    ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                                    : 'rgba(216,180,254,0.3)',
                                }}
                              />
                              <span className="text-[14px]">{stageEmojis[i]}</span>
                              <span
                                className="text-[8px] font-bold capitalize"
                                style={{ color: isActive ? '#6d28d9' : isPast ? '#a78bfa' : 'rgba(139,92,246,0.35)' }}
                              >
                                {s}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Last active */}
                <div
                  className="rounded-2xl p-3 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(216,180,254,0.4)' }}
                >
                  <span className="text-lg">🕐</span>
                  <div>
                    <div className="text-[10px] font-black text-violet-500/80 tracking-widest uppercase">Last Active</div>
                    <div className="text-violet-800 font-bold text-xs mt-0.5">
                      {(() => {
                        const mins = Math.floor((Date.now() - viewingStatsFriend.lastSync) / 60_000);
                        if (mins < 1) return 'Just now';
                        if (mins < 60) return `${mins}m ago`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `${hrs}h ago`;
                        return `${Math.floor(hrs / 24)}d ago`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddFriendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-3"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowAddFriendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,249,255,0.95) 100%)',
                  border: '1.5px solid rgba(186,230,253,0.6)',
                  boxShadow: '0 12px 32px -8px rgba(14,165,233,0.2)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🐠</span>
                    <span className="text-sky-700 text-sm font-black tracking-wider uppercase">Add Friend</span>
                  </div>
                  <motion.button
                    onClick={() => setShowAddFriendModal(false)}
                    className="rounded-full p-1.5 active:scale-90"
                    style={{
                      background: 'rgba(186,230,253,0.3)',
                      border: '1px solid rgba(186,230,253,0.5)',
                    }}
                    whileTap={{ scale: 0.85 }}
                  >
                    <X className="w-4 h-4 text-sky-600" strokeWidth={2.5} />
                  </motion.button>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={friendCode}
                    onChange={e => setFriendCode(e.target.value.toUpperCase())}
                    placeholder="Enter friend code…"
                    className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sky-800 text-sm placeholder-sky-300/70 focus:outline-none focus:ring-2 focus:ring-sky-300/50 transition-all"
                    style={{ background: 'rgba(224,242,254,0.8)', border: '1px solid rgba(186,230,253,0.6)' }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddFriend();
                      }
                    }}
                  />
                  <motion.button
                    onClick={handleAddFriend}
                    disabled={!friendCode.trim()}
                    className="rounded-xl px-4 py-2.5 text-xs font-black tracking-wide shrink-0"
                    style={{
                      background: friendCode.trim()
                        ? 'linear-gradient(135deg, #38bdf8, #0ea5e9)'
                        : 'rgba(186,230,253,0.4)',
                      color: friendCode.trim() ? '#fff' : 'rgba(14,165,233,0.4)',
                      border: '1px solid rgba(56,189,248,0.35)',
                      boxShadow: friendCode.trim() ? '0 4px 12px -2px rgba(14,165,233,0.3)' : 'none',
                    }}
                    whileTap={friendCode.trim() ? { scale: 0.92 } : {}}
                  >
                    Add
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}