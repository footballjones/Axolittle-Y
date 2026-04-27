import { motion } from 'motion/react';

export function LoadingScreen() {
  return (
    <motion.div
      key="loading-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
      style={{ background: '#041428' }}
    >
      {/* Axolotl image with pulse */}
      <motion.img
        src={`${import.meta.env.BASE_URL}axolotl.png`}
        alt=""
        className="w-28 h-28 object-contain mb-6"
        animate={{ scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          filter: 'drop-shadow(0 0 20px rgba(100,180,255,0.5)) drop-shadow(0 0 40px rgba(120,80,255,0.3))',
        }}
      />

      {/* Title */}
      <motion.h1
        className="text-white font-black text-3xl tracking-wide mb-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        style={{ textShadow: '0 0 24px rgba(120,180,255,0.6)' }}
      >
        Axolittle
      </motion.h1>

      {/* Dot loader */}
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-blue-300"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
