import { motion } from 'motion/react';
import { Cloud, HardDrive, AlertTriangle, Smartphone } from 'lucide-react';
import { GameState } from '../types/game';
import { CoinIcon } from './icons';
import { calculateLevel } from '../utils/gameLogic';

interface SaveCardProps {
  state: GameState;
  label: string;
  icon: React.ElementType;
}

function SaveCard({ state, label, icon: Icon }: SaveCardProps) {
  const axolotl = state.axolotl;
  const level = axolotl ? calculateLevel(axolotl.experience) : 1;

  return (
    <div className="bg-white/10 rounded-2xl p-4 flex-1 border border-white/10">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="w-3.5 h-3.5 text-white/60" strokeWidth={2.5} />
        <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>

      {axolotl ? (
        <div className="space-y-1">
          <div className="text-white font-bold text-base leading-tight">{axolotl.name}</div>
          <div className="text-sky-300 text-sm font-semibold">Lv. {level}</div>
          <div className="text-white/60 text-xs">Gen {axolotl.generation} · {axolotl.rarity}</div>
          <div className="text-white/50 text-xs capitalize">{axolotl.stage}</div>
          <div className="text-amber-300 text-xs pt-1 flex items-center gap-1"><CoinIcon size={11} /> {(state.coins ?? 0).toLocaleString()}</div>
        </div>
      ) : (
        <div className="text-white/30 text-sm italic">No axolotl yet</div>
      )}
    </div>
  );
}

interface SyncConflictModalProps {
  localState: GameState;
  cloudState: GameState;
  onKeepLocal: () => void;
  onUseCloud: () => void;
}

/**
 * Shown when a cloud pull finds that both the local save and the cloud save
 * have meaningful progress — lets the player choose which one to keep.
 *
 * z-[10002] puts it above LevelUpOverlay (z-[10000]) and JuvenileUnlockModal (z-[10001]).
 */
export function SyncConflictModal({
  localState,
  cloudState,
  onKeepLocal,
  onUseCloud,
}: SyncConflictModalProps) {
  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        className="w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="flex justify-center mb-2"><Cloud className="w-10 h-10 text-sky-300" /></div>
          <h2 className="text-white font-bold text-lg">Two Saves Found</h2>
          <p className="text-white/50 text-sm mt-1 leading-snug">
            Your cloud save is newer than what's on this device. Which save do you want to keep?
          </p>
        </div>

        {/* Save comparison */}
        <div className="flex gap-2 px-4 pb-5">
          <SaveCard state={localState} label="This Device" icon={HardDrive} />
          <SaveCard state={cloudState} label="Cloud" icon={Cloud} />
        </div>

        {/* Warning */}
        <div className="mx-4 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          <p className="text-red-300 text-xs text-center leading-snug">
            <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" /> The save you don't pick will be permanently overwritten.</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-4 pb-6">
          <button
            onClick={onUseCloud}
            className="w-full py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm transition-colors active:scale-95"
          >
            <span className="inline-flex items-center gap-1.5 justify-center"><Cloud className="w-4 h-4" /> Use Cloud Save</span>
          </button>
          <button
            onClick={onKeepLocal}
            className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition-colors active:scale-95"
          >
            <span className="inline-flex items-center gap-1.5 justify-center"><Smartphone className="w-4 h-4" /> Keep This Device's Save</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
