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
  birthStats?: SecondaryStats; // Secondary stats at birth (before any level-up gains) — used for inheritance floor
}

export interface DecorationItem {
  id: string;
  name: string;
  type: 'plant' | 'rock' | 'ornament' | 'background';
  cost: number;
  emoji: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';   // Rendered size in the aquarium
  layer?: 'floor' | 'mid' | 'tall';    // Vertical placement layer in the aquarium
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
  parentStats?: SecondaryStats; // Parent's birth stats — used to apply inheritance floor on hatch
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
  nurseryEggs: Egg[]; // Storage: open slots grow as player unlocks them
  nurseryUnlockedSlots?: number; // Number of unlocked nursery slots (default 6)
  /** @deprecated Use ownedFilters + equippedFilter instead. Kept for legacy save migration. */
  filterTier?: string;
  ownedFilters?: string[];  // All filter IDs the player has purchased (multiple allowed)
  equippedFilter?: string;  // The currently active filter ID (one of ownedFilters)
  shrimpCount?: number; // Number of shrimp in tank (vacation mechanic)
  storedShrimp?: number; // Shrimp in inventory, not yet deployed to tank
  storedTreatments?: Record<string, number>; // treatmentId → count stored in inventory
  lastShrimpUpdate?: number; // Timestamp of last shrimp consumption
  lastEnergyUpdate?: number; // Timestamp of last energy update (for fractional energy tracking)
  lastSpinDate?: string; // YYYY-MM-DD format for daily spin wheel
  lastLoginDate?: string; // YYYY-MM-DD format for daily login bonus
  loginStreak?: number; // Current login streak (days)
  lastLoginBonusDate?: string; // YYYY-MM-DD format for login bonus tracking
  cleanlinessLowSince?: number; // Timestamp when cleanliness first dropped below 50%
  cleanlinessVeryLowSince?: number; // Timestamp when cleanliness first dropped below 10%
  allStatsZeroSince?: number; // Timestamp when hunger, happiness AND cleanliness all hit 0 simultaneously
  lastTraitDecayTime?: number; // Timestamp of last secondary-stat decay tick
  poopItems?: PoopItem[]; // Active visible poop items in the tank
  pendingPoops?: PendingPoop[]; // Poops scheduled to appear after 5-min delay
  feedCount?: number; // Feeds since last feed-poop was scheduled (resets at 6)
  lastPoopTime?: number; // Timestamp when last time-based poop was generated
  miniGamesLockedUntil?: number; // Timestamp (ms) until which mini-games are locked after a water change
  friendCode?: string;             // Permanent code set once at account creation, never changes
  // ── Achievement tracking ─────────────────────────────────────────────────
  achievements?: string[];         // IDs of all unlocked achievements (claimed + unclaimed)
  pendingAchievements?: string[];  // IDs of unlocked but not-yet-claimed achievements
  totalFeedsEver?: number;         // Cumulative feed count (all time)
  totalCleansEver?: number;        // Cumulative poop-clean count (all time)
  totalWaterChanges?: number;      // Cumulative water-change count
  totalMinigamesPlayed?: number;   // Cumulative minigames played
  totalExceptionalScores?: number; // Cumulative "exceptional" tier scores
  totalGiftsSent?: number;         // Cumulative gifts sent to friends
  totalEggsHatched?: number;       // Cumulative eggs hatched
  uniqueGamesPlayed?: string[];    // Game IDs ever played (for all-rounder achievement)
  recessiveExpressed?: boolean;    // Ephemeral: set true in handleHatchEgg when recessive genes expressed
  // ── Tutorial ────────────────────────────────────────────────────────────────
  // undefined = existing save (skip tutorial). 'feed'→'eat'→'done' on new games.
  tutorialStep?: 'feed' | 'eat' | 'done';
  // undefined = existing save (skip). false = new game, not yet seen. true = completed.
  cleanTutorialSeen?: boolean;
  // ── Jimmy & Chubs ────────────────────────────────────────────────────────────
  lastJimmyGift?: number; // Unix-ms timestamp of last gift received from Jimmy & Chubs
  // ── Audio Settings ────────────────────────────────────────────────────────────
  musicEnabled?: boolean; // Master toggle for all background music (default: true)
  soundEnabled?: boolean; // Master toggle for all sound effects (default: true)
  // ── Stat Allocation ────────────────────────────────────────────────────────
  pendingStatPoints?: number; // Unspent level-up stat points waiting to be allocated
  // ── Feeding XP ───────────────────────────────────────────────────────────
  feedXpToday?: number;  // Total XP earned from feeding today (resets daily, max 2)
  feedXpDate?: string;   // YYYY-MM-DD when feedXpToday was last reset
  firstFeedXpGranted?: boolean; // True after the first-ever eat grants a full level-up XP
  // ── Stat tutorial ────────────────────────────────────────────────────────
  statTutorialSeen?: boolean; // True once the player taps the stat assignment banner
  playTutorialSeen?: boolean; // True once the player enters play mode for the first time
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

export interface PoopItem {
  id: string;
  x: number; // position as percentage (0-100) — always sits at bottom
  createdAt: number;
}

export interface PendingPoop {
  id: string;
  x: number;
  showAt: number; // timestamp when poop becomes visible (5 min after 6th feed)
}