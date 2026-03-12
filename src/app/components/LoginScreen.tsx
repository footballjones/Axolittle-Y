import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import axolotlImg from '../../assets/axolotlnamescreen.png';

export function LoginScreen() {
  const { signInWithEmail, continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    const { error } = await signInWithEmail(trimmed);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSent(true);
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-6 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #041428 0%, #0a1e3d 50%, #0d2847 100%)' }}
    >
      {/* Background radial glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 25%, rgba(56,189,248,0.06) 0%, transparent 70%), ' +
            'radial-gradient(ellipse 60% 45% at 50% 75%, rgba(168,85,247,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Rising bubbles */}
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/10 border border-white/20 pointer-events-none"
          style={{
            width: 6 + i * 5,
            height: 6 + i * 5,
            left: `${8 + i * 10}%`,
            bottom: '-10%',
          }}
          animate={{ y: [0, -(700 + i * 60)], opacity: [0.4, 0] }}
          transition={{
            duration: 5 + i * 0.7,
            repeat: Infinity,
            repeatType: 'loop',
            delay: i * 0.6,
            ease: 'easeIn',
          }}
        />
      ))}

      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="w-full relative z-10"
        style={{ maxWidth: 260 }}
      >
        {/* Axolotl image */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            {/* Bioluminescent glow ring */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.55, 0.25] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(56,189,248,0.22) 0%, transparent 70%)',
              }}
            />
            <motion.img
              src={axolotlImg}
              alt="Axolotl"
              animate={{ y: [0, -12, 0], rotate: [0, 1.2, 0, -1.2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 220,
                borderRadius: 20,
                boxShadow:
                  '0 0 30px rgba(56,189,248,0.2), 0 0 70px rgba(168,85,247,0.1)',
                maskImage:
                  'radial-gradient(ellipse 90% 85% at center, black 55%, transparent 100%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse 90% 85% at center, black 55%, transparent 100%)',
              }}
            />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h1
            className="text-3xl font-black tracking-tight"
            style={{
              background:
                'linear-gradient(135deg, #67e8f9 0%, #a78bfa 35%, #f0abfc 65%, #67e8f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Axolittle
          </h1>
          <p className="text-cyan-200/60 text-xs mt-1">Save your progress to the cloud</p>
        </div>

        {/* Card */}
        <div
          className="relative rounded-2xl p-5 backdrop-blur-xl"
          style={{
            background:
              'linear-gradient(145deg, rgba(6,13,26,0.88) 0%, rgba(10,20,45,0.92) 100%)',
            border: '1px solid rgba(56,189,248,0.15)',
            boxShadow:
              '0 0 40px rgba(56,189,248,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {sent ? (
            /* ── Magic link sent ── */
            <div className="text-center py-2">
              <div className="text-4xl mb-3">📧</div>
              <h2 className="text-sm font-black text-cyan-100 mb-2">Check your email!</h2>
              <p className="text-xs text-cyan-200/55 leading-relaxed">
                We sent a magic link to{' '}
                <span className="font-semibold text-cyan-300">{email}</span>.
                <br />
                Click it to sign in and sync your axolotl.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-4 text-xs text-cyan-400/70 underline underline-offset-2 hover:text-cyan-300 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* ── Sign-in form ── */
            <>
              <h2 className="text-sm font-black text-cyan-100 mb-1">Sign in with magic link</h2>
              <p className="text-xs text-cyan-200/45 mb-4 leading-relaxed">
                No password needed — we'll email you a sign-in link.
              </p>

              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-cyan-100 placeholder:text-cyan-300/25 transition-all"
                  style={{
                    background: 'rgba(6,13,26,0.8)',
                    border: '1px solid rgba(56,189,248,0.2)',
                    outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.border = '1px solid rgba(56,189,248,0.5)')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid rgba(56,189,248,0.2)')}
                />

                {error && (
                  <p className="text-xs text-red-400 font-medium">{error}</p>
                )}

                <motion.button
                  onClick={handleSend}
                  disabled={loading || !email.trim()}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-2.5 rounded-xl font-black text-white text-sm disabled:opacity-40 transition-opacity"
                  style={{
                    background:
                      'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #2563eb 100%)',
                  }}
                >
                  {loading ? '✉️ Sending…' : '✉️ Send Magic Link'}
                </motion.button>
              </div>

              {/* Divider */}
              <div className="relative my-4">
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div
                    className="w-full"
                    style={{ borderTop: '1px solid rgba(56,189,248,0.1)' }}
                  />
                </div>
                <div className="relative flex justify-center">
                  <span
                    className="px-3 text-xs text-cyan-200/30"
                    style={{ background: 'rgba(10,20,45,0.92)' }}
                  >
                    or
                  </span>
                </div>
              </div>

              <motion.button
                onClick={continueAsGuest}
                whileTap={{ scale: 0.97 }}
                className="w-full py-2.5 rounded-xl font-bold text-cyan-300/60 text-sm transition-colors hover:text-cyan-300"
                style={{
                  background: 'rgba(56,189,248,0.05)',
                  border: '1px solid rgba(56,189,248,0.12)',
                }}
              >
                Continue as Guest
              </motion.button>

              <p className="text-[10px] text-cyan-200/25 text-center mt-3 leading-relaxed">
                Guest progress is saved locally on this device only.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
