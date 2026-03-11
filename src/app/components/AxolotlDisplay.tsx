import { motion } from 'motion/react';
import { Axolotl, FoodItem } from '../types/game';
import { useEffect, useState, useRef, useCallback } from 'react';

interface AxolotlDisplayProps {
  axolotl: Axolotl;
  foodItems: FoodItem[];
  onEatFood: (foodId: string) => void;
  clickTarget?: { x: number; y: number; timestamp: number } | null;
}

export function AxolotlDisplay({ axolotl, foodItems, onEatFood, clickTarget }: AxolotlDisplayProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [facingLeft, setFacingLeft] = useState(false);
  const foodFirstSeenRef = useRef<number | null>(null);

  // Track previous position + move start time so we can interpolate visual position
  const prevPosRef = useRef({ x: 50, y: 50 });
  const moveStartRef = useRef<number>(Date.now());
  const MOVE_DURATION = 4000; // matches Framer Motion transition duration (ms)

  // Refs so the polling interval always sees fresh values without re-creating
  const positionRef = useRef(position);
  const foodItemsRef = useRef(foodItems);
  const onEatFoodRef = useRef(onEatFood);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { foodItemsRef.current = foodItems; }, [foodItems]);
  useEffect(() => { onEatFoodRef.current = onEatFood; }, [onEatFood]);

  // Reset to center on mount
  useEffect(() => {
    setPosition({ x: 50, y: 50 });
  }, []);

  // Handle click target - move axolotl to clicked position
  useEffect(() => {
    if (clickTarget) {
      prevPosRef.current = positionRef.current;
      moveStartRef.current = Date.now();
      setFacingLeft(clickTarget.x < positionRef.current.x);
      setPosition({ x: clickTarget.x, y: clickTarget.y });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickTarget?.timestamp]);

  // Track when food first appears for auto-seek delay
  useEffect(() => {
    if (foodItems.length > 0 && foodFirstSeenRef.current === null) {
      foodFirstSeenRef.current = Date.now();
    } else if (foodItems.length === 0) {
      foodFirstSeenRef.current = null;
    }
  }, [foodItems.length]);

  // Compute food's visual Y. While falling (y===0), interpolate 10%→75% over ~4s easeIn.
  const getFoodVisualY = useCallback((food: FoodItem): number => {
    if (food.y > 0) return food.y;
    const elapsed = (Date.now() - food.createdAt) / 1000;
    const progress = Math.min(1, elapsed / 4);
    return 10 + progress * progress * 65;
  }, []);

  // Compute axolotl's actual visual position (interpolated between prev and target).
  const getAxolotlVisualPos = useCallback(() => {
    const elapsed = Date.now() - moveStartRef.current;
    const t = Math.min(1, elapsed / MOVE_DURATION);
    // Approximate easeOut cubic
    const eased = 1 - Math.pow(1 - t, 3);
    const prev = prevPosRef.current;
    const tgt = positionRef.current;
    return {
      x: prev.x + (tgt.x - prev.x) * eased,
      y: prev.y + (tgt.y - prev.y) * eased,
    };
  }, []);

  // Continuous proximity check (every 200ms) — axolotl eats food when it physically reaches it.
  useEffect(() => {
    const interval = setInterval(() => {
      const items = foodItemsRef.current;
      if (items.length === 0) return;

      const axPos = getAxolotlVisualPos();

      for (const food of items) {
        const distX = food.x - axPos.x;
        const distY = getFoodVisualY(food) - axPos.y;
        if (Math.sqrt(distX * distX + distY * distY) < 12) {
          onEatFoodRef.current(food.id);
          return;
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [getFoodVisualY, getAxolotlVisualPos]);

  // Auto-seek: after 7s swim toward closest food
  useEffect(() => {
    if (foodItems.length === 0) return;

    const now = Date.now();
    const timeSince = foodFirstSeenRef.current
      ? (now - foodFirstSeenRef.current) / 1000
      : Infinity;
    if (timeSince < 7) return;

    const closest = foodItems.reduce((acc, food) => {
      const vy = getFoodVisualY(food);
      const dx = food.x - position.x;
      const dy = vy - position.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      return (!acc.food || d < acc.d) ? { food, d, vy } : acc;
    }, { food: null as FoodItem | null, d: Infinity, vy: 0 });

    if (closest.food) {
      prevPosRef.current = positionRef.current;
      moveStartRef.current = Date.now();
      setFacingLeft(closest.food.x < position.x);
      setPosition({ x: closest.food.x, y: closest.vy });
    }
  }, [foodItems, position.x, position.y, getFoodVisualY]);

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