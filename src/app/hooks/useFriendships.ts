/**
 * useFriendships — fetches the current player's friendship rows and keeps
 * them warm via Supabase Realtime.
 *
 * The data is keyed by FRIEND id (the other player), not pair_id, because
 * call sites (friend cards, visit overlay) all have a friend id and want to
 * look up "what's my friendship with this person."
 *
 * Includes a level-up detector: when an UPDATE comes through realtime that
 * crosses a level boundary, the hook fires `onLevelUp` with the friend id
 * and new level so the host can render a celebration.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isSupabaseConfigured,
  fetchFriendships,
  subscribeToFriendships,
  type FriendshipRow,
} from '../services/supabase';
import { track, FriendshipEvents } from '../utils/telemetry';

interface UseFriendshipsOptions {
  userId: string | null;
  /** Called when realtime detects this user crossing a level boundary. */
  onLevelUp?: (friendId: string, newLevel: number) => void;
}

interface UseFriendshipsReturn {
  /** Map of friendId → FriendshipRow. */
  friendships: Map<string, FriendshipRow>;
  /** Convenience getter: friendship with a specific friend id (or undefined). */
  getFriendship: (friendId: string) => FriendshipRow | undefined;
  /**
   * Locally apply the result of an XP award (e.g. from awardFriendshipXp RPC)
   * so the UI updates instantly without waiting for the realtime round-trip.
   * The realtime UPDATE will land later and overwrite — values match.
   */
  applyXpResult: (friendId: string, result: { level: number; total_xp: number; daily_xp_count: number }) => void;
}

export function useFriendships({ userId, onLevelUp }: UseFriendshipsOptions): UseFriendshipsReturn {
  const [friendships, setFriendships] = useState<Map<string, FriendshipRow>>(new Map());
  // Tracks the last-seen level per friend so realtime UPDATEs can detect
  // level crossings. Keyed by friend id, not pair_id.
  const lastLevelRef = useRef<Map<string, number>>(new Map());

  const indexRow = useCallback((row: FriendshipRow, currentUserId: string) => {
    const friendId = row.player_a === currentUserId ? row.player_b : row.player_a;
    return friendId;
  }, []);

  // Initial fetch.
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setFriendships(new Map());
      lastLevelRef.current = new Map();
      return;
    }
    let cancelled = false;
    fetchFriendships(userId).then(rows => {
      if (cancelled) return;
      const next = new Map<string, FriendshipRow>();
      rows.forEach(row => {
        const friendId = indexRow(row, userId);
        next.set(friendId, row);
        lastLevelRef.current.set(friendId, row.level);
      });
      setFriendships(next);
    });
    return () => { cancelled = true; };
  }, [userId, indexRow]);

  // Realtime subscription.
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;

    const channel = subscribeToFriendships(userId, (row) => {
      const friendId = indexRow(row, userId);

      // Detect level-up before updating the map so the comparison is valid.
      const prevLevel = lastLevelRef.current.get(friendId) ?? 0;
      if (row.level > prevLevel) {
        track(FriendshipEvents.LEVELED_UP, { new_level: row.level, source: 'realtime' });
        onLevelUp?.(friendId, row.level);
      }
      lastLevelRef.current.set(friendId, row.level);

      setFriendships(prev => {
        const next = new Map(prev);
        next.set(friendId, row);
        return next;
      });
    });

    return () => { channel.unsubscribe(); };
  }, [userId, onLevelUp, indexRow]);

  const getFriendship = useCallback(
    (friendId: string) => friendships.get(friendId),
    [friendships],
  );

  const applyXpResult = useCallback((friendId: string, result: { level: number; total_xp: number; daily_xp_count: number }) => {
    setFriendships(prev => {
      const existing = prev.get(friendId);
      if (!existing) return prev;
      const updated: FriendshipRow = {
        ...existing,
        level: result.level,
        total_xp: result.total_xp,
        daily_xp_count: result.daily_xp_count,
        last_xp_at: new Date().toISOString(),
      };
      const next = new Map(prev);
      next.set(friendId, updated);
      return next;
    });
    // Update last-level cache too so the realtime echo doesn't fire a duplicate
    // level-up event for a level we've already shown.
    lastLevelRef.current.set(friendId, result.level);
  }, []);

  return { friendships, getFriendship, applyXpResult };
}
