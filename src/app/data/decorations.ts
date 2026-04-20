import { DecorationItem } from '../types/game';

export const DECORATIONS: DecorationItem[] = [
  // ── Plants ──────────────────────────────────────────────────────────────────
  // Tall underwater flora that fills the upper-mid portion of the tank
  { id: 'plant-1', name: 'Seaweed',      type: 'plant', cost: 0,   icon: 'Leaf',     size: 'xl', layer: 'tall',  svgPath: 'decorations/seaweed.svg' },
  { id: 'plant-2', name: 'Coral',        type: 'plant', cost: 50,  icon: 'Shell',    size: 'xl', layer: 'tall'  },
  { id: 'plant-3', name: 'Water Reeds',  type: 'plant', cost: 100, icon: 'Wheat',    size: 'lg', layer: 'mid'   },
  { id: 'plant-4', name: 'Water Lily',   type: 'plant', cost: 150, icon: 'Flower2',  size: 'md', layer: 'mid'   },
  { id: 'plant-5', name: 'Sprout',       type: 'plant', cost: 80,  icon: 'Sprout',   size: 'sm', layer: 'floor' },

  // ── Rocks ───────────────────────────────────────────────────────────────────
  // Floor-level items; driftwood and crystals are classic freshwater tank decor
  { id: 'rock-1', name: 'Pebble',       type: 'rock', cost: 0,   icon: 'Mountain', size: 'sm', layer: 'floor' },
  { id: 'rock-2', name: 'Driftwood',    type: 'rock', cost: 75,  icon: 'TreePine', size: 'lg', layer: 'floor' },
  { id: 'rock-3', name: 'Crystal',      type: 'rock', cost: 200, icon: 'Gem',      size: 'md', layer: 'floor' },

  // ── Ornaments ───────────────────────────────────────────────────────────────
  // Classic aquarium decorations — shells, sunken ruins, nautical items
  { id: 'ornament-1', name: 'Shell',        type: 'ornament', cost: 50,  icon: 'Shell',   size: 'sm', layer: 'floor' },
  { id: 'ornament-2', name: 'Sunken Castle',type: 'ornament', cost: 150, icon: 'Castle',  size: 'xl', layer: 'tall', svgPath: 'decorations/sunken-castle.svg' },
  { id: 'ornament-3', name: 'Treasure',     type: 'ornament', cost: 250, icon: 'Coins',   size: 'md', layer: 'floor' },
  { id: 'ornament-4', name: 'Starfish',     type: 'ornament', cost: 100, icon: 'Star',    size: 'sm', layer: 'floor' },
  { id: 'ornament-5', name: 'Anchor',       type: 'ornament', cost: 120, icon: 'Anchor',  size: 'lg', layer: 'mid'   },
  { id: 'ornament-6', name: 'Ancient Vase', type: 'ornament', cost: 175, icon: 'Archive', size: 'md', layer: 'floor' },

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  { id: 'bg-1', name: 'Deep Blue', type: 'background', cost: 0,   icon: 'Waves'   },
  { id: 'bg-2', name: 'Sunset',    type: 'background', cost: 100, icon: 'Sunrise' },
  { id: 'bg-3', name: 'Night',     type: 'background', cost: 150, icon: 'Moon'    },
  { id: 'bg-4', name: 'Tropical',  type: 'background', cost: 200, icon: 'Trees'   },
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
