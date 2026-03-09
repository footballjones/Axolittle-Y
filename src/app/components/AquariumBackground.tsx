import { motion } from 'motion/react';
import { getDecorationById } from '../data/decorations';

interface AquariumBackgroundProps {
  background: string;
  decorations: string[];
}

export function AquariumBackground({ background, decorations }: AquariumBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base aquarium background image */}
      <img
        src="/aquarium-bg.png"
        alt="Aquarium background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      />
      
      {/* Color tint overlay from customization */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{ background, zIndex: 1 }}
      />

      {/* Decorations (emoji items from shop) */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 flex items-end justify-around px-4 pb-4 z-[2]">
        {decorations.map((decorationId, index) => {
          const decoration = getDecorationById(decorationId);
          if (!decoration || decoration.type === 'background') return null;

          return (
            <motion.div
              key={`${decorationId}-${index}`}
              initial={{ y: 50, opacity: 0, scale: 0.8 }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
              }}
              transition={{
                delay: index * 0.15,
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
              whileHover={{ scale: 1.1, y: -5 }}
              className="text-3xl drop-shadow-lg cursor-pointer"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            >
              {decoration.emoji}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}