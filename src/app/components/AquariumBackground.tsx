import { motion } from 'motion/react';
import { getDecorationById } from '../data/decorations';
import { DecorationItem } from '../types/game';

interface AquariumBackgroundProps {
  background: string;
  decorations: string[];
}

// Maps decoration size to Tailwind font-size class
const SIZE_CLASS: Record<string, string> = {
  sm: 'text-3xl',  // ~30px — small items: pebbles, shells, sprouts
  md: 'text-4xl',  // ~36px — medium items: crystals, starfish, treasure
  lg: 'text-5xl',  // ~48px — large items: driftwood, anchors, water reeds
  xl: 'text-6xl',  // ~60px — extra-large: seaweed, coral, sunken castle
};

// Bottom offset (% of aquarium height) per vertical layer
const LAYER_BOTTOM: Record<string, string> = {
  floor: '2%',   // Sits on the aquarium floor
  mid:   '20%',  // Floats mid-tank (anchors, mid-height plants)
  tall:  '36%',  // Tall items reaching up into the water column
};

/**
 * Returns the horizontal position (% of container width) for each item,
 * spreading them evenly from ~10% to ~90% regardless of count.
 * The aquarium container is 250% the viewport width, so this effectively
 * distributes decorations across the full scrollable area.
 */
function getXPercent(index: number, total: number): number {
  if (total <= 1) return 50;
  const step = 80 / (total - 1); // span 10%→90%
  return 10 + index * step;
}

export function AquariumBackground({ background, decorations }: AquariumBackgroundProps) {
  // Filter out background-type entries — only tank decorations get rendered
  const tankDecos = decorations
    .map(id => getDecorationById(id))
    .filter((d): d is DecorationItem => !!d && d.type !== 'background');

  const total = tankDecos.length;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base aquarium background image */}
      <img
        src={`${import.meta.env.BASE_URL}aquarium-bg.png`}
        alt="Aquarium background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      />

      {/* Color tint overlay from background customization */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{ background, zIndex: 1 }}
      />

      {/* Decorations — absolutely positioned, spread across the full scrollable width */}
      {tankDecos.map((decoration, index) => {
        const sizeClass = SIZE_CLASS[decoration.size ?? 'md'];
        const bottom = LAYER_BOTTOM[decoration.layer ?? 'floor'];
        const leftPct = getXPercent(index, total);

        return (
          // Outer div handles positioning; inner motion.div handles animation
          // (keeps CSS transforms separate from Framer Motion transforms)
          <div
            key={`${decoration.id}-${index}`}
            className="absolute z-[2]"
            style={{
              bottom,
              left: `${leftPct}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{
                delay: index * 0.15,
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
              whileHover={{ scale: 1.1, y: -6 }}
              className={`${sizeClass} drop-shadow-lg cursor-pointer`}
              style={{
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))',
                lineHeight: 1,
              }}
            >
              {decoration.emoji}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
