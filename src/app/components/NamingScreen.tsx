import { useState } from 'react';
import { motion } from 'motion/react';
import { SpineAxolotl } from './SpineAxolotl';

interface Props {
  onComplete: (name: string) => void;
}

export function NamingScreen({ onComplete }: Props) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onComplete(trimmed);
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0c1824 0%, #0f2035 45%, #142840 100%)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: '20%', width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(56,100,200,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
          animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {[8, 22, 78, 92].map((x, i) => (
          <motion.div
            key={`bub-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${x}%`,
              width: 4 + (i % 3) * 3, height: 4 + (i % 3) * 3,
              border: '1px solid rgba(150,220,255,0.2)',
              background: 'radial-gradient(circle at 30% 30%, rgba(200,240,255,0.1), transparent)',
              bottom: -20,
            }}
            animate={{ y: -900, opacity: [0, 0.55, 0] }}
            transition={{ duration: 9 + i * 1.5, repeat: Infinity, ease: 'easeOut', delay: i * 1.8 }}
          />
        ))}
      </div>

      {/* Floating axolotl */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ scale: { duration: 0.5, ease: 'backOut' }, opacity: { duration: 0.4 } }}
        >
          <SpineAxolotl
            size={120}
            animation="Idle"
            facingLeft={false}
            style={{ filter: 'drop-shadow(0 0 28px rgba(100,200,255,0.42))' }}
          />
        </motion.div>
      </div>

      {/* Name card */}
      <motion.div
        className="relative z-10 rounded-t-3xl px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{
          background: 'linear-gradient(180deg, rgba(30,27,75,0.97), rgba(20,15,55,0.99))',
          border: '1.5px solid rgba(167,139,250,0.3)',
          borderBottom: 'none',
          boxShadow: '0 -16px 50px rgba(80,0,200,0.2)',
        }}
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      >
        <h2 className="text-white font-black text-2xl text-center mb-1">What's their name?</h2>
        <p className="text-violet-300/75 text-sm text-center mb-5">
          Give your new axolotl a name!
        </p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter a name..."
          maxLength={20}
          className="w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none mb-4"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1.5px solid rgba(167,139,250,0.35)',
          }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <motion.button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full py-4 rounded-xl font-black text-white text-lg disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
          whileTap={{ scale: 0.97 }}
        >
          Let's Go!
        </motion.button>
      </motion.div>
    </div>
  );
}
