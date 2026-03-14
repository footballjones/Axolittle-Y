import { motion } from 'motion/react';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function PinPad({ value, onChange, maxLength = 4, disabled = false }: PinPadProps) {
  const handleKey = (key: string) => {
    if (disabled) return;
    if (key === 'del') {
      onChange(value.slice(0, -1));
    } else if (value.length < maxLength) {
      onChange(value + key);
    }
  };

  return (
    <div>
      {/* PIN dots */}
      <div className="flex justify-center gap-4 mb-5">
        {Array.from({ length: maxLength }).map((_, i) => (
          <motion.div
            key={i}
            animate={i < value.length ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.15 }}
            className="w-4 h-4 rounded-full border-2 transition-colors"
            style={{
              background: i < value.length ? 'rgba(56,189,248,1)' : 'transparent',
              borderColor: i < value.length ? 'rgba(56,189,248,1)' : 'rgba(56,189,248,0.3)',
            }}
          />
        ))}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key, i) =>
          key === '' ? (
            <div key={i} />
          ) : (
            <motion.button
              key={key}
              whileTap={{ scale: 0.88 }}
              onClick={() => handleKey(key)}
              disabled={disabled}
              className="py-3.5 rounded-xl font-bold text-xl transition-opacity disabled:opacity-40"
              style={{
                background: 'rgba(56,189,248,0.07)',
                border: '1px solid rgba(56,189,248,0.15)',
                color: key === 'del' ? 'rgba(56,189,248,0.5)' : 'rgba(207,250,254,0.9)',
                fontSize: key === 'del' ? 18 : 22,
              }}
            >
              {key === 'del' ? '⌫' : key}
            </motion.button>
          )
        )}
      </div>
    </div>
  );
}
