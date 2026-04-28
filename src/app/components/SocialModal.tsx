import { useState, useEffect, useRef } from 'react';
import { X, Users, Copy, Check, ChevronDown, Heart, Waves, Plus, Leaf, Sparkles, ChevronRight, Gift, Trash2, BarChart2, Egg, Crown, Sprout, Dumbbell, Droplets, Clock, Fish, Trophy, Lock, ArrowLeft, Loader2, Zap, Brain, Wind, Shield, MoreVertical, Flag, ShieldOff } from 'lucide-react';
import { Axolotl, Friend } from '../types/game';
import { calculateLevel } from '../utils/gameLogic';
import { motion, AnimatePresence } from 'motion/react';
import { GameIcon } from './icons';
import { ALL_ACHIEVEMENTS } from '../data/achievements';
import { ACHIEVEMENT_CATEGORIES, type AchievementCategory } from '../types/achievements';
import { fetchPlayerAchievements, fetchFriendSnapshot, FriendSnapshot, isSupabaseConfigured, blockUser, awardFriendshipXp } from '../services/supabase';
import { AquariumBackground } from './AquariumBackground';
import { SpineAxolotl } from './SpineAxolotl';
import { ReportUserModal } from './ReportUserModal';
import { FriendshipRing } from './FriendshipRing';
import { FriendshipDetailPanel } from './FriendshipDetailPanel';
import { LevelUpCelebration } from './LevelUpCelebration';
import { useFriendships } from '../hooks/useFriendships';
import { track, SocialEvents, ModerationEvents, FriendshipEvents } from '../utils/telemetry';
import { STICKERS } from '../data/stickers';
import { recordFriendVisit, recordFriendGift, getAllFriendStats, FriendStats } from '../utils/friendStats';

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

/**
 * Live-formats Add-Friend input to the canonical friend-code shape (3 chars,
 * dash, up to 5 chars). Strips non-alphanumeric, uppercases, and inserts the
 * dash at position 3 automatically. Caps the result at 9 visible chars
 * (3-5 + dash). Designed so a kid pasting a code with or without the dash
 * always gets the same valid result.
 */
function formatFriendCodeInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
}

// ── 18-hour poke cooldown helpers (localStorage-backed) ──────────────────────
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

// ── Daily gift limit (10 gifts per day, resets at midnight) ───────────────────
const GIFT_DAILY_LIMIT = 10;
const GIFT_COUNT_KEY = 'gift_daily_count';

interface GiftDailyCount {
  count: number;
  date: string; // YYYY-MM-DD
}

function getGiftDailyCount(): GiftDailyCount {
  const today = new Date().toISOString().split('T')[0];
  const raw = localStorage.getItem(GIFT_COUNT_KEY);
  if (!raw) return { count: 0, date: today };
  try {
    const data = JSON.parse(raw) as GiftDailyCount;
    if (data.date !== today) return { count: 0, date: today };
    return data;
  } catch {
    return { count: 0, date: today };
  }
}

function incrementGiftCount() {
  const today = new Date().toISOString().split('T')[0];
  const current = getGiftDailyCount();
  localStorage.setItem(GIFT_COUNT_KEY, JSON.stringify({ count: current.count + 1, date: today }));
}

function getGiftsRemaining(): number {
  return Math.max(0, GIFT_DAILY_LIMIT - getGiftDailyCount().count);
}

const JIMMY_CHUBS_ID = 'jimmy-chubs';

// ── Friend Aquarium Swimmer ───────────────────────────────────────────────────
// Lightweight read-only swimmer: same images as AxolotlDisplay, no food/play logic.

function getFriendAxolotlSize(stage: string) {
  switch (stage) {
    case 'hatchling': return 96;
    case 'sprout':    return 132;
    case 'guardian':  return 168;
    case 'elder':     return 186;
    default:          return 96;
  }
}

function FriendAxolotlSwimmer({ stage, name }: { stage: string; name: string; rarity: string }) {
  const [pos, setPos] = useState({ x: 50, y: 60 });
  const [facingLeft, setFacingLeft] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const posRef = useRef({ x: 50, y: 60 });
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Random swim every 10-18 seconds
  useEffect(() => {
    const swim = () => {
      const newX = Math.random() * 50 + 25; // 25-75%
      const newY = Math.random() * 30 + 35; // 35-65%
      setFacingLeft(newX < posRef.current.x);
      posRef.current = { x: newX, y: newY };
      setPos({ x: newX, y: newY });
      setIsMoving(true);
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      moveTimerRef.current = setTimeout(() => setIsMoving(false), 2500);
    };
    const id = setInterval(swim, 10000 + Math.random() * 8000);
    return () => { clearInterval(id); if (moveTimerRef.current) clearTimeout(moveTimerRef.current); };
  }, []);

  const size = getFriendAxolotlSize(stage);

  return (
    <motion.div
      className="absolute"
      animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      transition={{ duration: 4, ease: [0.2, 0.8, 0.4, 1] }}
      style={{ transform: 'translate(-50%, -50%)', zIndex: 10 }}
    >
      <div className="relative flex flex-col items-center gap-1">
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
        <SpineAxolotl
          size={size}
          animation={isMoving ? 'Swim' : 'Idle'}
          facingLeft={facingLeft}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(160,120,255,0.4)) drop-shadow(0 0 20px rgba(100,180,255,0.3)) drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
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
      </div>
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
  /** COPPA: under-13 users see Jimmy & Chubs but cannot add friends or share codes. */
  isUnder13?: boolean;
  onGiftFriend: (friendId: string, coins: number, opals: number) => void;
  onPokeFriend: (friendId: string) => void;
  onSendSticker?: (friendId: string, stickerId: string) => Promise<string | null>;
  onVisitJimmy: () => void;
  lineage: Axolotl[];
  /** Authenticated user id — needed for the friendships hook and XP awarding. Hidden when null (guest). */
  userId?: string | null;
}

