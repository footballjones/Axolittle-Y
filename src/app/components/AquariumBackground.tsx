import { useRef, useState } from 'react';
import { motion, useMotionValue } from 'motion/react';
import { LayoutGrid, Check, X, Plus, Minus } from 'lucide-react';
import { getDecorationById } from '../data/decorations';
import { DecorationItem, PlacedDecoration } from '../types/game';
import { GameIcon } from './icons';

interface AquariumBackgroundProps {
  background: string;
  bgImagePath?: string;
  decorations: PlacedDecoration[];
  decorationPositions?: Record<string, { x: number; y: number; scale?: number }>;
  onUpdateDecorationPosition?: (id: string, x: number, y: number) => void;
  onUpdateDecorationScale?: (id: string, scale: number) => void;
  onRemoveDecoration?: (instanceId: string) => void;
}

// These are bottom-anchor positions: the decoration's BASE sits at this % from container top.
// Combined with translateY(-100%), the item grows upward from that point.
const LAYER_DEFAULT_TOP: Record<string, number> = {
  floor: 90,
  mid:   68,
  tall:  90, // seaweed/plants stand on the floor and grow up
};

const SVG_SIZE: Record<string, number> = {
  sm: 36, md: 48, lg: 60, xl: 80,
};

const ICON_SIZE: Record<string, number> = {
  sm: 22, md: 28, lg: 36, xl: 48,
};

function getDefaultPosition(decoration: DecorationItem, index: number, total: number) {
  // The aquarium is 250% wide; the axolotl centers the view at ~50% of the container,
  // making the visible viewport cover roughly 30%–70%. Default decorations within that range.
  const step = total <= 1 ? 0 : 30 / (total - 1);
  return { x: 35 + index * step, y: LAYER_DEFAULT_TOP[decoration.layer ?? 'floor'] };
}

interface DraggableDecorationProps {
  decoration: DecorationItem;
  instanceId: string;
  position: { x: number; y: number; scale?: number };
  arrangeMode: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onCommitPosition: (x: number, y: number) => void;
  onScaleChange: (scale: number) => void;
  onRemove: () => void;
  entryDelay: number;
}

// ── Sunbeam shafts (only shown over aquarium-bg-starting.png) ────────────────
// Each shaft is a radial-gradient ellipse — bright at the top (entry point),
// fading to transparent as depth increases. No clip-path, no hard geometry —
// pure softness, like real underwater light columns. mix-blend-mode:screen
// adds brightness without washing colours out.
const SHAFTS = [
  { cx: '12%', w: '10%', h: '78%', delay: 0.0,  dur: 12, peak: 0.28, swayDur: 19, swayPx:  8 },
  { cx: '22%', w: '7%',  h: '68%', delay: 5.2,  dur: 15, peak: 0.22, swayDur: 24, swayPx: -6 },
  { cx: '36%', w: '13%', h: '85%', delay: 9.1,  dur: 11, peak: 0.32, swayDur: 16, swayPx: 10 },
  { cx: '48%', w: '9%',  h: '72%', delay: 2.4,  dur: 14, peak: 0.24, swayDur: 21, swayPx: -8 },
  { cx: '61%', w: '11%', h: '82%', delay: 7.0,  dur: 13, peak: 0.30, swayDur: 18, swayPx:  7 },
  { cx: '74%', w: '8%',  h: '65%', delay: 3.8,  dur: 10, peak: 0.20, swayDur: 22, swayPx: -5 },
  { cx: '86%', w: '10%', h: '74%', delay: 6.5,  dur: 16, peak: 0.25, swayDur: 20, swayPx:  6 },
];

