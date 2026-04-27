import { useState } from 'react';
import { X, Volume2, VolumeX, Bell, BellOff, Trash2, LogOut, LogIn, User, Shield, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsModalProps {
  onClose: () => void;
  onResetGame: () => void;
  musicEnabled?: boolean;
  onMusicToggle?: (enabled: boolean) => void;
  soundEffectsEnabled?: boolean;
  onSoundToggle?: (enabled: boolean) => void;
  username?: string | null;
  isGuest?: boolean;
  isUnder13?: boolean;
  onSignOut?: () => void;
  onSignIn?: () => void;
  /**
   * Deletes the user's account and all associated cloud data, then signs
   * them out and resets the on-device save. Required by Apple Guideline
   * 5.1.1(v) for any app that allows account creation.
   */
  onDeleteAccount?: () => Promise<{ error: string | null }>;
}

// Move ToggleSwitch outside component to prevent recreation on every render
const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className={`relative w-11 h-6 rounded-full transition-colors ${
      enabled ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-slate-600'
    }`}
  >
    <motion.div
      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md"
      animate={{ left: enabled ? 20 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
);

export function SettingsModal({
  onClose,
  onResetGame,
  musicEnabled: initialMusicEnabled = true,
  onMusicToggle,
  soundEffectsEnabled: initialSoundEnabled = true,
  onSoundToggle,
  username,
  isGuest = true,
  isUnder13 = false,
  onSignOut,
  onSignIn,
  onDeleteAccount,
}: SettingsModalProps) {
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [musicEnabled, setMusicEnabled] = useState(initialMusicEnabled);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteAcctConfirm, setShowDeleteAcctConfirm] = useState(false);
  const [deletingAcct, setDeletingAcct] = useState(false);
  const [deleteAcctError, setDeleteAcctError] = useState<string | null>(null);
  const isSignedIn = !isGuest && !!username;

  const handleMusicToggle = () => {
    const newValue = !musicEnabled;
    setMusicEnabled(newValue);
    onMusicToggle?.(newValue);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col"
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-slate-500 via-cyan-600 to-slate-500 rounded-3xl blur-xl opacity-30" />
        
        <div className="relative bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-slate-600 via-cyan-600 to-slate-600 p-3 sm:p-5 border-b border-white/10 flex-shrink-0">
            <motion.div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            
            <div className="relative z-10 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">Settings</h2>
              <motion.button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-colors border border-white/30 shadow-lg"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-4 sm:p-5 space-y-3 flex-1">

            {/* Account Section */}
            <div>
              <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Account</h3>
              <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                {!isGuest && username ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{username}</p>
                        <p className="text-white/40 text-xs">Signed in</p>
                      </div>
                    </div>
                    {onSignOut && (
                      <motion.button
                        onClick={onSignOut}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border border-white/10"
                        whileTap={{ scale: 0.95 }}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </motion.button>
                    )}
                  </div>
                ) : isUnder13 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white/40" />
                      </div>
                      <div>
                        <p className="text-white/70 text-sm font-medium">Playing as Guest</p>
                        <p className="text-white/40 text-xs">Social features require a parent account</p>
                      </div>
                    </div>
                    {onSignIn && (
                      <div
                        className="rounded-xl p-3"
                        style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.18)' }}
                      >
                        <p className="text-yellow-200/70 text-xs leading-relaxed mb-2">
                          A parent or guardian can sign in to unlock friend features.
                        </p>
                        <motion.button
                          onClick={onSignIn}
                          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border border-white/15"
                          whileTap={{ scale: 0.95 }}
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          Parent / Guardian Sign In
                        </motion.button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white/40" />
                      </div>
                      <div>
                        <p className="text-white/70 text-sm font-medium">Playing as Guest</p>
                        <p className="text-white/40 text-xs">Progress saved locally only</p>
                      </div>
                    </div>
                    {onSignIn && (
                      <motion.button
                        onClick={onSignIn}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-md"
                        whileTap={{ scale: 0.95 }}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        Sign In
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Audio Section */}
            <div>
              <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Audio</h3>
              <div className="space-y-1">
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-white text-sm">Sound Effects</span>
                  </div>
                  <ToggleSwitch enabled={soundEnabled} onToggle={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    onSoundToggle?.(next);
                  }} />
                </div>

                <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    {musicEnabled ? (
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-white text-sm">Background Music</span>
                  </div>
                  <ToggleSwitch enabled={musicEnabled} onToggle={handleMusicToggle} />
                </div>
              </div>
            </div>

            {/* Preferences Section */}
            <div>
              <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Preferences</h3>
              <div className="space-y-1">
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    {notificationsEnabled ? (
                      <Bell className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <BellOff className="w-4 h-4 text-slate-500" />
                    )}
                    <div>
                      <span className="text-white text-sm">Push Notifications</span>
                      <p className="text-white/30 text-[10px] leading-none mt-0.5">Coming soon</p>
                    </div>
                  </div>
                  <ToggleSwitch enabled={notificationsEnabled} onToggle={() => setNotificationsEnabled(!notificationsEnabled)} />
                </div>
              </div>
            </div>

            {/* Data Section */}
            <div>
              <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Data</h3>
              <div className="space-y-1">
                {!showResetConfirm ? (
                  <motion.button
                    onClick={() => setShowResetConfirm(true)}
                    className="flex items-center gap-3 w-full bg-red-500/10 hover:bg-red-500/20 rounded-xl px-4 py-3 border border-red-500/20 transition-colors text-left"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">Reset Game Data</span>
                  </motion.button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 rounded-xl p-4 border border-red-500/20"
                  >
                    <p className="text-red-300 text-sm mb-3">Are you sure? This will delete all progress and cannot be undone.</p>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => {
                          onResetGame();
                          onClose();
                        }}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 rounded-lg transition-colors"
                        whileTap={{ scale: 0.95 }}
                      >
                        Yes, Reset
                      </motion.button>
                      <motion.button
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2 rounded-lg transition-colors"
                        whileTap={{ scale: 0.95 }}
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Delete account — only when signed in. Required by Apple
                    Guideline 5.1.1(v) for any app that allows account creation. */}
                {isSignedIn && onDeleteAccount && (
                  !showDeleteAcctConfirm ? (
                    <motion.button
                      onClick={() => { setShowDeleteAcctConfirm(true); setDeleteAcctError(null); }}
                      className="flex items-center gap-3 w-full bg-red-500/10 hover:bg-red-500/20 rounded-xl px-4 py-3 border border-red-500/30 transition-colors text-left"
                      whileTap={{ scale: 0.98 }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm">Delete Account</span>
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 rounded-xl p-4 border border-red-500/30"
                    >
                      <p className="text-red-300 text-sm font-semibold mb-1">Delete your account?</p>
                      <p className="text-red-300/80 text-xs leading-relaxed mb-3">
                        This permanently removes your account, cloud save, friend graph, and
                        achievements. It cannot be undone.
                      </p>
                      {deleteAcctError && (
                        <p className="text-xs text-red-200 font-medium mb-2">{deleteAcctError}</p>
                      )}
                      <div className="flex gap-2">
                        <motion.button
                          onClick={async () => {
                            setDeletingAcct(true);
                            setDeleteAcctError(null);
                            const { error } = await onDeleteAccount();
                            setDeletingAcct(false);
                            if (error) {
                              setDeleteAcctError(error);
                              return;
                            }
                            onClose();
                          }}
                          disabled={deletingAcct}
                          className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-lg transition-colors"
                          whileTap={{ scale: 0.95 }}
                        >
                          {deletingAcct ? 'Deleting…' : 'Delete Forever'}
                        </motion.button>
                        <motion.button
                          onClick={() => setShowDeleteAcctConfirm(false)}
                          disabled={deletingAcct}
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
                          whileTap={{ scale: 0.95 }}
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                )}
              </div>
            </div>

            {/* Legal Section */}
            <div>
              <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Legal</h3>
              <div className="space-y-1">
                <a
                  href="https://www.uomalabs.com/axolittle/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 border border-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span className="text-white text-sm">Privacy Policy</span>
                  </div>
                  <span className="text-white/30 text-xs">↗</span>
                </a>
                <a
                  href="mailto:support@uomalabs.com"
                  className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 border border-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span className="text-white text-sm">Contact Support</span>
                  </div>
                  <span className="text-white/30 text-xs">↗</span>
                </a>
              </div>
            </div>

            {/* Version info */}
            <div className="text-center pt-2">
              <p className="text-white/20 text-xs">Axolotl Aquarium v1.0.0</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
