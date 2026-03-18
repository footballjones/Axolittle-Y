import { useEffect } from 'react';
import { GameState } from '../types/game';
import { updateStats, checkEvolution, updateShrimp } from '../utils/gameLogic';
import { GAME_CONFIG } from '../config/game';

interface UseWellbeingEngineProps {
  axolotlId: string | null | undefined;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
}

/**
 * Runs the wellbeing tick: stat decay, evolution checks, and energy regen.
 * Fires every 5 seconds while an axolotl is alive.
 */
export function useWellbeingEngine({ axolotlId, setGameState }: UseWellbeingEngineProps): void {
  useEffect(() => {
    if (!axolotlId) return;

    const interval = setInterval(() => {
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
    }, 5000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axolotlId]);
}
