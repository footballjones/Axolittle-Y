import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, X, Lock } from 'lucide-react';
import { Egg, Axolotl } from '../types/game';
import { isEggReady } from '../utils/eggs';
import { GAME_CONFIG } from '../config/game';
import { EggHatchModal } from './EggHatchModal';
import { ReleaseAxolotlModal } from './ReleaseAxolotlModal';

interface DisplayEgg {
  id: string;
  name: string;
  color: string;
  generation: number;
  parentName: string;
  hatchesIn: string;
  emoji: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  rarityColor: string;
  rarityBorder: string;
  rarityText: string;
  glowColor: string;
  egg: Egg; // Reference to actual egg
}

// Row 1 (indices 0-2): eggs fill these, rest empty
// Row 2 (indices 3-5): all empty/unlocked
// Rows 3-6 (indices 6-17): all locked
const UNLOCKED_SLOTS = 6;
const TOTAL_SLOTS = 18;

function formatTimeRemaining(incubationEndsAt: number | undefined): string {
  if (!incubationEndsAt || typeof incubationEndsAt !== 'number') {
    return 'Ready!';
  }
  
  const now = Date.now();
  const remaining = incubationEndsAt - now;
  
  if (remaining <= 0) return 'Ready!';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getRarityStyle(rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic') {
  switch (rarity) {
    case 'Mythic':
      return {
        rarityColor: 'rgba(239,68,68,0.2)',
        rarityBorder: 'rgba(239,68,68,0.5)',
        rarityText: 'text-red-600',
        glowColor: 'rgba(248,113,113,0.65)',
        emoji: '🔥',
      };
    case 'Legendary':
      return {
        rarityColor: 'rgba(245,158,11,0.2)',
        rarityBorder: 'rgba(245,158,11,0.5)',
        rarityText: 'text-amber-600',
        glowColor: 'rgba(251,191,36,0.65)',
        emoji: '✨',
      };
    case 'Epic':
      return {
        rarityColor: 'rgba(168,85,247,0.18)',
        rarityBorder: 'rgba(168,85,247,0.45)',
        rarityText: 'text-violet-600',
        glowColor: 'rgba(192,132,252,0.55)',
        emoji: '💜',
      };
    case 'Rare':
      return {
        rarityColor: 'rgba(59,130,246,0.18)',
        rarityBorder: 'rgba(59,130,246,0.45)',
        rarityText: 'text-blue-600',
        glowColor: 'rgba(96,165,250,0.55)',
        emoji: '🥚',
      };
    default: // Common
      return {
        rarityColor: 'rgba(255,255,255,0.15)',
        rarityBorder: 'rgba(255,255,255,0.38)',
        rarityText: 'text-white',
        glowColor: 'rgba(255,255,255,0.5)',
        emoji: '🫧',
      };
  }
}

interface Props {
  onClose: () => void;
  incubatorEgg: Egg | null;
  nurseryEggs: Egg[];
  axolotl: Axolotl | null;
  onHatch?: (eggId: string, name: string) => void;
  onReleaseAxolotl?: () => void;
  onMoveToIncubator?: (eggId: string) => void;
  onBoost?: (eggId: string) => void;
  onGift?: (eggId: string) => void;
  onDiscard?: (eggId: string) => void;
  opals?: number;
  hasAxolotl?: boolean; // Whether an axolotl already exists
}

export function EggsPanel({ 
  onClose, 
  incubatorEgg, 
  nurseryEggs,
  axolotl,
  onHatch,
  onReleaseAxolotl,
  onMoveToIncubator,
  onBoost,
  onGift,
  onDiscard,
  opals = 0,
  hasAxolotl,
}: Props) {
  const [selectedEgg, setSelectedEgg] = useState<DisplayEgg | null>(null);
  const [showUnlockToast, setShowUnlockToast] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [showHatchModal, setShowHatchModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [eggToHatch, setEggToHatch] = useState<Egg | null>(null);
  const [showFirstConfirm, setShowFirstConfirm] = useState(false);
  const [showSecondConfirm, setShowSecondConfirm] = useState(false);

  // Convert incubator egg to display format
  const incubatorDisplayEgg = useMemo(() => {
    if (!incubatorEgg) return null;
    const style = getRarityStyle(incubatorEgg.rarity);
    return {
      id: incubatorEgg.id,
      name: `${incubatorEgg.rarity} Egg`,
      color: incubatorEgg.color,
      generation: incubatorEgg.generation,
      parentName: `Gen ${incubatorEgg.generation - 1}`,
      hatchesIn: formatTimeRemaining(incubatorEgg.incubationEndsAt),
      emoji: style.emoji,
      rarity: incubatorEgg.rarity,
      ...style,
      egg: incubatorEgg,
    };
  }, [incubatorEgg]);

  // Convert nursery eggs to display format
  const nurseryDisplayEggs = useMemo(() => {
    return nurseryEggs.map(egg => {
      const style = getRarityStyle(egg.rarity);
      return {
        id: egg.id,
        name: `${egg.rarity} Egg`,
        color: egg.color,
        generation: egg.generation,
        parentName: `Gen ${egg.generation - 1}`,
        hatchesIn: formatTimeRemaining(egg.incubationEndsAt),
        emoji: style.emoji,
        rarity: egg.rarity,
        ...style,
        egg,
      };
    });
  }, [nurseryEggs]);

  // All eggs for ready count
  const allDisplayEggs = useMemo(() => {
    const all: DisplayEgg[] = [];
    if (incubatorDisplayEgg) all.push(incubatorDisplayEgg);
    all.push(...nurseryDisplayEggs);
    return all;
  }, [incubatorDisplayEgg, nurseryDisplayEggs]);

  const handleUnlockSlot = () => {
    setShowUnlockToast(true);
    setTimeout(() => setShowUnlockToast(false), 2500);
  };

  return (
    <>
      {/* Confirmation dialogs - outside main container to ensure they're on top */}
      {/* First confirmation: Release current axolotl? */}
      <AnimatePresence>
        {showFirstConfirm && (
          <>
            <motion.div
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowFirstConfirm(false);
                setEggToHatch(null);
              }}
            />
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100 border-2 border-violet-300/60 shadow-2xl">
                <div className="px-6 pt-6 pb-4 text-center">
                  <div className="text-5xl mb-3">🌊</div>
                  <h2 className="text-2xl font-bold text-violet-800 mb-2">
                    Hatch This Egg?
                  </h2>
                  <p className="text-sm text-violet-600">
                    Any axolotl in your aquarium will be released to the wild if you hatch this egg.
                  </p>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <motion.button
                    onClick={() => {
                      setShowFirstConfirm(false);
                      setEggToHatch(null);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-violet-700 bg-white/60 border border-violet-200 active:bg-white/80"
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setShowFirstConfirm(false);
                      setShowSecondConfirm(true);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-violet-500 to-purple-500 active:from-violet-600 active:to-purple-600"
                    whileTap={{ scale: 0.95 }}
                  >
                    Continue
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Second confirmation: Are you really sure? */}
      <AnimatePresence>
        {showSecondConfirm && (
          <>
            <motion.div
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowSecondConfirm(false);
                setEggToHatch(null);
              }}
            />
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-br from-red-100 via-orange-100 to-amber-100 border-2 border-red-300/60 shadow-2xl">
                <div className="px-6 pt-6 pb-4 text-center">
                  <div className="text-5xl mb-3">⚠️</div>
                  <h2 className="text-2xl font-bold text-red-800 mb-2">
                    Are You Really Sure?
                  </h2>
                  <p className="text-sm text-red-700 mb-2">
                    If you have an axolotl, releasing it will permanently lose all progress including:
                  </p>
                  <ul className="text-xs text-red-600 text-left space-y-1 mb-3 bg-white/40 rounded-lg p-3">
                    <li>• Current level and experience</li>
                    <li>• All stat progress</li>
                    <li>• Life stage progression</li>
                    <li>• Generation and lineage</li>
                  </ul>
                  <p className="text-sm font-semibold text-red-800">
                    This cannot be undone!
                  </p>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <motion.button
                    onClick={() => {
                      setShowSecondConfirm(false);
                      setEggToHatch(null);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-red-700 bg-white/60 border border-red-200 active:bg-white/80"
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setShowSecondConfirm(false);
                      setShowHatchModal(true);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 active:from-red-600 active:to-orange-600"
                    whileTap={{ scale: 0.95 }}
                  >
                    Yes, Release
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 flex flex-col rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 48%, #fce7f3 100%)' }}
      >
      {/* Decorative orbs */}
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-violet-300/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-6 w-44 h-44 rounded-full bg-amber-200/25 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center px-5 pt-5 pb-3 flex-shrink-0 gap-3">
        <motion.button
          onClick={onClose}
          className="rounded-full p-1.5 border border-violet-200/60 bg-white/50 active:bg-white/80 flex-shrink-0"
          whileTap={{ scale: 0.85 }}
        >
          <ChevronDown className="w-4 h-4 text-violet-400 rotate-90" strokeWidth={2.5} />
        </motion.button>
        <div className="flex-1">
          <h3 className="text-violet-800 font-bold text-base">Nursery</h3>
          <p className="text-[10px] text-violet-500/80 font-medium">
            {nurseryEggs.length}/{UNLOCKED_SLOTS} nursery slots · {allDisplayEggs.filter(e => e.hatchesIn === 'Ready!').length} ready
          </p>
        </div>
      </div>

      <div className="h-px mx-5 flex-shrink-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.3),transparent)' }} />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>

        {/* Incubator section - single slot at top */}
        <div
          className="relative rounded-3xl overflow-hidden p-5 mb-3"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.72) 0%, rgba(245,240,255,0.78) 50%, rgba(254,243,199,0.65) 100%)',
            border: '1.5px solid rgba(216,180,254,0.5)',
            boxShadow: '0 8px 32px -4px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          {/* Incubator top label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.25))' }} />
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-violet-400/80">Incubator</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,rgba(168,85,247,0.25),transparent)' }} />
          </div>

          {/* Warm glow underlay */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(251,191,36,0.08) 0%, transparent 65%)' }} />

          {/* Single incubator slot - larger size */}
          <div className="flex justify-center px-2">
            <div className="w-full max-w-[120px]">
              <EggSlot
                slotIndex={0}
                egg={incubatorDisplayEgg}
                onSelect={() => incubatorDisplayEgg && setSelectedEgg(incubatorDisplayEgg)}
                isIncubator={true}
              />
            </div>
          </div>
        </div>

        {/* Nursery section - rows of 3 slots */}
        <div
          className="relative rounded-3xl overflow-hidden p-4"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.72) 0%, rgba(245,240,255,0.78) 50%, rgba(254,243,199,0.65) 100%)',
            border: '1.5px solid rgba(216,180,254,0.5)',
            boxShadow: '0 8px 32px -4px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          {/* Nursery top label */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.25))' }} />
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-violet-400/80">Nursery</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,rgba(168,85,247,0.25),transparent)' }} />
          </div>

          {/* Warm glow underlay */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(251,191,36,0.08) 0%, transparent 65%)' }} />

          {/* Nursery slots grid — rows of 3 */}
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
              // Rows 3–6 are locked
              if (i >= UNLOCKED_SLOTS) {
                return <LockedSlot key={i} onUnlock={handleUnlockSlot} />;
              }
              // Fill with nursery eggs where available
              const displayEgg = nurseryDisplayEggs[i] ?? null;
              return (
                <EggSlot
                  key={i}
                  slotIndex={i}
                  egg={displayEgg}
                  onSelect={() => displayEgg && setSelectedEgg(displayEgg)}
                />
              );
            })}
          </div>
        </div>

        {/* Collapsible tip section */}
        <motion.div
          className="rounded-2xl mt-3 overflow-hidden"
          style={{ background: 'rgba(233,213,255,0.4)', border: '1px solid rgba(216,180,254,0.4)' }}
        >
          <button
            className="flex items-center gap-2 w-full px-4 py-2.5 active:bg-violet-100/40"
            onClick={() => setTipOpen(o => !o)}
          >
            <span className="text-base flex-shrink-0">💡</span>
            <span className="flex-1 text-left text-[11px] font-bold text-violet-700/80">Nursery Tips</span>
            <motion.div animate={{ rotate: tipOpen ? 180 : 0 }} transition={{ duration: 0.22 }}>
              <ChevronDown className="w-3.5 h-3.5 text-violet-400" strokeWidth={2.5} />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {tipOpen && (
              <motion.div
                key="tip-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <p className="text-[11px] text-violet-700/80 leading-snug px-4 pb-3">
                  Tap an egg to see its details. Eggs are collected by "hatching together" with friends in Social — each inherits traits from both parents — or through Rebirth, where your axolotl retires and leaves behind a new egg.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Egg detail sub-panel */}
      <AnimatePresence>
        {selectedEgg && (
          <>
            {/* Dimmed backdrop inside panel */}
            <motion.div
              className="absolute inset-0 rounded-3xl z-20"
              style={{ background: 'rgba(88,28,135,0.18)', backdropFilter: 'blur(2px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEgg(null)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-0 left-0 right-0 rounded-b-3xl rounded-t-2xl overflow-hidden flex flex-col z-30"
              style={{
                background: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 60%, #fef9c3 100%)',
                border: '1.5px solid rgba(216,180,254,0.6)',
                borderBottom: 'none',
                boxShadow: '0 -12px 40px -8px rgba(168,85,247,0.2)',
                maxHeight: '72%',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag pill */}
              <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
                <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(168,85,247,0.3)' }} />
              </div>

              {/* Close */}
              <motion.button
                className="absolute top-3 right-4 rounded-full p-1.5 border border-violet-200/60 bg-white/60 active:bg-white/90"
                whileTap={{ scale: 0.85 }}
                onClick={() => setSelectedEgg(null)}
              >
                <X className="w-3.5 h-3.5 text-violet-400" strokeWidth={2.5} />
              </motion.button>

              <div className="overflow-y-auto overscroll-contain px-4 pb-5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                {/* Egg hero */}
                <div className="flex flex-col items-center pt-1 pb-4">
                  <motion.div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-3 shadow-lg"
                    style={{
                      background: selectedEgg.rarityColor,
                      border: `2px solid ${selectedEgg.rarityBorder}`,
                      boxShadow: `0 0 28px 6px ${selectedEgg.glowColor}`,
                    }}
                    animate={{ rotate: [0, -5, 5, -3, 3, 0], scale: [1, 1.03, 1] }}
                    transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                  >
                    {selectedEgg.emoji}
                  </motion.div>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-800 font-black text-base">{selectedEgg.name}</p>
                    <span
                      className={`text-[9px] font-black ${selectedEgg.rarityText} px-2 py-0.5 rounded-full`}
                      style={{ background: selectedEgg.rarityColor, border: `1px solid ${selectedEgg.rarityBorder}` }}
                    >
                      {selectedEgg.rarity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gen {selectedEgg.generation} · From <span className="font-semibold text-slate-500">{selectedEgg.parentName}</span>
                  </p>

                  {/* Timer */}
                  <div
                    className="flex items-center gap-2 mt-2.5 px-4 py-2 rounded-full"
                    style={{
                      background: selectedEgg.hatchesIn === 'Ready!'
                        ? 'rgba(34,197,94,0.12)'
                        : 'rgba(241,245,249,0.9)',
                      border: selectedEgg.hatchesIn === 'Ready!'
                        ? '1px solid rgba(34,197,94,0.35)'
                        : '1px solid rgba(203,213,225,0.5)',
                    }}
                  >
                    <span className="text-sm">{selectedEgg.hatchesIn === 'Ready!' ? '✅' : '⏳'}</span>
                    <span className={`text-[12px] font-bold ${selectedEgg.hatchesIn === 'Ready!' ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {selectedEgg.hatchesIn === 'Ready!' ? 'Ready to hatch!' : `Hatches in ${selectedEgg.hatchesIn}`}
                    </span>
                  </div>
                </div>

                <div className="h-px mb-4" style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.25),transparent)' }} />

                {/* Action tiles grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Hatch / Watch / Move to Incubator */}
                  {incubatorEgg && incubatorEgg.id === selectedEgg.egg.id ? (
                    // Incubator egg - show Hatch/Watch button
                    <motion.button
                      onClick={() => {
                        const isReady = selectedEgg.hatchesIn === 'Ready!';
                        
                        if (isReady) {
                          // Check if axolotl exists
                          if (axolotl) {
                            // Show release modal first
                            setEggToHatch(selectedEgg.egg);
                            setShowReleaseModal(true);
                          } else {
                            // No axolotl, proceed to hatch confirmation
                            setEggToHatch(selectedEgg.egg);
                            setShowHatchModal(true);
                          }
                        }
                      }}
                      className="group relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl overflow-hidden"
                      style={
                        selectedEgg.hatchesIn === 'Ready!'
                          ? { background: 'linear-gradient(135deg, rgba(134,239,172,0.75) 0%, rgba(74,222,128,0.6) 100%)', border: '1px solid rgba(34,197,94,0.4)' }
                          : { background: 'linear-gradient(135deg, rgba(226,232,240,0.75) 0%, rgba(203,213,225,0.6) 100%)', border: '1px solid rgba(148,163,184,0.35)' }
                      }
                      whileTap={{ scale: 0.92 }}
                      disabled={selectedEgg.hatchesIn !== 'Ready!'}
                    >
                      <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                      <span className="text-[1.6rem]">{selectedEgg.hatchesIn === 'Ready!' ? '🐣' : '👀'}</span>
                      <span className={`text-[10px] font-black tracking-wider uppercase ${
                        selectedEgg.hatchesIn === 'Ready!' ? 'text-emerald-700' : 'text-slate-500'
                      }`}>
                        {selectedEgg.hatchesIn === 'Ready!' ? 'Hatch' : 'Watch'}
                      </span>
                      {selectedEgg.hatchesIn !== 'Ready!' && (
                        <span className="text-[9px] text-slate-400">{selectedEgg.hatchesIn}</span>
                      )}
                    </motion.button>
                  ) : (
                    // Nursery egg - show Move to Incubator button (if incubator is empty)
                    <motion.button
                      onClick={() => {
                        if (onMoveToIncubator && !incubatorEgg) {
                          onMoveToIncubator(selectedEgg.egg.id);
                          setSelectedEgg(null);
                        }
                      }}
                      className="group relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl overflow-hidden"
                      style={
                        !incubatorEgg
                          ? { background: 'linear-gradient(135deg, rgba(167,139,250,0.75) 0%, rgba(139,92,246,0.6) 100%)', border: '1px solid rgba(139,92,246,0.4)' }
                          : { background: 'linear-gradient(135deg, rgba(226,232,240,0.75) 0%, rgba(203,213,225,0.6) 100%)', border: '1px solid rgba(148,163,184,0.35)' }
                      }
                      whileTap={{ scale: 0.92 }}
                      disabled={!!incubatorEgg || !onMoveToIncubator}
                    >
                      <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                      <span className="text-[1.6rem]">📦</span>
                      <span className={`text-[10px] font-black tracking-wider uppercase ${
                        !incubatorEgg ? 'text-violet-700' : 'text-slate-500'
                      }`}>
                        {!incubatorEgg ? 'Move to Incubator' : 'Incubator Full'}
                      </span>
                      {incubatorEgg && (
                        <span className="text-[9px] text-slate-400">Slot occupied</span>
                      )}
                    </motion.button>
                  )}

                  {/* Boost */}
                  <motion.button
                    onClick={() => {
                      const boostCost = GAME_CONFIG.eggBoostCost;
                      if (onBoost && opals >= boostCost) {
                        onBoost(selectedEgg.egg.id);
                        setSelectedEgg(null);
                      }
                    }}
                    className="group relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl overflow-hidden"
                    style={{ 
                      background: opals >= GAME_CONFIG.eggBoostCost
                        ? 'linear-gradient(135deg, rgba(216,180,254,0.75) 0%, rgba(192,132,252,0.6) 100%)' 
                        : 'linear-gradient(135deg, rgba(226,232,240,0.75) 0%, rgba(203,213,225,0.6) 100%)',
                      border: opals >= GAME_CONFIG.eggBoostCost
                        ? '1px solid rgba(168,85,247,0.4)' 
                        : '1px solid rgba(148,163,184,0.35)',
                    }}
                    whileTap={{ scale: 0.92 }}
                    disabled={!onBoost || opals < GAME_CONFIG.eggBoostCost}
                  >
                    <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                    <span className="text-[1.6rem]">⚡</span>
                    <span className={`text-[10px] font-black tracking-wider uppercase ${opals >= GAME_CONFIG.eggBoostCost ? 'text-violet-700' : 'text-slate-500'}`}>Boost</span>
                    <span className={`text-[9px] ${opals >= GAME_CONFIG.eggBoostCost ? 'text-violet-500' : 'text-slate-400'}`}>{GAME_CONFIG.eggBoostCost} 🪬 opals</span>
                  </motion.button>

                  {/* Gift */}
                  <motion.button
                    onClick={() => {
                      if (onGift) {
                        onGift(selectedEgg.egg.id);
                        setSelectedEgg(null);
                      }
                    }}
                    className="group relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(251,207,232,0.75) 0%, rgba(249,168,212,0.6) 100%)', border: '1px solid rgba(244,114,182,0.35)' }}
                    whileTap={{ scale: 0.92 }}
                    disabled={!onGift}
                  >
                    <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                    <span className="text-[1.6rem]">🎁</span>
                    <span className="text-[10px] font-black tracking-wider uppercase text-pink-700">Gift</span>
                    <span className="text-[9px] text-pink-400">Send to friend</span>
                  </motion.button>

                  {/* Discard */}
                  <motion.button
                    onClick={() => {
                      if (onDiscard) {
                        onDiscard(selectedEgg.egg.id);
                        setSelectedEgg(null);
                      }
                    }}
                    className="group relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(254,202,202,0.65) 0%, rgba(252,165,165,0.5) 100%)', border: '1px solid rgba(248,113,113,0.3)' }}
                    whileTap={{ scale: 0.92 }}
                    disabled={!onDiscard}
                  >
                    <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)' }} />
                    <span className="text-[1.6rem]">🗑️</span>
                    <span className="text-[10px] font-black tracking-wider uppercase text-red-500">Discard</span>
                    <span className="text-[9px] text-red-300">Cannot undo</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Unlock toast */}
      <AnimatePresence>
        {showUnlockToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-2 rounded-full z-40"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.9), rgba(217,70,239,0.9))', boxShadow: '0 4px 20px rgba(168,85,247,0.35)' }}
          >
            <span className="text-white text-[11px] font-bold">Not enough opals! 🪬</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Release axolotl modal */}
      <ReleaseAxolotlModal
        isOpen={showReleaseModal}
        onClose={() => {
          setShowReleaseModal(false);
          setEggToHatch(null);
        }}
        onConfirm={() => {
          // Release the axolotl first, then proceed to hatch
          if (onReleaseAxolotl) {
            onReleaseAxolotl();
          }
          // After release, show hatch modal
          setShowReleaseModal(false);
          if (eggToHatch) {
            setShowHatchModal(true);
          }
        }}
        axolotlName={axolotl?.name}
      />

      {/* Hatch name modal */}
      <EggHatchModal
        isOpen={showHatchModal && !showFirstConfirm && !showSecondConfirm}
        onClose={() => {
          setShowHatchModal(false);
          setEggToHatch(null);
        }}
        onConfirm={(name) => {
          if (eggToHatch && onHatch) {
            onHatch(eggToHatch.id, name);
            setSelectedEgg(null);
            setEggToHatch(null);
          }
        }}
        eggRarity={eggToHatch?.rarity}
        pendingName={eggToHatch?.pendingName}
      />
    </motion.div>
    </>
  );
}

/* ── Individual egg slot ── */
function EggSlot({ slotIndex, egg, onSelect, isIncubator = false }: { slotIndex: number; egg: DisplayEgg | null; onSelect: () => void; isIncubator?: boolean }) {
  const isReady = egg?.hatchesIn === 'Ready!';

  const slotSize = isIncubator ? 'w-full aspect-square' : 'aspect-square';

  if (!egg) {
    return (
      <div
        className={`${slotSize} rounded-2xl flex flex-col items-center justify-center gap-1.5`}
        style={{
          background: 'rgba(255,255,255,0.65)',
          border: '1.5px dashed rgba(168,85,247,0.5)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <span className={`${isIncubator ? 'text-[2rem]' : 'text-[1.4rem]'} opacity-70`}>🥚</span>
        <span className="text-[9px] text-violet-600/80 font-bold tracking-wider uppercase">Empty</span>
      </div>
    );
  }

  // Ensure egg has all required properties before rendering
  if (!egg || !egg.rarityColor || !egg.rarityBorder || !egg.glowColor || !egg.emoji || !egg.rarity || !egg.rarityText) {
    return (
      <div
        className={`${slotSize} rounded-2xl flex flex-col items-center justify-center gap-1.5`}
        style={{
          background: 'rgba(255,255,255,0.65)',
          border: '1.5px dashed rgba(168,85,247,0.5)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <span className={`${isIncubator ? 'text-[2rem]' : 'text-[1.4rem]'} opacity-70`}>🥚</span>
        <span className="text-[9px] text-violet-600/80 font-bold tracking-wider uppercase">Error</span>
      </div>
    );
  }

  return (
    <motion.button
      className={`relative ${slotSize} rounded-2xl flex flex-col items-center justify-center gap-1 overflow-hidden`}
      style={{
        background: `radial-gradient(ellipse at 50% 80%, ${egg.rarityColor} 0%, rgba(255,255,255,0.55) 100%)`,
        border: `1.5px solid ${egg.rarityBorder}`,
        boxShadow: isReady
          ? `0 0 16px 4px ${egg.glowColor}, inset 0 1px 0 rgba(255,255,255,0.8)`
          : `0 2px 12px -2px ${egg.glowColor}, inset 0 1px 0 rgba(255,255,255,0.8)`,
      }}
      whileTap={{ scale: 0.91 }}
      onClick={onSelect}
    >
      {/* Slot gloss */}
      <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%)' }} />

      {/* Ready shimmer */}
      {isReady && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: `linear-gradient(135deg, transparent 0%, ${egg.glowColor} 50%, transparent 100%)`, opacity: 0.4 }}
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Egg */}
      <motion.span
        className={`${isIncubator ? 'text-[3rem]' : 'text-[2rem]'} leading-none relative z-10 drop-shadow-sm`}
        animate={
          isReady
            ? { scale: [1, 1.1, 1], rotate: [0, -6, 6, -4, 4, 0] }
            : { rotate: [0, -3, 3, -2, 2, 0] }
        }
        transition={{
          duration: isReady ? 2 : 3.8,
          repeat: Infinity,
          repeatDelay: isReady ? 0.6 : 2 + slotIndex * 0.7,
          ease: 'easeInOut',
        }}
      >
        {egg.emoji}
      </motion.span>

      {/* Rarity label */}
      <span
        className={`text-[7.5px] font-black ${egg.rarityText} tracking-wider uppercase z-10 px-1.5 py-0.5 rounded-full`}
        style={{ background: 'rgba(255,255,255,0.72)' }}
      >
        {egg.rarity}
      </span>

      {/* Ready badge */}
      {isReady && (
        <motion.div
          className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-emerald-400 border border-white shadow-md z-10"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  );
}

/* ── Locked slot ── */
function LockedSlot({ onUnlock }: { onUnlock: () => void }) {
  return (
    <motion.button
      className="relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.65)',
        border: '1.5px dashed rgba(139,92,246,0.5)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
      }}
      whileTap={{ scale: 0.91 }}
      onClick={onUnlock}
    >
      {/* Slot gloss */}
      <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)' }} />

      {/* Lock icon */}
      <Lock className="w-5 h-5 text-violet-500/80" strokeWidth={2.5} />

      {/* Price pill */}
      <span
        className="text-[8px] font-black text-violet-700/90 tracking-wide z-10 px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(168,85,247,0.4)' }}
      >
        10 🪬 unlock
      </span>
    </motion.button>
  );
}