function LightRays() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {SHAFTS.map((s, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: s.cx,
            width: s.w,
            height: s.h,
            transform: 'translateX(-50%)',
            // Ellipse tallest at top, fades to nothing — no hard edges at all
            background: 'radial-gradient(ellipse 100% 12% at 50% 0%, rgba(220,242,255,0.95) 0%, rgba(200,232,255,0.55) 18%, rgba(185,222,255,0.18) 50%, transparent 100%)',
            mixBlendMode: 'screen',
          }}
          animate={{
            opacity: [0, s.peak, s.peak * 0.75, s.peak * 0.9, s.peak * 0.5, 0],
            x: [0, s.swayPx, -s.swayPx * 0.6, s.swayPx * 0.3, 0],
          }}
          transition={{
            opacity: {
              duration: s.dur,
              delay: s.delay,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.18, 0.42, 0.62, 0.82, 1],
            },
            x: {
              duration: s.swayDur,
              delay: s.delay * 0.3,
              repeat: Infinity,
              ease: 'easeInOut',
              repeatType: 'mirror',
            },
          }}
        />
      ))}
    </div>
  );
}

const SCALE_MIN = 0.4;
const SCALE_MAX = 3.0;
const SCALE_STEP = 0.15;

function DraggableDecoration({
  decoration,
  instanceId,
  position,
  arrangeMode,
  selectedId,
  onSelect,
  containerRef,
  onCommitPosition,
  onScaleChange,
  onRemove,
  entryDelay,
}: DraggableDecorationProps) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const isSelected = arrangeMode && selectedId === instanceId;
  const userScale = position.scale ?? 1;

  function handleDragEnd(_e: unknown, info: { offset: { x: number; y: number } }) {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const dx = (info.offset.x / cRect.width) * 100;
    const dy = (info.offset.y / cRect.height) * 100;

    const newX = Math.min(98, Math.max(2, position.x + dx));
    // Min Y of 22% keeps the decoration's base below the header/nav buttons overlay (z-40)
    const newY = Math.min(95, Math.max(22, position.y + dy));

    mx.set(0);
    my.set(0);
    onCommitPosition(newX, newY);
  }

  const svgSize = SVG_SIZE[decoration.size ?? 'md'] * userScale;
  const iconSize = ICON_SIZE[decoration.size ?? 'md'] * userScale;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: isSelected ? 10 : 2,
        pointerEvents: arrangeMode ? 'auto' : 'none',
      }}
    >
      <motion.div
        drag={arrangeMode}
        dragMomentum={false}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        onTap={() => { if (arrangeMode) onSelect(isSelected ? null : instanceId); }}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          filter: isSelected
            ? 'drop-shadow(0 0 14px rgba(56,189,248,1.0))'
            : arrangeMode
              ? 'drop-shadow(0 0 8px rgba(56,189,248,0.6))'
              : 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))',
        }}
        transition={{ delay: entryDelay, type: 'spring', stiffness: 220, damping: 16 }}
        whileHover={arrangeMode ? { scale: 1.05 } : undefined}
        whileDrag={arrangeMode ? { scale: 1.1 } : undefined}
        className="select-none relative"
        style={{ x: mx, y: my, touchAction: arrangeMode ? 'none' : 'auto', cursor: arrangeMode ? 'grab' : 'default' }}
      >
        {decoration.svgPath ? (
          <img
            src={`${import.meta.env.BASE_URL}${decoration.svgPath}`}
            alt={decoration.name}
            draggable={false}
            style={{ display: 'block', width: svgSize, height: 'auto', minWidth: svgSize }}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: iconSize + 16,
              height: iconSize + 16,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(4px)',
              border: '1.5px solid rgba(255,255,255,0.3)',
            }}
          >
            <GameIcon name={decoration.icon} size={iconSize} className="text-white" />
          </div>
        )}

        {/* Remove button */}
        {arrangeMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            onTap={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg,#ef4444,#dc2626)',
              border: '2px solid #fff',
              boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
              zIndex: 20,
              touchAction: 'none',
            }}
          >
            <X size={9} strokeWidth={3.5} className="text-white" />
          </motion.button>
        )}
      </motion.div>

      {/* Size controls — appear below the decoration when selected */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 mt-1.5"
          style={{ justifyContent: 'center', touchAction: 'none', pointerEvents: 'auto' }}
        >
          <motion.button
            onTap={(e) => { e.stopPropagation(); onScaleChange(Math.max(SCALE_MIN, +(userScale - SCALE_STEP).toFixed(2))); }}
            whileTap={{ scale: 0.85 }}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(0,0,0,0.55)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Minus size={11} strokeWidth={3} className="text-white" />
          </motion.button>
          <span
            className="text-white font-bold"
            style={{ fontSize: 9, background: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: '2px 5px' }}
          >
            {Math.round(userScale * 100)}%
          </span>
          <motion.button
            onTap={(e) => { e.stopPropagation(); onScaleChange(Math.min(SCALE_MAX, +(userScale + SCALE_STEP).toFixed(2))); }}
            whileTap={{ scale: 0.85 }}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(0,0,0,0.55)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <Plus size={11} strokeWidth={3} className="text-white" />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}

