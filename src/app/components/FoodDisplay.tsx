import { motion } from 'motion/react';
import { FoodItem } from '../types/game';
import { useMemo } from 'react';

interface FoodDisplayProps {
  food: FoodItem;
  tutorialActive?: boolean;
}

export function FoodDisplay({ food, tutorialActive }: FoodDisplayProps) {
  // Generate random sink rate and wiggle pattern for each worm
  const animationProps = useMemo(() => ({
    sinkDuration: 4 + Math.random() * 2.67, // 4-6.67 seconds to sink (33% slower)
    wiggleAmount: 5 + Math.random() * 10, // 5-15 degrees wiggle
    wiggleDuration: 0.8 + Math.random() * 0.4, // 0.8-1.2 second wiggle
  }), []);

  return (
    <motion.div
      className="absolute"
      data-food-id={food.id}
      initial={{
        left: `${food.x}%`,
        top: '10%',
        opacity: 1,
      }}
      animate={{
        top: '75%',
      }}
      transition={{
        duration: animationProps.sinkDuration,
        ease: 'easeIn',
      }}
      style={{
        zIndex: 25,
        pointerEvents: 'none',
      }}
    >
      {/* Tutorial: pulsing ring around the worm */}
      {tutorialActive && (
        <motion.div
          style={{
            position: 'absolute',
            width: 64,
            height: 36,
            top: -8,
            left: -7,
            transform: 'translateX(-50%)',
            borderRadius: '50%',
            border: '2.5px solid rgba(239,68,68,0.85)',
            pointerEvents: 'none',
          }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Bloodworm - curved shape with brighter red */}
      <motion.div
        animate={{
          rotate: [0, animationProps.wiggleAmount, -animationProps.wiggleAmount, 0],
        }}
        transition={{
          duration: animationProps.wiggleDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          width: 50,
          height: 20,
          position: 'relative',
          transform: 'translateX(-50%)',
        }}
      >
        {/* Curved worm body using SVG */}
        <svg 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
          viewBox="0 0 50 20"
        >
          <defs>
            <linearGradient id={`worm-gradient-${food.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff0000" />
              <stop offset="30%" stopColor="#ff2020" />
              <stop offset="70%" stopColor="#ff0000" />
              <stop offset="100%" stopColor="#cc0000" />
            </linearGradient>
            <filter id={`worm-shadow-${food.id}`}>
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="1" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.5"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Main curved worm body */}
          <motion.path
            d="M 2 10 Q 12.5 6, 25 10 T 48 10"
            stroke={`url(#worm-gradient-${food.id})`}
            strokeWidth="2.75"
            fill="none"
            strokeLinecap="round"
            animate={{
              d: [
                "M 2 10 Q 12.5 6, 25 10 T 48 10",
                "M 2 10 Q 12.5 14, 25 10 T 48 10",
                "M 2 10 Q 12.5 6, 25 10 T 48 10",
              ],
            }}
            transition={{
              duration: animationProps.wiggleDuration * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              filter: `url(#worm-shadow-${food.id}) drop-shadow(0 1px 4px rgba(255,51,51,0.6))`,
            }}
          />
          
          {/* Segments overlay */}
          <motion.path
            d="M 2 10 Q 12.5 6, 25 10 T 48 10"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="2.75"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="3 4"
            animate={{
              d: [
                "M 2 10 Q 12.5 6, 25 10 T 48 10",
                "M 2 10 Q 12.5 14, 25 10 T 48 10",
                "M 2 10 Q 12.5 6, 25 10 T 48 10",
              ],
            }}
            transition={{
              duration: animationProps.wiggleDuration * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {/* Highlight along worm */}
          <motion.path
            d="M 10 10 Q 18 7, 30 10"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            animate={{
              d: [
                "M 10 10 Q 18 7, 30 10",
                "M 10 10 Q 18 13, 30 10",
                "M 10 10 Q 18 7, 30 10",
              ],
            }}
            transition={{
              duration: animationProps.wiggleDuration * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              filter: 'blur(1px)',
            }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}