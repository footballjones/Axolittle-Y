import { useRef, useState } from 'react';
import { motion, useMotionValue } from 'motion/react';
import { LayoutGrid, Check, X } from 'lucide-react';
import { getDecorationById } from '../data/decorations';
import { DecorationItem } from '../types/game';
import { GameIcon } from './icons';

interface AquariumBackgroundProps {
  background: string;
  decorations: string[];
  decorationPositions?: Record<string, { x: number; y: number }>;
  onUpdateDecorationPosition?: (id: string, x: number, y: number) => void;
  onRemoveDecoration?: (id: string) => void;
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
  position: { x: number; y: number };
  arrangeMode: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onCommitPosition: (x: number, y: number) => void;
  onRemove: () => void;
  entryDelay: number;
}

function DraggableDecoration({
  decoration,
  position,
  arrangeMode,
  containerRef,
  onCommitPosition,
  onRemove,
  entryDelay,
}: DraggableDecorationProps) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

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

  const svgSize = SVG_SIZE[decoration.size ?? 'md'];
  const iconSize = ICON_SIZE[decoration.size ?? 'md'];

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: 2,
        // Non-arrange: pass all pointer events through so tank taps work normally
        pointerEvents: arrangeMode ? 'auto' : 'none',
      }}
    >
      <motion.div
        drag={arrangeMode}
        dragMomentum={false}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          filter: arrangeMode
            ? 'drop-shadow(0 0 10px rgba(56,189,248,0.9))'
            : 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))',
        }}
        transition={{ delay: entryDelay, type: 'spring', stiffness: 220, damping: 16 }}
        whileHover={arrangeMode ? { scale: 1.1 } : undefined}
        whileDrag={arrangeMode ? { scale: 1.15 } : undefined}
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

        {/* Remove button — shown in arrange mode, stops propagation so it doesn't trigger drag */}
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
    </div>
  );
}

export function AquariumBackground({
  background,
  decorations,
  decorationPositions = {},
  onUpdateDecorationPosition,
  onRemoveDecoration,
}: AquariumBackgroundProps) {
  const [arrangeMode, setArrangeMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const tankDecos = decorations
    .map(id => getDecorationById(id))
    .filter((d): d is DecorationItem => !!d && d.type !== 'background');

  const total = tankDecos.length;

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ overflow: arrangeMode ? 'visible' : 'hidden' }}>
      <img
        src={`${import.meta.env.BASE_URL}aquarium-bg.png`}
        alt="Aquarium background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      />

      <div
        className="absolute inset-0 mix-blend-overlay opacity-40"
        style={{ background, zIndex: 1 }}
      />

      {tankDecos.map((decoration, index) => {
        const pos = decorationPositions[decoration.id] ?? getDefaultPosition(decoration, index, total);
        return (
          <DraggableDecoration
            key={decoration.id}
            decoration={decoration}
            position={pos}
            arrangeMode={arrangeMode}
            containerRef={containerRef}
            onCommitPosition={(x, y) => onUpdateDecorationPosition?.(decoration.id, x, y)}
            onRemove={() => {
              onRemoveDecoration?.(decoration.id);
              // If removed, also clear stored position so re-adding gives a fresh default
              // (position removal is handled by the equip toggle in game state)
            }}
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
          onTap={() => setArrangeMode(m => !m)}
        >
          {arrangeMode
            ? <><Check size={11} strokeWidth={3} /> Done</>
            : <><LayoutGrid size={11} strokeWidth={2.5} /> Arrange</>}
        </motion.button>
      )}

      {/* Hint banner — fixed to viewport center */}
      {arrangeMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full text-[10px] font-bold text-white"
          style={{
            background: 'rgba(14,165,233,0.85)',
            backdropFilter: 'blur(6px)',
            whiteSpace: 'nowrap',
          }}
        >
          Drag to move · tap ✕ to remove
        </motion.div>
      )}
    </div>
  );
}
