/**
 * ResetPasswordScreen — full-screen surface shown after the user clicks a
 * recovery link. Supabase's PASSWORD_RECOVERY event has set isRecovering=true
 * and the session is valid only for `auth.updateUser({ password })`. After
 * the password is changed we sign the user out so they can sign in fresh.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

function isValidPassword(p: string): boolean {
  return p.length >= 8 && /[a-zA-Z]/.test(p) && /[0-9]/.test(p);
}

const HINT = 'At least 8 characters with a letter and a number';

export function ResetPasswordScreen() {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await updatePassword(password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
  };

  const handleDone = async () => {
    // Sign out so the user lands on the LoginScreen and signs in fresh
    // with their new password — no leftover recovery session.
    await signOut();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[70]"
      style={{ background: 'linear-gradient(180deg, #041428 0%, #0a1e3d 50%, #0d2847 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="w-full max-w-sm rounded-3xl p-6 border border-white/10"
        style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.97), rgba(2,8,23,0.97))' }}
      >
        <div className="text-center mb-5">
          <h1 className="text-xl font-black text-white mb-2">
            {done ? 'Password updated' : 'Choose a new password'}
          </h1>
          <p className="text-white/55 text-sm leading-relaxed">
            {done
              ? 'Sign in with your new password to keep playing.'
              : 'Pick something you can remember — you can write it down too.'}
          </p>
        </div>

        {done ? (
          <motion.button
            onClick={handleDone}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-2xl font-black text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
          >
            Sign in
          </motion.button>
        ) : (
          <>
            <label className="block text-xs text-cyan-200/50 mb-1 font-semibold">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-cyan-100 placeholder:text-cyan-300/25 mb-1"
              style={{ background: 'rgba(6,13,26,0.8)', border: '1px solid rgba(56,189,248,0.2)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)')}
            />
            <p className="text-[10px] text-cyan-200/30 mb-3">{HINT}</p>

            <label className="block text-xs text-cyan-200/50 mb-1 font-semibold">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null); }}
              placeholder="••••••••"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-cyan-100 placeholder:text-cyan-300/25 mb-3"
              style={{ background: 'rgba(6,13,26,0.8)', border: '1px solid rgba(56,189,248,0.2)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)')}
            />

            {error && (
              <p className="text-xs text-red-400 font-medium text-center mb-3">{error}</p>
            )}

            <motion.button
              onClick={submit}
              disabled={loading || !isValidPassword(password) || password !== confirm}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-2xl font-black text-white text-sm disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              {loading ? 'Saving…' : 'Save new password'}
            </motion.button>
          </>
        )}
      </motion.div>
    </div>
  );
}
