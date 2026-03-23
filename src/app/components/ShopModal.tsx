import { X, Coins, Sparkles, Droplets, Filter, Bug, Gem, Info, ChevronDown, Leaf, Mountain, Shell, Waves, Settings, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { DECORATIONS } from '../data/decorations';
import { GameIcon, CoinIcon } from './icons';

const DECO_CATEGORIES = [
  { type: 'plant',      label: 'Plants',      icon: <Leaf size={14} />,     color: 'rgba(134,239,172,0.2)',  border: 'rgba(74,222,128,0.35)'  },
  { type: 'rock',       label: 'Rocks',        icon: <Mountain size={14} />, color: 'rgba(203,213,225,0.25)', border: 'rgba(148,163,184,0.35)' },
  { type: 'ornament',   label: 'Ornaments',    icon: <Shell size={14} />,    color: 'rgba(253,186,116,0.2)',  border: 'rgba(251,146,60,0.3)'   },
  { type: 'background', label: 'Backgrounds',  icon: <Waves size={14} />,    color: 'rgba(147,210,255,0.2)',  border: 'rgba(56,189,248,0.3)'   },
];

interface ShopModalProps {
  onClose: () => void;
  coins: number;
  opals: number;

  onBuyCoins: (pack: { opals: number; coins: number }) => void;
  onBuyOpals: (pack: { price: string; opals: number }) => void;
  onBuyShrimp?: (pack: { count: number; opals: number }) => void;
  onBuyFilter?: (filter: { id: string; name: string; coins: number; opals: number }) => void;
  onEquipFilter?: (filterId: string) => void;
  onBuyTreatment?: (treatment: { id: string; name: string; opals: number }) => void;
  onStoreTreatment?: (treatment: { id: string; name: string; opals: number }) => void;
  onStoreShrimpInInventory?: (pack: { count: number; opals: number }) => void;
  initialSection?: 'coins' | 'opals' | 'wellbeing' | null;
  /** When true, pulses a highlight cue on the Small Colony shrimp pack */
  highlightShrimp?: boolean;
  /** All filter IDs the player has purchased. */
  ownedFilters?: string[];
  /** The currently active (equipped) filter ID. */
  equippedFilter?: string;
  /** Decoration ownership & equip state for the store tab. */
  ownedDecos?: string[];
  equippedDecos?: string[];
  activeBackground?: string;
  onBuyDecoration?: (id: string) => void;
  onEquipDecoration?: (id: string) => void;
}

const COIN_PACKS = [
  { opals: 5, coins: 500, label: 'Starter' },
  { opals: 10, coins: 1200, label: 'Popular', best: false },
  { opals: 25, coins: 3500, label: 'Best Value', best: true },
  { opals: 50, coins: 8000, label: 'Mega Pack', best: false },
];

const OPAL_PACKS = [
  { price: '$0.99', opals: 10, label: 'A Few' },
  { price: '$2.99', opals: 35, label: 'Handful' },
  { price: '$4.99', opals: 75, label: 'Armful' },
  { price: '$9.99', opals: 200, label: 'Catch of the Day' },
  { price: '$19.99', opals: 500, label: 'Whale Pack' },
];

const SHRIMP_PACKS = [
  { count: 10, opals: 10, label: 'Small Colony' },
  { count: 20, opals: 20, label: 'Medium Colony' },
  { count: 30, opals: 30, label: 'Large Colony' },
];

const FILTER_OPTIONS = [
  { id: 'filter-basic', name: 'Basic Filter', coins: 100, opals: 0, icon: <Settings size={18} />, description: 'Slow but steady filtration' },
  { id: 'filter-advanced', name: 'Advanced Filter', coins: 300, opals: 0, icon: <Wrench size={18} />, description: 'Faster, cleaner water' },
  { id: 'filter-premium', name: 'Premium Filter', coins: 0, opals: 50, icon: <Sparkles size={18} />, description: 'Crystal-clear perfection' },
];

const TREATMENT_OPTIONS = [
  { id: 'treatment-water', name: 'Water Treatment', opals: 5, icon: <Droplets size={18} />, description: 'Purifies & balances water quality' },
  { id: 'treatment-miracle', name: 'Miracle Treatment', opals: 15, icon: <Settings size={18} />, description: 'Fully restores all water stats' },
];

type TabId = 'currency' | 'decorations' | 'wellbeing';

const TABS: { id: TabId; label: string; activeGradient: string; activeShadow: string; inactiveColor: string }[] = [
  {
    id: 'currency',
    label: 'Currency',
    activeGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    activeShadow: '0 4px 12px rgba(245,158,11,0.45)',
    inactiveColor: 'rgba(146,64,14,0.6)',
  },
  {
    id: 'decorations',
    label: 'Decorations',
    activeGradient: 'linear-gradient(135deg, #34d399, #0d9488)',
    activeShadow: '0 4px 12px rgba(52,211,153,0.45)',
    inactiveColor: 'rgba(13,148,136,0.6)',
  },
  {
    id: 'wellbeing',
    label: 'Wellbeing',
    activeGradient: 'linear-gradient(135deg, #38bdf8, #2563eb)',
    activeShadow: '0 4px 12px rgba(56,189,248,0.45)',
    inactiveColor: 'rgba(14,116,144,0.6)',
  },
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
      <div className="flex items-center gap-1">
        <h3
          className="text-[13px] font-black tracking-tight"
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
  iconNode,
  title,
  subtitle,
  priceContent,
}: {
  index: number;
  onClick: () => void;
  disabled?: boolean;
  cardBg: string;
  cardBorder: string;
  iconNode?: React.ReactNode;
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
      {iconNode && <div className="flex-shrink-0 relative z-10">{iconNode}</div>}
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
  onEquipFilter,
  onBuyTreatment,
  onStoreTreatment,
  onStoreShrimpInInventory,
  initialSection,
  highlightShrimp = false,
  ownedFilters = [],
  equippedFilter,
  ownedDecos = [],
  equippedDecos = [],
  activeBackground = '',
  onBuyDecoration,
  onEquipDecoration,
}: ShopModalProps) {
  const canAfford = (cost: number) => coins >= cost;
  const canAffordOpals = (cost: number) => opals >= cost;

  const [activeTab, setActiveTab] = useState<TabId>(
    initialSection === 'wellbeing' ? 'wellbeing' : 'currency'
  );
  const [infoModal, setInfoModal] = useState<'shrimp' | 'filters' | 'treatments' | null>(null);
  const [confirmFilter, setConfirmFilter] = useState<{ filter: typeof FILTER_OPTIONS[number]; mode: 'buy' | 'equip' } | null>(null);
  const [openDecoCategories, setOpenDecoCategories] = useState<Record<string, boolean>>(
    () => Object.fromEntries(DECO_CATEGORIES.map(c => [c.type, true]))
  );
  const toggleDecoCategory = (type: string) =>
    setOpenDecoCategories(prev => ({ ...prev, [type]: !prev[type] }));

  const [pendingTreatment, setPendingTreatment] = useState<typeof TREATMENT_OPTIONS[number] | null>(null);
  const [pendingShrimpPack, setPendingShrimpPack] = useState<typeof SHRIMP_PACKS[number] | null>(null);

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
          {/* ── Header ── */}
          <div className="relative flex-shrink-0 px-5 pt-5 pb-4">
            <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)' }} />

            <div className="flex items-start justify-between">
              <div>
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
              </div>

              {/* Currency pills */}
              <div className="flex items-center gap-1 mr-1 mt-0.5">
                <motion.button
                  className="flex items-center gap-1 rounded-full px-2 py-1 transition-all"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(196,181,253,0.5)', boxShadow: '0 2px 8px rgba(139,92,246,0.1)' }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setActiveTab('currency')}
                >
                  <Sparkles className="w-2.5 h-2.5 text-violet-500" />
                  <span className="text-violet-800 text-[10px] font-black tabular-nums">{opals}</span>
                </motion.button>
                <motion.button
                  className="flex items-center gap-1 rounded-full px-2 py-1 transition-all"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(253,230,138,0.6)', boxShadow: '0 2px 8px rgba(245,158,11,0.1)' }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setActiveTab('currency')}
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

          {/* ── Tab bar ── */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2">
            <div
              className="flex rounded-2xl p-1 gap-1"
              style={{
                background: 'rgba(255,255,255,0.55)',
                border: '1.5px solid rgba(216,180,254,0.38)',
                boxShadow: 'inset 0 1px 3px rgba(139,92,246,0.06)',
              }}
            >
              {TABS.map(tab => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl relative overflow-hidden"
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {/* Active background */}
                  <AnimatePresence>
                    {activeTab === tab.id && (
                      <motion.div
                        key="tab-bg"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: tab.activeGradient, boxShadow: tab.activeShadow }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </AnimatePresence>
                  <span
                    className="relative z-10 text-[8.5px] font-black tracking-widest uppercase leading-none"
                    style={{ color: activeTab === tab.id ? '#fff' : tab.inactiveColor }}
                  >
                    {tab.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* ── Tab content ── */}
          <div
            className="overflow-y-auto flex-1 px-4 pb-5"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            <AnimatePresence mode="wait">

              {/* CURRENCY TAB */}
              {activeTab === 'currency' && (
                <motion.div
                  key="currency"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-5 pt-3"
                >
                  {/* Buy Opals */}
                  <div>
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
                          iconNode={<Gem size={20} className="text-violet-500" />}
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

                  {/* Buy Coins */}
                  <div>
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
                          <div className="mb-0.5"><CoinIcon size={24} className="text-amber-500" /></div>
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
                </motion.div>
              )}

              {/* DECORATIONS TAB */}
              {activeTab === 'decorations' && (
                <motion.div
                  key="decorations"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-2 pt-3"
                >
                  {DECO_CATEGORIES.map((cat, ci) => {
                    const items = DECORATIONS.filter(d => d.type === cat.type);
                    const isOpen = openDecoCategories[cat.type];
                    return (
                      <div
                        key={cat.type}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(20,184,166,0.14)' }}
                      >
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2.5 active:bg-teal-50/40"
                          onClick={() => toggleDecoCategory(cat.type)}
                        >
                          {cat.icon}
                          <span className="flex-1 text-left text-[11px] font-black tracking-widest uppercase" style={{ color: 'rgba(15,118,110,0.75)' }}>
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium mr-1">{items.length}</span>
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.22 }}>
                            <ChevronDown className="w-3.5 h-3.5 text-teal-400" strokeWidth={2.5} />
                          </motion.div>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              key={`store-${cat.type}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                                {items.map((item, i) => {
                                  const isOwned = ownedDecos.includes(item.id);
                                  const isEquipped = equippedDecos.includes(item.id) || (item.type === 'background' && activeBackground === item.id);
                                  const canBuy = coins >= item.cost;
                                  return (
                                    <motion.div
                                      key={item.id}
                                      initial={{ opacity: 0, scale: 0.88 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: ci * 0.03 + i * 0.03 }}
                                      className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl overflow-hidden"
                                      style={{
                                        background: isEquipped
                                          ? 'linear-gradient(135deg, rgba(167,243,208,0.6), rgba(110,231,183,0.45))'
                                          : 'rgba(255,255,255,0.7)',
                                        border: isEquipped
                                          ? '1.5px solid rgba(52,211,153,0.5)'
                                          : `1.5px solid ${cat.border}`,
                                      }}
                                    >
                                      {isEquipped && (
                                        <div
                                          className="absolute top-1.5 right-1.5 text-[6px] font-black text-white px-1 py-0.5 rounded-full"
                                          style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}
                                        >ON</div>
                                      )}
                                      <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                                        style={{ background: cat.color }}
                                      >
                                        <GameIcon name={item.icon} size={22} />
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">{item.name}</span>
                                      {isOwned ? (
                                        item.type === 'background' ? (
                                          <motion.button
                                            onClick={() => onEquipDecoration?.(item.id)}
                                            className="w-full py-1 rounded-xl text-[9px] font-black text-white"
                                            style={{
                                              background: isEquipped ? 'linear-gradient(135deg,#34d399,#10b981)' : 'linear-gradient(135deg,#38bdf8,#0ea5e9)',
                                            }}
                                            whileTap={{ scale: 0.94 }}
                                          >
                                            {isEquipped ? 'Active' : 'Use'}
                                          </motion.button>
                                        ) : isEquipped ? (
                                          <motion.button
                                            onClick={() => onEquipDecoration?.(item.id)}
                                            className="w-full py-1 rounded-xl text-[9px] font-black"
                                            style={{ background: 'rgba(239,246,255,0.8)', color: '#64748b', border: '1px solid rgba(203,213,225,0.5)' }}
                                            whileTap={{ scale: 0.94 }}
                                          >
                                            Remove
                                          </motion.button>
                                        ) : (
                                          <motion.button
                                            onClick={() => onEquipDecoration?.(item.id)}
                                            className="w-full py-1 rounded-xl text-[9px] font-black text-white"
                                            style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', boxShadow: '0 2px 6px rgba(14,165,233,0.3)' }}
                                            whileTap={{ scale: 0.94 }}
                                          >
                                            Equip
                                          </motion.button>
                                        )
                                      ) : (
                                        <motion.button
                                          onClick={() => onBuyDecoration?.(item.id)}
                                          disabled={!canBuy && item.cost > 0}
                                          className="w-full py-1 rounded-xl text-[9px] font-black"
                                          style={{
                                            background: item.cost === 0
                                              ? 'linear-gradient(135deg,#34d399,#10b981)'
                                              : canBuy
                                              ? 'linear-gradient(135deg,#f59e0b,#f97316)'
                                              : 'rgba(216,180,254,0.3)',
                                            color: canBuy || item.cost === 0 ? '#fff' : 'rgba(139,92,246,0.4)',
                                            boxShadow: canBuy && item.cost > 0 ? '0 2px 6px rgba(245,158,11,0.3)' : 'none',
                                            border: !canBuy && item.cost > 0 ? '1px solid rgba(196,181,253,0.3)' : 'none',
                                            cursor: !canBuy && item.cost > 0 ? 'not-allowed' : 'pointer',
                                          }}
                                          whileTap={canBuy || item.cost === 0 ? { scale: 0.94 } : {}}
                                        >
                                          {item.cost === 0 ? 'Free' : (
                                            <span className="flex items-center justify-center gap-0.5">
                                              <Coins className="w-2.5 h-2.5" />{item.cost}
                                            </span>
                                          )}
                                        </motion.button>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* WELLBEING TAB */}
              {activeTab === 'wellbeing' && (
                <motion.div
                  key="wellbeing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-5 pt-3"
                >
                  {/* Ghost Shrimp */}
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
                      {SHRIMP_PACKS.map((pack, i) => {
                        const isHighlighted = highlightShrimp && pack.label === 'Small Colony';
                        return (
                          <div key={i} className={isHighlighted ? 'relative' : undefined}>
                            {isHighlighted && (
                              <>
                                {/* Pulsing ring */}
                                <motion.div
                                  className="absolute -inset-1 rounded-2xl pointer-events-none"
                                  style={{ border: '2px solid #f472b6', borderRadius: 16 }}
                                  animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.025, 1] }}
                                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                {/* Cue label */}
                                <motion.div
                                  className="absolute -top-6 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                                  animate={{ y: [0, -3, 0] }}
                                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                  Start here ↓
                                </motion.div>
                              </>
                            )}
                            <ShopRowTile
                              index={i}
                              onClick={() => { if (canAffordOpals(pack.opals)) setPendingShrimpPack(pack); }}
                              disabled={!canAffordOpals(pack.opals)}
                              cardBg="linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(255,241,242,0.85) 100%)"
                              cardBorder={isHighlighted ? '1.5px solid rgba(244,114,182,0.9)' : '1.5px solid rgba(251,207,232,0.65)'}
                              iconNode={<span className="text-pink-400 font-bold text-sm">~</span>}
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
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filters */}
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
                        const isEquipped = equippedFilter === filter.id;
                        const isOwned = ownedFilters.includes(filter.id);
                        const usesOpals = filter.opals > 0;
                        const canAffordFilter = usesOpals ? canAffordOpals(filter.opals) : canAfford(filter.coins);
                        const filterCost = usesOpals ? filter.opals : filter.coins;

                        const isDisabled = isEquipped || (!isOwned && !canAffordFilter);
                        const handleClick = () => {
                          if (isEquipped) return;
                          if (isOwned) {
                            setConfirmFilter({ filter, mode: 'equip' });
                          } else if (canAffordFilter) {
                            setConfirmFilter({ filter, mode: 'buy' });
                          }
                        };

                        return (
                          <ShopRowTile
                            key={filter.id}
                            index={i}
                            onClick={handleClick}
                            disabled={isDisabled}
                            cardBg={
                              isEquipped
                                ? 'linear-gradient(135deg, rgba(220,252,231,0.9) 0%, rgba(187,247,208,0.85) 100%)'
                                : isOwned
                                ? 'linear-gradient(135deg, rgba(219,234,254,0.95) 0%, rgba(191,219,254,0.9) 100%)'
                                : 'linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(240,249,255,0.85) 100%)'
                            }
                            cardBorder={
                              isEquipped
                                ? '1.5px solid rgba(134,239,172,0.7)'
                                : isOwned
                                ? '1.5px solid rgba(96,165,250,0.7)'
                                : '1.5px solid rgba(186,230,253,0.6)'
                            }
                            iconNode={filter.icon}
                            title={filter.name}
                            subtitle={filter.description}
                            priceContent={
                              isEquipped ? (
                                <div
                                  className="flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-xl"
                                  style={{ background: 'linear-gradient(135deg, #4ade80, #16a34a)', color: '#fff', boxShadow: '0 3px 10px rgba(74,222,128,0.4)' }}
                                >
                                  Equipped
                                </div>
                              ) : isOwned ? (
                                <div
                                  className="flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-xl"
                                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', boxShadow: '0 3px 10px rgba(59,130,246,0.4)' }}
                                >
                                  Owned
                                </div>
                              ) : (
                                <PriceBadge
                                  bg={canAffordFilter ? (usesOpals ? 'linear-gradient(135deg, #f472b6, #e11d48)' : 'linear-gradient(135deg, #38bdf8, #2563eb)') : 'rgba(216,180,254,0.3)'}
                                  border="none"
                                  shadow={canAffordFilter ? (usesOpals ? '0 3px 10px rgba(244,114,182,0.3)' : '0 3px 10px rgba(56,189,248,0.3)') : 'none'}
                                  icon={usesOpals ? Sparkles : Coins}
                                  value={filterCost}
                                  textColor={canAffordFilter ? '#fff' : 'rgba(139,92,246,0.4)'}
                                />
                              )
                            }
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Treatments */}
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
                          onClick={() => { if (canAffordOpals(treatment.opals)) setPendingTreatment(treatment); }}
                          disabled={!canAffordOpals(treatment.opals)}
                          cardBg="linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(240,253,250,0.85) 100%)"
                          cardBorder="1.5px solid rgba(167,243,208,0.6)"
                          iconNode={treatment.icon}
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

                  {/* Tip */}
                  <motion.div
                    className="rounded-2xl p-3.5 text-center"
                    style={{ background: 'rgba(255,255,255,0.55)', border: '1.5px dashed rgba(167,243,208,0.45)' }}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <p className="text-[10px] text-teal-500/70 font-medium">
                      Keep shrimp stocked for a naturally cleaner tank!
                    </p>
                  </motion.div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Filter confirmation sheet ── */}
      <AnimatePresence>
        {confirmFilter && (() => {
          const { filter: f, mode } = confirmFilter;
          const usesOpals = f.opals > 0;
          const cost = usesOpals ? f.opals : f.coins;
          const canAffordIt = usesOpals ? canAffordOpals(f.opals) : canAfford(f.coins);
          const FILTER_DETAIL: Record<string, string> = {
            'filter-basic':    'A simple sponge filter that keeps waste from building up. Water Quality will decay more slowly, giving you more time between water changes.',
            'filter-advanced': 'A multi-stage canister filter that removes particles and toxins faster. Significantly slows Water Quality decay — great for busy days.',
            'filter-premium':  'A top-of-the-line system with UV sterilisation. Water Quality barely drops at all, so your axolotl stays happy with minimal maintenance.',
          };
          return (
            <motion.div
              key="confirm-filter-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-50 flex items-center justify-center px-4"
              style={{ background: 'rgba(15,10,40,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setConfirmFilter(null)}
            >
              <motion.div
                key="confirm-filter-card"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="w-full rounded-3xl p-5 flex flex-col gap-3"
                style={{
                  background: mode === 'equip'
                    ? 'linear-gradient(160deg, #eff6ff 0%, #dbeafe 100%)'
                    : 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: mode === 'equip'
                    ? '1.5px solid rgba(147,197,253,0.7)'
                    : '1.5px solid rgba(186,230,253,0.7)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'rgba(255,255,255,0.7)' }}>
                    {f.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black tracking-tight text-[1rem]" style={{ background: 'linear-gradient(135deg, #0284c7, #1d4ed8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {mode === 'equip' ? `Equip ${f.name}?` : f.name}
                    </h4>
                    <p className="text-sky-500/70 text-[10px] font-semibold">{f.description}</p>
                  </div>
                  <motion.button
                    onClick={() => setConfirmFilter(null)}
                    className="rounded-full p-1.5 flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(203,213,225,0.5)' }}
                    whileTap={{ scale: 0.85 }}
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" strokeWidth={2.5} />
                  </motion.button>
                </div>

                <p className="text-slate-600 text-[12px] leading-relaxed">
                  {FILTER_DETAIL[f.id]}
                </p>

                {mode === 'buy' && (
                  <div className="rounded-2xl px-3.5 py-2.5 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(186,230,253,0.6)' }}>
                    <span className="text-slate-500 text-[11px] font-medium flex-1">Cost:</span>
                    <div className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl"
                      style={{ background: usesOpals ? 'linear-gradient(135deg,#f472b6,#e11d48)' : 'linear-gradient(135deg,#38bdf8,#2563eb)', color: '#fff' }}>
                      {usesOpals ? <Sparkles className="w-3 h-3" /> : <Coins className="w-3 h-3" />}
                      <span>{cost}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium">one-time</span>
                  </div>
                )}

                {mode === 'buy' && !canAffordIt && (
                  <p className="text-red-400 text-[11px] font-semibold text-center">Not enough {usesOpals ? 'opals' : 'coins'}!</p>
                )}

                {mode === 'equip' && (
                  <div className="rounded-2xl px-3.5 py-2.5 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(147,197,253,0.5)' }}>
                    <span className="text-[11px] text-slate-500 font-medium">Already in your collection — no extra cost!</span>
                  </div>
                )}

                <div className="flex gap-2 mt-1">
                  <motion.button
                    onClick={() => setConfirmFilter(null)}
                    whileTap={{ scale: 0.96 }}
                    className="flex-1 py-2.5 rounded-2xl font-bold text-slate-500 text-sm"
                    style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(203,213,225,0.5)' }}
                  >
                    Cancel
                  </motion.button>
                  {mode === 'buy' ? (
                    <motion.button
                      onClick={() => {
                        if (!canAffordIt) return;
                        onBuyFilter?.(f);
                        setConfirmFilter(null);
                      }}
                      disabled={!canAffordIt}
                      whileTap={canAffordIt ? { scale: 0.96 } : {}}
                      className="flex-1 py-2.5 rounded-2xl font-black text-white text-sm disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg,#38bdf8,#2563eb)', boxShadow: canAffordIt ? '0 4px 15px rgba(56,189,248,0.4)' : 'none' }}
                    >
                      Buy &amp; Equip
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={() => {
                        onEquipFilter?.(f.id);
                        setConfirmFilter(null);
                      }}
                      whileTap={{ scale: 0.96 }}
                      className="flex-1 py-2.5 rounded-2xl font-black text-white text-sm"
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', boxShadow: '0 4px 15px rgba(59,130,246,0.4)' }}
                    >
                      Equip
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Info modal ── */}
      <AnimatePresence>
        {infoModal && (() => {
          const INFO = {
            shrimp: {
              iconNode: <span className="text-pink-400 font-bold text-xl">~</span>,
              title: 'Ghost Shrimp',
              color: 'linear-gradient(135deg, #db2777, #be123c)',
              bg: 'linear-gradient(160deg, #fff1f2 0%, #fce7f3 100%)',
              border: 'rgba(251,207,232,0.7)',
              body: (
                <div className="space-y-2.5">
                  <p className="text-slate-700 text-[13px] font-bold leading-snug">
                    Going somewhere? Fill the tank before you leave!
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base leading-none mt-0.5">🍽️</span>
                      <p className="text-slate-600 text-[12px] leading-relaxed">
                        <span className="font-bold text-slate-700">Your axolotl eats them.</span> Shrimp count as food, so hunger drops way slower while you're away.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-base leading-none mt-0.5">✨</span>
                      <p className="text-slate-600 text-[12px] leading-relaxed">
                        <span className="font-bold text-slate-700">They clean the tank.</span> Shrimp eat leftover food and algae, so your Cleanliness stat stays up longer.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-base leading-none mt-0.5">⏳</span>
                      <p className="text-slate-600 text-[12px] leading-relaxed">
                        <span className="font-bold text-slate-700">More shrimp = more time.</span> A bigger colony lasts longer. Load up before a long trip!
                      </p>
                    </div>
                  </div>
                </div>
              ),
              tip: 'They get eaten over time — restock from the shop when you get back.',
            },
            filters: {
              iconNode: <Settings size={20} />,
              title: 'Filters',
              color: 'linear-gradient(135deg, #0284c7, #1d4ed8)',
              bg: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: 'rgba(186,230,253,0.7)',
              body: 'Filters cycle water through a purification system, slowing the rate at which your Water Quality stat decays. Higher-tier filters keep the water cleaner for longer, so you can go more time between water changes.',
              tip: 'Upgrade your filter to spend less time on maintenance!',
            },
            treatments: {
              iconNode: <Droplets size={20} />,
              title: 'Treatments',
              color: 'linear-gradient(135deg, #059669, #0f766e)',
              bg: 'linear-gradient(160deg, #f0fdf4 0%, #ccfbf1 100%)',
              border: 'rgba(167,243,208,0.7)',
              body: 'Treatments are one-time-use boosts that instantly restore your Water Quality stat. Use a Water Treatment for a solid top-up, or break out the Miracle Treatment when things have gotten seriously murky and you need a full reset.',
              tip: 'Keep a Miracle Treatment in reserve for emergencies!',
            },
          }[infoModal];

          return (
            <motion.div
              key="info-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-50 flex items-center justify-center px-4"
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'rgba(255,255,255,0.7)' }}>
                    {INFO.iconNode}
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

                <div className="text-slate-600 text-[12px] leading-relaxed">
                  {INFO.body}
                </div>

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

      {/* ── Treatment: Use Now or Store sheet ── */}
      <AnimatePresence>
        {pendingTreatment && (
          <motion.div
            key="treatment-choice-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-50 flex items-end justify-center pb-6 px-4"
            style={{ background: 'rgba(15,10,40,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={() => setPendingTreatment(null)}
          >
            <motion.div
              key="treatment-choice-card"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full rounded-3xl p-5 flex flex-col gap-3"
              style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #ccfbf1 100%)', border: '1.5px solid rgba(167,243,208,0.7)', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm" style={{ background: 'rgba(255,255,255,0.7)' }}>
                  {pendingTreatment.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black tracking-tight text-[1rem]" style={{ background: 'linear-gradient(135deg, #059669, #0f766e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {pendingTreatment.name}
                  </h4>
                  <p className="text-teal-600/70 text-[10px] font-semibold">{pendingTreatment.description}</p>
                </div>
                <motion.button
                  onClick={() => setPendingTreatment(null)}
                  className="rounded-full p-1.5 flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(203,213,225,0.5)' }}
                  whileTap={{ scale: 0.85 }}
                >
                  <X className="w-3.5 h-3.5 text-slate-400" strokeWidth={2.5} />
                </motion.button>
              </div>
              <p className="text-slate-600 text-[12px] leading-relaxed">
                Use it now to boost your axolotl's stats, or save it in your Inventory to use whenever you're ready.
              </p>
              <div className="flex gap-2 mt-1">
                <motion.button
                  onClick={() => {
                    onBuyTreatment?.(pendingTreatment);
                    setPendingTreatment(null);
                  }}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 py-2.5 rounded-2xl font-black text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #34d399, #0d9488)', boxShadow: '0 4px 15px rgba(52,211,153,0.4)' }}
                >
                  Use Now
                </motion.button>
                <motion.button
                  onClick={() => {
                    onStoreTreatment?.(pendingTreatment);
                    setPendingTreatment(null);
                  }}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 py-2.5 rounded-2xl font-black text-sm"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(167,243,208,0.6)', color: '#0d9488' }}
                >
                  Store in Inventory
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Shrimp: Add to Aquarium or Store sheet ── */}
      <AnimatePresence>
        {pendingShrimpPack && (
          <motion.div
            key="shrimp-choice-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-50 flex items-end justify-center pb-6 px-4"
            style={{ background: 'rgba(15,10,40,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={() => setPendingShrimpPack(null)}
          >
            <motion.div
              key="shrimp-choice-card"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full rounded-3xl p-5 flex flex-col gap-3"
              style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #fce7f3 100%)', border: '1.5px solid rgba(251,207,232,0.7)', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'rgba(255,255,255,0.7)' }}>
                  <span className="text-pink-400 font-bold text-xl">~</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black tracking-tight text-[1rem]" style={{ background: 'linear-gradient(135deg, #db2777, #be123c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {pendingShrimpPack.label}
                  </h4>
                  <p className="text-pink-500/70 text-[10px] font-semibold">{pendingShrimpPack.count} ghost shrimp</p>
                </div>
                <motion.button
                  onClick={() => setPendingShrimpPack(null)}
                  className="rounded-full p-1.5 flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(203,213,225,0.5)' }}
                  whileTap={{ scale: 0.85 }}
                >
                  <X className="w-3.5 h-3.5 text-slate-400" strokeWidth={2.5} />
                </motion.button>
              </div>
              <p className="text-slate-600 text-[12px] leading-relaxed">
                Add them to your aquarium now to start cleaning right away, or store them in your Inventory to deploy later.
              </p>
              <div className="flex gap-2 mt-1">
                <motion.button
                  onClick={() => {
                    onBuyShrimp?.(pendingShrimpPack);
                    setPendingShrimpPack(null);
                  }}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 py-2.5 rounded-2xl font-black text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #f472b6, #e11d48)', boxShadow: '0 4px 15px rgba(244,114,182,0.4)' }}
                >
                  Add to Aquarium
                </motion.button>
                <motion.button
                  onClick={() => {
                    onStoreShrimpInInventory?.(pendingShrimpPack);
                    setPendingShrimpPack(null);
                  }}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 py-2.5 rounded-2xl font-black text-sm"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(251,207,232,0.6)', color: '#be123c' }}
                >
                  Store in Inventory
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