export function SocialModal({ onClose, axolotl, friendCode, friends, onAddFriend, onRemoveFriend, onBreed: _onBreed, onGiftFriend, onPokeFriend, onSendSticker, onVisitJimmy, lineage, isUnder13 = false, userId = null }: SocialModalProps) {
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
  const [selectedAxolotl, setSelectedAxolotl] = useState<Axolotl | null>(null);
  const [friendAchievementIds, setFriendAchievementIds] = useState<string[] | null>(null); // null = loading
  const fetchedFriendIdRef = useRef<string | null>(null);
  // Short-lived visual feedback states (2–2.5s after action)
  const [justPoked, setJustPoked] = useState<Set<string>>(new Set());
  const [justGifted, setJustGifted] = useState<Record<string, GiftResult>>({});
  // Per-visit sticker debounce: which sticker IDs were just tapped during this
  // visit. Cleared when leaving the visit overlay. Prevents accidental
  // double-taps; there is no real cooldown (stickers are designed to be light).
  const [justSentStickers, setJustSentStickers] = useState<Set<string>>(new Set());
  // Visit-overlay overflow menu (Report / Block actions). Closed by default.
  const [showVisitOverflow, setShowVisitOverflow] = useState(false);
  // Report flow state — when set, ReportUserModal is rendered for that friend.
  const [reportingFriend, setReportingFriend] = useState<Friend | null>(null);
  // Friendship-level UI state (Phase 2.1).
  const [detailPanelFriend, setDetailPanelFriend] = useState<Friend | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<{ friend: Friend; newLevel: number } | null>(null);

  // Friendship data + realtime subscription. Level-up callback fires the
  // celebration; the hook itself handles fetch + subscribe + apply-result.
  const { getFriendship, applyXpResult } = useFriendships({
    userId,
    onLevelUp: (friendId, newLevel) => {
      const friend = friends.find(f => f.id === friendId);
      if (friend) setLevelUpInfo({ friend, newLevel });
    },
  });
  // Snapshot of localStorage friend-stats. Refreshed whenever the modal mounts
  // or a friend interaction fires; rendered as small "visited 4× / gifted 2×"
  // pills on the expanded friend card.
  const [friendStatsSnapshot, setFriendStatsSnapshot] = useState<Record<string, FriendStats>>(() => getAllFriendStats());
  const refreshFriendStats = () => setFriendStatsSnapshot(getAllFriendStats());
  // Tick so cooldown timers refresh every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Modal-open telemetry — emits once per mount.
  useEffect(() => {
    track(SocialEvents.FRIEND_CODE_VIEWED, { friend_count: friends.length, under_13: isUnder13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch friend's appearance snapshot when visiting their aquarium, and
  // award friendship XP for the visit. Skip XP for Jimmy & Chubs (preset NPC,
  // not a real account) and when not authenticated.
  useEffect(() => {
    if (!visitingFriend) {
      setVisitSnapshot(null);
      setJustSentStickers(new Set());
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

    // Award visit XP. Fire-and-forget — UI doesn't wait for this.
    if (userId && visitingFriend.id !== JIMMY_CHUBS_ID && isSupabaseConfigured) {
      const visitedFriend = visitingFriend; // capture for closure
      awardFriendshipXp(visitedFriend.id, 'visit').then(result => {
        if (!result) return;
        track(FriendshipEvents.XP_AWARDED, {
          action: 'visit',
          new_level: result.level,
          cap_reached: result.cap_reached,
        });
        applyXpResult(visitedFriend.id, {
          level: result.level,
          total_xp: result.total_xp,
          daily_xp_count: result.daily_xp_count,
        });
        if (result.leveled_up) {
          track(FriendshipEvents.LEVELED_UP, { new_level: result.level, source: 'visit' });
          setLevelUpInfo({ friend: visitedFriend, newLevel: result.level });
        }
      });
    }
  }, [visitingFriend, userId, applyXpResult]);

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

  // Tries the native Share Sheet first (iOS/Android can hand off to Messages,
  // AirDrop, etc.); falls back to clipboard when navigator.share is missing or
  // the user dismisses the sheet. Always shows the green "copied" affordance
  // when the fallback runs so the user gets feedback regardless of path.
  const copyCode = async () => {
    track(SocialEvents.FRIEND_CODE_COPIED, {});
    const shareText = `Add me on Axolittle! My friend code is ${myCode}`;
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    if (canShare) {
      try {
        await navigator.share({ title: 'Axolittle friend code', text: shareText });
        track(SocialEvents.FRIEND_CODE_SHARE_SUCCEEDED, {});
        return;
      } catch (err) {
        // AbortError = user dismissed the sheet — silently fall through to copy.
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (isAbort) {
          track(SocialEvents.FRIEND_CODE_SHARE_DISMISSED, {});
          return;
        }
        // Other errors (permission denied, unsupported) — fall through to copy fallback.
        track(SocialEvents.FRIEND_CODE_SHARE_FALLBACK_COPY, { reason: 'share_threw' });
      }
    } else {
      track(SocialEvents.FRIEND_CODE_SHARE_FALLBACK_COPY, { reason: 'no_share_api' });
    }
    try { await navigator.clipboard.writeText(myCode); } catch { /* clipboard unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = async () => {
    if (!addFriendInput.trim() || addFriendLoading) return;
    setAddFriendLoading(true);
    setAddFriendError(null);
    track(SocialEvents.ADD_FRIEND_ATTEMPTED, { input_length: addFriendInput.trim().length });
    const error = await onAddFriend(addFriendInput.trim());
    setAddFriendLoading(false);
    if (error) {
      setAddFriendError(error);
      track(SocialEvents.ADD_FRIEND_FAILED, { reason: error.slice(0, 40) });
    } else {
      setAddFriendInput('');
      setAddFriendError(null);
      setShowAddFriendModal(false);
      // Success telemetry is emitted by the handler in useGameActions so we
      // capture both code-add and any future paths consistently.
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
                      {!isUnder13 && (
                        <motion.button
                          onClick={() => { setShowAddFriendModal(true); track(SocialEvents.ADD_FRIEND_OPENED, {}); }}
                          className="rounded-full p-1.5 active:scale-90 flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(167,139,250,0.5), rgba(139,92,246,0.4))',
                            border: '1px solid rgba(139,92,246,0.35)',
                          }}
                          whileTap={{ scale: 0.85 }}
                        >
                          <Plus className="w-3.5 h-3.5 text-violet-600" strokeWidth={2.5} />
                        </motion.button>
                      )}
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
                          {isUnder13
                            ? 'A parent account is needed to add friends.'
                            : 'No friends yet — share your code to connect!'}
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

                                  {/* Friendship ring — tappable, opens detail panel.
                                      Only visible once a mutual friendship row exists
                                      (i.e., the OTHER side has also added back). */}
                                  {(() => {
                                    const f = getFriendship(friend.id);
                                    if (!f) return null;
                                    return (
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          track(FriendshipEvents.RING_TAPPED, { level: f.level });
                                          setDetailPanelFriend(friend);
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <FriendshipRing level={f.level} totalXp={f.total_xp} size={32} strokeWidth={3} />
                                      </div>
                                    );
                                  })()}

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
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="text-[10px] text-violet-500/70 font-medium capitalize">
                                          {friend.axolotlName} · Gen {friend.generation} · {friend.stage}
                                        </span>
                                      </div>
                                      {(() => {
                                        const stats = friendStatsSnapshot[friend.id];
                                        const visits = stats?.visits ?? 0;
                                        const gifts  = stats?.giftsSent ?? 0;
                                        if (visits === 0 && gifts === 0) return null;
                                        return (
                                          <div className="flex items-center gap-1.5 mb-3">
                                            {visits > 0 && (
                                              <span
                                                className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-700 px-2 py-0.5 rounded-full"
                                                style={{ background: 'rgba(186,230,253,0.4)', border: '1px solid rgba(56,189,248,0.3)' }}
                                              >
                                                <Waves className="w-2.5 h-2.5" strokeWidth={2.5} />
                                                Visited {visits}{visits === 1 ? '' : '×'}
                                              </span>
                                            )}
                                            {gifts > 0 && (
                                              <span
                                                className="inline-flex items-center gap-1 text-[9px] font-bold text-violet-700 px-2 py-0.5 rounded-full"
                                                style={{ background: 'rgba(216,180,254,0.4)', border: '1px solid rgba(139,92,246,0.3)' }}
                                              >
                                                <Gift className="w-2.5 h-2.5" strokeWidth={2.5} />
                                                Gifted {gifts}{gifts === 1 ? '' : '×'}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}

                                      {/* Action tiles — row 1: Visit + Stats + Achievements */}
                                      <div className="grid grid-cols-3 gap-2 mb-2">
                                        <motion.button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setVisitingFriend(friend);
                                            recordFriendVisit(friend.id);
                                            refreshFriendStats();
                                            track(SocialEvents.FRIEND_VISITED, { stage: friend.stage, generation: friend.generation });
                                          }}
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
                                                track(SocialEvents.POKE_SENT, {});
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

                                      {/* Send Gift - full width, 10 gifts/day limit */}
                                      {(() => {
                                        const giftsLeft = getGiftsRemaining();
                                        const isGiftLimitReached = giftsLeft === 0;
                                        const justGiftedThis = justGifted[friend.id];
                                        const giftLabel = justGiftedThis
                                          ? justGiftedThis.opals > 0
                                            ? `Sent ${justGiftedThis.opals} opals!`
                                            : `Sent ${justGiftedThis.coins} coins!`
                                          : isGiftLimitReached
                                            ? 'Limit reached today'
                                            : null;
                                        return (
                                          <motion.button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isGiftLimitReached || justGiftedThis) return;
                                              const gift = rollGift();
                                              onGiftFriend(friend.id, gift.coins, gift.opals);
                                              incrementGiftCount();
                                              recordFriendGift(friend.id);
                                              refreshFriendStats();
                                              track(SocialEvents.GIFT_SENT, { coins: gift.coins, opals: gift.opals });
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
                                              background: justGiftedThis || isGiftLimitReached
                                                ? 'linear-gradient(135deg, rgba(134,239,172,0.45), rgba(74,222,128,0.35))'
                                                : 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.14))',
                                              border: justGiftedThis || isGiftLimitReached
                                                ? '1px solid rgba(74,222,128,0.45)'
                                                : '1px solid rgba(139,92,246,0.35)',
                                              opacity: isGiftLimitReached && !justGiftedThis ? 0.6 : 1,
                                            }}
                                            whileTap={justGiftedThis || isGiftLimitReached ? {} : { scale: 0.95 }}
                                          >
                                            {justGiftedThis || isGiftLimitReached ? <Check className="w-4 h-4 text-green-600" strokeWidth={2.5} /> : <Gift className="w-4 h-4 text-violet-600" strokeWidth={2} />}
                                            <span
                                              className="text-[10px] font-black tracking-wide uppercase"
                                              style={{ color: justGiftedThis || isGiftLimitReached ? '#16a34a' : '#6d28d9' }}
                                            >
                                              {giftLabel ?? `Send Gift (${giftsLeft} left)`}
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

                  {/* Your code card — hidden for under-13 (parent account required) */}
                  {!isUnder13 && (
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
                  )}

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

                  {/* Axolotl Pokédex */}
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-2">
                      <Fish className="w-3.5 h-3.5 text-teal-400" strokeWidth={2} />
                      <span className="text-violet-700 text-[11px] font-black tracking-wider uppercase">Axolodex</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-teal-500"
                        style={{ background: 'rgba(204,251,241,0.6)', border: '1px solid rgba(94,234,212,0.4)' }}
                      >
                        {lineage.length + 1} discovered
                      </div>
                    </div>
                  </div>

                  {/* Grid of all axolotls (current + ancestors) */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Current axolotl — always first */}
                    {(() => {
                      const rarityColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
                        Mythic:    { bg: 'rgba(253,224,71,0.18)',  border: 'rgba(253,224,71,0.55)',  text: '#a16207', glow: 'rgba(253,224,71,0.35)' },
                        Legendary: { bg: 'rgba(251,146,60,0.18)',  border: 'rgba(251,146,60,0.55)',  text: '#c2410c', glow: 'rgba(251,146,60,0.3)' },
                        Epic:      { bg: 'rgba(192,132,252,0.18)', border: 'rgba(192,132,252,0.55)', text: '#7e22ce', glow: 'rgba(192,132,252,0.3)' },
                        Rare:      { bg: 'rgba(96,165,250,0.18)',  border: 'rgba(96,165,250,0.55)',  text: '#1d4ed8', glow: 'rgba(96,165,250,0.25)' },
                        Common:    { bg: 'rgba(255,255,255,0.7)',   border: 'rgba(216,180,254,0.45)', text: '#6d28d9', glow: 'rgba(167,139,250,0.15)' },
                      };
                      const rarity = axolotl.rarity ?? 'Common';
                      const rc = rarityColors[rarity] ?? rarityColors.Common;
                      return (
                        <motion.div
                          key="current"
                          className="relative rounded-2xl p-2.5 flex flex-col items-center gap-1.5 overflow-hidden cursor-pointer"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0 }}
                          style={{
                            background: rc.bg,
                            border: `1.5px solid ${rc.border}`,
                            boxShadow: `0 4px 16px -4px ${rc.glow}`,
                          }}
                          onClick={() => setSelectedAxolotl(axolotl)}
                          whileTap={{ scale: 0.95 }}
                        >
                          {/* Entry number */}
                          <span className="absolute top-1.5 left-2 text-[8px] font-black opacity-40" style={{ color: rc.text }}>
                            #{String(lineage.length + 1).padStart(3, '0')}
                          </span>
                          {/* Current badge */}
                          <span
                            className="absolute top-1.5 right-1.5 text-[7px] font-black px-1 py-0.5 rounded-full"
                            style={{ background: 'rgba(251,191,36,0.85)', color: '#78350f' }}
                          >
                            NOW
                          </span>
                          {/* Image */}
                          <div className="mt-3 w-12 h-12 flex items-center justify-center overflow-hidden">
                            <SpineAxolotl
                              size={28}
                              animation="Idle"
                              facingLeft={false}
                              style={{ filter: `drop-shadow(0 2px 6px ${axolotl.color}55)` }}
                            />
                          </div>
                          {/* Color swatch */}
                          <div className="w-5 h-1.5 rounded-full" style={{ background: axolotl.color }} />
                          {/* Name */}
                          <span className="text-[10px] font-black text-center leading-tight truncate w-full text-center" style={{ color: rc.text }}>
                            {axolotl.name}
                          </span>
                          {/* Rarity + Stage */}
                          <div className="flex flex-col items-center gap-0.5 w-full">
                            <span className="text-[8px] font-bold opacity-70 capitalize" style={{ color: rc.text }}>{rarity}</span>
                            <span className="text-[8px] font-medium opacity-50 capitalize" style={{ color: rc.text }}>{axolotl.stage}</span>
                          </div>
                        </motion.div>
                      );
                    })()}

                    {/* Past axolotls — newest first */}
                    {lineage.length > 0 && lineage.slice().reverse().map((ancestor, index) => {
                      const rarityColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
                        Mythic:    { bg: 'rgba(253,224,71,0.18)',  border: 'rgba(253,224,71,0.55)',  text: '#a16207', glow: 'rgba(253,224,71,0.35)' },
                        Legendary: { bg: 'rgba(251,146,60,0.18)',  border: 'rgba(251,146,60,0.55)',  text: '#c2410c', glow: 'rgba(251,146,60,0.3)' },
                        Epic:      { bg: 'rgba(192,132,252,0.18)', border: 'rgba(192,132,252,0.55)', text: '#7e22ce', glow: 'rgba(192,132,252,0.3)' },
                        Rare:      { bg: 'rgba(96,165,250,0.18)',  border: 'rgba(96,165,250,0.55)',  text: '#1d4ed8', glow: 'rgba(96,165,250,0.25)' },
                        Common:    { bg: 'rgba(255,255,255,0.7)',   border: 'rgba(216,180,254,0.45)', text: '#6d28d9', glow: 'rgba(167,139,250,0.15)' },
                      };
                      const rarity = ancestor.rarity ?? 'Common';
                      const rc = rarityColors[rarity] ?? rarityColors.Common;
                      const entryNum = lineage.length - index;
                      return (
                        <motion.div
                          key={ancestor.id}
                          className="relative rounded-2xl p-2.5 flex flex-col items-center gap-1.5 overflow-hidden cursor-pointer"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (index + 1) * 0.05 }}
                          style={{
                            background: rc.bg,
                            border: `1.5px solid ${rc.border}`,
                            boxShadow: `0 4px 16px -4px ${rc.glow}`,
                          }}
                          onClick={() => setSelectedAxolotl(ancestor)}
                          whileTap={{ scale: 0.95 }}
                        >
                          {/* Entry number */}
                          <span className="absolute top-1.5 left-2 text-[8px] font-black opacity-40" style={{ color: rc.text }}>
                            #{String(entryNum).padStart(3, '0')}
                          </span>
                          {/* Gen badge */}
                          <span
                            className="absolute top-1.5 right-1.5 text-[7px] font-black px-1 py-0.5 rounded-full"
                            style={{ background: 'rgba(204,251,241,0.8)', color: '#0f766e' }}
                          >
                            G{ancestor.generation}
                          </span>
                          {/* Image */}
                          <div className="mt-3 w-12 h-12 flex items-center justify-center overflow-hidden opacity-85">
                            <SpineAxolotl
                              size={28}
                              animation="Idle"
                              facingLeft={false}
                              style={{ filter: `drop-shadow(0 2px 6px ${ancestor.color}55) grayscale(0.15)` }}
                            />
                          </div>
                          {/* Color swatch */}
                          <div className="w-5 h-1.5 rounded-full" style={{ background: ancestor.color }} />
                          {/* Name */}
                          <span className="text-[10px] font-black text-center leading-tight truncate w-full text-center" style={{ color: rc.text }}>
                            {ancestor.name}
                          </span>
                          {/* Rarity + Stage */}
                          <div className="flex flex-col items-center gap-0.5 w-full">
                            <span className="text-[8px] font-bold opacity-70 capitalize" style={{ color: rc.text }}>{rarity}</span>
                            <span className="text-[8px] font-medium opacity-50 capitalize" style={{ color: rc.text }}>{ancestor.stage}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {lineage.length === 0 && (
                    <motion.div
                      className="flex flex-col items-center justify-center py-6 gap-2 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.5)', border: '1.5px dashed rgba(216,180,254,0.5)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.span
                        className="text-4xl flex items-center justify-center"
                        animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                      >
                        <Leaf className="w-8 h-8 text-violet-400/60" strokeWidth={1.5} />
                      </motion.span>
                      <p className="text-violet-400/80 text-[11px] font-medium text-center px-6">
                        Rebirth your axolotl to unlock more entries!
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

              {/* Overflow menu — Report / Block. App Store Guideline 1.2 requires
                  a moderation affordance reachable from any UGC surface. */}
              {!isUnder13 && visitingFriend.id !== JIMMY_CHUBS_ID && (
                <div className="relative flex-shrink-0 ml-1">
                  <motion.button
                    onClick={() => setShowVisitOverflow(prev => !prev)}
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center justify-center w-9 h-9 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    aria-label="More options"
                  >
                    <MoreVertical className="w-4 h-4 text-white/70" strokeWidth={2.5} />
                  </motion.button>

                  <AnimatePresence>
                    {showVisitOverflow && (
                      <>
                        {/* Click-outside backdrop */}
                        <div className="fixed inset-0 z-[5]" onClick={() => setShowVisitOverflow(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-1 z-10 w-44 rounded-xl overflow-hidden"
                          style={{
                            background: 'rgba(15,32,53,0.97)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            boxShadow: '0 12px 28px -6px rgba(0,0,0,0.5)',
                          }}
                        >
                          <button
                            onClick={() => {
                              setShowVisitOverflow(false);
                              setReportingFriend(visitingFriend);
                              track(ModerationEvents.REPORT_OPENED, { context: 'visit' });
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left active:bg-white/10"
                          >
                            <Flag className="w-4 h-4 text-amber-400" strokeWidth={2.5} />
                            <span className="text-white text-[12px] font-bold">Report player</span>
                          </button>
                          <div className="h-px bg-white/8" />
                          <button
                            onClick={async () => {
                              setShowVisitOverflow(false);
                              const result = await blockUser(visitingFriend.id);
                              if (result.ok) {
                                track(ModerationEvents.USER_BLOCKED, { context: 'visit' });
                                onRemoveFriend(visitingFriend.id);
                                setVisitingFriend(null);
                              }
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left active:bg-white/10"
                          >
                            <ShieldOff className="w-4 h-4 text-rose-400" strokeWidth={2.5} />
                            <span className="text-white text-[12px] font-bold">Block player</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Aquarium body — horizontally scrollable */}
            <div
              className="flex-1 overflow-x-auto overflow-y-hidden"
              style={{ WebkitOverflowScrolling: 'touch' }}
              ref={(el) => {
                // Center scroll on mount/friend-change
                if (el) {
                  requestAnimationFrame(() => {
                    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
                  });
                }
              }}
            >
              {/* Wide inner container — same 250% as main aquarium */}
              <div className="relative h-full w-[250%]">
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
                      decorations={(visitSnapshot?.decorations ?? []).map(id => ({ instanceId: id, decorationId: id }))}
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

                    {/* Swipe hint */}
                    <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 20 }}>
                      <span
                        className="text-[10px] text-cyan-200/50 font-medium px-3 py-1 rounded-full"
                        style={{ background: 'rgba(4,20,40,0.6)' }}
                      >
                        Swipe to explore
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sticker bar — fixed footer of the visit overlay. Only shown when
                the host wired onSendSticker. Tapping a sticker fires it once
                per visit (debounce by id, no real cooldown). */}
            {onSendSticker && (
              <div
                className="flex-shrink-0 px-3 z-10"
                style={{
                  background: 'rgba(4,20,40,0.92)',
                  borderTop: '1px solid rgba(56,189,248,0.18)',
                  paddingTop: '0.6rem',
                  paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
                  <span className="text-[10px] font-black tracking-widest uppercase text-cyan-300/80">Leave a sticker</span>
                  <span className="text-[9px] text-cyan-300/40">tap once · no take-backs</span>
                </div>
                <div className="flex gap-1.5 justify-between">
                  {STICKERS.map((s) => {
                    const sent = justSentStickers.has(s.id);
                    return (
                      <motion.button
                        key={s.id}
                        onClick={async () => {
                          if (sent || !visitingFriend) return;
                          setJustSentStickers(prev => { const n = new Set(prev); n.add(s.id); return n; });
                          track(SocialEvents.STICKER_SENT, { sticker_id: s.id });
                          const err = await onSendSticker(visitingFriend.id, s.id);
                          if (err) {
                            // Roll back on failure so user can retry
                            setJustSentStickers(prev => { const n = new Set(prev); n.delete(s.id); return n; });
                          }
                        }}
                        whileTap={sent ? {} : { scale: 0.85 }}
                        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl"
                        style={{
                          background: sent
                            ? 'linear-gradient(135deg, rgba(74,222,128,0.35), rgba(34,197,94,0.25))'
                            : 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(99,102,241,0.14))',
                          border: sent
                            ? '1px solid rgba(74,222,128,0.5)'
                            : '1px solid rgba(56,189,248,0.3)',
                          opacity: sent ? 0.7 : 1,
                        }}
                        aria-label={`Send ${s.label} sticker`}
                        disabled={sent}
                      >
                        <span className="text-xl leading-none" aria-hidden>{s.emoji}</span>
                        <span className="text-[8px] font-bold tracking-wide uppercase text-cyan-100/85 leading-tight">{sent ? 'Sent' : s.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* ── Axolodex Detail Popup ─────────────────────────────────────── */}
      <AnimatePresence>
        {selectedAxolotl && (() => {
          const ax = selectedAxolotl;
          const level = calculateLevel(ax.experience);
          const rarity = ax.rarity ?? 'Common';
          const rarityColors: Record<string, { bg: string; border: string; text: string; glow: string; header: string }> = {
            Mythic:    { bg: 'linear-gradient(160deg, #fffbeb 0%, #fef3c7 100%)', border: 'rgba(253,224,71,0.55)',  text: '#92400e', glow: 'rgba(253,224,71,0.35)', header: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
            Legendary: { bg: 'linear-gradient(160deg, #fff7ed 0%, #ffedd5 100%)', border: 'rgba(251,146,60,0.55)',  text: '#9a3412', glow: 'rgba(251,146,60,0.3)',  header: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' },
            Epic:      { bg: 'linear-gradient(160deg, #faf5ff 0%, #ede9fe 100%)', border: 'rgba(192,132,252,0.55)', text: '#6b21a8', glow: 'rgba(192,132,252,0.3)',  header: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' },
            Rare:      { bg: 'linear-gradient(160deg, #eff6ff 0%, #dbeafe 100%)', border: 'rgba(96,165,250,0.55)',  text: '#1e40af', glow: 'rgba(96,165,250,0.25)',  header: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' },
            Common:    { bg: 'linear-gradient(160deg, #faf5ff 0%, #ede9fe 100%)', border: 'rgba(196,181,253,0.5)',  text: '#6d28d9', glow: 'rgba(167,139,250,0.2)',  header: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' },
          };
          const rc = rarityColors[rarity] ?? rarityColors.Common;
          const isCurrentAxolotl = ax.id === axolotl.id;
          const stats = ax.secondaryStats ?? { strength: 0, intellect: 0, stamina: 0, speed: 0 };
          const ageDays = Math.floor(ax.age / (60 * 24));
          const ageHours = Math.floor((ax.age % (60 * 24)) / 60);

          const StatBar = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 w-20 shrink-0">
                <span style={{ color: rc.text }} className="opacity-70">{icon}</span>
                <span className="text-[10px] font-bold" style={{ color: rc.text }}>{label}</span>
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{ background: rc.header }}
                />
              </div>
              <span className="text-[10px] font-black w-6 text-right" style={{ color: rc.text }}>{value}</span>
            </div>
          );

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}
              onClick={() => setSelectedAxolotl(null)}
            >
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.88, opacity: 0, y: 24 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-sm overflow-hidden rounded-3xl"
                style={{
                  background: rc.bg,
                  border: `1.5px solid ${rc.border}`,
                  boxShadow: `0 24px 64px -12px ${rc.glow}`,
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="relative px-5 py-4" style={{ background: rc.header }}>
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                  }} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Mini axolotl preview */}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)' }}
                      >
                        <SpineAxolotl size={36} animation="Idle" facingLeft={false} style={{ pointerEvents: 'none' }} />
                      </div>
                      <div>
                        <div className="text-white/60 text-[10px] font-bold tracking-widest uppercase mb-0.5">
                          {isCurrentAxolotl ? 'Current · ' : ''}{rarity}
                        </div>
                        <h3 className="text-white font-black text-lg leading-tight">{ax.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-white/70 text-[10px] font-bold capitalize">{ax.stage}</span>
                          <span className="text-white/40 text-[10px]">·</span>
                          <span className="text-white/70 text-[10px] font-bold">Gen {ax.generation}</span>
                        </div>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setSelectedAxolotl(null)}
                      className="rounded-full p-1.5 shrink-0 self-start"
                      style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                      whileTap={{ scale: 0.85 }}
                    >
                      <X className="w-4 h-4 text-white/80" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-3">
                  {/* Level + color row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className="rounded-2xl px-3 py-2.5 flex flex-col gap-0.5"
                      style={{ background: 'rgba(255,255,255,0.65)', border: `1px solid ${rc.border}` }}
                    >
                      <span className="text-[9px] font-black tracking-widest uppercase opacity-60" style={{ color: rc.text }}>Max Level Reached</span>
                      <span className="text-2xl font-black leading-tight" style={{ color: rc.text }}>{level}</span>
                      <span className="text-[9px] font-semibold opacity-50" style={{ color: rc.text }}>of 60</span>
                    </div>
                    <div
                      className="rounded-2xl px-3 py-2.5 flex flex-col gap-1"
                      style={{ background: 'rgba(255,255,255,0.65)', border: `1px solid ${rc.border}` }}
                    >
                      <span className="text-[9px] font-black tracking-widest uppercase opacity-60" style={{ color: rc.text }}>Colour</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-6 h-6 rounded-lg border-2 border-white/60 shadow-sm" style={{ background: ax.color }} />
                        <span className="text-[10px] font-bold capitalize opacity-70" style={{ color: rc.text }}>{ax.pattern}</span>
                      </div>
                      <span className="text-[9px] font-semibold opacity-50" style={{ color: rc.text }}>
                        {ageDays > 0 ? `${ageDays}d` : ''} {ageHours}h old
                      </span>
                    </div>
                  </div>

                  {/* Secondary stats */}
                  <div
                    className="rounded-2xl px-3 py-3 space-y-2"
                    style={{ background: 'rgba(255,255,255,0.65)', border: `1px solid ${rc.border}` }}
                  >
                    <span className="text-[9px] font-black tracking-widest uppercase opacity-60 block mb-1" style={{ color: rc.text }}>Stats</span>
                    <StatBar label="Strength" value={stats.strength} icon={<Zap className="w-3 h-3" />} />
                    <StatBar label="Intellect" value={stats.intellect} icon={<Brain className="w-3 h-3" />} />
                    <StatBar label="Stamina"   value={stats.stamina}   icon={<Shield className="w-3 h-3" />} />
                    <StatBar label="Speed"     value={stats.speed}     icon={<Wind className="w-3 h-3" />} />
                  </div>

                  {/* Stage progress */}
                  {(() => {
                    const stages: Axolotl['stage'][] = ['hatchling', 'sprout', 'guardian', 'elder'];
                    const currentIdx = stages.indexOf(ax.stage);
                    const stageIcons = [
                      <Egg key="egg" className="w-3.5 h-3.5" strokeWidth={2} />,
                      <Sprout key="sprout" className="w-3.5 h-3.5" strokeWidth={2} />,
                      <Droplets key="guardian" className="w-3.5 h-3.5" strokeWidth={2} />,
                      <Crown key="elder" className="w-3.5 h-3.5" strokeWidth={2} />,
                    ];
                    return (
                      <div
                        className="rounded-2xl p-3"
                        style={{ background: 'rgba(255,255,255,0.65)', border: `1px solid ${rc.border}` }}
                      >
                        <div className="text-[9px] font-black tracking-widest uppercase opacity-60 mb-2.5" style={{ color: rc.text }}>Life Stage</div>
                        <div className="flex items-center justify-between gap-1">
                          {stages.map((s, i) => {
                            const isActive = i === currentIdx;
                            const isPast = i < currentIdx;
                            return (
                              <div key={s} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                                  {(isPast || isActive) && (
                                    <div className="h-full rounded-full w-full" style={{ background: rc.header }} />
                                  )}
                                </div>
                                <span style={{ color: isActive || isPast ? rc.text : `${rc.text}44` }}>{stageIcons[i]}</span>
                                <span className="text-[8px] font-bold capitalize" style={{ color: isActive || isPast ? rc.text : `${rc.text}44` }}>{s}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
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
                    onChange={e => { setAddFriendInput(formatFriendCodeInput(e.target.value)); setAddFriendError(null); }}
                    placeholder="ABC-DEFGH"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={9}
                    className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sky-800 text-sm placeholder-sky-300/70 focus:outline-none focus:ring-2 focus:ring-sky-300/50 transition-all font-mono tracking-widest"
                    style={{ background: 'rgba(224,242,254,0.8)', border: '1px solid rgba(186,230,253,0.6)' }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddFriend();
                      }
                    }}
                  />
                  {(() => {
                    const ready = addFriendInput.trim().length > 0 && !addFriendLoading;
                    return (
                      <motion.button
                        onClick={handleAddFriend}
                        disabled={!ready}
                        className="rounded-xl px-4 py-2.5 text-xs font-black tracking-wide shrink-0"
                        style={{
                          background: ready
                            ? 'linear-gradient(135deg, #38bdf8, #0ea5e9)'
                            : 'rgba(186,230,253,0.4)',
                          color: ready ? '#fff' : 'rgba(14,165,233,0.4)',
                          border: '1px solid rgba(56,189,248,0.35)',
                          boxShadow: ready ? '0 4px 12px -2px rgba(14,165,233,0.3)' : 'none',
                        }}
                        whileTap={ready ? { scale: 0.92 } : {}}
                      >
                        {addFriendLoading ? 'Checking…' : 'Add'}
                      </motion.button>
                    );
                  })()}
                </div>
                {addFriendError && (
                  <p className="text-xs text-red-400 font-medium mt-2 px-1">{addFriendError}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report flow — rendered above all other overlays so it stacks correctly. */}
      {reportingFriend && (
        <ReportUserModal
          reportedUserId={reportingFriend.id}
          reportedDisplayName={reportingFriend.name}
          context="visit"
          contextMetadata={{ axolotl_name: reportingFriend.axolotlName }}
          onClose={() => setReportingFriend(null)}
          onBlocked={() => {
            // Block from inside the report flow → drop them locally and close
            // any open visit. Server-side block was already done by the modal.
            const blockedId = reportingFriend.id;
            onRemoveFriend(blockedId);
            if (visitingFriend?.id === blockedId) setVisitingFriend(null);
          }}
        />
      )}

      {/* Friendship detail panel — bottom sheet showing level + unlocks. */}
      <AnimatePresence>
        {detailPanelFriend && (() => {
          const f = getFriendship(detailPanelFriend.id);
          if (!f) return null;
          const today = new Date().toISOString().slice(0, 10);
          const capReachedToday = f.daily_xp_reset_date === today && f.daily_xp_count >= 5;
          track(FriendshipEvents.DETAIL_VIEWED, { level: f.level });
          return (
            <FriendshipDetailPanel
              friendName={detailPanelFriend.name}
              level={f.level}
              totalXp={f.total_xp}
              capReachedToday={capReachedToday}
              onClose={() => setDetailPanelFriend(null)}
            />
          );
        })()}
      </AnimatePresence>

      {/* Level-up celebration — full-screen confetti when friendship crosses
          a level boundary. Auto-dismisses after ~3.2s. */}
      <AnimatePresence>
        {levelUpInfo && (() => {
          const f = getFriendship(levelUpInfo.friend.id);
          // Use the live total_xp if available so the ring shows current state.
          const liveTotalXp = f?.total_xp ?? 0;
          return (
            <LevelUpCelebration
              friendName={levelUpInfo.friend.name}
              newLevel={levelUpInfo.newLevel}
              totalXp={liveTotalXp}
              onDismiss={() => setLevelUpInfo(null)}
            />
          );
        })()}
      </AnimatePresence>
    </div>
  );
}