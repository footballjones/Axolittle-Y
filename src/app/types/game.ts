export type LifeStage = 'baby' | 'juvenile' | 'adult' | 'elder';

export interface AxolotlStats {
  hunger: number; // 0-100
  happiness: number; // 0-100
  cleanliness: number; // 0-100
  waterQuality: number; // 0-100 (acts as multiplier on other stats)
}

export interface SecondaryStats {
  strength: number; // 0-100
  intellect: number; // 0-100
  stamina: number; // 0-100
  speed: number; // 0-100
}

export interface RecessiveGenes {
  color?: string;
  pattern?: string;
}

export interface Axolotl {
  id: string;
  name: string;
  stage: LifeStage;
  stats: AxolotlStats;
  secondaryStats: SecondaryStats;
  age: number; // in minutes
  experience: number;
  color: string;
  pattern: string;
  generation: number;
  parentIds: string[];
  birthDate: number;
  lastUpdated: number;
  recessiveGenes?: RecessiveGenes; // Hidden traits that can manifest on rebirth/breeding
  rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'; // Rarity of egg this axolotl came from
  lastLevel?: number; // Track last level to detect level ups
}

export interface DecorationItem {
  id: string;
  name: string;
  type: 'plant' | 'rock' | 'ornament' | 'background';
  cost: number;
  emoji: string;
}

export interface AquariumCustomization {
  background: string;
  decorations: string[]; // decoration IDs
}

export interface Egg {
  id: string;
  parentIds: string[];
  generation: number;
  incubationEndsAt: number; // timestamp when ready to hatch
  color: string; // from genetics (may include recessive expression)
  pattern: string; // from genetics (may include recessive expression)
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  pendingName?: string; // Name provided during rebirth (used at hatch)
}

export interface GameState {
  axolotl: Axolotl | null;
  coins: number;
  opals: number;
  energy: number;
  maxEnergy: number;
  unlockedDecorations: string[];
  customization: AquariumCustomization;
  lineage: Axolotl[]; // previous generations
  friends: Friend[];
  foodItems: FoodItem[];
  incubatorEgg: Egg | null; // 1 slot for active hatching
  nurseryEggs: Egg[]; // Storage: 6 open, 18 locked (purchase with Opals)
  filterTier?: string; // 'filter-basic' | 'filter-advanced' | 'filter-premium'
  shrimpCount?: number; // Number of shrimp in tank (vacation mechanic)
  lastShrimpUpdate?: number; // Timestamp of last shrimp consumption
  lastEnergyUpdate?: number; // Timestamp of last energy update (for fractional energy tracking)
  lastSpinDate?: string; // YYYY-MM-DD format for daily spin wheel
  lastLoginDate?: string; // YYYY-MM-DD format for daily login bonus
  loginStreak?: number; // Current login streak (days)
  lastLoginBonusDate?: string; // YYYY-MM-DD format for login bonus tracking
  cleanlinessLowSince?: number; // Timestamp when cleanliness first dropped below 50%
}

export interface Friend {
  id: string;
  friendCode?: string; // Normalized friend code for duplicate detection
  name: string;
  axolotlName: string;
  stage: LifeStage;
  generation: number;
  lastSync: number;
}

export interface BreedingRequest {
  friendId: string;
  accepted: boolean;
}

export interface FoodItem {
  id: string;
  x: number; // position as percentage (0-100)
  y: number; // position as percentage (0-100)
  createdAt: number;
}