import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Leaf, Mountain, Shell, Waves, Settings, Wrench, Sparkles, Droplets, FlaskConical } from 'lucide-react';
import { DECORATIONS, getDecorationById } from '../data/decorations';
import { GameIcon, CoinIcon } from './icons';

const DECO_CATEGORIES = [
  { type: 'plant',      label: 'Plants',      icon: <Leaf size={14} />,     color: 'rgba(134,239,172,0.2)',  border: 'rgba(74,222,128,0.35)'  },
  { type: 'rock',       label: 'Rocks',        icon: <Mountain size={14} />, color: 'rgba(203,213,225,0.25)', border: 'rgba(148,163,184,0.35)' },
  { type: 'ornament',   label: 'Ornaments',    icon: <Shell size={14} />,    color: 'rgba(253,186,116,0.2)',  border: 'rgba(251,146,60,0.3)'   },
  { type: 'background', label: 'Backgrounds',  icon: <Waves size={14} />,    color: 'rgba(147,210,255,0.2)',  border: 'rgba(56,189,248,0.3)'   },
];

const FILTER_DEFS = [
  { id: 'filter-basic',    name: 'Basic Filter',   icon: <Settings size={18} />,  description: 'Slow but steady filtration' },
  { id: 'filter-advanced', name: 'Advanced Filter', icon: <Wrench size={18} />,    description: 'Faster, cleaner water' },
  { id: 'filter-premium',  name: 'Premium Filter',  icon: <Sparkles size={18} />,  description: 'Crystal-clear perfection' },
];

const TREATMENT_DEFS = [
  { id: 'treatment-water',   name: 'Water Treatment',  icon: <Droplets size={18} />,     description: 'Restores water quality +30' },
  { id: 'treatment-miracle', name: 'Miracle Treatment', icon: <FlaskConical size={18} />, description: 'Fully restores all stats' },
];

type InventoryTab = 'decorations' | 'wellbeing';

interface PendingTreatmentUse {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  count: number;
}

interface Props {
  owned: string[];
  equippedDecos: string[];
  coins: number;
  activeBackground: string;
  ownedFilters: string[];
  equippedFilter?: string;
  storedTreatments?: Record<string, number>;
  storedShrimp?: number;
  onEquipFilter?: (id: string) => void;
  onUseTreatmentFromInventory?: (treatmentId: string) => void;
  onDeployShrimpFromInventory?: (count: number) => void;
  onClose: () => void;
  onEquip: (id: string) => void;
}

