import { Utensils, Sparkles, Droplets, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { AxolotlStats } from '../types/game';

// Custom poop icon component
const PoopIcon = ({ className, strokeWidth }: { className?: string; strokeWidth?: number }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="none">
    {/* Main poop shape */}
    <path d="M12 2c-1.5 0-2.5 1.5-2 3 .3.8.1 1.5-.5 2C8.5 8 7 9 7 11c-2 0-4 1.5-4 4s2 4 4 4h10c2 0 4-1.5 4-4s-2-4-4-4c0-2-1.5-3-2.5-4-.6-.5-.8-1.2-.5-2 .5-1.5-.5-3-2-3z" fill="currentColor"/>
    {/* Dark outline for definition */}
    <path d="M12 2c-1.5 0-2.5 1.5-2 3 .3.8.1 1.5-.5 2C8.5 8 7 9 7 11c-2 0-4 1.5-4 4s2 4 4 4h10c2 0 4-1.5 4-4s-2-4-4-4c0-2-1.5-3-2.5-4-.6-.5-.8-1.2-.5-2 .5-1.5-.5-3-2-3z" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" fill="none"/>
    {/* Swirl layer lines - thick and visible */}
    <path d="M8 11.5c1.8-1.2 4.2-1.2 6 0" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <path d="M6.5 15c2.5-1.5 6-1.5 8.5 0" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    {/* Eyes */}
    <circle cx="9.5" cy="13.2" r="0.9" fill="rgba(0,0,0,0.7)"/>
    <circle cx="13" cy="13.2" r="0.9" fill="rgba(0,0,0,0.7)"/>
    {/* Eye highlights */}
    <circle cx="9.2" cy="12.9" r="0.35" fill="white" opacity="0.8"/>
    <circle cx="12.7" cy="12.9" r="0.35" fill="white" opacity="0.8"/>
  </svg>
);

interface ActionButtonsProps {
  onFeed: () => void;
  onPlay: () => void;
  onClean: () => void;
  onWaterChange: () => void;
  onRebirth: () => void;
  canRebirth: boolean;
  isHungerFull?: boolean;
  stats: AxolotlStats;
}

export function ActionButtons({
  onFeed,
  onPlay,
  onClean,
  onWaterChange,
  onRebirth,
  canRebirth,
  isHungerFull,
  stats,
}: ActionButtonsProps) {
  const buttons = [
    {
      icon: Utensils, label: 'Feed', onClick: onFeed,
      gradient: 'from-emerald-400 to-emerald-600',
      emptyGradient: 'from-teal-900/30 to-cyan-950/35',
      fillColor: 'from-teal-400 via-cyan-400 to-teal-300',
      glowColor: 'rgba(94,234,212,0.45)',
      disabled: isHungerFull,
      value: stats.hunger,
    },
    {
      icon: Sparkles, label: 'Playtime', onClick: onPlay,
      gradient: 'from-violet-400 to-purple-500',
      emptyGradient: 'from-violet-900/30 to-purple-950/35',
      fillColor: 'from-violet-400 via-fuchsia-400 to-purple-300',
      glowColor: 'rgba(196,181,253,0.45)',
      disabled: false,
      value: stats.happiness,
    },
    {
      icon: PoopIcon, label: 'Clean', onClick: onClean,
      gradient: 'from-rose-400 to-pink-500',
      emptyGradient: 'from-rose-900/30 to-pink-950/35',
      fillColor: 'from-rose-400 via-pink-300 to-rose-300',
      glowColor: 'rgba(251,182,206,0.45)',
      disabled: false,
      value: stats.cleanliness,
    },
    {
      icon: Droplets, label: 'Water', onClick: onWaterChange,
      gradient: 'from-indigo-400 to-blue-500',
      emptyGradient: 'from-indigo-900/30 to-blue-950/35',
      fillColor: 'from-indigo-400 via-sky-400 to-blue-300',
      glowColor: 'rgba(165,180,252,0.45)',
      disabled: false,
      value: stats.waterQuality,
      smallIcon: true,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {buttons.map(({ icon: Icon, label, onClick, emptyGradient, fillColor, glowColor, disabled, value, smallIcon }) => {
          const isLow = value < 30;
          return (
            <motion.button
              key={label}
              onClick={onClick}
              className={`relative bg-gradient-to-b ${emptyGradient} rounded-xl overflow-hidden border border-white/10 ${disabled && value < 100 ? 'opacity-70' : ''}`}
              whileTap={{ scale: 0.93 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              style={{ height: 48 }}
            >
              {/* Fill level - rises from bottom */}
              <motion.div
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${fillColor} rounded-xl pointer-events-none`}
                initial={{ height: 0 }}
                animate={{ height: `${value}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
                  boxShadow: value >= 100 ? `0 -4px 16px ${glowColor}, inset 0 0 20px ${glowColor}` : `0 -4px 12px ${glowColor}`,
                  zIndex: 1,
                }}
              />

              {/* Shimmer on the fill */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/0 via-white/25 to-white/0 pointer-events-none"
                style={{ height: `${value}%`, zIndex: 2 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Top shine edge */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* Low stat pulse warning */}
              {isLow && !disabled && (
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-red-400/60"
                  animate={{ opacity: [0, 0.7, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-0.5 pointer-events-none">
                <motion.div
                  animate={isLow && !disabled ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.6, repeat: isLow ? Infinity : 0, repeatDelay: 0.4 }}
                >
                  <Icon className={`${smallIcon ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-white drop-shadow-md`} strokeWidth={2.5} />
                </motion.div>
                <span className="text-[8px] font-bold text-white/90 tracking-tight drop-shadow-sm">{label}</span>
                <span className="text-[9px] font-bold text-white tabular-nums drop-shadow-md">{Math.round(value)}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {canRebirth && (
        <motion.button
          onClick={onRebirth}
          className="relative w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 rounded-2xl p-3 text-white shadow-xl shadow-amber-500/30 overflow-hidden group border-2 border-white/40"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {/* Animated glow */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/50 to-white/0"
            animate={{
              x: ['-200%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          
          {/* Content */}
          <div className="relative z-10 flex items-center justify-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <RotateCcw className="w-5 h-5" strokeWidth={2.5} />
            </motion.div>
            <span className="text-sm font-black tracking-tight">Rebirth Available!</span>
          </div>
        </motion.button>
      )}
    </div>
  );
}