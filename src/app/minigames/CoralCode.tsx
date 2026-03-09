/**
 * Coral Code - Mastermind game
 * Guess the secret code in 10 tries
 * Score = 10 - guesses used (higher is better)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const MAX_GUESSES = 10;
const COLORS = ['🔴', '🟡', '🟢', '🔵', '🟣', '🟠'];

type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { codeLength: number; colorCount: number; label: string }> = {
  easy: { codeLength: 3, colorCount: 4, label: 'Easy (3 slots)' },
  normal: { codeLength: 4, colorCount: 5, label: 'Normal (4 slots)' },
  hard: { codeLength: 5, colorCount: 6, label: 'Hard (5 slots)' },
};

function getAvailableColors(difficulty: Difficulty): string[] {
  const colorCount = DIFFICULTY_CONFIG[difficulty].colorCount;
  return COLORS.slice(0, colorCount);
}

function generateSecretCode(codeLength: number, availableColors: string[]): string[] {
  const code: string[] = [];
  for (let i = 0; i < codeLength; i++) {
    code.push(availableColors[Math.floor(Math.random() * availableColors.length)]);
  }
  return code;
}

function checkGuess(secret: string[], guess: string[], codeLength: number): { correct: number; wrongPosition: number } {
  const secretCounts = new Map<string, number>();
  const guessCounts = new Map<string, number>();
  let correct = 0;
  
  // Count correct positions
  for (let i = 0; i < codeLength; i++) {
    if (secret[i] === guess[i]) {
      correct++;
    } else {
      secretCounts.set(secret[i], (secretCounts.get(secret[i]) || 0) + 1);
      guessCounts.set(guess[i], (guessCounts.get(guess[i]) || 0) + 1);
    }
  }
  
  // Count wrong positions (right color, wrong place)
  let wrongPosition = 0;
  for (const [color, count] of guessCounts.entries()) {
    const secretCount = secretCounts.get(color) || 0;
    wrongPosition += Math.min(count, secretCount);
  }
  
  return { correct, wrongPosition };
}

interface Guess {
  id: number;
  colors: string[];
  feedback: { correct: number; wrongPosition: number };
}

export function CoralCode({ onEnd, energy }: MiniGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [codeLength, setCodeLength] = useState<number>(4);
  const [availableColors, setAvailableColors] = useState<string[]>(COLORS.slice(0, 5));
  const [secretCode, setSecretCode] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [hasEnded, setHasEnded] = useState(false);
  const guessIdRef = useRef<number>(0);
  const guessesContainerRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback((selectedDifficulty: Difficulty) => {
    setHadEnergyAtStart(energy > 0);
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
    setSelectedColor(colors[0]);
    guessIdRef.current = 0;
  }, [energy]);

  // Auto-scroll to bottom when new guess is added
  useEffect(() => {
    if (guessesContainerRef.current && guesses.length > 0) {
      guessesContainerRef.current.scrollTop = guessesContainerRef.current.scrollHeight;
    }
  }, [guesses.length]);

  const addColorToGuess = useCallback((color: string) => {
    setCurrentGuess(prev => {
      if (prev.length < codeLength) {
        return [...prev, color];
      }
      return prev;
    });
  }, [codeLength]);

  const removeColorFromGuess = useCallback((index: number) => {
    setCurrentGuess(prev => prev.filter((_, i) => i !== index));
  }, []);

  const submitGuess = useCallback(() => {
    if (currentGuess.length !== codeLength || !isPlaying || isPaused || hasEnded) return;
    if (secretCode.length === 0) return; // Safety check

    const feedback = checkGuess(secretCode, currentGuess, codeLength);
    const newGuess: Guess = {
      id: guessIdRef.current++,
      colors: [...currentGuess],
      feedback,
    };

    setGuesses(prev => {
      const newGuesses = [...prev, newGuess];
      const newGuessCount = newGuesses.length;

      // Check win condition
      if (feedback.correct === codeLength) {
        // Won!
        const score = MAX_GUESSES - newGuessCount; // Higher score = fewer guesses
        setIsPlaying(false);
        setHasEnded(true);
        setGameEnded(true);
        setFinalScore(score);
        
        // Only calculate and show rewards if energy was available at start
        if (hadEnergyAtStart) {
          const rewards = calculateRewards('coral-code', score);
          setFinalRewards({
            tier: rewards.tier,
            xp: rewards.xp,
            coins: rewards.coins,
            opals: rewards.opals,
          });
        } else {
          setFinalRewards({
            tier: 'normal',
            xp: 0,
            coins: 0,
            opals: undefined,
          });
        }
        setShowOverlay(true);
        return newGuesses;
      }

      // Check lose condition
      if (newGuessCount >= MAX_GUESSES) {
        // Out of guesses
        setIsPlaying(false);
        setHasEnded(true);
        setGameEnded(true);
        setFinalScore(0);
        
        // Only calculate and show rewards if energy was available at start
        if (hadEnergyAtStart) {
          const rewards = calculateRewards('coral-code', 0);
          setFinalRewards({
            tier: rewards.tier,
            xp: rewards.xp,
            coins: rewards.coins,
            opals: rewards.opals,
          });
        } else {
          setFinalRewards({
            tier: 'normal',
            xp: 0,
            coins: 0,
            opals: undefined,
          });
        }
        setShowOverlay(true);
        return newGuesses;
      }

      return newGuesses;
    });
    setCurrentGuess([]);
  }, [currentGuess.length, secretCode, codeLength, isPlaying, isPaused, hasEnded, onEnd]);


  return (
    <GameWrapper
      gameName="Coral Code"
      score={MAX_GUESSES - guesses.length}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full flex flex-col p-4 bg-gradient-to-br from-purple-100 via-pink-100 to-violet-100">
        {/* Start/End Overlay */}
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-pink-900/80 to-violet-900/80 backdrop-blur-md z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-purple-100 via-pink-100 to-violet-100 rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-purple-300/80 shadow-2xl relative overflow-hidden"
            >
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-200/30 rounded-full blur-xl -ml-12 -mb-12" />
              
              <div className="relative z-10">
                {!isPlaying && !gameEnded ? (
                  <>
                    <div className="text-center mb-6">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-6xl mb-4"
                      >
                        🪸
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600 mb-4">
                        Coral Code
                      </h2>
                      <div className="space-y-2 text-purple-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🎯</span>
                          Crack the secret code!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">✓</span>
                          Green = correct color & position
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">○</span>
                          Yellow = correct color, wrong position
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">💡</span>
                          Choose your difficulty below
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {(['easy', 'normal', 'hard'] as Difficulty[]).map((diff) => (
                        <motion.button
                          key={diff}
                          onClick={() => startGame(diff)}
                          className="w-full bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg relative overflow-hidden group"
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <span className="relative z-10">{DIFFICULTY_CONFIG[diff].label}</span>
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          />
                        </motion.button>
                      ))}
                    </div>
                  </>
                ) : gameEnded && finalRewards ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">
                        {finalScore >= 8 ? '✨' : finalScore >= 5 ? '🎉' : finalScore > 0 ? '🎮' : '😅'}
                      </div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600 mb-4">
                        {finalScore > 0 ? 'Code Cracked!' : 'Out of Guesses!'}
                      </h2>
                      <p className="text-purple-800 text-center mb-2 text-2xl font-bold">
                        Score: {finalScore} / {MAX_GUESSES}
                      </p>
                      <p className="text-purple-600 text-center mb-4 text-sm font-medium">
                        {finalScore >= 8 ? '🌟 Master codebreaker!' : finalScore >= 5 ? '🎯 Great job!' : finalScore > 0 ? '💪 Good try!' : '💪 Keep practicing!'}
                      </p>
                      
                      {/* Rewards display - only show if energy was used */}
                      {hadEnergyAtStart && finalRewards && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-purple-200">
                          <p className="text-purple-700 font-bold text-lg mb-2">Rewards:</p>
                          <div className="flex flex-col gap-2 text-purple-800">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xl">⭐</span>
                              <span className="font-semibold">+{finalRewards.xp} XP</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xl">💰</span>
                              <span className="font-semibold">+{finalRewards.coins} Coins</span>
                            </div>
                            {finalRewards.opals && (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">🪬</span>
                                <span className="font-semibold">+{finalRewards.opals} Opals</span>
                              </div>
                            )}
                            <p className="text-xs text-purple-600 mt-1">
                              Tier: {finalRewards.tier.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-purple-200">
                          <p className="text-purple-700 font-bold text-lg mb-2">No Energy!</p>
                          <p className="text-purple-600 text-center text-sm">
                            Played for fun but no rewards earned.<br />
                            Energy regenerates over time.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => {
                          setGameEnded(false);
                          setFinalRewards(null);
                          setDifficulty(null);
                          setSecretCode([]);
                          setCurrentGuess([]);
                          setGuesses([]);
                          setHasEnded(false);
                          setShowOverlay(true);
                        }}
                        className="flex-1 bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg relative overflow-hidden group"
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <span className="relative z-10">Play Again</span>
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          // Call onEnd with actual rewards when leaving (only if energy was used)
                          if (hadEnergyAtStart && finalRewards) {
                            onEnd({
                              score: finalScore,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: finalRewards.xp,
                              coins: finalRewards.coins,
                              opals: finalRewards.opals,
                            });
                          } else {
                            // No rewards if no energy
                            onEnd({
                              score: finalScore,
                              tier: 'normal',
                              xp: 0,
                              coins: 0,
                            });
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold py-3 rounded-xl shadow-lg"
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        Back to Games
                      </motion.button>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Game content - only show if difficulty is selected and not showing overlay */}
        {difficulty && secretCode.length > 0 && !showOverlay && (
          <>
            {/* Title - compact */}
            <div className="mb-2 flex-shrink-0">
              <h3 className="text-xl font-bold text-purple-800 text-center">
                {DIFFICULTY_CONFIG[difficulty].label} • {MAX_GUESSES - guesses.length} guesses left
              </h3>
            </div>

            {/* Previous guesses - more space */}
            <div 
              ref={guessesContainerRef}
              className="flex-1 overflow-y-auto w-full mb-2 space-y-1.5 pr-1"
            >
              {guesses.map((guess, index) => {
                const isMostRecent = index === guesses.length - 1;
                return (
                  <motion.div
                    key={guess.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`bg-white/80 backdrop-blur-sm rounded-lg p-2 border-2 ${
                      isMostRecent 
                        ? 'border-purple-500 bg-purple-50 shadow-md' 
                        : 'border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {guess.colors.map((color, i) => (
                        <div key={i} className="text-2xl">{color}</div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                        ✓ {guess.feedback.correct}
                      </span>
                      <span className="bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">
                        ○ {guess.feedback.wrongPosition}
                      </span>
                      {isMostRecent && (
                        <span className="ml-auto text-purple-600 font-semibold text-xs">Latest</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Current guess - compact */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 border-4 border-purple-400 flex-shrink-0">
              <div className="flex items-center justify-center gap-1.5 mb-2 min-h-[50px]">
                {currentGuess.map((color, index) => (
                  <motion.button
                    key={index}
                    onClick={() => removeColorFromGuess(index)}
                    className="text-3xl"
                    whileTap={{ scale: 0.9 }}
                  >
                    {color}
                  </motion.button>
                ))}
                {[...Array(codeLength - currentGuess.length)].map((_, i) => (
                  <div key={i} className="w-10 h-10 border-2 border-dashed border-purple-300 rounded-lg" />
                ))}
              </div>

              {/* Color picker - compact */}
              <div className={`grid gap-1.5 mb-2 ${availableColors.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {availableColors.map((color) => (
                  <motion.button
                    key={color}
                    onClick={() => addColorToGuess(color)}
                    disabled={currentGuess.length >= codeLength}
                    className={`text-3xl p-1.5 rounded-lg border-2 ${
                      selectedColor === color
                        ? 'border-purple-600 bg-purple-100'
                        : 'border-purple-200 bg-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setSelectedColor(color)}
                  >
                    {color}
                  </motion.button>
                ))}
              </div>

              {/* Submit button - compact */}
              <motion.button
                onClick={submitGuess}
                disabled={currentGuess.length !== codeLength || !isPlaying}
                className="w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                whileTap={{ scale: 0.95 }}
              >
                Submit Guess
              </motion.button>
            </div>
          </>
        )}
      </div>
    </GameWrapper>
  );
}
