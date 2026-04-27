import { motion } from 'motion/react';
import { Axolotl, FoodItem } from '../types/game';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { SpineAxolotl } from './SpineAxolotl';
import { useBackgroundAwareInterval } from '../hooks/useBackgroundAwareInterval';

interface AxolotlDisplayProps {
  axolotl: Axolotl;
  foodItems: FoodItem[];
  onEatFood: (foodId: string) => void;
  clickTarget?: { x: number; y: number; timestamp: number } | null;
  playMode?: boolean;
  onAxolotlTap?: () => void;
}

export function AxolotlDisplay({ axolotl, foodItems, onEatFood, clickTarget, onAxolotlTap }: AxolotlDisplayProps) {
  const [position, setPosition] = useState({ x: 50, y: 75 });
  const [facingLeft, setFacingLeft] = useState(false);
  const [wiggling, setWiggling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const movingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const foodFirstSeenRef = useRef<number | null>(null);
  // Ref to the wrapper div so we can read the parent container's pixel dimensions
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Track previous position + move start time so we can interpolate visual position
  const prevPosRef = useRef({ x: 50, y: 75 });
  const moveStartRef = useRef<number>(Date.now());
  const MOVE_DURATION = 4000; // matches Framer Motion transition duration (ms)

  // Refs so the polling interval always sees fresh values without re-creating
  const positionRef = useRef(position);
  const foodItemsRef = useRef(foodItems);
  const onEatFoodRef = useRef(onEatFood);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { foodItemsRef.current = foodItems; }, [foodItems]);
  useEffect(() => { onEatFoodRef.current = onEatFood; }, [onEatFood]);

  // Start at bottom-center on mount
  useEffect(() => {
    setPosition({ x: 50, y: 75 });
  }, []);

  // Play Swim animation while the axolotl is travelling, Idle once it arrives
  useEffect(() => {
    setIsMoving(true);
    if (movingTimerRef.current) clearTimeout(movingTimerRef.current);
    movingTimerRef.current = setTimeout(() => setIsMoving(false), MOVE_DURATION - 1500);
    return () => { if (movingTimerRef.current) clearTimeout(movingTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.x, position.y]);

  // Handle click target - move axolotl to clicked position
  useEffect(() => {
    if (clickTarget) {
      // Save the *visual* position (not the logical target) so the animation
      // always starts from where the axolotl visually is — prevents instant
      // proximity triggers when re-tapping a food the axolotl was already targeting.
      prevPosRef.current = getAxolotlVisualPos();
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

  // Continuous proximity check (every 100ms) — axolotl eats food when it overlaps it.
  // Uses getBoundingClientRect so the check always reflects the actual rendered
  // positions, regardless of animation easing curves or duration randomness.
  useBackgroundAwareInterval(() => {
    const items = foodItemsRef.current;
    if (items.length === 0) return;

    const axEl = wrapperRef.current;
    if (!axEl) return;

    // Axolotl: the Spine canvas is centred inside a padded wrapper div.
    // The wrapper's geometric centre IS the visual centre of the skeleton.
    const axRect = axEl.getBoundingClientRect();
    const axCenterX = axRect.left + axRect.width / 2;
    const axCenterY = axRect.top  + axRect.height / 2;

    // Hit radius in viewport pixels — based on the skeleton's target height
    // (axolotl.stage drives the `size` prop; read it fresh each tick).
    const stageSize = (() => {
      switch (axolotl.stage) {
        case 'hatchling': return 52;
        case 'sprout':    return 64;
        case 'guardian':  return 88;
        case 'elder':     return 86;
        default:          return 52;
      }
    })();
    const hitRadius = stageSize * 0.7; // generous — worm is 50 px wide

    for (const food of items) {
      const foodEl = document.querySelector(`[data-food-id="${food.id}"]`) as HTMLElement | null;
      if (!foodEl) continue;

      const foodRect = foodEl.getBoundingClientRect();
      // The food outer div has `left: food.x%` and the inner worm div is
      // `translateX(-50%)`, so the worm's visual centre X = foodRect.left
      // (the outer div's left edge) rather than its geometric centre.
      const foodCenterX = foodRect.left;
      const foodCenterY = foodRect.top + foodRect.height / 2;

      const dx = foodCenterX - axCenterX;
      const dy = foodCenterY - axCenterY;

      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        onEatFoodRef.current(food.id);
        return;
      }
    }
  }, 100);

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
      // Guard: skip if already targeting this food (prevents the effect re-firing
      // after setPosition updates position deps and resetting the animation baseline)
      if (
        Math.abs(positionRef.current.x - closest.food.x) < 0.5 &&
        Math.abs(positionRef.current.y - closest.vy) < 0.5
      ) return;
      prevPosRef.current = getAxolotlVisualPos();
      moveStartRef.current = Date.now();
      setFacingLeft(closest.food.x < position.x);
      setPosition({ x: closest.food.x, y: closest.vy });
    }
  }, [foodItems, position.x, position.y, getFoodVisualY]);

  // Random swimming. Delay is randomized once per mount (12-18s); previously
  // this re-randomized after every swim because position.x was in the deps,
  // accidentally re-creating the interval. The fixed delay is simpler and
  // imperceptibly different.
  const swimDelay = useMemo(() => 12000 + Math.random() * 6000, []);
  useBackgroundAwareInterval(() => {
    // Center third: 33-66% of aquarium (columns split into thirds)
    const newX = Math.random() * 33 + 33;
    const newY = Math.random() * 33 + 33;
    setFacingLeft(newX < positionRef.current.x);
    setPosition({ x: newX, y: newY });
  }, swimDelay, { enabled: foodItems.length === 0 });

  const getSize = () => {
    // Elder matches the old Hatchling size — the Spine axolotl renders
    // larger than the previous PNG, so all stages are shifted down by ~50%.
    switch (axolotl.stage) {
      case 'hatchling': return 52;
      case 'sprout':    return 64;
      case 'guardian':  return 88;
      case 'elder':     return 86;
      default:          return 52;
    }
  };

  const size = getSize();


  return (
    <motion.div
      ref={wrapperRef}
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
      {/* Bob animation — overrides to a happy wiggle when the axolotl is tapped in play mode */}
      <motion.div
        animate={wiggling
          ? { x: [-10, 10, -8, 8, -4, 4, 0], rotate: [-9, 9, -7, 7, -3, 3, 0], scale: [1, 1.12, 0.93, 1.07, 0.97, 1.03, 1] }
          : { x: 0, y: [0, -6, 0, 4, 0], rotate: [0, -2, 0, 2, 0] }
        }
        transition={wiggling
          ? { duration: 0.55, ease: 'easeOut' }
          : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
        }
        onAnimationComplete={() => { if (wiggling) setWiggling(false); }}
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

        {/* Axolotl — Spine canvas, always tappable so clicks on the axolotl
            trigger a shake instead of falling through to the aquarium background
            (which would create a clickTarget and move the axolotl to itself). */}
        <SpineAxolotl
          size={size}
          animation={isMoving ? 'Swim' : 'Idle'}
          facingLeft={facingLeft}
          onClick={(e) => {
            e.stopPropagation(); // prevent aquarium tap-to-move from firing
            if (!wiggling) {
              setWiggling(true);
              onAxolotlTap?.();
            }
          }}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(160,120,255,0.4)) drop-shadow(0 0 20px rgba(100,180,255,0.3)) drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
            pointerEvents: 'auto', // always capture taps so nothing falls through
          }}
        />
      </motion.div>
    </motion.div>
  );
}