export function AquariumBackground({
  background,
  bgImagePath,
  decorations,
  decorationPositions = {},
  onUpdateDecorationPosition,
  onUpdateDecorationScale,
  onRemoveDecoration,
}: AquariumBackgroundProps) {
  const [arrangeMode, setArrangeMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tankDecos = decorations
    .map(placed => {
      const item = getDecorationById(placed.decorationId);
      return item && item.type !== 'background' ? { ...item, instanceId: placed.instanceId } : null;
    })
    .filter((d): d is DecorationItem & { instanceId: string } => !!d);

  const total = tankDecos.length;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ overflow: arrangeMode ? 'visible' : 'hidden' }}
      onClick={arrangeMode ? (e) => e.stopPropagation() : undefined}
    >
      <img
        src={`${import.meta.env.BASE_URL}${bgImagePath ?? 'aquarium-bg.png'}`}
        alt="Aquarium background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      />

      {bgImagePath === 'aquarium-bg-starting.png' && <LightRays />}

      {background && (
        <div
          className="absolute inset-0 mix-blend-overlay opacity-40"
          style={{ background, zIndex: 1 }}
        />
      )}

      {tankDecos.map((decoration, index) => {
        const pos = decorationPositions[decoration.instanceId] ?? getDefaultPosition(decoration, index, total);
        return (
          <DraggableDecoration
            key={decoration.instanceId}
            decoration={decoration}
            instanceId={decoration.instanceId}
            position={pos}
            arrangeMode={arrangeMode}
            selectedId={selectedId}
            onSelect={setSelectedId}
            containerRef={containerRef}
            onCommitPosition={(x, y) => onUpdateDecorationPosition?.(decoration.instanceId, x, y)}
            onScaleChange={(scale) => onUpdateDecorationScale?.(decoration.instanceId, scale)}
            onRemove={() => onRemoveDecoration?.(decoration.instanceId)}
            entryDelay={index * 0.12}
          />
        );
      })}

      {/* Arrange toggle — fixed so it stays visible regardless of aquarium pan */}
      {total > 0 && (
        <motion.button
          className="fixed bottom-24 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-black"
          style={{
            background: arrangeMode
              ? 'linear-gradient(135deg,#38bdf8,#0ea5e9)'
              : 'rgba(0,0,0,0.45)',
            color: '#fff',
            backdropFilter: 'blur(6px)',
            border: arrangeMode ? '1.5px solid rgba(56,189,248,0.6)' : '1.5px solid rgba(255,255,255,0.2)',
            boxShadow: arrangeMode ? '0 0 12px rgba(56,189,248,0.5)' : 'none',
          }}
          whileTap={{ scale: 0.9 }}
          onTap={() => { setArrangeMode(m => { if (m) setSelectedId(null); return !m; }); }}
        >
          {arrangeMode
            ? <><Check size={11} strokeWidth={3} /> Done</>
            : <><LayoutGrid size={11} strokeWidth={2.5} /> Arrange</>}
        </motion.button>
      )}

      {/* Hint banner — sits below the nav button row */}
      {arrangeMode && total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full text-[10px] font-bold text-white"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 136px)',
            background: 'rgba(14,165,233,0.85)',
            backdropFilter: 'blur(6px)',
            whiteSpace: 'nowrap',
          }}
        >
          Drag to move · tap to resize · ✕ to remove
        </motion.div>
      )}
    </div>
  );
}
