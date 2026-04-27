/**
 * ForgotPasswordModal — collects a username and triggers the
 * request-recovery-link edge function. The success message is intentionally
 * generic: the backend never confirms whether the username exists or has a
 * recovery email on file (no enumeration), and the modal mirrors that.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

interface Props {
  onClose: () => void;
  /** Pre-fill the username field with whatever was already on the sign-in form. */
  initialUsername?: string;
}

export function ForgotPasswordModal({ onClose, initialUsername = '' }: Props) {
  const { requestPasswordReset } = useAuth();
  const [username, setUsername] = useState(initialUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    const u = username.trim();
    if (!USERNAME_RE.test(u)) {
      setError('Enter the username you signed up with.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    const { error: err, message } = await requestPasswordReset(u);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(message ?? 'If we have a recovery email on file for that username, a reset link is on the way.');
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,8,23,0.78)' }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="w-full max-w-sm rounded-3xl p-5 border border-white/10"
        style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.97), rgba(2,8,23,0.97))' }}
      >
        <div className="text-center mb-4">
          <h2 className="text-lg font-black text-white mb-1">Reset your password</h2>
          <p className="text-white/55 text-xs leading-relaxed">
            Enter your username. If we have a recovery email on file, we'll send you a reset link.
          </p>
        </div>

        {success ? (
          <>
            <div
              className="rounded-xl px-4 py-3 mb-4"
              style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <p className="text-emerald-200/90 text-sm leading-relaxed">{success}</p>
            </div>
            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 rounded-xl font-black text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              Done
            </motion.button>
          </>
        ) : (
          <>
            <label className="block text-xs text-cyan-200/50 mb-1 font-semibold">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              placeholder="your_username"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={20}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-cyan-100 placeholder:text-cyan-300/25 mb-3"
              style={{ background: 'rgba(6,13,26,0.8)', border: '1px solid rgba(56,189,248,0.2)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)')}
            />
            {error && (
              <p className="text-xs text-red-400 font-medium text-center mb-3">{error}</p>
            )}
            <div className="flex gap-2">
              <motion.button
                onClick={onClose}
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/70 disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={submit}
                disabled={loading || !username.trim()}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
