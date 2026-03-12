import { DecorationItem } from '../types/game';

export const DECORATIONS: DecorationItem[] = [
  // ── Plants ──────────────────────────────────────────────────────────────────
  // Tall underwater flora that fills the upper-mid portion of the tank
  { id: 'plant-1', name: 'Seaweed',      type: 'plant', cost: 0,   emoji: '🌿', size: 'xl', layer: 'tall'  },
  { id: 'plant-2', name: 'Coral',        type: 'plant', cost: 50,  emoji: '🪸', size: 'xl', layer: 'tall'  },
  { id: 'plant-3', name: 'Water Reeds',  type: 'plant', cost: 100, emoji: '🌾', size: 'lg', layer: 'mid'   },
  { id: 'plant-4', name: 'Water Lily',   type: 'plant', cost: 150, emoji: '🪷', size: 'md', layer: 'mid'   },
  { id: 'plant-5', name: 'Sprout',       type: 'plant', cost: 80,  emoji: '🌱', size: 'sm', layer: 'floor' },

  // ── Rocks ───────────────────────────────────────────────────────────────────
  // Floor-level items; driftwood and crystals are classic freshwater tank decor
  { id: 'rock-1', name: 'Pebble',       type: 'rock', cost: 0,   emoji: '🪨', size: 'sm', layer: 'floor' },
  { id: 'rock-2', name: 'Driftwood',    type: 'rock', cost: 75,  emoji: '🪵', size: 'lg', layer: 'floor' },
  { id: 'rock-3', name: 'Crystal',      type: 'rock', cost: 200, emoji: '💎', size: 'md', layer: 'floor' },

  // ── Ornaments ───────────────────────────────────────────────────────────────
  // Classic aquarium decorations — shells, sunken ruins, nautical items
  { id: 'ornament-1', name: 'Shell',        type: 'ornament', cost: 50,  emoji: '🐚', size: 'sm', layer: 'floor' },
  { id: 'ornament-2', name: 'Sunken Castle',type: 'ornament', cost: 150, emoji: '🏰', size: 'xl', layer: 'tall'  },
  { id: 'ornament-3', name: 'Treasure',     type: 'ornament', cost: 250, emoji: '💰', size: 'md', layer: 'floor' },
  { id: 'ornament-4', name: 'Starfish',     type: 'ornament', cost: 100, emoji: '⭐', size: 'sm', layer: 'floor' },
  { id: 'ornament-5', name: 'Anchor',       type: 'ornament', cost: 120, emoji: '⚓', size: 'lg', layer: 'mid'   },
  { id: 'ornament-6', name: 'Ancient Vase', type: 'ornament', cost: 175, emoji: '🏺', size: 'md', layer: 'floor' },

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  { id: 'bg-1', name: 'Deep Blue', type: 'background', cost: 0,   emoji: '🌊' },
  { id: 'bg-2', name: 'Sunset',    type: 'background', cost: 100, emoji: '🌅' },
  { id: 'bg-3', name: 'Night',     type: 'background', cost: 150, emoji: '🌙' },
  { id: 'bg-4', name: 'Tropical',  type: 'background', cost: 200, emoji: '🏝️' },
];

export const BACKGROUND_COLORS: Record<string, string> = {
  'bg-1': '#1e40af',
  'bg-2': 'linear-gradient(to bottom, #ff7e5f, #feb47b)',
  'bg-3': 'linear-gradient(to bottom, #0f172a, #1e293b)',
  'bg-4': 'linear-gradient(to bottom, #06b6d4, #22d3ee)',
};

export function getDecorationById(id: string): DecorationItem | undefined {
  return DECORATIONS.find(d => d.id === id);
}
