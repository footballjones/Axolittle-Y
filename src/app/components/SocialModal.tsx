import { useState, useEffect, useRef } from 'react';
import { X, Users, Copy, Check, ChevronDown, Heart, Waves, Plus, Leaf, Sparkles, ChevronRight, Gift, Trash2, BarChart2, Egg, Crown, Sprout, Dumbbell, Droplets, Clock, Fish, Trophy, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { Axolotl, Friend } from '../types/game';
import { motion, AnimatePresence } from 'motion/react';
import { GameIcon } from './icons';
import { ALL_ACHIEVEMENTS } from '../data/achievements';
import { ACHIEVEMENT_CATEGORIES, type AchievementCategory } from '../types/achievements';
import { fetchPlayerAchievements, fetchFriendSnapshot, FriendSnapshot, isSupabaseConfigured } from '../services/supabase';
import { AquariumBackground } from './AquariumBackground';
import axolotlImg from '../../assets/axolotl.png';
import axolotlRareImg from '../../assets/axolotl-rare-1.png';
import axolotlEpicImg from '../../assets/axolotl-epic-1.png';
import axolotlLegendaryImg from '../../assets/axolotl-legendary-1.png';

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

const JIMMY_CHUBS_ID = 'jimmy-chubs';

// ── Friend Aquarium Swimmer ───────────────────────────────────────────────────
// Lightweight read-only swimmer: same images as AxolotlDisplay, no food/play logic.

function getFriendAxolotlImg(rarity: string) {
  switch (rarity) {
    case 'Rare':      return axolotlRareImg;
    case 'Epic':      return axolotlEpicImg;
    case 'Legendary':
    case 'Mythic':    return axolotlLegendaryImg;
    default:          return axolotlImg;
  }
}

function getFriendAxolotlSize(stage: string) {
  switch (stage) {
    case 'hatchling': return 96;
    case 'sprout':    return 132;
    case 'guardian':  return 168;
    case 'elder':     return 186;
    default:          return 96;
  }
}

function FriendAxolotlSwimmer({ stage, name, rarity }: { stage: string; name: string; rarity: string }) {
  const [pos, setPos] = useState({ x: 50, y: 60 });
  const [facingLeft, setFacingLeft] = useState(false);
  const posRef = useRef({ x: 50, y: 60 });

  // Random swim every 10-18 seconds
  useEffect(() => {
    const swim = () => {
      const newX = Math.random() * 50 + 25; // 25-75%
      const newY = Math.random() * 30 + 35; // 35-65%
      setFacingLeft(newX < posRef.current.x);
      posRef.current = { x: newX, y: newY };
      setPos({ x: newX, y: newY });
    };
    const id = setInterval(swim, 10000 + Math.random() * 8000);
    return () => clearInterval(id);
  }, []);

  const size = getFriendAxolotlSize(stage);
  const img = getFriendAxolotlImg(rarity);

  return (
    <motion.div
      className="absolute"
      animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      transition={{ duration: 4, ease: [0.2, 0.8, 0.4, 1] }}
      style={{ transform: 'translate(-50%, -50%)', zIndex: 10 }}
    >
      {/* Bob animation */}
      <motion.div
        animate={{ y: [0, -6, 0, 4, 0], rotate: [0, -2, 0, 2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex flex-col items-center gap-1"
      >
        {/* Glow */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div style={{
            width: size * 1.6, height: size * 1.3,
            background: 'radial-gradient(ellipse at center, rgba(120,180,255,0.3) 0%, rgba(180,100,255,0.15) 35%, transparent 65%)',
            borderRadius: '50%', filter: 'blur(25px)',
          }} />
        </motion.div>
        <img
          src={img}
          alt={name}
          width={size}
          height={size}
          style={{
            transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)',
            filter: 'drop-shadow(0 0 8px rgba(160,120,255,0.4)) drop-shadow(0 0 20px rgba(100,180,255,0.3)) drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
        {/* Name label */}
        <div
          className="text-white font-black text-[10px] px-2.5 py-0.5 rounded-full whitespace-nowrap"
          style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          {name}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface SocialModalProps {
  onClose: () => void;
  axolotl: Axolotl;
  friendCode: string;
  friends: Friend[];
  onAddFriend: (code: string) => Promise<string | null>;
  onRemoveFriend: (friendId: string) => void;
  onBreed: (friendId: string) => void;
  onGiftFriend: (friendId: string, coins: number, opals: number) => void;
  onPokeFriend: (friendId: string) => void;
  onVisitJimmy: () => void;
  lineage: Axolotl[];
}

export function SocialModal({ onClose, axolotl, friendCode, friends, onAddFriend, onRemoveFriend, onBreed: _onBreed, onGiftFriend, onPokeFriend, onVisitJimmy, lineage }: SocialModalProps) {
  const [addFriendInput, setAddFriendInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'lineage'>('friends');
  const [expandedFriend, setExpandedFriend] = useState<string | null>(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [addFriendLoading, setAddFriendLoading] = useState(false);
  const [addFriendError, setAddFriendError] = useState<string | null>(null);
  const [visitingFriend, setVisitingFriend] = useState<Friend | null>(null);
  const [visitSnapshot, setVisitSnapshot] = useState<FriendSnapshot | null>(null);
  const [visitSnapshotLoading, setVisitSnapshotLoading] = useState(false);
  const [viewingStatsFriend, setViewingStatsFriend] = useState<Friend | null>(null);
  const [viewingAchievementsFriend, setViewingAchievementsFriend] = useState<Friend | null>(null);
  const [friendAchievementIds, setFriendAchievementIds] = useState<string[] | null>(null); // null = loading
  const fetchedFriendIdRef = useRef<string | null>(null);
  // Short-lived visual feedback states (2–2.5s after action)
  const [justPoked, setJustPoked] = useState<Set<string>>(new Set());
  const [justGifted, setJustGifted] = useState<Record<string, GiftResult>>({});
  // Tick so cooldown timers refresh every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fetch friend's appearance snapshot when visiting their aquarium
  useEffect(() => {
    if (!visitingFriend) {
      setVisitSnapshot(null);
      return;
    }
    setVisitSnapshot(null);
    setVisitSnapshotLoading(true);
    fetchFriendSnapshot(visitingFriend.id).then(snapshot => {
      setVisitSnapshot(snapshot);
      setVisitSnapshotLoading(false);
    }).catch(() => {
      setVisitSnapshotLoading(false);
    });
  }, [visitingFriend]);

  // Fetch real achievements from Supabase when viewing a friend's achievements
  useEffect(() => {
    if (!viewingAchievementsFriend) {
      setFriendAchievementIds(null);
      fetchedFriendIdRef.current = null;
      return;
    }
    // Avoid re-fetching for the same friend
    if (fetchedFriendIdRef.current === viewingAchievementsFriend.id) return;

    fetchedFriendIdRef.current = viewingAchievementsFriend.id;
    setFriendAchievementIds(null); // reset to loading

    if (isSupabaseConfigured) {
      fetchPlayerAchievements(viewingAchievementsFriend.id).then(ids => {
        setFriendAchievementIds(ids);
      }).catch(() => {
        // Fall back to inferred on error
        setFriendAchievementIds([]);
      });
    } else {
      // Supabase not available — use empty list (inferred data shown via inferFriendAchievements)
      setFriendAchievementIds([]);
    }
  }, [viewingAchievementsFriend]);

  // Infer which achievements a friend has earned based on their known data
  const inferFriendAchievements = (friend: Friend): Set<string> => {
    const earned = new Set<string>(friend.achievements ?? []);
    // Always: they have an axolotl → hatched it
    earned.add('hatchling');
    // Stage-based progression
    if (['sprout', 'guardian', 'elder'].includes(friend.stage)) earned.add('first-steps');
    if (['guardian', 'elder'].includes(friend.stage)) earned.add('all-grown-up');
    if (friend.stage === 'elder') earned.add('elder-wisdom');
    // Generation-based
    if (friend.generation >= 2) earned.add('circle-of-life');
    if (friend.generation >= 5) earned.add('dynasty');
    // Has at least us as a friend
    earned.add('first-friend');
    return earned;
  };

  const myCode = friendCode;

  const copyCode = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = async () => {
    if (!addFriendInput.trim() || addFriendLoading) return;
    setAddFriendLoading(true);
    setAddFriendError(null);
    const error = await onAddFriend(addFriendInput.trim());
    setAddFriendLoading(false);
    if (error) {
      setAddFriendError(error);
    } else {
      setAddFriendInput('');
      setAddFriendError(null);
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
                  <span className="relative z-10">{tab === 'friends' ? 'Friends' : 'Lineage'}</span>
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
                          // ── Special card for Jimmy & Chubs ──────────────────
                          if (friend.id === JIMMY_CHUBS_ID) {
                            return (
                              <motion.div
                                key={friend.id}
                                className="overflow-hidden rounded-2xl"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.06, type: 'spring', stiffness: 320, damping: 26 }}
                                style={{
                                  background: 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(139,92,246,0.10) 100%)',
                                  border: '1.5px solid rgba(56,189,248,0.35)',
                                  boxShadow: '0 2px 12px -3px rgba(56,189,248,0.15)',
                                }}
                              >
                                {/* Shimmer top line */}
                                <motion.div
                                  className="h-[1.5px] w-full"
                                  style={{ background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.6), rgba(139,92,246,0.4), transparent)' }}
                                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                <div className="px-3.5 py-3 flex items-center gap-3">
                                  {/* Avatar */}
                                  <div className="relative shrink-0">
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center"
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(56,189,248,0.3) 0%, rgba(139,92,246,0.25) 100%)',
                                        border: '1.5px solid rgba(56,189,248,0.4)',
                                        boxShadow: '0 2px 10px rgba(56,189,248,0.2)',
                                      }}
                                    >
                                      <Dumbbell className="w-4 h-4 text-sky-400" strokeWidth={2} />
                                    </div>
                                    {/* Star badge */}
                                    <div
                                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                                      style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', border: '1.5px solid white' }}
                                    >
                                      <Sparkles className="w-2 h-2 text-amber-900" strokeWidth={2.5} />
                                    </div>
                                  </div>

                                  {/* Name */}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-black" style={{ color: '#38bdf8' }}>
                                      Jimmy &amp; Chubs
                                    </div>
                                    <div className="text-[10px] font-semibold" style={{ color: 'rgba(139,92,246,0.8)' }}>
                                      Preset Friend · Always here for you
                                    </div>
                                  </div>

                                  {/* Visit button */}
                                  <motion.button
                                    onClick={(e) => { e.stopPropagation(); onVisitJimmy(); }}
                                    whileTap={{ scale: 0.9 }}
                                    className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl shrink-0"
                                    style={{
                                      background: 'linear-gradient(135deg, rgba(14,165,233,0.22), rgba(56,189,248,0.16))',
                                      border: '1px solid rgba(56,189,248,0.4)',
                                    }}
                                  >
                                    <Waves className="w-4 h-4 text-sky-500" strokeWidth={2} />
                                    <span className="text-[8px] font-black tracking-wide uppercase text-sky-500">Visit</span>
                                  </motion.button>
                                </div>
                              </motion.div>
                            );
                          }

                          // ── Regular friend card ──────────────────────────────
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
                                      <Users className="w-4 h-4 text-violet-400" strokeWidth={2} />
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

                                      {/* Action tiles — row 1: Visit + Stats + Achievements */}
                                      <div className="grid grid-cols-3 gap-2 mb-2">
                                        <motion.button
                                          onClick={(e) => { e.stopPropagation(); setVisitingFriend(friend); }}
                                          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl"
                                          style={{
                                            background: 'linear-gradient(135deg, rgba(14,165,233,0.18), rgba(6,182,212,0.14))',
                                            border: '1px solid rgba(14,165,233,0.35)',
                                          }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <Waves className="w-4 h-4 text-sky-500" strokeWidth={2} />
                                          <span className="text-[8px] font-black tracking-wide uppercase text-sky-600 text-center leading-tight">Visit Aquarium</span>
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
                                          <BarChart2 className="w-4 h-4 text-indigo-500" strokeWidth={2} />
                                          <span className="text-[8px] font-black tracking-wide uppercase text-indigo-600 text-center leading-tight">View Stats</span>
                                        </motion.button>
                                        <motion.button
                                          onClick={(e) => { e.stopPropagation(); setViewingAchievementsFriend(friend); }}
                                          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl"
                                          style={{
                                            background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,191,36,0.14))',
                                            border: '1px solid rgba(245,158,11,0.35)',
                                          }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <Trophy className="w-4 h-4 text-amber-500" strokeWidth={2} />
                                          <span className="text-[8px] font-black tracking-wide uppercase text-amber-600 text-center leading-tight">Achievements</span>
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
                                                onPokeFriend(friend.id);
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
                                              {justPokedThis ? <Sparkles className="w-5 h-5 text-amber-500" strokeWidth={2} /> : <ChevronRight className="w-5 h-5 text-amber-500" strokeWidth={2} />}
                                              <span className="text-[9px] font-black tracking-wide uppercase text-amber-600" style={{ lineHeight: 1.2 }}>
                                                {justPokedThis ? 'Poked!' : isPokeOnCooldown ? formatCooldown(pokeRemaining) : 'Poke'}
                                              </span>
                                            </motion.button>
                                          );
                                        })()}

                                        {/* Breed — Coming Soon */}
                                        <div
                                          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl relative overflow-hidden"
                                          style={{
                                            background: 'rgba(216,180,254,0.08)',
                                            border: '1px solid rgba(216,180,254,0.15)',
                                            opacity: 0.55,
                                            cursor: 'not-allowed',
                                          }}
                                        >
                                          <Egg className="w-5 h-5 text-purple-400/60" strokeWidth={2} />
                                          <span className="text-[9px] font-black tracking-wide uppercase text-purple-400/60">Hatch Together</span>
                                          <span className="text-[7px] font-bold tracking-widest uppercase text-purple-300/50">Coming Soon</span>
                                        </div>
                                      </div>

                                      {/* Send Gift - full width, 18h cooldown */}
                                      {(() => {
                                        const giftRemaining = getCooldownRemaining(`gift_${friend.id}`);
                                        const isGiftOnCooldown = giftRemaining > 0;
                                        const justGiftedThis = justGifted[friend.id];
                                        const giftLabel = justGiftedThis
                                          ? justGiftedThis.opals > 0
                                            ? `Sent ${justGiftedThis.opals} opals!`
                                            : `Sent ${justGiftedThis.coins} coins!`
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
                                            {justGiftedThis || isGiftOnCooldown ? <Check className="w-4 h-4 text-green-600" strokeWidth={2.5} /> : <Gift className="w-4 h-4 text-violet-600" strokeWidth={2} />}
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
                                        <Trash2 className="w-4 h-4 text-red-500" strokeWidth={2} />
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
                      <Droplets className="w-4 h-4 text-violet-500" />
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
                        <Droplets className="w-7 h-7 text-teal-500" strokeWidth={2} />
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
                        className="text-4xl flex items-center justify-center"
                        animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                      >
                        <Leaf className="w-10 h-10 text-violet-400/60" strokeWidth={1.5} />
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

      {/* ── Visit Aquarium Overlay (full-screen) ──────────────────────── */}
      <AnimatePresence>
        {visitingFriend && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[60] flex flex-col"
            style={{ background: '#041428' }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 z-10 relative flex-shrink-0"
              style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem', background: 'rgba(4,20,40,0.85)', borderBottom: '1px solid rgba(56,189,248,0.12)' }}
            >
              <motion.button
                onClick={() => setVisitingFriend(null)}
                whileTap={{ scale: 0.9 }}
                className="flex items-center justify-center w-11 h-11 rounded-full flex-shrink-0"
                style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.2)' }}
              >
                <ArrowLeft className="w-5 h-5 text-cyan-300" strokeWidth={2.5} />
              </motion.button>
              <div>
                <p className="text-[10px] text-cyan-400/60 font-bold tracking-widest uppercase leading-none mb-0.5">Visiting</p>
                <h2 className="text-white font-black text-base leading-none">{visitingFriend.name}'s Aquarium</h2>
              </div>
              {/* Info pills */}
              <div className="ml-auto flex gap-1.5 flex-wrap justify-end">
                <span
                  className="text-[9px] font-black px-2 py-0.5 rounded-full text-cyan-300"
                  style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.25)' }}
                >
                  {visitingFriend.axolotlName}
                </span>
                <span
                  className="text-[9px] font-black px-2 py-0.5 rounded-full text-violet-300"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
                >
                  {visitingFriend.stage.charAt(0).toUpperCase() + visitingFriend.stage.slice(1)}
                </span>
                <span
                  className="text-[9px] font-black px-2 py-0.5 rounded-full text-emerald-300"
                  style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)' }}
                >
                  Gen {visitingFriend.generation}
                </span>
              </div>
            </div>

            {/* Aquarium body */}
            <div className="flex-1 relative overflow-hidden">
              {visitSnapshotLoading ? (
                /* Loading state */
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" strokeWidth={2} />
                  <p className="text-cyan-300/60 text-sm">Loading aquarium…</p>
                </div>
              ) : (
                <>
                  {/* Background image + tint + decorations */}
                  <AquariumBackground
                    background={visitSnapshot?.bgColor ?? '#1e40af'}
                    decorations={visitSnapshot?.decorations ?? []}
                  />

                  {/* Floating bubbles */}
                  {[12, 31, 55, 74, 88].map((x, i) => (
                    <motion.div
                      key={i}
                      className="absolute bottom-0 rounded-full pointer-events-none"
                      style={{
                        left: `${x}%`,
                        width: `${5 + i * 2}px`,
                        height: `${5 + i * 2}px`,
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        zIndex: 5,
                      }}
                      animate={{ y: [0, '-100vh', 0], opacity: [0, 0.7, 0] }}
                      transition={{ duration: 4 + i * 0.8, repeat: Infinity, delay: i * 1.1, ease: 'easeInOut' }}
                    />
                  ))}

                  {/* Swimming axolotl */}
                  <FriendAxolotlSwimmer
                    stage={visitingFriend.stage}
                    name={visitingFriend.axolotlName}
                    rarity={visitSnapshot?.axolotlRarity ?? 'Common'}
                  />
                </>
              )}
            </div>
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
                    <div className="text-violet-200/70 text-[10px] font-bold tracking-widest uppercase mb-0.5">Profile</div>
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
                    <Droplets className="w-6 h-6 text-violet-500" strokeWidth={2} />
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
                  const stages: Friend['stage'][] = ['hatchling', 'sprout', 'guardian', 'elder'];
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
                          const stageIcons = [
                            <Egg key="egg" className="w-3.5 h-3.5" strokeWidth={2} />,
                            <Sprout key="sprout" className="w-3.5 h-3.5" strokeWidth={2} />,
                            <Droplets key="guardian" className="w-3.5 h-3.5" strokeWidth={2} />,
                            <Crown key="elder" className="w-3.5 h-3.5" strokeWidth={2} />,
                          ];
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
                              <span style={{ color: isActive ? '#6d28d9' : isPast ? '#a78bfa' : 'rgba(139,92,246,0.35)' }}>{stageIcons[i]}</span>
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
                  <Clock className="w-5 h-5 text-violet-400" />
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

      {/* ── Friend Achievements Overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {viewingAchievementsFriend && (() => {
          // Merge: real Supabase IDs (if loaded) + inferred from friend data
          const inferred = inferFriendAchievements(viewingAchievementsFriend);
          const isLoading = friendAchievementIds === null;
          const earned: Set<string> = isLoading
            ? inferred
            : new Set([...friendAchievementIds, ...inferred]);
          const earnedCount = ALL_ACHIEVEMENTS.filter(a => earned.has(a.id)).length;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}
              onClick={() => setViewingAchievementsFriend(null)}
            >
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.88, opacity: 0, y: 24 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-sm rounded-3xl overflow-hidden flex flex-col"
                style={{
                  background: 'linear-gradient(160deg, #fffbeb 0%, #fef3c7 50%, #fef9c3 100%)',
                  border: '1.5px solid rgba(245,158,11,0.4)',
                  boxShadow: '0 24px 64px -12px rgba(245,158,11,0.3)',
                  maxHeight: '80vh',
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  className="relative px-5 py-4 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%)' }}
                >
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                  }} />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <div className="text-amber-200/70 text-[10px] font-bold tracking-widest uppercase mb-0.5">Achievements</div>
                      <h3 className="text-white font-black text-lg leading-tight">{viewingAchievementsFriend.name}</h3>
                      <p className="text-amber-200/80 text-xs mt-0.5">
                        {isLoading ? 'Loading…' : `${earnedCount} / ${ALL_ACHIEVEMENTS.length} earned`}
                      </p>
                    </div>
                    <motion.button
                      onClick={() => setViewingAchievementsFriend(null)}
                      className="rounded-full p-1.5 flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                      whileTap={{ scale: 0.85 }}
                    >
                      <X className="w-4 h-4 text-white/80" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>

                {/* Loading state */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-8 h-8 rounded-full border-2 border-amber-300 border-t-amber-600"
                    />
                  </div>
                ) : (
                  /* Achievement list — scrollable */
                  <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
                    {(ACHIEVEMENT_CATEGORIES as { id: AchievementCategory; label: string; icon: string }[]).map(cat => {
                      const catAchievements = ALL_ACHIEVEMENTS.filter(a => a.category === cat.id);
                      const catEarned = catAchievements.filter(a => earned.has(a.id)).length;
                      return (
                        <div key={cat.id}>
                          {/* Category header */}
                          <div className="flex items-center gap-2 mb-2">
                            <GameIcon name={cat.icon} size={14} className="text-amber-600" />
                            <span className="text-[10px] font-black tracking-widest uppercase text-amber-700">{cat.label}</span>
                            <span className="text-[10px] text-amber-500/70 font-medium ml-auto">{catEarned}/{catAchievements.length}</span>
                          </div>
                          <div className="space-y-2">
                            {catAchievements.map(achievement => {
                              const isEarned = earned.has(achievement.id);
                              return (
                                <div
                                  key={achievement.id}
                                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                                  style={{
                                    background: isEarned
                                      ? 'rgba(255,255,255,0.8)'
                                      : 'rgba(255,255,255,0.35)',
                                    border: isEarned
                                      ? '1px solid rgba(245,158,11,0.4)'
                                      : '1px solid rgba(245,158,11,0.15)',
                                    opacity: isEarned ? 1 : 0.55,
                                  }}
                                >
                                  <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                      background: isEarned
                                        ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.2))'
                                        : 'rgba(0,0,0,0.06)',
                                      border: isEarned
                                        ? '1px solid rgba(245,158,11,0.4)'
                                        : '1px solid rgba(0,0,0,0.08)',
                                    }}
                                  >
                                    {isEarned
                                      ? <GameIcon name={achievement.icon} size={16} className="text-amber-600" />
                                      : <Lock className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                                    }
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-black leading-tight ${isEarned ? 'text-amber-900' : 'text-slate-500'}`}>
                                      {achievement.name}
                                    </p>
                                    <p className={`text-[10px] leading-snug mt-0.5 ${isEarned ? 'text-amber-700/80' : 'text-slate-400'}`}>
                                      {achievement.description}
                                    </p>
                                  </div>
                                  {isEarned && (
                                    <div
                                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                                    >
                                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
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
                    <Fish className="w-5 h-5 text-sky-500" />
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
                    value={addFriendInput}
                    onChange={e => { setAddFriendInput(e.target.value.toUpperCase()); setAddFriendError(null); }}
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
                    disabled={!friendCode.trim() || addFriendLoading}
                    className="rounded-xl px-4 py-2.5 text-xs font-black tracking-wide shrink-0"
                    style={{
                      background: friendCode.trim() && !addFriendLoading
                        ? 'linear-gradient(135deg, #38bdf8, #0ea5e9)'
                        : 'rgba(186,230,253,0.4)',
                      color: friendCode.trim() && !addFriendLoading ? '#fff' : 'rgba(14,165,233,0.4)',
                      border: '1px solid rgba(56,189,248,0.35)',
                      boxShadow: friendCode.trim() && !addFriendLoading ? '0 4px 12px -2px rgba(14,165,233,0.3)' : 'none',
                    }}
                    whileTap={friendCode.trim() && !addFriendLoading ? { scale: 0.92 } : {}}
                  >
                    {addFriendLoading ? 'Checking…' : 'Add'}
                  </motion.button>
                </div>
                {addFriendError && (
                  <p className="text-xs text-red-400 font-medium mt-2 px-1">{addFriendError}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}