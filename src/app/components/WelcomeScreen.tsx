import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Star, Gem, Wand2, Heart, HelpCircle, X } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: (name: string) => void;
}

const bulletIcons = [Heart, Star, Gem, Wand2, Sparkles];
const bulletColors = [
  'text-pink-400',
  'text-amber-400',
  'text-cyan-400',
  'text-purple-400',
  'text-emerald-400',
];

// Inline SVG coral/seascape elements
function CoralReef() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '28%' }}>
      {/* Sandy ocean floor */}
      <div className="absolute bottom-0 left-0 right-0 h-12 rounded-t-[50%]"
        style={{ background: 'linear-gradient(to top, rgba(194,178,128,0.12), rgba(194,178,128,0.03))' }} />
      <div className="absolute bottom-0 left-0 right-0 h-6"
        style={{ background: 'linear-gradient(to top, rgba(160,140,100,0.08), transparent)' }} />

      {/* Coral SVGs rendered as colored divs with organic shapes */}
      {/* Brain coral - left */}
      <motion.div
        className="absolute bottom-2"
        style={{ left: '5%' }}
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-10 h-8 rounded-[50%] relative"
          style={{ background: 'radial-gradient(ellipse, rgba(255,120,150,0.25) 0%, rgba(255,80,120,0.1) 70%, transparent 100%)' }}>
          <div className="absolute inset-1 rounded-[50%]"
            style={{ background: 'radial-gradient(ellipse, rgba(255,150,180,0.15) 0%, transparent 70%)' }} />
        </div>
      </motion.div>

      {/* Fan coral - left mid */}
      <motion.div
        className="absolute bottom-3"
        style={{ left: '18%' }}
        animate={{ rotateZ: [-2, 2, -2] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div style={{
          width: 0, height: 0,
          borderLeft: '18px solid transparent',
          borderRight: '18px solid transparent',
          borderBottom: '40px solid rgba(255,100,80,0.15)',
          borderRadius: '50%',
          filter: 'blur(0.5px)',
        }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-3"
          style={{ background: 'rgba(180,80,60,0.2)' }} />
      </motion.div>

      {/* Tall branching coral - right */}
      <motion.div
        className="absolute bottom-2"
        style={{ right: '8%' }}
        animate={{ rotateZ: [-1, 1.5, -1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <div className="relative" style={{ width: 30, height: 55 }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[3px] rounded-t-full"
            style={{ height: 55, background: 'linear-gradient(to top, rgba(200,100,150,0.2), rgba(255,150,200,0.08))' }} />
          <div className="absolute bottom-[30px] left-1/2 w-[2px] rounded-t-full origin-bottom"
            style={{ height: 20, transform: 'rotate(-35deg)', background: 'linear-gradient(to top, rgba(200,100,150,0.18), rgba(255,150,200,0.05))' }} />
          <div className="absolute bottom-[38px] left-1/2 w-[2px] rounded-t-full origin-bottom"
            style={{ height: 15, transform: 'rotate(30deg)', background: 'linear-gradient(to top, rgba(200,100,150,0.15), rgba(255,150,200,0.05))' }} />
          {/* Coral tips glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
            style={{ background: 'rgba(255,150,200,0.3)', boxShadow: '0 0 6px rgba(255,150,200,0.2)' }} />
        </div>
      </motion.div>

      {/* Tube coral cluster - right mid */}
      <motion.div
        className="absolute bottom-2"
        style={{ right: '25%' }}
        animate={{ scaleY: [1, 1.05, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        {[0, -6, 6, -3, 3].map((offset, i) => (
          <div key={i} className="absolute bottom-0 rounded-t-full"
            style={{
              left: offset + 12, width: 3 + (i % 2),
              height: 18 + (i * 5 % 15),
              background: `linear-gradient(to top, rgba(100,200,255,${0.15 + i * 0.02}), rgba(100,220,255,0.04))`,
            }} />
        ))}
      </motion.div>

      {/* Sea anemone - center left */}
      <motion.div
        className="absolute bottom-1"
        style={{ left: '35%' }}
      >
        <div className="relative" style={{ width: 24, height: 20 }}>
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bottom-0 left-1/2 rounded-t-full origin-bottom"
              style={{
                width: 2,
                height: 14 + (i % 3) * 3,
                transform: `rotate(${(i - 3) * 12}deg)`,
                background: `linear-gradient(to top, rgba(168,85,247,0.2), rgba(200,150,255,0.06))`,
              }}
              animate={{ rotateZ: [(i - 3) * 12 - 3, (i - 3) * 12 + 3, (i - 3) * 12 - 3] }}
              transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
            />
          ))}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-3 rounded-t-[50%]"
            style={{ background: 'radial-gradient(ellipse, rgba(168,85,247,0.15), transparent)' }} />
        </div>
      </motion.div>

      {/* Small rocks/pebbles on seafloor */}
      {[
        { x: '12%', w: 8, h: 4 },
        { x: '45%', w: 6, h: 3 },
        { x: '65%', w: 10, h: 5 },
        { x: '80%', w: 7, h: 3 },
        { x: '55%', w: 5, h: 3 },
      ].map((rock, i) => (
        <div key={`rock-${i}`}
          className="absolute bottom-1 rounded-[50%]"
          style={{
            left: rock.x, width: rock.w, height: rock.h,
            background: `rgba(120,110,90,${0.08 + i * 0.015})`,
          }} />
      ))}

      {/* Starfish */}
      <motion.div
        className="absolute bottom-2"
        style={{ left: '72%' }}
        animate={{ rotate: [0, 8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div style={{ fontSize: 14, opacity: 0.2, filter: 'drop-shadow(0 0 3px rgba(255,180,100,0.3))' }}>
          ✦
        </div>
      </motion.div>

      {/* Shell */}
      <motion.div
        className="absolute bottom-1.5 rounded-full"
        style={{
          left: '42%', width: 7, height: 6,
          background: 'radial-gradient(ellipse at 40% 30%, rgba(255,220,180,0.15), rgba(200,180,150,0.05))',
          border: '0.5px solid rgba(255,220,180,0.1)',
        }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

// Small background fish
function BackgroundFish() {
  const fish = useMemo(() => [
    { y: '18%', size: 12, duration: 18, delay: 0, direction: 1, color: 'rgba(100,200,255,0.12)' },
    { y: '30%', size: 8, duration: 22, delay: 5, direction: -1, color: 'rgba(150,180,255,0.09)' },
    { y: '55%', size: 10, duration: 15, delay: 8, direction: 1, color: 'rgba(100,220,200,0.1)' },
    { y: '42%', size: 6, duration: 25, delay: 12, direction: -1, color: 'rgba(180,150,255,0.08)' },
    { y: '65%', size: 9, duration: 20, delay: 3, direction: 1, color: 'rgba(120,200,180,0.1)' },
  ], []);

  return (
    <>
      {fish.map((f, i) => (
        <motion.div
          key={`fish-${i}`}
          className="absolute"
          style={{ top: f.y }}
          initial={{ x: f.direction === 1 ? '-5vw' : '105vw' }}
          animate={{ x: f.direction === 1 ? '105vw' : '-5vw' }}
          transition={{ duration: f.duration, repeat: Infinity, ease: 'linear', delay: f.delay }}
        >
          {/* Simple fish shape using CSS */}
          <div style={{
            width: f.size,
            height: f.size * 0.55,
            background: f.color,
            borderRadius: f.direction === 1 ? '50% 70% 70% 50%' : '70% 50% 50% 70%',
            position: 'relative',
          }}>
            {/* Tail */}
            <div style={{
              position: 'absolute',
              top: '15%',
              [f.direction === 1 ? 'left' : 'right']: -f.size * 0.3,
              width: 0, height: 0,
              borderTop: `${f.size * 0.2}px solid transparent`,
              borderBottom: `${f.size * 0.2}px solid transparent`,
              [f.direction === 1 ? 'borderRight' : 'borderLeft']: `${f.size * 0.35}px solid ${f.color}`,
            }} />
          </div>
        </motion.div>
      ))}
    </>
  );
}

// Jellyfish silhouettes
function Jellyfish() {
  const jellies = useMemo(() => [
    { x: '8%', startY: 70, size: 18, duration: 14, delay: 2, color: 'rgba(200,150,255,0.07)' },
    { x: '85%', startY: 60, size: 14, duration: 18, delay: 7, color: 'rgba(150,200,255,0.06)' },
    { x: '92%', startY: 75, size: 10, duration: 20, delay: 0, color: 'rgba(180,130,255,0.05)' },
  ], []);

  return (
    <>
      {jellies.map((j, i) => (
        <motion.div
          key={`jelly-${i}`}
          className="absolute"
          style={{ left: j.x, top: `${j.startY}%` }}
          animate={{
            y: [0, -120, 0],
            x: [0, i % 2 === 0 ? 15 : -15, 0],
          }}
          transition={{ duration: j.duration, repeat: Infinity, ease: 'easeInOut', delay: j.delay }}
        >
          {/* Bell */}
          <motion.div
            animate={{ scaleX: [1, 0.85, 1], scaleY: [1, 1.1, 1] }}
            transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div style={{
              width: j.size,
              height: j.size * 0.7,
              borderRadius: '50% 50% 30% 30%',
              background: j.color,
              boxShadow: `0 0 ${j.size}px ${j.color}`,
              position: 'relative',
            }}>
              {/* Tentacles */}
              {[...Array(3)].map((_, t) => (
                <motion.div
                  key={t}
                  className="absolute rounded-full"
                  style={{
                    bottom: -j.size * 0.6,
                    left: `${20 + t * 25}%`,
                    width: 1,
                    height: j.size * 0.5,
                    background: j.color,
                  }}
                  animate={{ skewX: [-5, 5, -5], scaleY: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: t * 0.3 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      ))}
    </>
  );
}

// Underwater caustic light pattern at top
function CausticLight() {
  return (
    <div className="absolute top-0 left-0 right-0 h-[35%] overflow-hidden pointer-events-none">
      {/* Water surface ripple effect */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-3"
        style={{
          background: 'linear-gradient(to bottom, rgba(100,200,255,0.06), transparent)',
        }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Animated caustic overlay shapes */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`caustic-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${10 + i * 16}%`,
            top: `${5 + (i * 13) % 20}%`,
            width: 60 + (i * 17) % 40,
            height: 40 + (i * 23) % 30,
            background: `radial-gradient(ellipse, rgba(100,220,255,${0.025 + (i % 3) * 0.01}) 0%, transparent 70%)`,
            borderRadius: '40% 60% 50% 50%',
          }}
          animate={{
            scale: [1, 1.3, 0.9, 1.1, 1],
            x: [0, 20, -10, 15, 0],
            y: [0, 10, -5, 8, 0],
            opacity: [0.4, 0.8, 0.3, 0.7, 0.4],
            rotate: [0, 15, -10, 5, 0],
          }}
          transition={{
            duration: 6 + i * 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.8,
          }}
        />
      ))}
    </div>
  );
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [name, setName] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleStart = () => {
    if (name.trim()) {
      onStart(name.trim());
    }
  };

  // Bubbles rising from bottom
  const bubbles = useMemo(() =>
    [...Array(18)].map((_, i) => ({
      id: i,
      size: 4 + (i * 3 % 12),
      x: (i * 13 + 5) % 95,
      duration: 6 + (i % 5) * 2,
      delay: (i * 0.7) % 4,
    })), []);

  // Floating particles (plankton/sediment)
  const particles = useMemo(() =>
    [...Array(25)].map((_, i) => ({
      id: i,
      size: 1.5 + (i * 5 % 4),
      x: (i * 17 + 13) % 100,
      y: (i * 23 + 7) % 100,
      duration: 5 + (i % 5),
      delay: (i * 0.4) % 3,
    })), []);

  // Underwater light rays
  const lightRays = useMemo(() =>
    [...Array(7)].map((_, i) => ({
      id: i,
      x: 5 + i * 14,
      width: 25 + (i * 17 % 50),
      opacity: 0.025 + (i % 3) * 0.012,
      duration: 8 + i * 2,
    })), []);

  // Kelp strands — more varied
  const kelp = useMemo(() =>
    [...Array(10)].map((_, i) => ({
      id: i,
      x: 3 + i * 10,
      height: 50 + (i * 29 % 100),
      width: 5 + (i % 3) * 3,
      duration: 3 + (i % 4),
      delay: i * 0.3,
      hue: i % 2 === 0 ? '16,185,129' : '52,211,153',
    })), []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#041428] via-[#0a1e3d] to-[#0d2847] flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Deep ocean layered background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0a2a5a_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_#061a30_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,_rgba(56,189,248,0.06)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,_rgba(168,85,247,0.05)_0%,_transparent_50%)]" />
        {/* Deep water color band */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(20,80,120,0.08)_0%,_transparent_70%)]" />

        {/* Caustic light overlay at top */}
        <CausticLight />

        {/* Light rays from surface */}
        {lightRays.map((ray) => (
          <motion.div
            key={ray.id}
            className="absolute top-0"
            style={{
              left: `${ray.x}%`,
              width: `${ray.width}px`,
              height: '100%',
              background: `linear-gradient(180deg, rgba(120,200,255,${ray.opacity * 3}) 0%, rgba(120,200,255,${ray.opacity}) 40%, transparent 75%)`,
              transformOrigin: 'top center',
            }}
            animate={{ skewX: [-5, 5, -5], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: ray.duration, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Ambient underwater glow pulses */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 40% 30%, rgba(100,200,255,0.04) 0%, transparent 30%), radial-gradient(circle at 65% 50%, rgba(100,200,255,0.03) 0%, transparent 25%), radial-gradient(circle at 25% 70%, rgba(100,200,255,0.03) 0%, transparent 25%)',
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Kelp forest */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '30%' }}>
          {kelp.map((k) => (
            <motion.div
              key={k.id}
              className="absolute bottom-0"
              style={{
                left: `${k.x}%`, width: `${k.width}px`, height: `${k.height}px`,
                borderRadius: `${k.width / 2}px ${k.width / 2}px 0 0`,
                background: `linear-gradient(to top, rgba(${k.hue},0.22), rgba(${k.hue},0.04))`,
              }}
              animate={{ skewX: [-3, 3, -3], scaleY: [1, 1.06, 1] }}
              transition={{ duration: k.duration, repeat: Infinity, ease: 'easeInOut', delay: k.delay }}
            />
          ))}
          {/* Thin secondary kelp fronds */}
          {kelp.filter((_, i) => i % 2 === 0).map((k) => (
            <motion.div
              key={`frond-${k.id}`}
              className="absolute bottom-0"
              style={{
                left: `${k.x + 1.5}%`, width: '3px', height: `${k.height * 0.65}px`,
                borderRadius: '2px 2px 0 0',
                background: `linear-gradient(to top, rgba(${k.hue},0.18), rgba(${k.hue},0.02))`,
              }}
              animate={{ skewX: [2, -4, 2] }}
              transition={{ duration: k.duration * 1.3, repeat: Infinity, ease: 'easeInOut', delay: k.delay + 0.6 }}
            />
          ))}
        </div>

        {/* Coral reef and seafloor */}
        <CoralReef />

        {/* Background fish */}
        <BackgroundFish />

        {/* Jellyfish */}
        <Jellyfish />

        {/* Rising bubbles */}
        {bubbles.map((b) => (
          <motion.div
            key={b.id}
            className="absolute rounded-full"
            style={{
              left: `${b.x}%`, bottom: '-20px', width: b.size, height: b.size,
              border: `1px solid rgba(150,220,255,${0.2 + (b.size / 30)})`,
              background: `radial-gradient(circle at 30% 30%, rgba(200,240,255,${0.15 + b.size / 50}), transparent)`,
              boxShadow: 'inset 0 -1px 2px rgba(100,200,255,0.1)',
            }}
            animate={{
              y: [0, -(typeof window !== 'undefined' ? window.innerHeight + 40 : 900)],
              x: [0, (b.id % 2 === 0 ? 15 : -15), 0],
              opacity: [0, 0.7, 0.5, 0],
            }}
            transition={{ duration: b.duration, repeat: Infinity, ease: 'easeOut', delay: b.delay }}
          />
        ))}

        {/* Floating plankton/sediment particles */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size,
              background: p.id % 4 === 0 ? 'rgba(200,255,200,0.35)' : 'rgba(150,220,255,0.4)',
              boxShadow: `0 0 ${p.size * 3}px ${p.id % 4 === 0 ? 'rgba(200,255,200,0.15)' : 'rgba(150,220,255,0.2)'}`,
            }}
            animate={{
              y: [0, -20, 5, 0], x: [0, p.id % 2 === 0 ? 8 : -8, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{ duration: p.duration, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10 flex flex-col items-center"
      >
        {/* Axolotl hero section */}
        <div className="text-center mb-6 relative">
          {/* Bioluminescent glow */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[55%]"
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-44 h-44 bg-gradient-to-br from-cyan-400/30 via-purple-500/20 to-teal-400/25 rounded-full blur-[60px]" />
          </motion.div>
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[55%]"
            animate={{ scale: [1.2, 0.9, 1.2], opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            <div className="w-52 h-52 bg-gradient-to-br from-teal-300/15 via-transparent to-blue-400/20 rounded-full blur-[50px]" />
          </motion.div>

          {/* Floating bubbles around axolotl */}
          {[
            { x: -55, y: -30, size: 6, delay: 0 },
            { x: 50, y: -40, size: 8, delay: 0.8 },
            { x: -45, y: 15, size: 5, delay: 1.5 },
            { x: 55, y: 10, size: 7, delay: 0.4 },
            { x: -30, y: -55, size: 4, delay: 2 },
            { x: 35, y: 30, size: 5, delay: 1.2 },
            { x: 0, y: -60, size: 6, delay: 0.6 },
            { x: -60, y: -5, size: 4, delay: 1.8 },
          ].map((b, i) => (
            <motion.div
              key={`hero-bubble-${i}`}
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: b.size, height: b.size,
                border: '1px solid rgba(150,220,255,0.3)',
                background: 'radial-gradient(circle at 30% 30%, rgba(200,240,255,0.2), transparent)',
              }}
              animate={{
                x: [b.x, b.x + (i % 2 === 0 ? 5 : -5), b.x],
                y: [b.y, b.y - 15, b.y],
                opacity: [0, 0.7, 0], scale: [0.5, 1, 0.5],
              }}
              transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
            />
          ))}

          {/* Bioluminescent sparkle dots */}
          {[
            { x: -40, y: -20, color: 'rgba(100,255,218,0.8)', delay: 0 },
            { x: 45, y: -35, color: 'rgba(120,200,255,0.8)', delay: 0.5 },
            { x: 30, y: 25, color: 'rgba(200,150,255,0.7)', delay: 1 },
            { x: -35, y: 30, color: 'rgba(100,255,200,0.7)', delay: 1.5 },
            { x: 60, y: 0, color: 'rgba(150,230,255,0.6)', delay: 0.8 },
            { x: -55, y: -10, color: 'rgba(100,255,230,0.6)', delay: 2 },
          ].map((s, i) => (
            <motion.div
              key={`glow-${i}`}
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: 3, height: 3, background: s.color,
                boxShadow: `0 0 8px 2px ${s.color}`,
              }}
              animate={{
                x: [s.x, s.x + (i % 2 === 0 ? 4 : -4), s.x],
                y: [s.y, s.y - 8, s.y],
                opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
            />
          ))}

          {/* Axolotl with float */}
          <motion.div
            animate={{ y: [0, -18, 0], rotate: [0, 1.5, 0, -1.5, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10 mb-4"
          >
            <svg
              width="176"
              height="176"
              viewBox="0 0 200 200"
              className="mx-auto"
              style={{ filter: 'drop-shadow(0 0 25px rgba(56,189,248,0.35)) drop-shadow(0 0 50px rgba(168,85,247,0.2))' }}
            >
              {/* Body */}
              <ellipse
                cx="100"
                cy="120"
                rx="60"
                ry="50"
                fill="#FFB5E8"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
              />
              
              {/* Head */}
              <ellipse
                cx="100"
                cy="80"
                rx="50"
                ry="45"
                fill="#FFB5E8"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
              />
              
              {/* Gills (left side) */}
              <ellipse cx="50" cy="85" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
              <ellipse cx="45" cy="95" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
              <ellipse cx="50" cy="105" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
              
              {/* Gills (right side) */}
              <ellipse cx="150" cy="85" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
              <ellipse cx="155" cy="95" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
              <ellipse cx="150" cy="105" rx="8" ry="20" fill="rgba(255,200,200,0.6)" />
              
              {/* Eyes */}
              <circle cx="85" cy="75" r="12" fill="white" />
              <circle cx="115" cy="75" r="12" fill="white" />
              <circle cx="88" cy="78" r="6" fill="black" />
              <circle cx="118" cy="78" r="6" fill="black" />
              
              {/* Smile */}
              <path
                d="M 85 95 Q 100 105 115 95"
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
              
              {/* Tail */}
              <ellipse
                cx="100"
                cy="165"
                rx="35"
                ry="25"
                fill="#FFB5E8"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
              />
              
              {/* Spots pattern */}
              <circle cx="100" cy="100" r="8" fill="rgba(255,255,255,0.4)" />
              <circle cx="120" cy="130" r="6" fill="rgba(255,255,255,0.4)" />
              <circle cx="80" cy="140" r="7" fill="rgba(255,255,255,0.4)" />
            </svg>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1
              className="text-6xl font-black bg-clip-text text-transparent mb-2"
              style={{
                backgroundImage: 'linear-gradient(135deg, #67e8f9 0%, #a78bfa 35%, #f0abfc 65%, #67e8f9 100%)',
                filter: 'drop-shadow(0 2px 10px rgba(56,189,248,0.3))',
              }}
            >
              Axolittle
            </h1>
            <p className="text-cyan-200/80 text-lg font-medium tracking-wide">
              Raise your own <em className="italic">little</em> axolotl
            </p>
          </motion.div>
        </div>

        {/* Compact card — name input + actions only */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="relative w-full"
        >
          <div className="absolute -inset-[2px] rounded-[22px] bg-gradient-to-b from-cyan-400/30 via-purple-500/20 to-teal-400/25 blur-sm" />
          <div className="absolute -inset-[1px] rounded-[22px] bg-gradient-to-b from-cyan-300/40 via-blue-400/15 to-cyan-300/30" />

          <div className="relative rounded-[20px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a1e3d]/92 via-[#0d1530]/95 to-[#081428]/95 backdrop-blur-xl" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.06)_0%,_transparent_60%)]" />

            {/* Subtle card bubbles */}
            {[
              { x: '85%', y: '20%', s: 20, o: 0.03 },
              { x: '10%', y: '70%', s: 15, o: 0.02 },
              { x: '90%', y: '80%', s: 25, o: 0.025 },
            ].map((dot, i) => (
              <motion.div
                key={`card-bubble-${i}`}
                className="absolute rounded-full"
                style={{
                  left: dot.x, top: dot.y, width: dot.s, height: dot.s,
                  border: `1px solid rgba(150,220,255,${dot.o * 3})`,
                  background: `radial-gradient(circle at 30% 30%, rgba(200,240,255,${dot.o}), transparent)`,
                }}
                animate={{ y: [0, -8, 0], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
              />
            ))}

            <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            <div className="relative p-5 pt-6">
              {/* Name input section */}
              <div className="space-y-3.5">
                <label className="block text-cyan-200/90 text-sm font-medium tracking-wide text-center">
                  What will you call your new friend?
                </label>

                <div className="relative">
                  <AnimatePresence>
                    {inputFocused && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-cyan-500/40 via-purple-400/30 to-teal-400/40 blur-sm"
                      />
                    )}
                  </AnimatePresence>
                  <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-cyan-500/30 via-blue-400/20 to-teal-500/30" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter a name..."
                    maxLength={20}
                    className="relative w-full bg-[#060d1a]/80 rounded-xl px-4 py-3.5 text-white placeholder-cyan-300/25 focus:outline-none transition-all"
                    onKeyPress={e => e.key === 'Enter' && handleStart()}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    autoFocus
                  />
                </div>

                {/* CTA Button */}
                <motion.button
                  onClick={handleStart}
                  disabled={!name.trim()}
                  className="relative w-full overflow-hidden rounded-xl py-4 text-white font-black text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                  whileHover={name.trim() ? { scale: 1.02, y: -2 } : {}}
                  whileTap={name.trim() ? { scale: 0.97 } : {}}
                >
                  {name.trim() && (
                    <motion.div
                      className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-400/25 via-purple-500/25 to-teal-400/25 blur-md"
                      animate={{ opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-cyan-400/60 via-purple-400/40 to-cyan-400/60" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-xl" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-xl" />
                  {name.trim() && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                      animate={{ x: ['-200%', '200%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] flex items-center justify-center gap-2">
                    <Wand2 className="w-5 h-5" />
                    Start Adventure
                  </span>
                </motion.button>

                {/* How to Play button */}
                <motion.button
                  onClick={() => setShowHowToPlay(true)}
                  className="relative w-full overflow-hidden rounded-xl py-3 text-cyan-200/90 font-bold text-sm transition-all group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-cyan-400/25 via-purple-400/15 to-cyan-400/25" />
                  <div className="absolute inset-0 bg-[#0a1530]/70 rounded-xl" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    How to Play
                  </span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom text */}
        <motion.div
          className="mt-5 text-center text-cyan-300/35 text-xs font-medium tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Your progress is saved automatically
        </motion.div>
      </motion.div>

      {/* How to Play Modal */}
      <AnimatePresence>
        {showHowToPlay && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-[#041428]/80 backdrop-blur-sm"
              onClick={() => setShowHowToPlay(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal card */}
            <motion.div
              className="relative w-full max-w-sm"
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Outer glow */}
              <div className="absolute -inset-[3px] rounded-[24px] bg-gradient-to-b from-cyan-400/35 via-purple-500/25 to-teal-400/30 blur-md" />
              {/* Border */}
              <div className="absolute -inset-[1px] rounded-[22px] bg-gradient-to-b from-cyan-300/50 via-blue-400/20 to-cyan-300/40" />

              <div className="relative rounded-[20px] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a1e3d]/96 via-[#0d1530]/97 to-[#081428]/97 backdrop-blur-xl" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.08)_0%,_transparent_60%)]" />
                <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

                {/* Floating bubbles inside modal */}
                {[
                  { x: '88%', y: '15%', s: 14, dur: 5 },
                  { x: '8%', y: '75%', s: 18, dur: 6 },
                  { x: '92%', y: '60%', s: 12, dur: 4.5 },
                ].map((dot, i) => (
                  <motion.div
                    key={`modal-bubble-${i}`}
                    className="absolute rounded-full"
                    style={{
                      left: dot.x, top: dot.y, width: dot.s, height: dot.s,
                      border: '1px solid rgba(150,220,255,0.08)',
                      background: 'radial-gradient(circle at 30% 30%, rgba(200,240,255,0.04), transparent)',
                    }}
                    animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: dot.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                  />
                ))}

                <div className="relative p-5 pt-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Sparkles className="w-5 h-5 text-cyan-300" style={{ filter: 'drop-shadow(0 0 6px rgba(100,220,255,0.6))' }} />
                      </motion.div>
                      <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-cyan-200">
                        How to Play
                      </h2>
                    </div>
                    <motion.button
                      onClick={() => setShowHowToPlay(false)}
                      className="relative w-8 h-8 rounded-full flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <div className="absolute inset-0 rounded-full bg-white/5 border border-white/10" />
                      <X className="w-4 h-4 text-cyan-200/70 relative z-10" />
                    </motion.button>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent" />
                    <Gem className="w-3 h-3 text-cyan-400/50" />
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent" />
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-3.5 mb-5">
                    {[
                      'Care for your axolotl through 4 life stages',
                      'Play mini-games to boost stats',
                      'Customize your aquarium',
                      'Build your lineage through rebirth',
                      'Visit friends and grow your axolotl family',
                    ].map((item, i) => {
                      const Icon = bulletIcons[i];
                      return (
                        <motion.li
                          key={i}
                          className="flex items-center gap-3"
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.08 }}
                        >
                          <div className="relative flex-shrink-0">
                            <div className={`absolute inset-0 rounded-full blur-md ${bulletColors[i]} opacity-40`} />
                            <div className="relative w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                              <Icon className={`w-3.5 h-3.5 ${bulletColors[i]}`} fill="currentColor" strokeWidth={1} />
                            </div>
                          </div>
                          <span className="text-cyan-100/80 text-sm font-medium">{item}</span>
                        </motion.li>
                      );
                    })}
                  </ul>

                  {/* Bottom divider */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-teal-400/20 to-transparent" />
                    <Star className="w-3 h-3 text-teal-300/40" fill="currentColor" />
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-teal-400/20 to-transparent" />
                  </div>

                  {/* Got It button */}
                  <motion.button
                    onClick={() => setShowHowToPlay(false)}
                    className="relative w-full overflow-hidden rounded-xl py-3.5 text-white font-bold transition-all"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-cyan-400/50 via-purple-400/35 to-cyan-400/50" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-blue-600/90 rounded-xl" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-xl" />
                    <span className="relative z-10 drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]">Got It!</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
