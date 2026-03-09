import { motion } from 'motion/react';
import { Axolotl, FoodItem } from '../types/game';
import { useEffect, useState, useRef } from 'react';

interface AxolotlDisplayProps {
  axolotl: Axolotl;
  foodItems: FoodItem[];
  onEatFood: (foodId: string) => void;
  clickTarget?: { x: number; y: number; timestamp: number } | null;
}

export function AxolotlDisplay({ axolotl, foodItems, onEatFood, clickTarget }: AxolotlDisplayProps) {
  // Start in center column (center third: 33-66%, so 50% is perfect)
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [facingLeft, setFacingLeft] = useState(false);
  const foodFirstSeenRef = useRef<number | null>(null);

  // Reset to center column when component mounts (returning to aquarium screen)
  useEffect(() => {
    setPosition({ x: 50, y: 50 });
  }, []); // Empty dependency array - only on mount

  // Handle click target - move axolotl to clicked position
  useEffect(() => {
    if (clickTarget) {
      setFacingLeft(clickTarget.x < position.x);
      setPosition({ x: clickTarget.x, y: clickTarget.y });
    }
  }, [clickTarget?.timestamp]); // Only trigger when timestamp changes (new click)

  // Track when food first appears for 7-second delay
  useEffect(() => {
    if (foodItems.length > 0 && foodFirstSeenRef.current === null) {
      foodFirstSeenRef.current = Date.now();
    } else if (foodItems.length === 0) {
      foodFirstSeenRef.current = null;
    }
  }, [foodItems.length]);

  // Check for nearby food - can eat while falling or settled
  useEffect(() => {
    if (foodItems.length === 0) return;

    // Check all food items (including falling ones) for eating
    const allFood = foodItems;
    
    // First, check if axolotl is close enough to eat any food (even while falling)
    for (const food of allFood) {
      const distX = food.x - position.x;
      const distY = food.y - position.y;
      const distance = Math.sqrt(distX * distX + distY * distY);
      
      if (distance < 7) {
        // Close enough to eat, regardless of whether it's falling or settled
        onEatFood(food.id);
        return;
      }
    }

    // For auto-seeking, only check settled food and wait 7 seconds
    const settledFood = foodItems.filter(f => f.y > 10);
    if (settledFood.length === 0) return;

    // Check if 7 seconds have passed since food first appeared
    const now = Date.now();
    const timeSinceFoodAppeared = foodFirstSeenRef.current 
      ? (now - foodFirstSeenRef.current) / 1000 
      : Infinity;
    
    // Only auto-seek food after 7 seconds
    if (timeSinceFoodAppeared < 7) return;

    const closestFood = settledFood.reduce((closest, food) => {
      const distX = food.x - position.x;
      const distY = food.y - position.y;
      const distance = Math.sqrt(distX * distX + distY * distY);

      if (!closest.food || distance < closest.distance) {
        return { food, distance };
      }
      return closest;
    }, { food: null as FoodItem | null, distance: Infinity });

    if (closestFood.food) {
      setFacingLeft(closestFood.food.x < position.x);
      setPosition({ x: closestFood.food.x, y: closestFood.food.y });
    }
  }, [foodItems, position.x, position.y, onEatFood]);

  // Random swimming
  useEffect(() => {
    if (foodItems.length > 0) return;

    const swimInterval = setInterval(() => {
      // Center third: 33-66% of aquarium (columns split into thirds)
      const newX = Math.random() * 33 + 33;
      const newY = Math.random() * 33 + 33;
      setFacingLeft(newX < position.x);
      setPosition({ x: newX, y: newY });
    }, 12000 + Math.random() * 6000); // 12-18 seconds (less often)

    return () => clearInterval(swimInterval);
  }, [foodItems.length, position.x]);

  const getSize = () => {
    switch (axolotl.stage) {
      case 'baby':
        return 96;
      case 'juvenile':
        return 132;
      case 'adult':
        return 168;
      case 'elder':
        return 186;
      default:
        return 96;
    }
  };

  const size = getSize();

  return (
    <motion.div
      className="absolute"
      animate={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      transition={{
        duration: 4, // Faster movement for both random swimming and click targets
        ease: [0.2, 0.8, 0.4, 1],
      }}
      style={{
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
    >
      {/* Gentle bob animation */}
      <motion.div
        animate={{
          y: [0, -6, 0, 4, 0],
          rotate: [0, -2, 0, 2, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative"
      >
        {/* Outer soft ambient glow */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div
            style={{
              width: size * 1.6,
              height: size * 1.3,
              background: 'radial-gradient(ellipse at center, rgba(120,180,255,0.3) 0%, rgba(180,100,255,0.15) 35%, transparent 65%)',
              borderRadius: '50%',
              filter: 'blur(25px)',
            }}
          />
        </motion.div>

        {/* Inner pulsing glow aura */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.45, 0.7, 0.45],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div
            style={{
              width: size * 0.9,
              height: size * 0.7,
              background: 'radial-gradient(ellipse at center, rgba(200,160,255,0.55) 0%, rgba(100,200,255,0.35) 40%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(16px)',
            }}
          />
        </motion.div>

        {/* Tight highlight glow */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div
            style={{
              width: size * 0.5,
              height: size * 0.4,
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.35) 0%, rgba(200,180,255,0.2) 50%, transparent 80%)',
              borderRadius: '50%',
              filter: 'blur(10px)',
            }}
          />
        </motion.div>

        {/* Axolotl image */}
        <img
          src="/axolotl.png"
          alt="Axolotl"
          width={size}
          height={size}
          style={{
            transform: facingLeft ? 'scaleX(1)' : 'scaleX(-1)',
            filter: 'drop-shadow(0 0 8px rgba(160,120,255,0.4)) drop-shadow(0 0 20px rgba(100,180,255,0.3)) drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
            objectFit: 'contain',
          }}
        />
      </motion.div>
    </motion.div>
  );
}