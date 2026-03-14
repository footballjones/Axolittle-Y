import { useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { GameState } from '../types/game';
import { getLocalUpdatedAt } from '../utils/storage';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'guest';

interface UseCloudSyncOptions {
  /** Authenticated user ID, or null when not signed in. */
  userId: string | null;
  gameState: GameState | null;
  onCloudStateLoaded: (state: GameState) => void;
  onStatusChange: (status: SyncStatus) => void;
}

/**
 * Handles bidirectional cloud sync:
 *  - On mount (when userId is first available): pull from Supabase and use
 *    whichever version is newer (cloud vs localStorage).
 *  - On every gameState change: debounced push to Supabase (1 500 ms delay).
 */
export function useCloudSync({
  userId,
  gameState,
  onCloudStateLoaded,
  onStatusChange,
}: UseCloudSyncOptions) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Guard so we only pull once per session. */
  const hasPulledRef = useRef(false);

  // ── Pull on first sign-in ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !isSupabaseConfigured || hasPulledRef.current) return;
    hasPulledRef.current = true;

    const pull = async () => {
      onStatusChange('syncing');
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

      if (cloudMs > localMs) {
        // Cloud is newer — hydrate app with cloud state.
        onCloudStateLoaded(data.state as GameState);
      }

      onStatusChange('synced');
    };

    pull();
  }, [userId, onCloudStateLoaded, onStatusChange]);

  // ── Debounced push on state change ────────────────────────────────────────
  const pushToCloud = useCallback(
    async (state: GameState) => {
      if (!userId || !isSupabaseConfigured) return;
      onStatusChange('syncing');

      const { error } = await supabase.from('game_states').upsert(
        {
          player_id: userId,
          state,
          schema_version: 2,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_id' },
      );

      // Publish discoverable profile info so other players can look up this user
      // by friend code. Only written when the player has an axolotl and friend code.
      if (!error && state.axolotl && state.friendCode) {
        await supabase.from('profiles').upsert(
          {
            id: userId,
            username: state.axolotl.name,
            friend_code: state.friendCode,
            axolotl_name: state.axolotl.name,
            generation: state.axolotl.generation,
            stage: state.axolotl.stage,
          },
          { onConflict: 'id' },
        );
      }

      onStatusChange(error ? 'error' : 'synced');
    },
    [userId, onStatusChange],
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
