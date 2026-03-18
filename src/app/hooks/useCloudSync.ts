import { useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { GameState } from '../types/game';
import { getLocalUpdatedAt } from '../utils/storage';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline' | 'guest';

interface UseCloudSyncOptions {
  /** Authenticated user ID, or null when not signed in. */
  userId: string | null;
  /** The player's login username (from auth metadata). Null for OAuth-only users. */
  authUsername: string | null;
  gameState: GameState | null;
  onCloudStateLoaded: (state: GameState) => void;
  /**
   * Called when both local and cloud saves exist with meaningful data and the cloud
   * version is strictly newer. The caller should present a conflict-resolution UI
   * so the user can choose which save to keep.
   */
  onConflict?: (local: GameState, cloud: GameState) => void;
  onStatusChange: (status: SyncStatus) => void;
  /** Called when this player's friend code collides with another user's in the DB. */
  onFriendCodeCollision?: () => void;
}

/**
 * Handles bidirectional cloud sync:
 *  - On mount (when userId is first available): pull from Supabase and use
 *    whichever version is newer (cloud vs localStorage). When both sides have
 *    meaningful data, calls onConflict so the user can choose.
 *  - On every gameState change: debounced push to Supabase (1 500 ms delay).
 *  - Offline resilience: queues failed writes and flushes them on reconnect.
 */
export function useCloudSync({
  userId,
  authUsername,
  gameState,
  onCloudStateLoaded,
  onConflict,
  onStatusChange,
  onFriendCodeCollision,
}: UseCloudSyncOptions) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Guard so we only pull once per session. */
  const hasPulledRef = useRef(false);
  /** True when the browser reports we have network access. */
  const isOnlineRef = useRef(navigator.onLine);
  /**
   * Holds the most-recent state that failed to push (network offline or Supabase
   * error). Flushed automatically when the browser goes back online.
   */
  const pendingStateRef = useRef<GameState | null>(null);

  // ── Bare Supabase upsert (no debounce, no status side-effects) ────────────
  const doPush = useCallback(
    async (state: GameState): Promise<boolean> => {
      if (!userId || !isSupabaseConfigured) return false;

      const { error } = await supabase.from('game_states').upsert(
        {
          player_id: userId,
          state,
          schema_version: 2,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_id' },
      );

      // Publish discoverable profile so other players can find this user by friend code.
      if (!error && state.axolotl && state.friendCode) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: userId,
            username: authUsername ?? state.axolotl.name,
            friend_code: state.friendCode,
            axolotl_name: state.axolotl.name,
            generation: state.axolotl.generation,
            stage: state.axolotl.stage,
          },
          { onConflict: 'id' },
        );

        // Unique constraint violation on friend_code → another user already has this code.
        if (
          profileError &&
          profileError.code === '23505' &&
          profileError.message?.includes('friend_code')
        ) {
          onFriendCodeCollision?.();
        }
      }

      return !error;
    },
    [userId, authUsername, onFriendCodeCollision],
  );

  // ── Online / Offline tracking & flush-on-reconnect ────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      isOnlineRef.current = true;
      if (pendingStateRef.current) {
        onStatusChange('syncing');
        const success = await doPush(pendingStateRef.current);
        if (success) {
          pendingStateRef.current = null;
          onStatusChange('synced');
        } else {
          onStatusChange('error');
        }
      } else {
        // No queue but we're back online — signal healthy state
        onStatusChange('synced');
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      onStatusChange('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial status if already offline
    if (!navigator.onLine) onStatusChange('offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [doPush, onStatusChange]);

  // ── Pull on first sign-in ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !isSupabaseConfigured || hasPulledRef.current) return;
    hasPulledRef.current = true;

    const pull = async () => {
      onStatusChange('syncing');

      try {
        const { data, error } = await supabase
          .from('game_states')
          .select('state, updated_at')
          .eq('player_id', userId)
          .single();

        if (error || !data) {
          // No cloud save yet (new account) — keep local state.
          onStatusChange('idle');
          return;
        }

        const cloudMs = new Date(data.updated_at as string).getTime();
        const localMs = getLocalUpdatedAt();
        const cloudState = data.state as GameState;

        if (cloudMs > localMs) {
          // Cloud is newer — check whether the local side also has meaningful data.
          // If yes, surface a conflict modal so the user can decide. Otherwise just
          // silently hydrate from cloud (e.g. fresh install / new device).
          if (localMs > 0 && gameState?.axolotl && onConflict) {
            onConflict(gameState, cloudState);
          } else {
            onCloudStateLoaded(cloudState);
          }
        }

        onStatusChange('synced');
      } catch {
        onStatusChange('error');
      }
    };

    pull();
  // gameState intentionally excluded: we only want the snapshot from when
  // userId first becomes available, not re-run on every state change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, onCloudStateLoaded, onConflict, onStatusChange]);

  // ── Debounced push on state change ────────────────────────────────────────
  const pushToCloud = useCallback(
    async (state: GameState) => {
      if (!userId || !isSupabaseConfigured) return;

      if (!isOnlineRef.current) {
        // Device is offline — remember the latest state to push on reconnect.
        pendingStateRef.current = state;
        onStatusChange('offline');
        return;
      }

      onStatusChange('syncing');
      const success = await doPush(state);

      if (!success) {
        // Network error despite being "online" (e.g. Supabase outage) — queue it.
        pendingStateRef.current = state;
      }

      onStatusChange(success ? 'synced' : 'error');
    },
    [userId, doPush, onStatusChange],
  );

  useEffect(() => {
    if (!userId || !gameState || !isSupabaseConfigured) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushToCloud(gameState);
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [gameState, userId, pushToCloud]);
}
