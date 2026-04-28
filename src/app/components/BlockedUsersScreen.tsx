import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShieldOff, ShieldCheck, Loader2 } from 'lucide-react';
import { fetchBlockedUsers, unblockUser, type BlockedUserRow } from '../services/supabase';
import { track, ModerationEvents } from '../utils/telemetry';

interface BlockedUsersScreenProps {
  userId: string;
  onClose: () => void;
}

/**
 * Settings → Blocked Users. Lists everyone the player has blocked, with an
 * unblock affordance on each. Required for App Store / Play Store compliance:
 * blocking must be reversible, and users must be able to see who they have
 * blocked.
 *
 * The list shows blocked_id only — we deliberately don't fetch profile data
 * for blocked users (they're blocked, we shouldn't be loading their stuff).
 * That means the list is a bit anonymous ("Player from <date>"), which is
 * fine and arguably better — re-humanizing a blocked person via their nice
 * axolotl photo could be a coercion vector.
 */
export function BlockedUsersScreen({ userId, onClose }: BlockedUsersScreenProps) {
  const [blocks, setBlocks] = useState<BlockedUserRow[] | null>(null);
  const [unblockingIds, setUnblockingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBlockedUsers(userId).then(setBlocks);
  }, [userId]);

  const handleUnblock = async (blockedId: string) => {
    setUnblockingIds(prev => { const n = new Set(prev); n.add(blockedId); return n; });
    const result = await unblockUser(blockedId);
    if (result.ok) {
      track(ModerationEvents.USER_UNBLOCKED, {});
      setBlocks(prev => prev?.filter(b => b.blocked_id !== blockedId) ?? null);
    }
    setUnblockingIds(prev => { const n = new Set(prev); n.delete(blockedId); return n; });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0c1824 0%, #0f2035 45%, #142840 100%)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: '0.75rem',
          background: 'rgba(15,32,53,0.85)',
          borderBottom: '1px solid rgba(248,113,113,0.18)',
        }}
      >
        <motion.button
          onClick={onClose}
          whileTap={{ scale: 0.9 }}
          className="flex items-center justify-center w-11 h-11 rounded-full"
          style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)' }}
        >
          <ArrowLeft className="w-5 h-5 text-rose-300" strokeWidth={2.5} />
        </motion.button>
        <div>
          <p className="text-[10px] text-rose-400/70 font-bold tracking-widest uppercase leading-none mb-0.5">Settings</p>
          <h2 className="text-white font-black text-base leading-none">Blocked Players</h2>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {blocks === null ? (
          <div className="flex flex-col items-center gap-3 mt-12">
            <Loader2 className="w-8 h-8 text-rose-400 animate-spin" strokeWidth={2} />
            <p className="text-rose-300/60 text-sm">Loading…</p>
          </div>
        ) : blocks.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 py-12 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.1)' }}
          >
            <ShieldCheck className="w-12 h-12 text-emerald-400/70" strokeWidth={1.5} />
            <p className="text-white/70 font-bold text-sm">No blocked players</p>
            <p className="text-white/40 text-[11px] text-center px-6 leading-snug">
              Players you block won't be able to add you, gift you, or visit your tank.
            </p>
          </div>
        ) : (
          <>
            <p className="text-rose-300/60 text-[11px] mb-3 px-1 leading-snug">
              These players can't add you, send gifts, or visit your tank. You can unblock them anytime.
            </p>
            <AnimatePresence>
              {blocks.map((b, i) => {
                const blockedSinceDate = new Date(b.created_at);
                const sinceLabel = blockedSinceDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const busy = unblockingIds.has(b.blocked_id);
                return (
                  <motion.div
                    key={b.blocked_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 80 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 px-3.5 py-3 mb-2 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(248,113,113,0.08), rgba(190,18,60,0.08))',
                      border: '1px solid rgba(248,113,113,0.2)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)' }}
                    >
                      <ShieldOff className="w-5 h-5 text-rose-300" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-black text-[13px] leading-tight">Blocked player</div>
                      <div className="text-rose-300/60 text-[10px] mt-0.5">Since {sinceLabel}</div>
                    </div>
                    <motion.button
                      onClick={() => handleUnblock(b.blocked_id)}
                      disabled={busy}
                      whileTap={busy ? {} : { scale: 0.92 }}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-black flex-shrink-0"
                      style={{
                        background: busy ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: busy ? 'rgba(255,255,255,0.4)' : '#fff',
                      }}
                    >
                      {busy ? 'Unblocking…' : 'Unblock'}
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
