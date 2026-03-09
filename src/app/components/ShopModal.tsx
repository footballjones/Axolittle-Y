import { X, Coins, Sparkles, Droplets, Filter, Bug, Gem, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface ShopModalProps {
  onClose: () => void;
  coins: number;
  opals: number;

  onBuyCoins: (pack: { opals: number; coins: number }) => void;
  onBuyOpals: (pack: { price: string; opals: number }) => void;
  onBuyShrimp?: (pack: { count: number; opals: number }) => void;
  onBuyFilter?: (filter: { id: string; name: string; coins: number; opals: number }) => void;
  onBuyTreatment?: (treatment: { id: string; name: string; opals: number }) => void;
  initialSection?: 'coins' | 'opals' | null;
}

const COIN_PACKS = [
  { opals: 5, coins: 500, label: 'Starter', emoji: '🪙' },
  { opals: 10, coins: 1200, label: 'Popular', emoji: '💰', best: false },
  { opals: 25, coins: 3500, label: 'Best Value', emoji: '🏆', best: true },
  { opals: 50, coins: 8000, label: 'Mega Pack', emoji: '👑', best: false },
];

const OPAL_PACKS = [
  { price: '$0.99', opals: 10, label: 'A Few', emoji: '💎' },
  { price: '$2.99', opals: 35, label: 'Handful', emoji: '💎' },
  { price: '$4.99', opals: 75, label: 'Armful', emoji: '✨' },
  { price: '$9.99', opals: 200, label: 'Best Value', emoji: '🌟' },
  { price: '$19.99', opals: 500, label: 'Whale Pack', emoji: '🐋' },
];

const SHRIMP_PACKS = [
  { count: 10, opals: 10, label: 'Small Colony', emoji: '🦐' },
  { count: 20, opals: 20, label: 'Medium Colony', emoji: '🦐🦐' },
  { count: 30, opals: 30, label: 'Large Colony', emoji: '🦐🦐🦐' },
];

const FILTER_OPTIONS = [
  { id: 'filter-basic', name: 'Basic Filter', coins: 100, opals: 0, emoji: '⚙️', description: 'Slow but steady filtration' },
  { id: 'filter-advanced', name: 'Advanced Filter', coins: 300, opals: 0, emoji: '🔧', description: 'Faster, cleaner water' },
  { id: 'filter-premium', name: 'Premium Filter', coins: 0, opals: 50, emoji: '✨', description: 'Crystal-clear perfection' },
];

const TREATMENT_OPTIONS = [
  { id: 'treatment-water', name: 'Water Treatment', opals: 5, emoji: '💧', description: 'Purifies & balances water quality' },
  { id: 'treatment-miracle', name: 'Miracle Treatment', opals: 15, emoji: '🧪', description: 'Fully restores all water stats' },
];

/* ── Section header ── */
function SectionHeader({ icon: Icon, iconBg, iconShadow, title, titleGradient, wobbleDirection = 'left', onInfo }: {
  icon: typeof Coins;
  iconBg: string;
  iconShadow: string;
  title: string;
  titleGradient: string;
  wobbleDirection?: 'left' | 'right';
  onInfo?: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <motion.div
        className="rounded-xl p-1.5 shadow-md flex-shrink-0"
        style={{ background: iconBg, boxShadow: iconShadow }}
        animate={{ rotate: wobbleDirection === 'left' ? [0, -5, 5, 0] : [0, 5, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
      >
        <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
      </motion.div>
      <h3
        className="text-[13px] font-black tracking-tight flex-1"
        style={{
          background: titleGradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {title}
      </h3>
      {onInfo && (
        <motion.button
          onClick={onInfo}
          className="rounded-full p-1 flex-shrink-0 active:bg-violet-100/60"
          style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(196,181,253,0.45)' }}
          whileTap={{ scale: 0.85 }}
        >
          <Info className="w-3.5 h-3.5 text-violet-400" strokeWidth={2.5} />
        </motion.button>
      )}
    </div>
  );
}

/* ── Section divider ── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(196,181,253,0.5), transparent)' }} />
      <motion.span
        className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-400/60"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {label}
      </motion.span>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(196,181,253,0.5), transparent)' }} />
    </div>
  );
}

/* ── Shared row tile ── */
function ShopRowTile({
  index,
  onClick,
  disabled,
  cardBg,
  cardBorder,
  emoji,
  title,
  subtitle,
  priceContent,
}: {
  index: number;
  onClick: () => void;
  disabled?: boolean;
  cardBg: string;
  cardBorder: string;
  emoji: string;
  title: string;
  subtitle: string;
  priceContent: React.ReactNode;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}
      onClick={onClick}
      disabled={disabled}
      className="relative w-full flex items-center gap-3 rounded-2xl p-3 text-left overflow-hidden transition-all"
      style={{
        background: disabled ? 'rgba(245,240,255,0.4)' : cardBg,
        border: disabled ? '1.5px solid rgba(216,180,254,0.2)' : cardBorder,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 2px 10px -3px rgba(139,92,246,0.08)',
      }}
      whileTap={!disabled ? { scale: 0.97 } : {}}
    >
      {/* Shimmer top line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }}
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
      />
      <div className="text-xl flex-shrink-0 relative z-10">{emoji}</div>
      <div className="flex-1 min-w-0 relative z-10">
        <div className="text-violet-900 text-[12px] font-bold">{title}</div>
        <div className="text-violet-500/70 text-[10px] mt-0.5 font-medium">{subtitle}</div>
      </div>
      <div className="relative z-10 flex-shrink-0">{priceContent}</div>
    </motion.button>
  );
}

/* ── Price badge ── */
function PriceBadge({ bg, border, shadow, icon: PIcon, value, textColor }: {
  bg: string;
  border: string;
  shadow: string;
  icon: typeof Coins;
  value: string | number;
  textColor: string;
}) {
  return (
    <div
      className="flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-xl"
      style={{ background: bg, border, boxShadow: shadow, color: textColor }}
    >
      <PIcon className="w-3 h-3 opacity-80" />
      <span>{value}</span>
    </div>
  );
}

export function ShopModal({
  onClose,
  coins,
  opals,
  onBuyCoins,
  onBuyOpals,
  onBuyShrimp,
  onBuyFilter,
  onBuyTreatment,
  initialSection,
}: ShopModalProps) {
  const canAfford = (cost: number) => coins >= cost;
  const canAffordOpals = (cost: number) => opals >= cost;
  const coinsSectionRef = useRef<HTMLDivElement>(null);
  const opalsSectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [infoModal, setInfoModal] = useState<'shrimp' | 'filters' | 'treatments' | null>(null);

  useEffect(() => {
    if (!initialSection) return;
    const timeout = setTimeout(() => {
      const ref = initialSection === 'coins' ? coinsSectionRef : opalsSectionRef;
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => clearTimeout(timeout);
  }, [initialSection]);



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: 'rgba(88,28,135,0.22)', backdropFilter: 'blur(14px)' }}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 24 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Ambient glow orbs */}
        <div className="absolute -top-10 -left-10 w-52 h-52 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-10 -right-8 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(192,132,252,0.28) 0%, transparent 70%)' }} />

        {/* Main card */}
        <div
          className="relative flex flex-col overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 48%, #fce7f3 100%)',
            border: '1.5px solid rgba(216,180,254,0.55)',
            borderRadius: '28px',
            boxShadow: '0 24px 64px -12px rgba(139,92,246,0.28), 0 8px 24px -4px rgba(251,191,36,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
            maxHeight: '90vh',
          }}
        >
          {/* Header */}
          <div className="relative flex-shrink-0 px-5 pt-5 pb-4">
            {/* Bottom rule */}
            <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)' }} />

            <div className="flex items-start justify-between">
              <div>
                {/* Wordmark */}
                <h2
                  className="font-black tracking-tight"
                  style={{
                    fontSize: '1.6rem',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 50%, #f59e0b 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.1,
                  }}
                >
                  Shop
                </h2>
                {/* subtitle removed */}
              </div>

              {/* Currency pills */}
              <div className="flex items-center gap-1 mr-1 mt-0.5">
                <motion.button
                  className="flex items-center gap-1 rounded-full px-2 py-1 transition-all"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(196,181,253,0.5)', boxShadow: '0 2px 8px rgba(139,92,246,0.1)' }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => opalsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  <Sparkles className="w-2.5 h-2.5 text-violet-500" />
                  <span className="text-violet-800 text-[10px] font-black tabular-nums">{opals}</span>
                </motion.button>
                <motion.button
                  className="flex items-center gap-1 rounded-full px-2 py-1 transition-all"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(253,230,138,0.6)', boxShadow: '0 2px 8px rgba(245,158,11,0.1)' }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => coinsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  <Coins className="w-2.5 h-2.5 text-amber-500" />
                  <span className="text-amber-800 text-[10px] font-black tabular-nums">{coins}</span>
                </motion.button>
              </div>

              <motion.button
                onClick={onClose}
                className="rounded-full p-2 border border-violet-200/60 active:bg-violet-100/80 flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(255,255,255,0.65)' }}
                whileTap={{ scale: 0.85, rotate: 90 }}
              >
                <X className="w-4 h-4 text-violet-400" strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>

          {/* Scrollable content */}
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto flex-1 px-4 pb-5 pt-4 space-y-5"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >

            {/* ── Buy Opals ── */}
            <div ref={opalsSectionRef}>
              <SectionHeader
                icon={Gem}
                iconBg="linear-gradient(135deg, #22d3ee, #3b82f6)"
                iconShadow="0 3px 10px rgba(34,211,238,0.35)"
                title="Buy Opals"
                titleGradient="linear-gradient(135deg, #0891b2, #2563eb)"
              />
              <div className="space-y-1.5">
                {OPAL_PACKS.map((pack, i) => (
                  <ShopRowTile
                    key={i}
                    index={i}
                    onClick={() => onBuyOpals(pack)}
                    cardBg="linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(240,249,255,0.85) 100%)"
                    cardBorder="1.5px solid rgba(186,230,253,0.6)"
                    emoji={pack.emoji}
                    title={pack.label}
                    subtitle={`${pack.opals} Opals`}
                    priceContent={
                      <PriceBadge
                        bg="linear-gradient(135deg, #22d3ee, #3b82f6)"
                        border="none"
                        shadow="0 3px 10px rgba(34,211,238,0.3)"
                        icon={Sparkles}
                        value={pack.price}
                        textColor="#fff"
                      />
                    }
                  />
                ))}
              </div>
              <p className="text-violet-400/50 text-[9px] mt-2 text-center italic">Demo only — no real purchases made.</p>
            </div>

            {/* ── Buy Coins ── */}
            <div ref={coinsSectionRef}>
              <SectionHeader
                icon={Coins}
                iconBg="linear-gradient(135deg, #fbbf24, #f97316)"
                iconShadow="0 3px 10px rgba(251,191,36,0.4)"
                title="Buy Coins with Opals"
                titleGradient="linear-gradient(135deg, #d97706, #ea580c)"
                wobbleDirection="right"
              />
              <div className="grid grid-cols-2 gap-2">
                {COIN_PACKS.map((pack, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.28 }}
                    onClick={() => onBuyCoins(pack)}
                    disabled={!canAffordOpals(pack.opals)}
                    className="relative flex flex-col items-center rounded-2xl p-3 text-center overflow-hidden transition-all"
                    style={{
                      background: canAffordOpals(pack.opals)
                        ? 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,251,235,0.88) 100%)'
                        : 'rgba(245,240,255,0.4)',
                      border: canAffordOpals(pack.opals)
                        ? '1.5px solid rgba(253,230,138,0.65)'
                        : '1.5px solid rgba(216,180,254,0.2)',
                      opacity: canAffordOpals(pack.opals) ? 1 : 0.45,
                      boxShadow: canAffordOpals(pack.opals) ? '0 2px 10px -3px rgba(245,158,11,0.15)' : 'none',
                      cursor: canAffordOpals(pack.opals) ? 'pointer' : 'not-allowed',
                    }}
                    whileTap={canAffordOpals(pack.opals) ? { scale: 0.96 } : {}}
                  >
                    {/* Gloss */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)' }} />

                    {pack.best && (
                      <motion.div
                        className="text-white text-[6px] font-black px-2 py-0.5 rounded-full mb-1"
                        style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', boxShadow: '0 2px 8px rgba(251,191,36,0.4)' }}
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        BEST
                      </motion.div>
                    )}
                    <div className="text-lg mb-0.5">{pack.emoji}</div>
                    <div className="text-amber-900 text-[12px] font-black">{pack.coins.toLocaleString()}</div>
                    <div className="flex items-center gap-0.5 text-amber-500/70 text-[9px] font-semibold mb-1.5">
                      <Coins className="w-2 h-2" />
                      <span>coins</span>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
                      style={{ background: 'rgba(237,233,254,0.8)', border: '1px solid rgba(196,181,253,0.5)' }}
                    >
                      <Sparkles className="w-2 h-2 text-violet-500" />
                      <span className="text-violet-700 text-[9px] font-black">{pack.opals}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* ── Ghost Shrimp ── */}
            <div>
              <SectionHeader
                icon={Bug}
                iconBg="linear-gradient(135deg, #f472b6, #e11d48)"
                iconShadow="0 3px 10px rgba(244,114,182,0.35)"
                title="Ghost Shrimp"
                titleGradient="linear-gradient(135deg, #db2777, #be123c)"
                onInfo={() => setInfoModal('shrimp')}
              />
              <div className="space-y-1.5">
                {SHRIMP_PACKS.map((pack, i) => (
                  <ShopRowTile
                    key={i}
                    index={i}
                    onClick={() => onBuyShrimp?.(pack)}
                    disabled={!canAffordOpals(pack.opals)}
                    cardBg="linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(255,241,242,0.85) 100%)"
                    cardBorder="1.5px solid rgba(251,207,232,0.65)"
                    emoji={pack.emoji}
                    title={pack.label}
                    subtitle={`${pack.count} shrimp`}
                    priceContent={
                      <PriceBadge
                        bg={canAffordOpals(pack.opals) ? 'linear-gradient(135deg, #f472b6, #e11d48)' : 'rgba(216,180,254,0.3)'}
                        border="none"
                        shadow={canAffordOpals(pack.opals) ? '0 3px 10px rgba(244,114,182,0.3)' : 'none'}
                        icon={Sparkles}
                        value={pack.opals}
                        textColor={canAffordOpals(pack.opals) ? '#fff' : 'rgba(139,92,246,0.4)'}
                      />
                    }
                  />
                ))}
              </div>
            </div>

            {/* ── Filters ── */}
            <div>
              <SectionHeader
                icon={Filter}
                iconBg="linear-gradient(135deg, #38bdf8, #2563eb)"
                iconShadow="0 3px 10px rgba(56,189,248,0.35)"
                title="Filters"
                titleGradient="linear-gradient(135deg, #0284c7, #1d4ed8)"
                wobbleDirection="right"
                onInfo={() => setInfoModal('filters')}
              />
              <div className="space-y-1.5">
                {FILTER_OPTIONS.map((filter, i) => {
                  const usesOpals = filter.opals > 0;
                  const canAffordFilter = usesOpals ? canAffordOpals(filter.opals) : canAfford(filter.coins);
                  const filterCost = usesOpals ? filter.opals : filter.coins;
                  
                  return (
                    <ShopRowTile
                      key={filter.id}
                      index={i}
                      onClick={() => onBuyFilter?.(filter)}
                      disabled={!canAffordFilter}
                      cardBg="linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(240,249,255,0.85) 100%)"
                      cardBorder="1.5px solid rgba(186,230,253,0.6)"
                      emoji={filter.emoji}
                      title={filter.name}
                      subtitle={filter.description}
                      priceContent={
                        <PriceBadge
                          bg={canAffordFilter ? (usesOpals ? 'linear-gradient(135deg, #f472b6, #e11d48)' : 'linear-gradient(135deg, #38bdf8, #2563eb)') : 'rgba(216,180,254,0.3)'}
                          border="none"
                          shadow={canAffordFilter ? (usesOpals ? '0 3px 10px rgba(244,114,182,0.3)' : '0 3px 10px rgba(56,189,248,0.3)') : 'none'}
                          icon={usesOpals ? Sparkles : Coins}
                          value={filterCost}
                          textColor={canAffordFilter ? '#fff' : 'rgba(139,92,246,0.4)'}
                        />
                      }
                    />
                  );
                })}
              </div>
            </div>

            {/* ── Treatments ── */}
            <div>
              <SectionHeader
                icon={Droplets}
                iconBg="linear-gradient(135deg, #34d399, #0d9488)"
                iconShadow="0 3px 10px rgba(52,211,153,0.35)"
                title="Treatments"
                titleGradient="linear-gradient(135deg, #059669, #0f766e)"
                onInfo={() => setInfoModal('treatments')}
              />
              <div className="space-y-1.5">
                {TREATMENT_OPTIONS.map((treatment, i) => (
                  <ShopRowTile
                    key={treatment.id}
                    index={i}
                    onClick={() => onBuyTreatment?.(treatment)}
                    disabled={!canAffordOpals(treatment.opals)}
                    cardBg="linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(240,253,250,0.85) 100%)"
                    cardBorder="1.5px solid rgba(167,243,208,0.6)"
                    emoji={treatment.emoji}
                    title={treatment.name}
                    subtitle={treatment.description}
                    priceContent={
                      <PriceBadge
                        bg={canAffordOpals(treatment.opals) ? 'linear-gradient(135deg, #34d399, #0d9488)' : 'rgba(216,180,254,0.3)'}
                        border="none"
                        shadow={canAffordOpals(treatment.opals) ? '0 3px 10px rgba(52,211,153,0.3)' : 'none'}
                        icon={Sparkles}
                        value={treatment.opals}
                        textColor={canAffordOpals(treatment.opals) ? '#fff' : 'rgba(139,92,246,0.4)'}
                      />
                    }
                  />
                ))}
              </div>
            </div>

            {/* Footer tip */}
            <motion.div
              className="rounded-2xl p-3.5 text-center"
              style={{
                background: 'rgba(255,255,255,0.55)',
                border: '1.5px dashed rgba(216,180,254,0.45)',
              }}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-[10px] text-violet-400/70 font-medium">
                🛍️ Earn coins from mini-games · Buy decorations in the Axopedia!
              </p>
            </motion.div>

          </div>
        </div>
      </motion.div>

      {/* ── Info modal ── */}
      <AnimatePresence>
        {infoModal && (() => {
          const INFO = {
            shrimp: {
              emoji: '🦐',
              title: 'Ghost Shrimp',
              color: 'linear-gradient(135deg, #db2777, #be123c)',
              bg: 'linear-gradient(160deg, #fff1f2 0%, #fce7f3 100%)',
              border: 'rgba(251,207,232,0.7)',
              body: 'Ghost Shrimp are tiny tank cleaners that munch on algae and leftover food, keeping your aquarium sparkling. The more shrimp you have, the faster your tank stays clean — reducing how quickly the Clean stat drops over time.',
              tip: '💡 A big colony means less frequent scrubbing!',
            },
            filters: {
              emoji: '⚙️',
              title: 'Filters',
              color: 'linear-gradient(135deg, #0284c7, #1d4ed8)',
              bg: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: 'rgba(186,230,253,0.7)',
              body: 'Filters cycle water through a purification system, slowing the rate at which your Water Quality stat decays. Higher-tier filters keep the water cleaner for longer, so you can go more time between water changes.',
              tip: '💡 Upgrade your filter to spend less time on maintenance!',
            },
            treatments: {
              emoji: '🧪',
              title: 'Treatments',
              color: 'linear-gradient(135deg, #059669, #0f766e)',
              bg: 'linear-gradient(160deg, #f0fdf4 0%, #ccfbf1 100%)',
              border: 'rgba(167,243,208,0.7)',
              body: 'Treatments are one-time-use boosts that instantly restore your Water Quality stat. Use a Water Treatment for a solid top-up, or break out the Miracle Treatment when things have gotten seriously murky and you need a full reset.',
              tip: '💡 Keep a Miracle Treatment in reserve for emergencies!',
            },
          }[infoModal];

          return (
            <motion.div
              key="info-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-50 flex items-end justify-center pb-6 px-4"
              style={{ background: 'rgba(15,10,40,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setInfoModal(null)}
            >
              <motion.div
                key="info-card"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="w-full rounded-3xl p-5 flex flex-col gap-3"
                style={{ background: INFO.bg, border: `1.5px solid ${INFO.border}`, boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
                    style={{ background: 'rgba(255,255,255,0.7)' }}
                  >
                    {INFO.emoji}
                  </div>
                  <h4
                    className="font-black tracking-tight"
                    style={{ fontSize: '1.05rem', background: INFO.color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >
                    {INFO.title}
                  </h4>
                  <motion.button
                    onClick={() => setInfoModal(null)}
                    className="ml-auto rounded-full p-1.5 active:bg-slate-200/60 flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(203,213,225,0.5)' }}
                    whileTap={{ scale: 0.85 }}
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" strokeWidth={2.5} />
                  </motion.button>
                </div>

                {/* Body */}
                <p className="text-slate-600 text-[12px] leading-relaxed">
                  {INFO.body}
                </p>

                {/* Tip pill */}
                <div
                  className="rounded-2xl px-3.5 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${INFO.border}` }}
                >
                  <p className="text-[11px] text-slate-500 font-medium">{INFO.tip}</p>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}