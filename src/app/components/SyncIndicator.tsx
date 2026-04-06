import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, CloudOff, Loader2, Check, WifiOff } from 'lucide-react';
import type { SyncStatus } from '../hooks/useCloudSync';

interface SyncIndicatorProps {
  status: SyncStatus;
}

/**
 * Tiny HUD indicator showing cloud-sync state.
 * - 'synced'  → green checkmark, auto-hides after 2 s
 * - 'syncing' → spinning loader
 * - 'error'   → red cloud-off, stays visible until status changes
 * - 'offline' → amber wifi-off, stays visible until back online
 * - 'idle' / 'guest' → hidden
 */
export function SyncIndicator({ status }: SyncIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only surface problems to the player — hide all success/progress states.
    if (status === 'error' || status === 'offline') {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [status]);

  const config: Record<
    SyncStatus,
    { icon: React.ElementType; color: string; label: string; spin?: boolean }
  > = {
    idle:    { icon: Cloud,    color: 'text-white/40',  label: '' },
    guest:   { icon: Cloud,    color: 'text-white/40',  label: 'Guest' },
    syncing: { icon: Loader2,  color: 'text-sky-300',   label: 'Saving…', spin: true },
    synced:  { icon: Check,    color: 'text-green-400', label: 'Saved' },
    error:   { icon: CloudOff, color: 'text-red-400',   label: 'Sync error' },
    offline: { icon: WifiOff,  color: 'text-amber-400', label: 'Offline' },
  };

  const { icon: Icon, color, label, spin } = config[status];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-1 pointer-events-none"
        >
          <Icon
            className={`${color} ${spin ? 'animate-spin' : ''}`}
            style={{ width: 12, height: 12 }}
            strokeWidth={2.5}
          />
          {label && (
            <span className={`${color} font-medium`} style={{ fontSize: 10 }}>
              {label}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