export function DecorationsPanel({
  owned,
  equippedDecos,
  coins,
  activeBackground,
  ownedFilters,
  equippedFilter,
  storedTreatments = {},
  storedShrimp = 0,
  onEquipFilter,
  onUseTreatmentFromInventory,
  onDeployShrimpFromInventory,
  onClose,
  onEquip,
}: Props) {
  const [activeTab, setActiveTab] = useState<InventoryTab>('decorations');
  const [pendingTreatmentUse, setPendingTreatmentUse] = useState<PendingTreatmentUse | null>(null);
  const [showShrimpSheet, setShowShrimpSheet] = useState(false);
  const [deployCount, setDeployCount] = useState(10);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => Object.fromEntries([...DECO_CATEGORIES.map(c => [c.type, true]), ['filters', true], ['treatments', true], ['shrimp', true]])
  );

  const toggleCategory = (type: string) =>
    setOpenCategories(prev => ({ ...prev, [type]: !prev[type] }));

  const ownedDecos = DECORATIONS.filter(d => owned.includes(d.id));
  const ownedFilterDefs = FILTER_DEFS.filter(f => ownedFilters.includes(f.id));
  const storedTreatmentEntries = TREATMENT_DEFS.filter(t => (storedTreatments[t.id] ?? 0) > 0);
  const decoGroups = DECO_CATEGORIES.map(cat => ({
    ...cat,
    items: ownedDecos.filter(d => d.type === cat.type),
  })).filter(g => g.items.length > 0);

  const hasWellbeingItems = ownedFilterDefs.length > 0 || storedTreatmentEntries.length > 0 || storedShrimp > 0;
  const hasDecoItems = decoGroups.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 flex flex-col rounded-3xl overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #e0fdf4 0%, #ede9fe 48%, #fce7f3 100%)' }}
    >
      {/* Panel header */}
      <div className="flex items-center px-4 pt-5 pb-3 flex-shrink-0 gap-3">
        <motion.button
          onClick={onClose}
          className="rounded-full p-1.5 border border-teal-200/60 bg-white/50 active:bg-white/80 flex-shrink-0"
          whileTap={{ scale: 0.85 }}
        >
          <ChevronDown className="w-4 h-4 text-teal-500 rotate-90" strokeWidth={2.5} />
        </motion.button>
        <div className="flex-1 min-w-0">
          <h3
            className="font-black tracking-tight"
            style={{
              fontSize: '1.25rem',
              lineHeight: 1,
              background: 'linear-gradient(110deg, #0d9488 0%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Inventory
          </h3>
          <p className="text-[10px] text-teal-600/70 font-medium mt-0.5">
            {ownedDecos.length} decorations · {ownedFilterDefs.length} filter{ownedFilterDefs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(253,230,138,0.6)' }}
        >
          <CoinIcon size={14} className="text-amber-500" />
          <span className="text-amber-800 text-[10px] font-black tabular-nums">{coins}</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex mx-4 mb-2 rounded-2xl p-1 flex-shrink-0 gap-1" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(20,184,166,0.2)' }}>
        {([
          { id: 'decorations' as const, label: 'Decorations' },
          { id: 'wellbeing' as const, label: 'Wellbeing' },
        ]).map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 rounded-xl text-[11px] font-black tracking-wide uppercase relative overflow-hidden"
            whileTap={{ scale: 0.96 }}
          >
            <AnimatePresence>
              {activeTab === tab.id && (
                <motion.div
                  key="tab-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: tab.id === 'decorations'
                      ? 'linear-gradient(135deg, #34d399, #0d9488)'
                      : 'linear-gradient(135deg, #38bdf8, #2563eb)',
                    boxShadow: tab.id === 'decorations'
                      ? '0 2px 8px rgba(52,211,153,0.3)'
                      : '0 2px 8px rgba(56,189,248,0.3)',
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.18 }}
                />
              )}
            </AnimatePresence>
            <span
              className="relative z-10"
              style={{ color: activeTab === tab.id ? '#fff' : 'rgba(15,118,110,0.6)' }}
            >
              {tab.label}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="h-px mx-4 flex-shrink-0 mb-2" style={{ background: 'linear-gradient(90deg,transparent,rgba(20,184,166,0.3),transparent)' }} />

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-4"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'none' }}
      >
        <AnimatePresence mode="wait">

          {/* ── DECORATIONS TAB ── */}
          {activeTab === 'decorations' && (
            <motion.div
              key="decos"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="space-y-2 pt-2"
            >
              {!hasDecoItems ? (
                <div className="flex flex-col items-center justify-center gap-4 opacity-60 py-16">
                  <Leaf size={48} className="text-teal-400" />
                  <div className="text-center">
                    <p className="text-slate-600 font-bold text-sm">No decorations owned yet</p>
                    <p className="text-slate-400 text-[11px] mt-1">Buy them from the Shop → Decorations tab!</p>
                  </div>
                </div>
              ) : decoGroups.map((group, gi) => (
                <div key={group.type} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(20,184,166,0.12)' }}>
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2.5 active:bg-teal-50/40"
                    onClick={() => toggleCategory(group.type)}
                  >
                    {group.icon}
                    <span className="flex-1 text-left text-[11px] font-black tracking-widest uppercase" style={{ color: 'rgba(15,118,110,0.75)' }}>
                      {group.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mr-1">({group.items.length})</span>
                    <motion.div animate={{ rotate: openCategories[group.type] ? 180 : 0 }} transition={{ duration: 0.22 }}>
                      <ChevronDown className="w-3.5 h-3.5 text-teal-400" strokeWidth={2.5} />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {openCategories[group.type] && (
                      <motion.div
                        key={`owned-${group.type}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                          {group.items.map((item, i) => {
                            const ownedCount = owned.filter(id => id === item.id).length;
                            const placedCount = equippedDecos.filter(id => id === item.id).length;
                            const isBackground = item.type === 'background';
                            const isBgActive = isBackground && activeBackground === item.id;
                            const totalPlaced = equippedDecos.filter(id => {
                              const d = getDecorationById(id);
                              return d && d.type !== 'background';
                            }).length;
                            const canPlace = !isBackground && placedCount < ownedCount && totalPlaced < 5;
                            const hasAnyInTank = !isBackground && placedCount > 0;
                            return (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.88 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: gi * 0.04 + i * 0.04 }}
                                className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl overflow-hidden"
                                style={{
                                  background: hasAnyInTank || isBgActive ? 'linear-gradient(135deg, rgba(167,243,208,0.6), rgba(110,231,183,0.45))' : 'rgba(255,255,255,0.65)',
                                  border: hasAnyInTank || isBgActive ? '1.5px solid rgba(52,211,153,0.5)' : `1.5px solid ${group.border}`,
                                }}
                              >
                                {!isBackground && (
                                  <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-0.5">
                                    {ownedCount > 1 && (
                                      <div className="text-[6px] font-black text-white px-1 py-0.5 rounded-full" style={{ background: 'rgba(100,116,139,0.75)' }}>×{ownedCount}</div>
                                    )}
                                    {placedCount > 0 && (
                                      <div className="text-[6px] font-black text-white px-1 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}>{placedCount} on</div>
                                    )}
                                  </div>
                                )}
                                {isBgActive && (
                                  <div className="absolute top-1.5 right-1.5 text-[6px] font-black text-white px-1 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}>ON</div>
                                )}
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: group.color }}>
                                  <GameIcon name={item.icon} size={22} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">{item.name}</span>
                                {isBackground ? (
                                  <motion.button onClick={() => onEquip(item.id)} className="w-full py-1 rounded-xl text-[9px] font-black text-white"
                                    style={{ background: isBgActive ? 'linear-gradient(135deg,#34d399,#10b981)' : 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }} whileTap={{ scale: 0.94 }}>
                                    {isBgActive ? 'Active' : 'Use'}
                                  </motion.button>
                                ) : (
                                  <motion.button
                                    onClick={() => canPlace && onEquip(item.id)}
                                    className="w-full py-1 rounded-xl text-[9px] font-black"
                                    style={{
                                      background: canPlace ? 'linear-gradient(135deg,#38bdf8,#0ea5e9)' : 'rgba(203,213,225,0.5)',
                                      color: canPlace ? '#fff' : '#94a3b8',
                                      cursor: canPlace ? 'pointer' : 'default',
                                      boxShadow: canPlace ? '0 2px 6px rgba(14,165,233,0.3)' : 'none',
                                    }}
                                    whileTap={canPlace ? { scale: 0.94 } : {}}
                                  >
                                    {canPlace ? 'Place' : totalPlaced >= 5 ? 'Tank full' : 'All placed'}
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
              ))}
            </motion.div>
          )}

          {/* ── WELLBEING TAB ── */}
          {activeTab === 'wellbeing' && (
            <motion.div
              key="wellbeing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="space-y-2 pt-2"
            >
              {!hasWellbeingItems ? (
                <div className="flex flex-col items-center justify-center gap-4 opacity-60 py-16">
                  <Droplets size={48} className="text-sky-400" />
                  <div className="text-center">
                    <p className="text-slate-600 font-bold text-sm">No wellbeing items yet</p>
                    <p className="text-slate-400 text-[11px] mt-1">Buy filters, shrimp & treatments from the Shop!</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Filters */}
                  {ownedFilterDefs.length > 0 && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(56,189,248,0.18)' }}>
                      <button className="flex items-center gap-2 w-full px-3 py-2.5 active:bg-sky-50/40" onClick={() => toggleCategory('filters')}>
                        <Settings size={14} />
                        <span className="flex-1 text-left text-[11px] font-black tracking-widest uppercase" style={{ color: 'rgba(14,116,144,0.8)' }}>Filters</span>
                        <span className="text-[10px] text-slate-400 font-medium mr-1">({ownedFilterDefs.length})</span>
                        <motion.div animate={{ rotate: openCategories['filters'] ? 180 : 0 }} transition={{ duration: 0.22 }}>
                          <ChevronDown className="w-3.5 h-3.5 text-sky-400" strokeWidth={2.5} />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openCategories['filters'] && (
                          <motion.div key="filters-content" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                            <div className="px-3 pb-3 space-y-1.5">
                              {ownedFilterDefs.map(f => {
                                const isEquipped = equippedFilter === f.id;
                                return (
                                  <div key={f.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                                    style={{ background: isEquipped ? 'linear-gradient(135deg, rgba(220,252,231,0.9), rgba(187,247,208,0.85))' : 'linear-gradient(135deg, rgba(240,249,255,0.9), rgba(224,242,254,0.85))', border: isEquipped ? '1.5px solid rgba(134,239,172,0.7)' : '1.5px solid rgba(186,230,253,0.6)' }}>
                                    <span className="flex-shrink-0">{f.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[12px] font-bold text-slate-700">{f.name}</p>
                                      <p className="text-[10px] text-slate-400 font-medium">{f.description}</p>
                                    </div>
                                    {isEquipped ? (
                                      <div className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4ade80, #16a34a)', color: '#fff', boxShadow: '0 2px 6px rgba(74,222,128,0.35)' }}>
                                        Equipped
                                      </div>
                                    ) : (
                                      <motion.button onClick={() => onEquipFilter?.(f.id)} whileTap={{ scale: 0.94 }}
                                        className="text-[10px] font-black px-2.5 py-1 rounded-xl flex-shrink-0 text-white"
                                        style={{ background: 'linear-gradient(135deg, #38bdf8, #2563eb)', boxShadow: '0 2px 6px rgba(56,189,248,0.3)' }}>
                                        Equip
                                      </motion.button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Stored Shrimp */}
                  {storedShrimp > 0 && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(251,207,232,0.3)' }}>
                      <button className="flex items-center gap-2 w-full px-3 py-2.5 active:bg-pink-50/40" onClick={() => toggleCategory('shrimp')}>
                        <span className="text-base">Shrimp</span>
                        <span className="flex-1 text-left text-[11px] font-black tracking-widest uppercase" style={{ color: 'rgba(157,23,77,0.7)' }}>Stored Shrimp</span>
                        <span className="text-[10px] text-slate-400 font-medium mr-1">({storedShrimp})</span>
                        <motion.div animate={{ rotate: openCategories['shrimp'] ? 180 : 0 }} transition={{ duration: 0.22 }}>
                          <ChevronDown className="w-3.5 h-3.5 text-pink-400" strokeWidth={2.5} />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openCategories['shrimp'] && (
                          <motion.div key="shrimp-content" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                            <div className="px-3 pb-3">
                              <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: 'linear-gradient(135deg, rgba(255,241,242,0.9), rgba(252,231,243,0.85))', border: '1.5px solid rgba(251,207,232,0.6)' }}>
                                <span className="text-2xl text-pink-400">~</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-bold text-slate-700">{storedShrimp} shrimp ready</p>
                                  <p className="text-[10px] text-slate-400 font-medium">Add them to your aquarium to clean</p>
                                </div>
                                <motion.button
                                  onClick={() => { setDeployCount(10); setShowShrimpSheet(true); }}
                                  whileTap={{ scale: 0.94 }}
                                  className="text-[10px] font-black px-2.5 py-1 rounded-xl flex-shrink-0 text-white"
                                  style={{ background: 'linear-gradient(135deg, #f472b6, #e11d48)', boxShadow: '0 2px 6px rgba(244,114,182,0.35)' }}
                                >
                                  Add
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Stored Treatments */}
                  {storedTreatmentEntries.length > 0 && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(167,243,208,0.25)' }}>
                      <button className="flex items-center gap-2 w-full px-3 py-2.5 active:bg-teal-50/40" onClick={() => toggleCategory('treatments')}>
                        <FlaskConical size={14} />
                        <span className="flex-1 text-left text-[11px] font-black tracking-widest uppercase" style={{ color: 'rgba(13,148,136,0.75)' }}>Treatments</span>
                        <span className="text-[10px] text-slate-400 font-medium mr-1">({storedTreatmentEntries.reduce((s, t) => s + (storedTreatments[t.id] ?? 0), 0)})</span>
                        <motion.div animate={{ rotate: openCategories['treatments'] ? 180 : 0 }} transition={{ duration: 0.22 }}>
                          <ChevronDown className="w-3.5 h-3.5 text-teal-400" strokeWidth={2.5} />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openCategories['treatments'] && (
                          <motion.div key="treatments-content" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                            <div className="px-3 pb-3 space-y-1.5">
                              {storedTreatmentEntries.map(t => {
                                const count = storedTreatments[t.id] ?? 0;
                                return (
                                  <div key={t.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: 'linear-gradient(135deg, rgba(240,253,250,0.9), rgba(204,251,241,0.85))', border: '1.5px solid rgba(167,243,208,0.6)' }}>
                                    <span className="flex-shrink-0">{t.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[12px] font-bold text-slate-700">{t.name} <span className="text-teal-500 font-black">×{count}</span></p>
                                      <p className="text-[10px] text-slate-400 font-medium">{t.description}</p>
                                    </div>
                                    <motion.button
                                      onClick={() => setPendingTreatmentUse({ id: t.id, name: t.name, icon: t.icon, description: t.description, count })}
                                      whileTap={{ scale: 0.94 }}
                                      className="text-[10px] font-black px-2.5 py-1 rounded-xl flex-shrink-0 text-white"
                                      style={{ background: 'linear-gradient(135deg, #34d399, #0d9488)', boxShadow: '0 2px 6px rgba(52,211,153,0.35)' }}
                                    >
                                      Use
                                    </motion.button>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        <div style={{ height: '3rem', minHeight: '3rem', flexShrink: 0 }} />
      </div>

      {/* ── Treatment use confirmation sheet ── */}
      <AnimatePresence>
        {pendingTreatmentUse && (
          <motion.div
            key="treatment-confirm"
            className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl px-5 pt-5 pb-7"
            style={{ background: 'linear-gradient(160deg,#f0fdf4,#dcfce7)', borderTop: '1.5px solid rgba(52,211,153,0.3)', boxShadow: '0 -8px 32px rgba(0,0,0,0.12)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col items-center gap-1 mb-4">
              <span className="text-4xl mb-1">{pendingTreatmentUse.icon}</span>
              <p className="text-[14px] font-black text-slate-800 text-center">{pendingTreatmentUse.name}</p>
              <p className="text-[11px] text-slate-500 text-center">{pendingTreatmentUse.description}</p>
              {pendingTreatmentUse.count > 1 && (
                <p className="text-[10px] font-bold text-teal-600 mt-0.5">You have ×{pendingTreatmentUse.count} stored</p>
              )}
            </div>
            <p className="text-[12px] font-bold text-slate-600 text-center mb-4">Use this treatment on your axolotl?</p>
            <div className="flex gap-3">
              <motion.button
                onClick={() => setPendingTreatmentUse(null)}
                whileTap={{ scale: 0.95 }}
                className="flex-1 py-3 rounded-2xl text-[13px] font-black"
                style={{ background: 'rgba(241,245,249,0.9)', color: '#64748b', border: '1.5px solid rgba(203,213,225,0.6)' }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={() => { onUseTreatmentFromInventory?.(pendingTreatmentUse.id); setPendingTreatmentUse(null); }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 py-3 rounded-2xl text-[13px] font-black text-white"
                style={{ background: 'linear-gradient(135deg, #34d399, #0d9488)', boxShadow: '0 4px 14px rgba(52,211,153,0.4)' }}
              >
                Use Now
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Shrimp deploy quantity sheet ── */}
      <AnimatePresence>
        {showShrimpSheet && (() => {
          const maxGroups = Math.floor(storedShrimp / 10);
          const selectedGroups = Math.floor(deployCount / 10);
          return (
            <motion.div
              key="shrimp-deploy"
              className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl px-5 pt-5 pb-7"
              style={{ background: 'linear-gradient(160deg,#fff1f2,#fce7f3)', borderTop: '1.5px solid rgba(244,114,182,0.3)', boxShadow: '0 -8px 32px rgba(0,0,0,0.12)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex flex-col items-center gap-1 mb-4">
                <span className="text-4xl mb-1 text-pink-400">~</span>
                <p className="text-[14px] font-black text-slate-800">Add Shrimp to Aquarium</p>
                <p className="text-[11px] text-slate-500">{storedShrimp} shrimp stored · select in groups of 10</p>
              </div>

              {/* Stepper */}
              <div className="flex items-center justify-center gap-5 mb-5">
                <motion.button
                  onClick={() => setDeployCount(c => Math.max(10, c - 10))}
                  whileTap={{ scale: 0.88 }}
                  disabled={selectedGroups <= 1}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-black"
                  style={{ background: selectedGroups <= 1 ? 'rgba(241,245,249,0.7)' : 'linear-gradient(135deg,#f472b6,#e11d48)', color: selectedGroups <= 1 ? '#cbd5e1' : '#fff', boxShadow: selectedGroups <= 1 ? 'none' : '0 3px 10px rgba(244,114,182,0.35)' }}
                >
                  −
                </motion.button>
                <div className="text-center">
                  <p className="text-[32px] font-black text-slate-800 leading-none tabular-nums">{deployCount}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">shrimp</p>
                </div>
                <motion.button
                  onClick={() => setDeployCount(c => Math.min(maxGroups * 10, c + 10))}
                  whileTap={{ scale: 0.88 }}
                  disabled={selectedGroups >= maxGroups}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-black"
                  style={{ background: selectedGroups >= maxGroups ? 'rgba(241,245,249,0.7)' : 'linear-gradient(135deg,#f472b6,#e11d48)', color: selectedGroups >= maxGroups ? '#cbd5e1' : '#fff', boxShadow: selectedGroups >= maxGroups ? 'none' : '0 3px 10px rgba(244,114,182,0.35)' }}
                >
                  +
                </motion.button>
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowShrimpSheet(false)}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 py-3 rounded-2xl text-[13px] font-black"
                  style={{ background: 'rgba(241,245,249,0.9)', color: '#64748b', border: '1.5px solid rgba(203,213,225,0.6)' }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={() => { onDeployShrimpFromInventory?.(deployCount); setShowShrimpSheet(false); }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 py-3 rounded-2xl text-[13px] font-black text-white"
                  style={{ background: 'linear-gradient(135deg, #f472b6, #e11d48)', boxShadow: '0 4px 14px rgba(244,114,182,0.4)' }}
                >
                  Add {deployCount} Shrimp
                </motion.button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

    </motion.div>
  );
}
