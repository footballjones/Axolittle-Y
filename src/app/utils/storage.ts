import { GameState, Axolotl } from '../types/game';
import { GAME_CONFIG } from '../config/game';

const STORAGE_KEY = 'axolotl-game-state';
const STORAGE_VERSION_KEY = 'axolotl-storage-version';
const CURRENT_STORAGE_VERSION = 2;

interface StoredState {
  version?: number;
  [key: string]: any;
}

// Migration functions
function migrateV1toV2(state: StoredState): StoredState {
  // V1 -> V2: Add secondaryStats, opals, foodItems, stage migration, energy, health->waterQuality
  if (state.axolotl && !state.axolotl.secondaryStats) {
    state.axolotl.secondaryStats = {
      strength: Math.floor(Math.random() * 40) + 30,
      intellect: Math.floor(Math.random() * 40) + 30,
      stamina: Math.floor(Math.random() * 40) + 30,
      speed: Math.floor(Math.random() * 40) + 30,
    };
  }
  
  if (state.opals === undefined) {
    state.opals = 10;
  }
  
  if (!state.foodItems) {
    state.foodItems = [];
  }
  
  // Migrate health to waterQuality
  if (state.axolotl && state.axolotl.stats && 'health' in state.axolotl.stats) {
    state.axolotl.stats.waterQuality = (state.axolotl.stats as any).health;
    delete (state.axolotl.stats as any).health;
  }
  
  // Add energy
  if (state.energy === undefined) {
    state.energy = GAME_CONFIG.energyMax;
    state.maxEnergy = GAME_CONFIG.energyMax;
  }
  
  // Add lastEnergyUpdate for fractional energy tracking
  if (state.lastEnergyUpdate === undefined) {
    state.lastEnergyUpdate = Date.now();
  }
  
  // Add egg system (incubatorEgg, nurseryEggs)
  if (state.incubatorEgg === undefined) {
    state.incubatorEgg = null;
  }
  if (state.nurseryEggs === undefined) {
    state.nurseryEggs = [];
  }
  
  // Ensure energy is initialized
  if (state.energy === undefined) {
    state.energy = GAME_CONFIG.energyMax;
  }
  if (state.maxEnergy === undefined) {
    state.maxEnergy = GAME_CONFIG.energyMax;
  }
  
  if (state.axolotl) {
    const stageMigration: Record<string, string> = { 'egg': 'baby', 'larva': 'baby' };
    if (stageMigration[state.axolotl.stage]) {
      state.axolotl.stage = stageMigration[state.axolotl.stage];
    }
    
    // Infer rarity from secondary stats if not set (for backwards compatibility)
    if (!state.axolotl.rarity && state.axolotl.secondaryStats) {
      const avgStat = (
        state.axolotl.secondaryStats.strength +
        state.axolotl.secondaryStats.intellect +
        state.axolotl.secondaryStats.stamina +
        state.axolotl.secondaryStats.speed
      ) / 4;
      
      if (avgStat >= 50) {
        state.axolotl.rarity = 'Mythic';
      } else if (avgStat >= 35) {
        state.axolotl.rarity = 'Legendary';
      } else if (avgStat >= 20) {
        state.axolotl.rarity = 'Epic';
      } else if (avgStat >= 9) {
        state.axolotl.rarity = 'Rare';
      } else {
        state.axolotl.rarity = 'Common';
      }
    }
    
    // Initialize lastLevel if not set (for backwards compatibility)
    if (state.axolotl.lastLevel === undefined) {
      // Calculate level from experience (Level 1 = 0 XP, Level 2 = 10 XP, then +5 per level)
      const exp = state.axolotl.experience;
      if (exp < 10) {
        state.axolotl.lastLevel = 1;
      } else {
        state.axolotl.lastLevel = Math.min(40, Math.floor((exp - 10) / 5) + 2);
      }
    }
  }
  
  state.version = 2;
  return state;
}

function runMigrations(state: StoredState): StoredState {
  const version = state.version || 1;
  
  if (version < 2) {
    state = migrateV1toV2(state);
  }
  
  // Future migrations: if (version < 3) { state = migrateV2toV3(state); }
  
  return state;
}

export function saveGameState(state: GameState): void {
  try {
    const stateWithVersion = { ...state, version: CURRENT_STORAGE_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithVersion));
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION.toString());
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

export function loadGameState(): GameState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state: StoredState = JSON.parse(stored);
      const migratedState = runMigrations(state);
      
      // Remove version from state before returning (it's not part of GameState type)
      const { version, ...gameState } = migratedState;
      return gameState as GameState;
    }
  } catch (error) {
    console.error('Failed to load game state:', error);
  }
  return null;
}

export function generateFriendCode(axolotl: Axolotl): string {
  // Generate a shareable friend code
  const code = `${axolotl.name.substring(0, 3).toUpperCase()}-${axolotl.generation}${axolotl.id.substring(4, 8).toUpperCase()}`;
  return code;
}

export function getInitialGameState(): GameState {
  return {
    axolotl: null,
    coins: GAME_CONFIG.starterCoins,
    opals: GAME_CONFIG.starterOpals,
    energy: GAME_CONFIG.energyMax,
    maxEnergy: GAME_CONFIG.energyMax,
    unlockedDecorations: ['plant-1', 'rock-1'],
    customization: {
      background: '#1e40af',
      decorations: [],
    },
    lineage: [],
    friends: [],
    foodItems: [],
    incubatorEgg: null,
    nurseryEggs: [],
    filterTier: undefined,
    shrimpCount: 0,
    lastShrimpUpdate: undefined,
    lastEnergyUpdate: Date.now(), // Initialize energy timestamp
    lastSpinDate: undefined,
    lastLoginDate: undefined,
    loginStreak: 0,
    lastLoginBonusDate: undefined,
  };
}