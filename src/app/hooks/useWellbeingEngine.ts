import { GameState } from '../types/game';
import { updateStats, checkEvolution, updateShrimp } from '../utils/gameLogic';
import { GAME_CONFIG } from '../config/game';
import { useBackgroundAwareInterval } from './useBackgroundAwareInterval';

interface UseWellbeingEngineProps {
  axolotlId: string | null | undefined;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
}

const TICK_MS = 5000;

/**
 * Runs the wellbeing tick: stat decay, evolution checks, and energy regen.
 * Pauses while the app is backgrounded; the catch-up tick on resume covers
 * the gap (all decay math is elapsed-time-based).
 */
export function useWellbeingEngine({ axolotlId, setGameState }: UseWellbeingEngineProps): void {
  useBackgroundAwareInterval(
    () => {
      setGameState(prev => {
        if (!prev?.axolotl) return prev;

        const stateWithUpdatedShrimp = updateShrimp(prev);
        const statsResult = updateStats(prev.axolotl, stateWithUpdatedShrimp);
        const { axolotl: evolved, didLevelUp } = checkEvolution(statsResult.axolotl);
        const gameStateUpdates = statsResult.gameState || {};

        const now = Date.now();
        const lastUpdate = stateWithUpdatedShrimp.lastEnergyUpdate || now;
        const elapsedSeconds = (now - lastUpdate) / 1000;

        const energyRegenRate = GAME_CONFIG.energyRegenRate / 3600;
        const maxEnergy = stateWithUpdatedShrimp.maxEnergy || GAME_CONFIG.energyMax;
        const currentEnergy = stateWithUpdatedShrimp.energy || 0;
        const energyGained = energyRegenRate * elapsedSeconds;
        const newEnergy = Math.min(maxEnergy, currentEnergy + energyGained);

        // Bail when nothing observable changed — skips a free React rerender on
        // alternating ticks where updateStats no-ops on its 6s floor and on any
        // tick where the player is idle at max energy. handleDeductEnergy is
        // robust to a stale lastEnergyUpdate via the maxEnergy cap, so skipping
        // the timestamp refresh at cap is safe.
        const shrimpUnchanged = stateWithUpdatedShrimp === prev;
        const statsUnchanged = statsResult.axolotl === prev.axolotl && !statsResult.gameState;
        const evolutionUnchanged =
          evolved.lastLevel === statsResult.axolotl.lastLevel &&
          evolved.stage === statsResult.axolotl.stage;
        const energyUnchanged = newEnergy === currentEnergy;
        if (shrimpUnchanged && statsUnchanged && evolutionUnchanged && energyUnchanged) {
          return prev;
        }

        // NOTE: pendingStatPoints is intentionally NOT granted here.
        // Stat points are the sole responsibility of the action handlers
        // (handleEatFood, handleMiniGameEnd) which already update axolotl.lastLevel
        // in sync with the XP change. If we also granted here we'd double-count
        // every level-up because checkEvolution would still see level > lastLevel
        // on the tick that runs right after an XP grant.
        void didLevelUp; // stage evolution (the return value) is all we need
        return {
          ...stateWithUpdatedShrimp,
          ...gameStateUpdates,
          axolotl: evolved,
          energy: newEnergy,
          maxEnergy,
          lastEnergyUpdate: now,
        };
      });
    },
    TICK_MS,
    { enabled: !!axolotlId, immediate: true },
  );
}
