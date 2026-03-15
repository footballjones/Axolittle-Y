/**
 * Coral Code - Mastermind game
 * Guess the secret code in 10 tries
 * Score = 10 - guesses used (higher is better)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps } from './types';
import { calculateRewards } from './config';

const MAX_GUESSES = 10;

// Ocean-themed gradient orbs — replaces flat emoji circles
const ORB_COLORS = [
  { id: 'coral',  label: 'Coral',    from: '#ff6b6b', to: '#e84545', shadow: '#ff6b6b' },
  { id: 'sun',    label: 'Sun',      from: '#ffe234', to: '#ffa502', shadow: '#ffcc00' },
  { id: 'kelp',   label: 'Kelp',     from: '#2ed573', to: '#17a85a', shadow: '#2ed573' },
  { id: 'ocean',  label: 'Ocean',    from: '#45cfff', to: '#1e9de0', shadow: '#45cfff' },
  { id: 'urchin', label: 'Urchin',   from: '#d76dff', to: '#9b3fd4', shadow: '#d76dff' },
  { id: 'clown',  label: 'Clown',    from: '#ff9f43', to: '#e07020', shadow: '#ff9f43' },
] as const;

type ColorId = typeof ORB_COLORS[number]['id'];

function getOrb(id: ColorId) {
  return ORB_COLORS.find(c => c.id === id) ?? ORB_COLORS[0];
}

type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { codeLength: number; colorCount: number; label: string; emoji: string; desc: string }> = {
  easy:   { codeLength: 3, colorCount: 4, label: 'Beginner',  emoji: '🐣', desc: '3 slots · 4 colors' },
  normal: { codeLength: 4, colorCount: 5, label: 'Explorer',  emoji: '🐠', desc: '4 slots · 5 colors' },
  hard:   { codeLength: 5, colorCount: 6, label: 'Master',    emoji: '🦈', desc: '5 slots · 6 colors' },
};

function getAvailableColors(difficulty: Difficulty): ColorId[] {
  return ORB_COLORS.slice(0, DIFFICULTY_CONFIG[difficulty].colorCount).map(c => c.id);
}

function generateSecretCode(codeLength: number, available: ColorId[]): ColorId[] {
  return Array.from({ length: codeLength }, () => available[Math.floor(Math.random() * available.length)]);
}

function checkGuess(secret: ColorId[], guess: ColorId[], codeLength: number) {
  const secretCounts = new Map<string, number>();
  const guessCounts  = new Map<string, number>();
  let correct = 0;
  for (let i = 0; i < codeLength; i++) {
    if (secret[i] === guess[i]) {
      correct++;
    } else {
      secretCounts.set(secret[i], (secretCounts.get(secret[i]) || 0) + 1);
      guessCounts.set(guess[i],   (guessCounts.get(guess[i])   || 0) + 1);
    }
  }
  let wrongPosition = 0;
  for (const [color, count] of guessCounts.entries()) {
    wrongPosition += Math.min(count, secretCounts.get(color) || 0);
  }
  return { correct, wrongPosition };
}

interface Guess {
  id: number;
  colors: ColorId[];
  feedback: { correct: number; wrongPosition: number };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Orb({ id, size = 36, glow = true }: { id: ColorId; size?: number; glow?: boolean }) {
  const orb = getOrb(id);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${orb.from}, ${orb.to})`,
        boxShadow: glow ? `0 0 10px ${orb.shadow}88, inset 0 2px 4px rgba(255,255,255,0.35)` : 'inset 0 2px 4px rgba(255,255,255,0.3)',
        flexShrink: 0,
      }}
    />
  );
}

/** Visual feedback pegs — coloured dots instead of text badges */
function FeedbackPegs({ correct, wrongPosition, total }: { correct: number; wrongPosition: number; total: number }) {
  const pegs = [
    ...Array(correct).fill('correct'),
    ...Array(wrongPosition).fill('close'),
    ...Array(total - correct - wrongPosition).fill('miss'),
  ];
  const half = Math.ceil(total / 2);
  const rows = [pegs.slice(0, half), pegs.slice(half)];
  return (
    <div className="flex flex-col gap-0.5 ml-auto">
      {rows.map((row, r) => (
        <div key={r} className="flex gap-0.5">
          {row.map((type, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background:
                  type === 'correct' ? 'radial-gradient(circle at 35% 35%, #6dff8a, #1db954)' :
                  type === 'close'   ? 'radial-gradient(circle at 35% 35%, #ffe234, #ffa502)' :
                                       'rgba(255,255,255,0.15)',
                boxShadow:
                  type === 'correct' ? '0 0 5px #1db95488' :
                  type === 'close'   ? '0 0 5px #ffa50288' : 'none',
                border: type === 'miss' ? '1px solid rgba(255,255,255,0.2)' : 'none',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Animated background bubbles */
function OceanBubbles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-white/20"
          style={{
            width:  6 + (i % 4) * 6,
            height: 6 + (i % 4) * 6,
            left:   `${5 + (i * 8.3) % 90}%`,
            bottom: '-5%',
            background: 'rgba(255,255,255,0.06)',
          }}
          animate={{ y: [0, -(500 + i * 40)], opacity: [0.5, 0] }}
          transition={{
            duration: 4 + (i % 4),
            repeat: Infinity,
            delay: i * 0.55,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function CoralCode({ onEnd, onDeductEnergy, energy }: MiniGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [codeLength, setCodeLength] = useState<number>(4);
  const [availableColors, setAvailableColors] = useState<ColorId[]>(ORB_COLORS.slice(0, 5).map(c => c.id));
  const [secretCode, setSecretCode] = useState<ColorId[]>([]);
  const [currentGuess, setCurrentGuess] = useState<ColorId[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);
  const [winFlash, setWinFlash] = useState(false);
  const guessIdRef = useRef<number>(0);
  const guessesContainerRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback((selectedDifficulty: Difficulty) => {
    const hadEnergy = Math.floor(energy) >= 1;
    if (hadEnergy) onDeductEnergy?.();
    setHadEnergyAtStart(hadEnergy);
    const config = DIFFICULTY_CONFIG[selectedDifficulty];
    const colors = getAvailableColors(selectedDifficulty);
    setDifficulty(selectedDifficulty);
    setCodeLength(config.codeLength);
    setAvailableColors(colors);
    setSecretCode(generateSecretCode(config.codeLength, colors));
    setCurrentGuess([]);
    setGuesses([]);
    setIsPlaying(true);
    setHasEnded(false);
    setGameEnded(false);
    setFinalRewards(null);
    setShowOverlay(false);
    setWinFlash(false);
    guessIdRef.current = 0;
  }, [energy, onDeductEnergy]);

  useEffect(() => {
    if (guessesContainerRef.current && guesses.length > 0) {
      guessesContainerRef.current.scrollTop = guessesContainerRef.current.scrollHeight;
    }
  }, [guesses.length]);

  const addColor = useCallback((color: ColorId) => {
    setCurrentGuess(prev => prev.length < codeLength ? [...prev, color] : prev);
  }, [codeLength]);

  const removeColor = useCallback((index: number) => {
    setCurrentGuess(prev => prev.filter((_, i) => i !== index));
  }, []);

  const submitGuess = useCallback(() => {
    if (currentGuess.length !== codeLength || !isPlaying || isPaused || hasEnded) return;
    if (secretCode.length === 0) return;

    const feedback = checkGuess(secretCode, currentGuess, codeLength);
    const newGuess: Guess = { id: guessIdRef.current++, colors: [...currentGuess], feedback };

    setGuesses(prev => {
      const newGuesses = [...prev, newGuess];
      const won = feedback.correct === codeLength;
      const lost = newGuesses.length >= MAX_GUESSES && !won;

      if (won || lost) {
        const score = won ? MAX_GUESSES - newGuesses.length : 0;
        setIsPlaying(false);
        setHasEnded(true);
        setGameEnded(true);
        setFinalScore(score);
        if (won) setWinFlash(true);
        const rewards = hadEnergyAtStart
          ? calculateRewards('coral-code', score)
          : { tier: 'normal', xp: 0, coins: 0, opals: undefined };
        setFinalRewards({ tier: rewards.tier, xp: rewards.xp, coins: rewards.coins, opals: rewards.opals });
        setTimeout(() => setShowOverlay(true), won ? 800 : 300);
      }
      return newGuesses;
    });
    setCurrentGuess([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGuess.length, secretCode, codeLength, isPlaying, isPaused, hasEnded]);

  return (
    <GameWrapper
      gameName="Coral Code"
      score={MAX_GUESSES - guesses.length}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
      gameEnded={gameEnded}
    >
      {/* Ocean background */}
      <div
        className="relative w-full h-full flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d2545 40%, #0e3060 100%)' }}
      >
        <OceanBubbles />

        {/* Win flash overlay */}
        <AnimatePresence>
          {winFlash && (
            <motion.div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at center, rgba(46,213,115,0.4) 0%, transparent 70%)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.8 }}
              onAnimationComplete={() => setWinFlash(false)}
            />
          )}
        </AnimatePresence>

        {/* Start / End Overlay */}
        <AnimatePresence>
          {showOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center p-4"
              style={{ background: 'rgba(5,15,35,0.82)', backdropFilter: 'blur(8px)' }}
            >
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="w-full max-w-xs rounded-3xl p-6 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, rgba(13,37,80,0.98) 0%, rgba(10,22,48,0.98) 100%)',
                  border: '1.5px solid rgba(69,207,255,0.25)',
                  boxShadow: '0 0 60px rgba(69,207,255,0.12), 0 20px 60px rgba(0,0,0,0.5)',
                }}
              >
                {/* Glow orb behind card */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(69,207,255,0.12) 0%, transparent 70%)' }} />

                {!isPlaying && !gameEnded ? (
                  /* ── Start screen ── */
                  <>
                    <div className="text-center mb-5">
                      <motion.div
                        animate={{ y: [0, -8, 0], rotate: [0, 4, -4, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-5xl mb-3"
                      >
                        🪸
                      </motion.div>
                      <h2
                        className="text-2xl font-black mb-1"
                        style={{
                          background: 'linear-gradient(135deg, #45cfff 0%, #c084fc 60%, #45cfff 100%)',
                          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                        }}
                      >
                        Coral Code
                      </h2>
                      <p className="text-cyan-300/60 text-xs mb-4">Crack the secret color code!</p>

                      {/* Legend */}
                      <div className="rounded-2xl p-3 mb-5 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex items-center gap-2 text-xs text-white/70">
                          <div style={{ width:12,height:12,borderRadius:'50%', background:'radial-gradient(circle at 35% 35%,#6dff8a,#1db954)', boxShadow:'0 0 5px #1db95488' }} />
                          <span>Right color, right spot</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/70">
                          <div style={{ width:12,height:12,borderRadius:'50%', background:'radial-gradient(circle at 35% 35%,#ffe234,#ffa502)', boxShadow:'0 0 5px #ffa50288' }} />
                          <span>Right color, wrong spot</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/70">
                          <div style={{ width:12,height:12,borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)' }} />
                          <span>Not in the code</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {(['easy', 'normal', 'hard'] as Difficulty[]).map((diff, i) => {
                        const cfg = DIFFICULTY_CONFIG[diff];
                        const gradients = [
                          'linear-gradient(135deg,#1e87e5,#0a5bb5)',
                          'linear-gradient(135deg,#9b3fd4,#6a1ea0)',
                          'linear-gradient(135deg,#e84545,#a01e1e)',
                        ];
                        return (
                          <motion.button
                            key={diff}
                            onClick={() => startGame(diff)}
                            whileTap={{ scale: 0.96 }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-white relative overflow-hidden"
                            style={{ background: gradients[i], boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
                          >
                            <span className="text-2xl">{cfg.emoji}</span>
                            <div className="text-left">
                              <div className="text-sm font-black">{cfg.label}</div>
                              <div className="text-xs opacity-70">{cfg.desc}</div>
                            </div>
                            <motion.div
                              className="absolute inset-0"
                              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ duration: 2.2 + i * 0.3, repeat: Infinity, ease: 'linear', delay: i * 0.4 }}
                            />
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                ) : gameEnded && finalRewards ? (
                  /* ── End screen ── */
                  <>
                    <div className="text-center mb-5">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                        className="text-5xl mb-3"
                      >
                        {finalScore >= 8 ? '🏆' : finalScore >= 5 ? '🌟' : finalScore > 0 ? '🎮' : '🐡'}
                      </motion.div>
                      <h2
                        className="text-2xl font-black mb-1"
                        style={{
                          background: finalScore > 0
                            ? 'linear-gradient(135deg, #6dff8a, #45cfff)'
                            : 'linear-gradient(135deg, #ff9f43, #ff6b6b)',
                          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                        }}
                      >
                        {finalScore > 0 ? 'Code Cracked!' : 'Out of Guesses!'}
                      </h2>
                      <p className="text-white/50 text-xs mb-1">
                        {finalScore >= 8 ? '🌊 Master codebreaker!' : finalScore >= 5 ? '🐠 Great solving!' : finalScore > 0 ? '🐙 Nice try!' : '💪 Keep practicing!'}
                      </p>

                      {/* Secret code reveal on loss */}
                      {finalScore === 0 && (
                        <div className="mt-3 mb-1">
                          <p className="text-white/40 text-xs mb-2">The secret code was:</p>
                          <div className="flex justify-center gap-2">
                            {secretCode.map((c, i) => (
                              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}>
                                <Orb id={c} size={32} />
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Score bar */}
                      <div className="mt-3 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-white/40 text-xs mb-1.5">Score</p>
                        <div className="flex justify-center gap-1.5">
                          {Array.from({ length: MAX_GUESSES }).map((_, i) => (
                            <div
                              key={i}
                              style={{
                                width: 14, height: 14, borderRadius: 4,
                                background: i < finalScore
                                  ? 'linear-gradient(135deg,#2ed573,#17a85a)'
                                  : 'rgba(255,255,255,0.08)',
                                boxShadow: i < finalScore ? '0 0 6px #2ed57366' : 'none',
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-white font-black text-lg mt-1">{finalScore} / {MAX_GUESSES}</p>
                      </div>
                    </div>

                    {/* Rewards */}
                    {hadEnergyAtStart && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
                      <div className="rounded-2xl p-3 mb-4 text-center" style={{ background: 'rgba(46,213,115,0.1)', border: '1px solid rgba(46,213,115,0.25)' }}>
                        <p className="text-emerald-300 text-xs font-bold mb-2">Rewards Earned!</p>
                        <div className="flex justify-center gap-4 text-white text-sm font-bold">
                          <span>⭐ +{finalRewards.xp} XP</span>
                          <span>🪙 +{finalRewards.coins}</span>
                          {finalRewards.opals && <span>🪬 +{finalRewards.opals}</span>}
                        </div>
                      </div>
                    ) : hadEnergyAtStart ? null : (
                      <div className="rounded-2xl p-3 mb-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <p className="text-white/40 text-xs">No energy — played for fun!</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => {
                          setGameEnded(false); setFinalRewards(null); setDifficulty(null);
                          setSecretCode([]); setCurrentGuess([]); setGuesses([]);
                          setHasEnded(false); setShowOverlay(true);
                        }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 py-3 rounded-2xl font-black text-white text-sm"
                        style={{ background: 'linear-gradient(135deg,#1e87e5,#0a5bb5)', boxShadow: '0 4px 15px rgba(30,135,229,0.4)' }}
                      >
                        Play Again
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          onEnd(hadEnergyAtStart && finalRewards
                            ? { score: finalScore, tier: finalRewards.tier as 'normal'|'good'|'exceptional', xp: finalRewards.xp, coins: finalRewards.coins, opals: finalRewards.opals }
                            : { score: finalScore, tier: 'normal', xp: 0, coins: 0 });
                        }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 py-3 rounded-2xl font-bold text-white/60 text-sm"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                      >
                        Exit
                      </motion.button>
                    </div>
                  </>
                ) : null}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active game ── */}
        {difficulty && secretCode.length > 0 && !showOverlay && (
          <div className="relative z-0 flex flex-col h-full p-3 gap-2">

            {/* Header bar */}
            <div className="flex items-center justify-between flex-shrink-0 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{DIFFICULTY_CONFIG[difficulty].emoji}</span>
                <span className="text-white/70 text-xs font-bold">{DIFFICULTY_CONFIG[difficulty].label}</span>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <span className="text-cyan-300 font-black text-sm">{MAX_GUESSES - guesses.length}</span>
                <span className="text-white/40 text-xs">left</span>
              </div>
            </div>

            {/* Guess history */}
            <div ref={guessesContainerRef} className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              <AnimatePresence initial={false}>
                {guesses.map((guess, index) => {
                  const isLatest = index === guesses.length - 1;
                  return (
                    <motion.div
                      key={guess.id}
                      initial={{ opacity: 0, x: -16, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
                      style={{
                        background: isLatest
                          ? 'rgba(69,207,255,0.12)'
                          : 'rgba(255,255,255,0.05)',
                        border: isLatest
                          ? '1.5px solid rgba(69,207,255,0.35)'
                          : '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      {/* Guess number */}
                      <span className="text-white/25 text-xs w-4 text-right flex-shrink-0">{index + 1}</span>

                      {/* Color orbs */}
                      <div className="flex gap-1.5 flex-1">
                        {guess.colors.map((c, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                          >
                            <Orb id={c} size={28} glow={isLatest} />
                          </motion.div>
                        ))}
                      </div>

                      {/* Feedback pegs */}
                      <FeedbackPegs correct={guess.feedback.correct} wrongPosition={guess.feedback.wrongPosition} total={codeLength} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Empty rows hint */}
              {guesses.length === 0 && (
                <div className="flex items-center justify-center h-16">
                  <p className="text-white/20 text-xs">Your guesses will appear here</p>
                </div>
              )}
            </div>

            {/* ── Input area ── */}
            <div
              className="flex-shrink-0 rounded-2xl p-3"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(69,207,255,0.2)',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
              }}
            >
              {/* Current guess slots */}
              <div className="flex items-center justify-center gap-2 mb-3">
                {Array.from({ length: codeLength }).map((_, i) => {
                  const filled = i < currentGuess.length;
                  return (
                    <motion.button
                      key={i}
                      onClick={() => filled && removeColor(i)}
                      whileTap={filled ? { scale: 0.85 } : {}}
                      style={{
                        width: 40, height: 40,
                        borderRadius: '50%',
                        background: filled ? undefined : 'rgba(255,255,255,0.04)',
                        border: filled ? 'none' : '2px dashed rgba(255,255,255,0.18)',
                        flexShrink: 0,
                      }}
                    >
                      {filled && <Orb id={currentGuess[i]} size={40} />}
                    </motion.button>
                  );
                })}
              </div>

              {/* Color picker */}
              <div className={`grid gap-2 mb-3 ${availableColors.length <= 4 ? 'grid-cols-4' : availableColors.length === 5 ? 'grid-cols-5' : 'grid-cols-6'}`}>
                {availableColors.map((id) => {
                  const orb = getOrb(id);
                  return (
                    <motion.button
                      key={id}
                      onClick={() => addColor(id)}
                      disabled={currentGuess.length >= codeLength}
                      whileTap={{ scale: 0.82 }}
                      whileHover={{ scale: 1.1 }}
                      className="flex items-center justify-center disabled:opacity-40"
                      style={{ aspectRatio: '1' }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: `radial-gradient(circle at 35% 35%, ${orb.from}, ${orb.to})`,
                        boxShadow: `0 0 12px ${orb.shadow}66, inset 0 2px 5px rgba(255,255,255,0.4)`,
                      }} />
                    </motion.button>
                  );
                })}
              </div>

              {/* Submit */}
              <motion.button
                onClick={submitGuess}
                disabled={currentGuess.length !== codeLength || !isPlaying}
                whileTap={{ scale: 0.96 }}
                className="w-full py-3 rounded-2xl font-black text-white text-sm disabled:opacity-30 relative overflow-hidden"
                style={{
                  background: currentGuess.length === codeLength
                    ? 'linear-gradient(135deg,#2ed573,#1db954)'
                    : 'rgba(255,255,255,0.08)',
                  boxShadow: currentGuess.length === codeLength ? '0 4px 20px rgba(46,213,115,0.45)' : 'none',
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
              >
                {currentGuess.length === codeLength ? (
                  <>
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)' }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className="relative">✓ Submit Guess</span>
                  </>
                ) : (
                  <span className="text-white/40">Pick {codeLength - currentGuess.length} more</span>
                )}
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </GameWrapper>
  );
}
