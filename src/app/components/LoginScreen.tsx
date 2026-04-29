import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import axolotlImg from '../../assets/axolotlnamescreen.png';

type View = 'signin' | 'signup';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

function isValidUsername(u: string) {
  return USERNAME_REGEX.test(u);
}

/** Minimum 8 chars with at least one letter and one number. */
function isValidPassword(p: string): boolean {
  return p.length >= 8 && /[a-zA-Z]/.test(p) && /[0-9]/.test(p);
}

const PASSWORD_HINT = 'At least 8 characters with a letter and a number';

/** Background bubbles — shared between views */
function Bubbles() {
  return (
    <>
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/10 border border-white/20 pointer-events-none"
          style={{ width: 6 + i * 5, height: 6 + i * 5, left: `${8 + i * 10}%`, bottom: '-10%' }}
          animate={{ y: [0, -(700 + i * 60)], opacity: [0.4, 0] }}
          transition={{ duration: 5 + i * 0.7, repeat: Infinity, repeatType: 'loop', delay: i * 0.6, ease: 'easeIn' }}
        />
      ))}
    </>
  );
}

interface LoginScreenProps {
  /** When provided (in-game overlay), renders a back/close button. */
  onClose?: () => void;
}

export function LoginScreen({ onClose }: LoginScreenProps = {}) {
  const { signIn, signUp, continueAsGuest, signInWithGoogle, signInWithApple } = useAuth();

  const [view, setView] = useState<View>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  // Synchronous guard against double-tap. setLoading(true) doesn't propagate
  // before a fast second tap fires, so the disabled prop on the button isn't
  // enough — without this, the second tap creates the account and the third
  // hits "user already exists" and surfaces a misleading error.
  const submittingRef = useRef(false);

  const resetForm = (nextView: View) => {
    setUsername('');
    setPassword('');
    setRecoveryEmail('');
    setError(null);
    setView(nextView);
  };

  const handleSignIn = async () => {
    if (submittingRef.current) return;
    if (!isValidUsername(username.trim())) {
      setError('Username must be 3–20 characters: letters, numbers or underscores only.');
      return;
    }
    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { error } = await signIn(username.trim(), password);
      if (error) setError(error);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (submittingRef.current) return;
    if (!isValidUsername(username.trim())) {
      setError('Username must be 3–20 characters: letters, numbers or underscores only.');
      return;
    }
    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { error } = await signUp(
        username.trim(),
        password,
        recoveryEmail.trim() || undefined,
      );
      if (error) setError(error);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    setError(null);
    const fn = provider === 'google' ? signInWithGoogle : signInWithApple;
    const { error } = await fn();
    // On success the page redirects — error only if the OAuth call itself fails
    if (error) {
      setError(error);
      setOauthLoading(null);
    }
  };

  const usernameInvalid = username.length > 0 && !isValidUsername(username);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #041428 0%, #0a1e3d 50%, #0d2847 100%)', zIndex: 60 }}
    >
      {/* Back button — only shown when used as an in-game overlay */}
      {onClose && (
        <motion.button
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute left-4 z-10 flex items-center gap-1.5 text-cyan-300 hover:text-cyan-400 transition-colors text-sm font-semibold"
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to game
        </motion.button>
      )}

      {/* Background radial glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 25%, rgba(56,189,248,0.06) 0%, transparent 70%), ' +
            'radial-gradient(ellipse 60% 45% at 50% 75%, rgba(168,85,247,0.05) 0%, transparent 70%)',
        }}
      />
      <Bubbles />

      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="w-full relative z-10"
        style={{ maxWidth: 300 }}
      >
        {/* Axolotl image */}
        <div className="flex justify-center mb-2">
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.55, 0.25] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 pointer-events-none"
              style={{ borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(56,189,248,0.22) 0%, transparent 70%)' }}
            />
            <motion.img
              src={axolotlImg}
              alt="Axolotl"
              animate={{ y: [0, -8, 0], rotate: [0, 1.2, 0, -1.2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 140,
                borderRadius: 16,
                boxShadow: '0 0 30px rgba(56,189,248,0.2), 0 0 70px rgba(168,85,247,0.1)',
                maskImage: 'radial-gradient(ellipse 90% 85% at center, black 55%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 90% 85% at center, black 55%, transparent 100%)',
              }}
            />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-2">
          <h1
            className="text-2xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #67e8f9 0%, #a78bfa 35%, #f0abfc 65%, #67e8f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Axolittle
          </h1>
        </div>

        {/* Card */}
        <div
          className="relative rounded-2xl p-4 backdrop-blur-xl"
          style={{
            background: 'linear-gradient(145deg, rgba(6,13,26,0.88) 0%, rgba(10,20,45,0.92) 100%)',
            border: '1px solid rgba(56,189,248,0.15)',
            boxShadow: '0 0 40px rgba(56,189,248,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Sign In / Sign Up toggle */}
          <div className="flex rounded-xl overflow-hidden mb-4" style={{ border: '1px solid rgba(56,189,248,0.15)' }}>
            {(['signin', 'signup'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => resetForm(v)}
                className="flex-1 py-2 text-xs font-bold transition-all"
                style={{
                  background: view === v ? 'rgba(56,189,248,0.15)' : 'transparent',
                  color: view === v ? 'rgba(207,250,254,0.95)' : 'rgba(207,250,254,0.35)',
                }}
              >
                {v === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {view === 'signin' ? (
              <motion.div
                key="signin"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
              >
                {/* Username */}
                <label className="block text-xs text-cyan-200/50 mb-1 font-semibold">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(null); }}
                  placeholder="your_username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-cyan-100 placeholder:text-cyan-300/25 mb-3"
                  style={{ background: 'rgba(6,13,26,0.8)', border: '1px solid rgba(56,189,248,0.2)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)')}
                />

                {/* Password */}
                <label className="block text-xs text-cyan-200/50 mb-1 font-semibold">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-cyan-100 placeholder:text-cyan-300/25 mb-4"
                  style={{ background: 'rgba(6,13,26,0.8)', border: '1px solid rgba(56,189,248,0.2)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)')}
                  onKeyDown={e => { if (e.key === 'Enter') handleSignIn(); }}
                />

                {error && (
                  <p className="text-xs text-red-400 font-medium text-center mb-3">{error}</p>
                )}

                <motion.button
                  onClick={handleSignIn}
                  disabled={loading || !username.trim() || !isValidPassword(password)}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-2.5 rounded-xl font-black text-white text-sm disabled:opacity-40 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #2563eb 100%)' }}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </motion.button>

                <div className="text-center mt-3">
                  <button
                    onClick={() => setShowForgot(true)}
                    className="text-cyan-300/45 hover:text-cyan-300/80 text-xs underline underline-offset-2 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                {/* Username */}
                <label className="block text-xs text-cyan-200/50 mb-1 font-semibold">
                  Choose a username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(null); }}
                  placeholder="axolotl_king_99"
                  autoCapitalize="none"
                  autoCorrect="off"
                  maxLength={20}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-cyan-100 placeholder:text-cyan-300/25 mb-1"
                  style={{
                    background: 'rgba(6,13,26,0.8)',
                    border: `1px solid ${usernameInvalid ? 'rgba(248,113,113,0.5)' : 'rgba(56,189,248,0.2)'}`,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = usernameInvalid ? 'rgba(248,113,113,0.5)' : 'rgba(56,189,248,0.2)')}
                />
                <p className="text-[10px] text-cyan-200/30 mb-3">
                  3–20 characters · letters, numbers, underscores
                </p>

                {/* Password */}
                <label className="block text-xs text-cyan-200/50 mb-1 font-semibold">
                  Choose a password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-cyan-100 placeholder:text-cyan-300/25 mb-1"
                  style={{ background: 'rgba(6,13,26,0.8)', border: '1px solid rgba(56,189,248,0.2)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)')}
                />
                <p className="text-[10px] text-cyan-200/30 mb-3">
                  {PASSWORD_HINT}
                </p>

                {/* Recovery email — used by the password-reset flow if this
                    account ever forgets its password. */}
                <div className="mt-4">
                  <label className="block text-xs text-cyan-200/50 mb-1 font-semibold">
                    Recovery email <span className="text-cyan-200/30 font-normal">(optional but recommended)</span>
                  </label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-cyan-100 placeholder:text-cyan-300/25"
                    style={{ background: 'rgba(6,13,26,0.8)', border: '1px solid rgba(56,189,248,0.2)' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)')}
                  />
                  <p className="text-[10px] text-cyan-200/30 mt-1 leading-relaxed">
                    If you forget your password, we'll send a reset link here.
                  </p>
                </div>

                {error && (
                  <p className="text-xs text-red-400 font-medium text-center mt-3">{error}</p>
                )}

                <motion.button
                  onClick={handleSignUp}
                  disabled={loading || !isValidPassword(password) || !username.trim()}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-2.5 rounded-xl font-black text-white text-sm disabled:opacity-40 transition-opacity mt-4"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #2563eb 100%)' }}
                >
                  {loading ? 'Creating account…' : 'Create My Account'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full" style={{ borderTop: '1px solid rgba(56,189,248,0.1)' }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-cyan-200/30" style={{ background: 'rgba(10,20,45,0.92)' }}>or continue with</span>
            </div>
          </div>

          {/* Apple sign-in */}
          <motion.button
            onClick={() => handleOAuth('apple')}
            disabled={oauthLoading !== null || loading}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-semibold text-sm mb-2 transition-opacity disabled:opacity-50"
            style={{ background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {oauthLoading === 'apple' ? (
              <span className="opacity-60 text-xs">Signing in…</span>
            ) : (
              <>
                {/* Apple logo */}
                <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.4-57.5-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.5 133.4-317.1 264.5-317.1 70.1 0 128.9 46.4 173.1 46.4 42.3 0 109.2-49.8 190.5-49.8 30.5 0 110.1 2.6 163.6 73.4zm-234.5-166.4c-39.6-52.5-96.7-85.7-157.8-85.7-10.9 0-21.7 1.3-31.3 3.2 1.3-39.6 17.9-86.3 51.2-121.5 36.9-38.3 93-64.3 147.8-64.3 10.3 0 20.7 1.3 27.6 2.6-2.6 43.5-18.6 86.3-51.2 121.5-31.3 34.5-80.8 61.6-136.3 65.5 2.6-6.5 143 77.8 150.0-121.3z"/>
                </svg>
                Sign in with Apple
              </>
            )}
          </motion.button>

          {/* Google sign-in */}
          <motion.button
            onClick={() => handleOAuth('google')}
            disabled={oauthLoading !== null || loading}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-semibold text-sm mb-3 transition-opacity disabled:opacity-50"
            style={{ background: '#fff', color: '#3c4043', border: '1px solid rgba(0,0,0,0.12)' }}
          >
            {oauthLoading === 'google' ? (
              <span className="opacity-60 text-xs">Signing in…</span>
            ) : (
              <>
                {/* Google "G" logo */}
                <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.1 33.6 29.6 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.5 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
                  <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.2 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.5 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
                  <path fill="#FBBC05" d="M24 46c5.5 0 10.5-1.8 14.4-5l-6.7-5.5C29.6 37 26.9 38 24 38c-5.6 0-10.3-3.8-12-9H5.1C8.6 39.8 15.8 46 24 46z"/>
                  <path fill="#EA4335" d="M44.5 20H24v8.5h11.8C34.1 33.6 29.6 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.5 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" opacity="0"/>
                </svg>
                Sign in with Google
              </>
            )}
          </motion.button>

          {error && oauthLoading === null && (
            <p className="text-xs text-red-400 font-medium text-center -mt-1 mb-2">{error}</p>
          )}

          {/* Divider + guest */}
          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full" style={{ borderTop: '1px solid rgba(56,189,248,0.08)' }} />
            </div>
          </div>

          {/* Only show guest option when not already in-game */}
          {!onClose && (
            <>
              <motion.button
                onClick={continueAsGuest}
                whileTap={{ scale: 0.97 }}
                className="w-full py-2 rounded-xl font-bold text-cyan-300/40 text-xs transition-colors hover:text-cyan-300/70"
                style={{ background: 'transparent' }}
              >
                Continue as Guest
              </motion.button>
              <p className="text-[10px] text-cyan-200/20 text-center mt-1 leading-relaxed">
                Guest progress is saved on this device only.
              </p>
            </>
          )}
        </div>
      </motion.div>

      {showForgot && (
        <ForgotPasswordModal
          onClose={() => setShowForgot(false)}
          initialUsername={username}
        />
      )}
    </div>
  );
}
