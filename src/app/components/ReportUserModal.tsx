import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flag, ShieldOff, Check, Loader2, AlertTriangle } from 'lucide-react';
import { submitReport, blockUser, type ReportReason, type ReportContext } from '../services/supabase';
import { track, ModerationEvents } from '../utils/telemetry';

interface ReportUserModalProps {
  /** The player being reported. */
  reportedUserId: string;
  /** Display name shown in the confirmation copy (no need to be exact — this is just UX). */
  reportedDisplayName: string;
  /** Where in the app this report was triggered, for moderation triage. */
  context?: ReportContext;
  /** Optional metadata captured at report time (e.g. axolotl_name being reported). */
  contextMetadata?: Record<string, unknown>;
  /** Called when the modal should close (after success, after dismissal, after block-only). */
  onClose: () => void;
  /**
   * Called after a successful block so the host can refresh UI state
   * (e.g. remove the user from the friend list immediately).
   */
  onBlocked?: () => void;
}

const REASONS: { id: ReportReason; label: string; description: string }[] = [
  { id: 'inappropriate_name', label: 'Inappropriate name',  description: 'The axolotl or player name is rude, offensive, or unsafe.' },
  { id: 'harassment',         label: 'Harassment / bullying', description: 'This player is being mean, scary, or making me uncomfortable.' },
  { id: 'other',              label: 'Something else',       description: 'A different reason I want to tell the team about.' },
];

type ModalStep = 'pick_reason' | 'submitting' | 'submitted' | 'error';

/**
 * Two-step report flow. Step 1: pick a reason (+ optional notes). Step 2:
 * submit. After success, offer a "Also block this player" affordance — block
 * is a separate, lighter action, not bundled with reporting.
 *
 * Required for App Store Guideline 1.2 compliance whenever user-generated
 * content (axolotl names, friend codes) is visible to other users.
 */
export function ReportUserModal({
  reportedUserId,
  reportedDisplayName,
  context = 'other',
  contextMetadata,
  onClose,
  onBlocked,
}: ReportUserModalProps) {
  const [step, setStep] = useState<ModalStep>('pick_reason');
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blockBusy, setBlockBusy] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setStep('submitting');
    track(ModerationEvents.REPORT_SUBMITTED, { reason: selectedReason, context });
    const result = await submitReport(reportedUserId, selectedReason, context, contextMetadata, notes.trim() || null);
    if (result.ok) {
      setStep('submitted');
    } else {
      track(ModerationEvents.REPORT_FAILED, { reason_code: result.reason });
      setErrorMsg(result.reason === 'duplicate' ? 'You already reported this player recently — our team is reviewing.' : 'Could not send the report. Please try again later.');
      setStep('error');
    }
  };

  const handleBlock = async () => {
    setBlockBusy(true);
    const result = await blockUser(reportedUserId);
    setBlockBusy(false);
    if (result.ok) {
      track(ModerationEvents.USER_BLOCKED, { context });
      onBlocked?.();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl"
        style={{
          background: 'linear-gradient(160deg, #fff7ed 0%, #fef3c7 50%, #fee2e2 100%)',
          border: '1.5px solid rgba(251,191,36,0.4)',
          boxShadow: '0 24px 64px -12px rgba(217,119,6,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-5 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }}
        >
          <Flag className="w-5 h-5 text-white" strokeWidth={2.5} />
          <h2 className="text-white font-black text-lg flex-1">Report a Player</h2>
          <motion.button
            onClick={onClose}
            className="rounded-full p-1.5 bg-white/15 active:bg-white/30"
            whileTap={{ scale: 0.85 }}
          >
            <X className="w-4 h-4 text-white" strokeWidth={2.5} />
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {step === 'pick_reason' && (
            <motion.div
              key="pick"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5"
            >
              <p className="text-amber-900/80 text-[12px] mb-4 leading-snug">
                Reporting <span className="font-bold">{reportedDisplayName}</span> sends a note to our team. We review every report.
              </p>

              <div className="space-y-2 mb-4">
                {REASONS.map(r => (
                  <motion.button
                    key={r.id}
                    onClick={() => setSelectedReason(r.id)}
                    className="w-full text-left rounded-xl px-3.5 py-2.5"
                    style={{
                      background: selectedReason === r.id ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.65)',
                      border: selectedReason === r.id
                        ? '1.5px solid rgba(245,158,11,0.7)'
                        : '1.5px solid rgba(251,191,36,0.3)',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: selectedReason === r.id ? '#f59e0b' : 'rgba(255,255,255,0.8)',
                          border: '1.5px solid rgba(245,158,11,0.5)',
                        }}
                      >
                        {selectedReason === r.id && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-amber-900 font-black text-[13px]">{r.label}</span>
                    </div>
                    <p className="text-amber-800/65 text-[11px] mt-1 ml-6 leading-snug">{r.description}</p>
                  </motion.button>
                ))}
              </div>

              <label className="block text-amber-900/70 text-[10px] font-black tracking-wider uppercase mb-1.5">
                Tell us more (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value.slice(0, 200))}
                placeholder="What happened? (optional, up to 200 characters)"
                maxLength={200}
                rows={3}
                className="w-full rounded-xl px-3 py-2 text-amber-900 text-[12px] placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(251,191,36,0.4)' }}
              />
              <div className="text-right text-[10px] text-amber-700/60 mt-1">{notes.length}/200</div>

              <motion.button
                onClick={handleSubmit}
                disabled={!selectedReason}
                className="w-full mt-3 py-3 rounded-xl font-black text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: selectedReason
                    ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
                    : 'rgba(251,191,36,0.4)',
                  boxShadow: selectedReason ? '0 6px 18px -4px rgba(239,68,68,0.4)' : 'none',
                }}
                whileTap={selectedReason ? { scale: 0.97 } : {}}
              >
                Send Report
              </motion.button>

              <button
                onClick={onClose}
                className="w-full mt-2 py-2 text-amber-700/70 text-[12px] font-bold"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {step === 'submitting' && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center gap-3"
            >
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" strokeWidth={2} />
              <p className="text-amber-900 font-bold text-sm">Sending report…</p>
            </motion.div>
          )}

          {step === 'submitted' && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-5"
            >
              <div className="flex flex-col items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center">
                  <Check className="w-7 h-7 text-emerald-600" strokeWidth={3} />
                </div>
                <h3 className="text-emerald-900 font-black text-base">Report sent</h3>
                <p className="text-amber-900/80 text-[12px] text-center leading-snug">
                  Thanks — our team will review.<br />
                  Want to also block <span className="font-bold">{reportedDisplayName}</span>?
                </p>
              </div>

              <div className="flex gap-2">
                <motion.button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-black bg-white/70 border border-amber-300/50 text-amber-800"
                  whileTap={{ scale: 0.97 }}
                >
                  Just close
                </motion.button>
                <motion.button
                  onClick={handleBlock}
                  disabled={blockBusy}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-black text-white flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  {blockBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" strokeWidth={2.5} />}
                  Block too
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5"
            >
              <div className="flex flex-col items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-amber-600" strokeWidth={2.5} />
                </div>
                <h3 className="text-amber-900 font-black text-base">Couldn't send</h3>
                <p className="text-amber-900/80 text-[12px] text-center leading-snug">{errorMsg ?? 'Something went wrong.'}</p>
              </div>
              <motion.button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-[12px] font-black bg-white/70 border border-amber-300/50 text-amber-800"
                whileTap={{ scale: 0.97 }}
              >
                Close
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
