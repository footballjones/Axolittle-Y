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
        const updated = checkEvolution(statsResult.axolotl);
        const gameStateUpdates = statsResult.gameState || {};

        const now = Date.now();
        const lastUpdate = stateWithUpdatedShrimp.lastEnergyUpdate || now;
        const elapsedSeconds = (now - lastUpdate) / 1000;

        const energyRegenRate = GAME_CONFIG.energyRegenRate / 3600;
        const maxEnergy = stateWithUpdatedShrimp.maxEnergy || GAME_CONFIG.energyMax;
        const currentEnergy = stateWithUpdatedShrimp.energy || 0;
        const energyGained = energyRegenRate * elapsedSeconds;
        const newEnergy = Math.min(maxEnergy, currentEnergy + energyGained);

        return {
          ...stateWithUpdatedShrimp,
          ...gameStateUpdates,
          axolotl: updated,
          energy: Math.floor(newEnergy),
          maxEnergy,
          lastEnergyUpdate: now,
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axolotlId]);
}
