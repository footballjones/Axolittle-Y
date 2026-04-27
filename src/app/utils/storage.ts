import { GameState, Friend } from '../types/game';
import { GAME_CONFIG } from '../config/game';
import { calculateLevel } from './gameLogic';

export const JIMMY_CHUBS_ID = 'jimmy-chubs';

export const JIMMY_CHUBS_FRIEND: Friend = {
  id: JIMMY_CHUBS_ID,
  friendCode: 'JIM-0CHBS',
  name: 'Jimmy & Chubs',
  axolotlName: 'Chubs',
  stage: 'guardian',
  generation: 7,
  lastSync: 0,
};

const STORAGE_KEY = 'axolotl-game-state';
const STORAGE_VERSION_KEY = 'axolotl-storage-version';
const CURRENT_STORAGE_VERSION = 2;

interface StoredState {
  version?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.axolotl.stats.waterQuality = (state.axolotl.stats as any).health;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  if (state.nurseryUnlockedSlots === undefined) {
    state.nurseryUnlockedSlots = GAME_CONFIG.nurserySlotsOpen;
  }
  
  // Ensure energy is initialized
  if (state.energy === undefined) {
    state.energy = GAME_CONFIG.energyMax;
  }
  if (state.maxEnergy === undefined) {
    state.maxEnergy = GAME_CONFIG.energyMax;
  }
  
  if (state.axolotl) {
    const stageMigration: Record<string, string> = { 'egg': 'hatchling', 'larva': 'hatchling', 'baby': 'hatchling', 'juvenile': 'sprout', 'adult': 'guardian' };
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
      state.axolotl.lastLevel = calculateLevel(state.axolotl.experience);
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

/** Millisecond timestamp stored alongside every save — used for cloud conflict resolution. */
const UPDATED_AT_KEY = 'axolotl-updated-at';

export function saveGameState(state: GameState): void {
  try {
    const now = Date.now();
    const stateWithVersion = { ...state, version: CURRENT_STORAGE_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithVersion));
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION.toString());
    localStorage.setItem(UPDATED_AT_KEY, String(now));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

/**
 * Returns the Unix-ms timestamp of the last local save, or 0 if no save exists.
 * Used by {@link useCloudSync} to decide whether cloud state is newer.
 */
export function getLocalUpdatedAt(): number {
  const raw = localStorage.getItem(UPDATED_AT_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

export function loadGameState(): GameState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state: StoredState = JSON.parse(stored);
      const migratedState = runMigrations(state);

      // Remove version from state before returning (it's not part of GameState type)
      const { version: _version, ...gameState } = migratedState;

      // Always ensure Jimmy & Chubs is present (non-deletable preset friend)
      const gs = gameState as GameState;

      // Migrate old decorations format: string[] → PlacedDecoration[]
      if (gs.customization?.decorations?.length > 0 && typeof gs.customization.decorations[0] === 'string') {
        gs.customization.decorations = (gs.customization.decorations as unknown as string[]).map(id => ({
          instanceId: id,
          decorationId: id,
        }));
      }

      // Ensure bg-5 (Starting Waters) is always in the player's inventory
      if (!gs.unlockedDecorations) gs.unlockedDecorations = [];
      if (!gs.unlockedDecorations.includes('bg-5')) {
        gs.unlockedDecorations = ['bg-5', ...gs.unlockedDecorations];
      }

      // Migrate existing saves to the new image-based background system
      if (!gs.customization) gs.customization = { background: '', decorations: [] };
      if (!gs.customization.bgImagePath) {
        gs.customization.background = '';
        gs.customization.backgroundId = 'bg-5';
        gs.customization.bgImagePath = 'aquarium-bg-starting.png';
      }

      if (!gs.friends) gs.friends = [];
      if (!gs.friends.some(f => f.id === JIMMY_CHUBS_ID)) {
        gs.friends = [JIMMY_CHUBS_FRIEND, ...gs.friends];
      }

      return gs;
    }
  } catch (error) {
    console.error('Failed to load game state:', error);
  }
  return null;
}

export function generatePermanentFriendCode(): string {
  // Generates a random permanent code — set once at account creation, never changes.
  // Uses unambiguous chars (no 0/O, 1/I/L) for readability.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars — 256 % 32 === 0, no modulo bias
  const rand = (n: number) => {
    const bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => chars[b % chars.length]).join('');
  };
  return `${rand(3)}-${rand(5)}`;
}

export function getInitialGameState(): GameState {
  return {
    friendCode: generatePermanentFriendCode(),
    axolotl: null,
    coins: GAME_CONFIG.starterCoins,
    opals: GAME_CONFIG.starterOpals,
    energy: GAME_CONFIG.energyMax,
    maxEnergy: GAME_CONFIG.energyMax,
    unlockedDecorations: ['plant-1', 'rock-1', 'bg-5'],
    customization: {
      background: '',
      backgroundId: 'bg-5',
      bgImagePath: 'aquarium-bg-starting.png',
      decorations: [],
    },
    lineage: [],
    friends: [JIMMY_CHUBS_FRIEND],
    foodItems: [],
    incubatorEgg: null,
    nurseryEggs: [],
    nurseryUnlockedSlots: GAME_CONFIG.nurserySlotsOpen,
    filterTier: undefined,
    ownedFilters: [],
    equippedFilter: undefined,
    shrimpCount: 0,
    lastShrimpUpdate: undefined,
    shrimpTutorialSeen: false,
    lastEnergyUpdate: Date.now(), // Initialize energy timestamp
    lastSpinDate: undefined,
    lastLoginDate: undefined,
    loginStreak: 0,
    lastLoginBonusDate: undefined,
    tutorialStep: 'swipe',        // First tutorial: prompt the player to swipe and explore
    cleanTutorialSeen: false,     // Show cleaning tutorial on first poop appearance
    waterTutorialSeen: false,     // Show water-change tutorial after poop tutorial
    wellbeingIntroSeen: false,    // Show wellbeing intro modal before feed tutorial
    wellbeingCompleteSeen: false, // Show completion modal + 5 opal reward after water tutorial
    menuTutorialSeen: false,     // Show menu walkthrough tutorial after wellbeing
  };
}