import { DecorationItem } from '../types/game';

export const DECORATIONS: DecorationItem[] = [
  // Plants
  { id: 'plant-1', name: 'Seaweed', type: 'plant', cost: 0, emoji: '🌿' },
  { id: 'plant-2', name: 'Kelp', type: 'plant', cost: 50, emoji: '🪸' },
  { id: 'plant-3', name: 'Coral', type: 'plant', cost: 100, emoji: '🪴' },
  { id: 'plant-4', name: 'Lotus', type: 'plant', cost: 150, emoji: '🪷' },

  // Rocks
  { id: 'rock-1', name: 'Pebble', type: 'rock', cost: 0, emoji: '🪨' },
  { id: 'rock-2', name: 'Boulder', type: 'rock', cost: 75, emoji: '🗿' },
  { id: 'rock-3', name: 'Crystal', type: 'rock', cost: 200, emoji: '💎' },

  // Ornaments
  { id: 'ornament-1', name: 'Shell', type: 'ornament', cost: 50, emoji: '🐚' },
  { id: 'ornament-2', name: 'Castle', type: 'ornament', cost: 150, emoji: '🏰' },
  { id: 'ornament-3', name: 'Treasure', type: 'ornament', cost: 250, emoji: '💰' },
  { id: 'ornament-4', name: 'Starfish', type: 'ornament', cost: 100, emoji: '⭐' },
  { id: 'ornament-5', name: 'Mushroom', type: 'ornament', cost: 120, emoji: '🍄' },

  // Backgrounds
  { id: 'bg-1', name: 'Deep Blue', type: 'background', cost: 0, emoji: '🌊' },
  { id: 'bg-2', name: 'Sunset', type: 'background', cost: 100, emoji: '🌅' },
  { id: 'bg-3', name: 'Night', type: 'background', cost: 150, emoji: '🌙' },
  { id: 'bg-4', name: 'Tropical', type: 'background', cost: 200, emoji: '🏝️' },
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
