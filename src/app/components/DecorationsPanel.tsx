import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Coins } from 'lucide-react';
import { DECORATIONS } from '../data/decorations';

const DECO_CATEGORIES = [
  { type: 'plant',      label: 'Plants',      emoji: '🌿', color: 'rgba(134,239,172,0.2)',  border: 'rgba(74,222,128,0.35)'  },
  { type: 'rock',       label: 'Rocks',        emoji: '🪨', color: 'rgba(203,213,225,0.25)', border: 'rgba(148,163,184,0.35)' },
  { type: 'ornament',   label: 'Ornaments',    emoji: '🐚', color: 'rgba(253,186,116,0.2)',  border: 'rgba(251,146,60,0.3)'   },
  { type: 'background', label: 'Backgrounds',  emoji: '🌊', color: 'rgba(147,210,255,0.2)',  border: 'rgba(56,189,248,0.3)'   },
];

interface Props {
  owned: string[];
  equippedDecos: string[];
  coins: number;
  activeBackground: string;
  decorationsTab: 'store' | 'owned';
  setDecorationsTab: (tab: 'store' | 'owned') => void;
  onClose: () => void;
  onPurchase: (id: string) => void;
  onEquip: (id: string) => void;
}

export function DecorationsPanel({
  owned,
  equippedDecos,
  coins,
  activeBackground,
  decorationsTab,
  setDecorationsTab,
  onClose,
  onPurchase,
  onEquip,
}: Props) {
  // Track which categories are open — default all open
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => Object.fromEntries(DECO_CATEGORIES.map(c => [c.type, true]))
  );

  const toggleCategory = (type: string) =>
    setOpenCategories(prev => ({ ...prev, [type]: !prev[type] }));

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
            Decorations
          </h3>
          <p className="text-[10px] text-teal-600/70 font-medium mt-0.5">
            {owned.length} owned · {equippedDecos.length} equipped
          </p>
        </div>
        {/* Coin balance pill */}
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(253,230,138,0.6)' }}
        >
          <Coins className="w-3 h-3 text-amber-500" />
          <span className="text-amber-800 text-[10px] font-black tabular-nums">{coins}</span>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex mx-4 mb-3 rounded-2xl p-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(20,184,166,0.2)' }}>
        {(['store', 'owned'] as const).map(tab => (
          <motion.button
            key={tab}
            onClick={() => setDecorationsTab(tab)}
            className="flex-1 py-1.5 rounded-xl text-[11px] font-black tracking-wide uppercase transition-all"
            style={{
              background: decorationsTab === tab ? 'linear-gradient(135deg, #14b8a6, #7c3aed)' : 'transparent',
              color: decorationsTab === tab ? '#fff' : 'rgba(15,118,110,0.6)',
              boxShadow: decorationsTab === tab ? '0 2px 8px rgba(20,184,166,0.3)' : 'none',
            }}
            whileTap={{ scale: 0.96 }}
          >
            {tab === 'store' ? '🛒 Store' : `🎒 Owned (${owned.length})`}
          </motion.button>
        ))}
      </div>

      <div className="h-px mx-4 flex-shrink-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(20,184,166,0.3),transparent)' }} />

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 space-y-2"
        style={{ 
          WebkitOverflowScrolling: 'touch', 
          touchAction: 'pan-y',
          overscrollBehaviorY: 'none',
        }}
      >
        {decorationsTab === 'store' ? (
          /* ── STORE TAB ── */
          DECO_CATEGORIES.map((cat, ci) => {
            const items = DECORATIONS.filter(d => d.type === cat.type);
            const isOpen = openCategories[cat.type];
            return (
              <div key={cat.type} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(20,184,166,0.12)' }}>
                {/* Collapsible header */}
                <button
                  className="flex items-center gap-2 w-full px-3 py-2.5 active:bg-teal-50/40"
                  onClick={() => toggleCategory(cat.type)}
                >
                  <span className="text-base">{cat.emoji}</span>
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
                          const isOwned = owned.includes(item.id);
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
                                  ? 'linear-gradient(135deg, rgba(167,243,208,0.6) 0%, rgba(110,231,183,0.45) 100%)'
                                  : 'rgba(255,255,255,0.65)',
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
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                                style={{ background: cat.color }}
                              >
                                {item.emoji}
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">{item.name}</span>
                              {/* Action button */}
                              {isOwned ? (
                                item.type === 'background' ? (
                                  <motion.button
                                    onClick={() => onEquip(item.id)}
                                    className="w-full py-1 rounded-xl text-[9px] font-black text-white"
                                    style={{
                                      background: isEquipped
                                        ? 'linear-gradient(135deg,#34d399,#10b981)'
                                        : 'linear-gradient(135deg,#38bdf8,#0ea5e9)',
                                      boxShadow: isEquipped
                                        ? '0 2px 6px rgba(52,211,153,0.35)'
                                        : '0 2px 6px rgba(14,165,233,0.3)',
                                    }}
                                    whileTap={{ scale: 0.94 }}
                                  >
                                    {isEquipped ? '✓ Active' : 'Use'}
                                  </motion.button>
                                ) : isEquipped ? (
                                  <motion.button
                                    onClick={() => onEquip(item.id)}
                                    className="w-full py-1 rounded-xl text-[9px] font-black"
                                    style={{ background: 'rgba(239,246,255,0.8)', color: '#64748b', border: '1px solid rgba(203,213,225,0.5)' }}
                                    whileTap={{ scale: 0.94 }}
                                  >
                                    Remove
                                  </motion.button>
                                ) : (
                                  <motion.button
                                    onClick={() => onEquip(item.id)}
                                    className="w-full py-1 rounded-xl text-[9px] font-black text-white"
                                    style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', boxShadow: '0 2px 6px rgba(14,165,233,0.3)' }}
                                    whileTap={{ scale: 0.94 }}
                                  >
                                    Equip
                                  </motion.button>
                                )
                              ) : (
                                <motion.button
                                  onClick={() => onPurchase(item.id)}
                                  disabled={!canBuy}
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
          })
        ) : (
          /* ── OWNED TAB ── */
          (() => {
            const allOwned = DECORATIONS.filter(d => owned.includes(d.id));
            const groups = DECO_CATEGORIES.map(cat => ({
              ...cat,
              items: allOwned.filter(d => d.type === cat.type),
            })).filter(g => g.items.length > 0);

            if (groups.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-60 py-16">
                  <span className="text-5xl">🪸</span>
                  <div className="text-center">
                    <p className="text-slate-600 font-bold text-sm">Nothing owned yet</p>
                    <p className="text-slate-400 text-[11px] mt-1">Head to the Store tab to buy decorations!</p>
                  </div>
                </div>
              );
            }

            return groups.map((group, gi) => (
              <div key={group.type} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(20,184,166,0.12)' }}>
                {/* Collapsible header */}
                <button
                  className="flex items-center gap-2 w-full px-3 py-2.5 active:bg-teal-50/40"
                  onClick={() => toggleCategory(group.type)}
                >
                  <span className="text-base">{group.emoji}</span>
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
                          const isEquipped = equippedDecos.includes(item.id) || (item.type === 'background' && activeBackground === item.id);
                          return (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.88 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: gi * 0.04 + i * 0.04 }}
                              className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl overflow-hidden"
                              style={{
                                background: isEquipped
                                  ? 'linear-gradient(135deg, rgba(167,243,208,0.6) 0%, rgba(110,231,183,0.45) 100%)'
                                  : 'rgba(255,255,255,0.65)',
                                border: isEquipped
                                  ? '1.5px solid rgba(52,211,153,0.5)'
                                  : `1.5px solid ${group.border}`,
                              }}
                            >
                              {isEquipped && (
                                <div
                                  className="absolute top-1.5 right-1.5 text-[6px] font-black text-white px-1 py-0.5 rounded-full"
                                  style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}
                                >ON</div>
                              )}
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                                style={{ background: group.color }}
                              >
                                {item.emoji}
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">{item.name}</span>
                              {item.type === 'background' ? (
                                <motion.button
                                  onClick={() => onEquip(item.id)}
                                  className="w-full py-1 rounded-xl text-[9px] font-black text-white"
                                  style={{
                                    background: isEquipped
                                      ? 'linear-gradient(135deg,#34d399,#10b981)'
                                      : 'linear-gradient(135deg,#38bdf8,#0ea5e9)',
                                  }}
                                  whileTap={{ scale: 0.94 }}
                                >
                                  {isEquipped ? '✓ Active' : 'Use'}
                                </motion.button>
                              ) : isEquipped ? (
                                <motion.button
                                  onClick={() => onEquip(item.id)}
                                  className="w-full py-1 rounded-xl text-[9px] font-black"
                                  style={{ background: 'rgba(239,246,255,0.8)', color: '#64748b', border: '1px solid rgba(203,213,225,0.5)' }}
                                  whileTap={{ scale: 0.94 }}
                                >
                                  Remove
                                </motion.button>
                              ) : (
                                <motion.button
                                  onClick={() => onEquip(item.id)}
                                  className="w-full py-1 rounded-xl text-[9px] font-black text-white"
                                  style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', boxShadow: '0 2px 6px rgba(14,165,233,0.3)' }}
                                  whileTap={{ scale: 0.94 }}
                                >
                                  Equip
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
            ));
          })()
        )}
        {/* Bottom spacer to prevent scroll bounce */}
        <div style={{ height: '3rem', minHeight: '3rem', flexShrink: 0 }} />
      </div>
    </motion.div>
  );
}
