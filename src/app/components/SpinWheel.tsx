/**
 * Daily Spin Wheel Component
 * One free spin per day with coin/opal rewards
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { canSpinToday } from '../utils/dailySystem';

interface SpinWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSpin: (reward: { type: 'coins' | 'opals'; amount: number }) => void;
  lastSpinDate?: string;
  coins: number;
  opals: number;
}

// Wheel sections in order (clockwise from top)
const WHEEL_SECTIONS = [
  { label: '50 Coins', value: 50, type: 'coins' as const, weight: 3, size: 1 },
  { label: '100 Coins', value: 100, type: 'coins' as const, weight: 3, size: 1 },
  { label: '5 Opals', value: 5, type: 'opals' as const, weight: 1, size: 0.5 },
  { label: '150 Coins', value: 150, type: 'coins' as const, weight: 2, size: 1 },
  { label: '200 Coins', value: 200, type: 'coins' as const, weight: 2, size: 1 },
  { label: '10 Opals', value: 10, type: 'opals' as const, weight: 1, size: 0.5 },
  { label: '250 Coins', value: 250, type: 'coins' as const, weight: 1, size: 1 },
  { label: '300 Coins', value: 300, type: 'coins' as const, weight: 1, size: 1 },
];

// Create weighted array for probability
const WEIGHTED_SECTIONS: Array<{ label: string; value: number; type: 'coins' | 'opals' }> = [];
WHEEL_SECTIONS.forEach(section => {
  for (let i = 0; i < section.weight; i++) {
    WEIGHTED_SECTIONS.push({
      label: section.label,
      value: section.value,
      type: section.type,
    });
  }
});

export function SpinWheel({ isOpen, onClose, onSpin, lastSpinDate, coins, opals }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedReward, setSelectedReward] = useState<{ type: 'coins' | 'opals'; amount: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  const canSpin = canSpinToday(lastSpinDate);

  // Calculate section geometry
  const sectionData = useMemo(() => {
    const totalSize = WHEEL_SECTIONS.reduce((sum, s) => sum + s.size, 0);
    const degreesPerUnit = 360 / totalSize;
    
    const sections = WHEEL_SECTIONS.map((section, index) => {
      // Calculate start angle (in degrees, 0 = top)
      let startAngle = 0;
      for (let i = 0; i < index; i++) {
        startAngle += WHEEL_SECTIONS[i].size * degreesPerUnit;
      }
      
      const sectionDegrees = section.size * degreesPerUnit;
      const centerAngle = startAngle + sectionDegrees / 2;
      const endAngle = startAngle + sectionDegrees;
      
      return {
        ...section,
        startAngle,
        centerAngle,
        endAngle,
        sectionDegrees,
      };
    });
    
    return { sections, degreesPerUnit };
  }, []);

  const handleSpin = useCallback(() => {
    if (isSpinning || !canSpin) return;

    setIsSpinning(true);
    setShowResult(false);
    setSelectedReward(null);

    // Pick random reward
    const randomIndex = Math.floor(Math.random() * WEIGHTED_SECTIONS.length);
    const reward = WEIGHTED_SECTIONS[randomIndex];
    
    // Find matching section (first match)
    const targetIndex = WHEEL_SECTIONS.findIndex(
      s => s.value === reward.value && s.type === reward.type
    );
    
    if (targetIndex === -1) {
      console.error('Section not found for reward', reward);
      setIsSpinning(false);
      return;
    }
    
    // Get the center angle of target section
    const targetSection = sectionData.sections[targetIndex];
    const targetCenterAngle = targetSection.centerAngle;
    
    // Calculate rotation: we want the section center to align with pointer (top = 0°)
    // Current section center is at targetCenterAngle
    // To bring it to top: rotate by (360 - targetCenterAngle)
    const fullSpins = 5 + Math.random() * 3; // 5-8 spins
    const adjustment = 360 - targetCenterAngle;
    const finalRotation = rotation + (fullSpins * 360) + adjustment;
    
    setRotation(finalRotation);

    // Show result after animation
    setTimeout(() => {
      setIsSpinning(false);
      const expectedReward = { type: reward.type, amount: reward.value };
      setSelectedReward(expectedReward);
      setShowResult(true);
      onSpin(expectedReward);
    }, 4000);
  }, [isSpinning, canSpin, onSpin, rotation, sectionData]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <div
              className="w-full max-w-md rounded-3xl overflow-hidden pointer-events-auto relative"
              style={{
                background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
                border: '3px solid rgba(139,92,246,0.5)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onClose();
                  }}
                  className="absolute top-4 right-4 z-[60] rounded-full p-2.5 border-2 border-violet-300/50 bg-white/25 hover:bg-white/35 active:bg-white/45 backdrop-blur-sm transition-all cursor-pointer touch-manipulation"
                  style={{
                    boxShadow: '0 2px 10px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                  }}
                  type="button"
                  aria-label="Close spin wheel"
                >
                  <X className="w-5 h-5 text-violet-50" strokeWidth={3} />
                </button>

                <div className="text-center">
                  <div className="text-5xl mb-3 drop-shadow-lg">🎰</div>
                  <h2 className="text-2xl font-black text-white mb-1 drop-shadow-md">
                    Daily Spin Wheel
                  </h2>
                  <p className="text-sm text-violet-200/80">
                    {canSpin ? 'Spin to win coins or opals!' : 'Come back tomorrow for another spin!'}
                  </p>
                </div>
              </div>

              {/* Wheel Container */}
              <div className="px-6 pb-6">
                <div className="relative w-72 h-72 mx-auto mb-6">
                  {/* Pointer at top */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div 
                      className="relative"
                      style={{
                        width: '0',
                        height: '0',
                        borderLeft: '20px solid transparent',
                        borderRight: '20px solid transparent',
                        borderTop: '30px solid #1e1b4b',
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                      }}
                    />
                    <div 
                      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full"
                      style={{
                        width: '0',
                        height: '0',
                        borderLeft: '18px solid transparent',
                        borderRight: '18px solid transparent',
                        borderTop: '26px solid #4c1d95',
                      }}
                    />
                  </div>

                  {/* Wheel wrapper */}
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    {/* Outer border */}
                    <div className="absolute inset-0 rounded-full border-4 border-black/50" />
                    
                    {/* Spinning wheel */}
                    <motion.div
                      className="w-full h-full"
                      animate={{ rotate: rotation }}
                      transition={{ 
                        duration: 4,
                        ease: [0.43, 0.13, 0.23, 0.96],
                      }}
                      style={{ 
                        transformOrigin: 'center',
                        filter: isSpinning ? 'blur(3px)' : 'blur(0px)',
                        transition: 'filter 0.3s ease-out',
                      }}
                    >
                      {/* SVG wheel - rotate -90deg so section 0 starts at top */}
                      <svg width="100%" height="100%" viewBox="0 0 300 300" style={{ transform: 'rotate(-90deg)' }}>
                        <defs>
                          <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="50%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#d97706" />
                          </linearGradient>
                          <linearGradient id="opalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="50%" stopColor="#7c3aed" />
                            <stop offset="100%" stopColor="#6d28d9" />
                          </linearGradient>
                        </defs>
                        
                        {sectionData.sections.map((section, index) => {
                          // Convert our angles (0 = top) to SVG angles (0 = right, then -90 makes it top)
                          // SVG: 0° = right, 90° = bottom, 180° = left, 270° = top
                          // After -90deg rotation: our 0° (top) = SVG's 270° = -90° in SVG coords
                          const svgStart = (section.startAngle - 90) * (Math.PI / 180);
                          const svgEnd = (section.endAngle - 90) * (Math.PI / 180);
                          
                          const cx = 150;
                          const cy = 150;
                          const r = 145;
                          
                          const x1 = cx + r * Math.cos(svgStart);
                          const y1 = cy + r * Math.sin(svgStart);
                          const x2 = cx + r * Math.cos(svgEnd);
                          const y2 = cy + r * Math.sin(svgEnd);
                          
                          const largeArc = section.sectionDegrees > 180 ? 1 : 0;
                          
                          return (
                            <g key={index}>
                              <path
                                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                fill={section.type === 'opals' ? 'url(#opalGrad)' : 'url(#coinGrad)'}
                                stroke="#000000"
                                strokeWidth="3"
                              />
                            </g>
                          );
                        })}
                      </svg>
                      
                      {/* Labels */}
                      {sectionData.sections.map((section, index) => {
                        const radius = 110;
                        return (
                          <div
                            key={`label-${index}`}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                            style={{
                              transform: `rotate(${section.centerAngle}deg) translateY(-${radius}px) rotate(${-section.centerAngle}deg)`,
                            }}
                          >
                            <span 
                              className="font-black text-white whitespace-nowrap"
                              style={{
                                fontSize: section.type === 'opals' ? '10px' : '11px',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)',
                                letterSpacing: '0.5px',
                              }}
                            >
                              {section.label}
                            </span>
                          </div>
                        );
                      })}
                    </motion.div>
                    
                    {/* Center hub */}
                    <div 
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 rounded-full"
                      style={{
                        width: '60px',
                        height: '60px',
                        background: 'linear-gradient(145deg, #4c1d95 0%, #312e81 50%, #1e1b4b 100%)',
                        border: '3px solid rgba(139,92,246,0.6)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4)',
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-2xl">🎯</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Result display */}
                <AnimatePresence>
                  {showResult && selectedReward && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 mb-4 border-2 border-violet-400/50 shadow-xl"
                      style={{
                        boxShadow: '0 10px 30px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                      }}
                    >
                      <div className="text-center">
                        <motion.div 
                          className="text-5xl mb-3"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.5 }}
                        >
                          {selectedReward.type === 'opals' ? '💎' : '🪙'}
                        </motion.div>
                        <p className="text-xl font-black text-white mb-1 drop-shadow-lg">
                          You won {selectedReward.amount} {selectedReward.type === 'opals' ? 'Opals' : 'Coins'}!
                        </p>
                        <p className="text-sm text-violet-100 font-semibold">
                          {selectedReward.type === 'opals' ? 'Rare reward! 🎉' : 'Nice spin!'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Spin button */}
                <motion.button
                  onClick={handleSpin}
                  disabled={isSpinning || !canSpin}
                  className="w-full py-4 rounded-xl font-black text-white disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                  style={{
                    background: canSpin && !isSpinning
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)'
                      : 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                    boxShadow: canSpin && !isSpinning
                      ? '0 8px 20px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                      : '0 4px 10px rgba(0,0,0,0.2)',
                    border: canSpin && !isSpinning ? '2px solid rgba(167,139,250,0.5)' : '2px solid rgba(100,116,139,0.3)',
                  }}
                  whileTap={canSpin && !isSpinning ? { scale: 0.96 } : {}}
                  whileHover={canSpin && !isSpinning ? { 
                    boxShadow: '0 12px 28px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                  } : {}}
                >
                  {isSpinning && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  <span className="relative z-10 text-lg tracking-wide">
                    {isSpinning ? 'Spinning...' : canSpin ? 'SPIN NOW!' : 'Already Spun Today'}
                  </span>
                </motion.button>

                {!canSpin && (
                  <p className="text-center text-xs text-violet-300/70 mt-3 font-medium">
                    Next spin available tomorrow! 🌅
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
