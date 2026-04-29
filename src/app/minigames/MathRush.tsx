/**
 * Math Rush - Solve math equations fast!
 * Equations appear with multiple choice. Timer counts down.
 * Score = number of correct answers
 * Features: Emoji themes, progressive difficulty, division support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { motion, useAnimation } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps } from './types';
import { calculateRewards } from './config';
import { Droplets, Gem, Zap, Star, Trophy, Gamepad2, Rocket, Target, Heart } from 'lucide-react';
import { CoinIcon, OpalIcon } from '../components/icons';
import { useGameSFX } from '../hooks/useGameSFX';
import { EndScreenFooter } from './components/EndScreenFooter';
import { EnergyEmptyBanner } from './components/EnergyEmptyBanner';

/**
 * Returns the operator family currently in rotation given how many questions
 * have been ANSWERED so far (= score, since wrong answers end the run unless
 * easy-mode lives). Used by the persistent legend HUD.
 *
 * Bands match generateQuestion's rules:
 *   Q1–4:   +
 *   Q5–12:  + −
 *   Q13–24: + − ×
 *   Q25–32: + − × ÷
 *   Q33+:   + − × ÷ √
 */
function activeOperators(qCount: number): string {
  if (qCount < 4) return '+';
  if (qCount < 12) return '+  −';
  if (qCount < 24) return '+  −  ×';
  if (qCount < 32) return '+  −  ×  ÷';
  return '+  −  ×  ÷  √';
}

/** Highest operator family the player saw — used for end-screen coaching. */
function highestOperatorReached(qCount: number): 'addition' | 'subtraction' | 'multiplication' | 'division' | 'sqrt' {
  if (qCount < 5) return 'addition';
  if (qCount < 13) return 'subtraction';
  if (qCount < 25) return 'multiplication';
  if (qCount < 33) return 'division';
  return 'sqrt';
}

const INITIAL_TIMER = 10; // seconds per question

const THEMES: Array<{ icon: React.ReactNode; name: string }> = [
  { icon: <Droplets className="w-10 h-10 text-sky-400" />, name: 'ghost shrimp' },
  { icon: <Gem className="w-10 h-10 text-violet-400" />, name: 'shells' },
  { icon: <Gem className="w-10 h-10 text-cyan-400" />, name: 'gems' },
  { icon: <Zap className="w-10 h-10 text-amber-400" />, name: 'bubbles' },
];

interface Question {
  question: string;
  answer: number;
  options: number[];
  themeIcon: React.ReactNode;
}

// Perfect squares for square-root questions (Q33+)
const PERFECT_SQUARES = [4, 9, 16, 25, 36, 49, 64, 81, 100];

/**
 * Generate a question based on how many questions have been asked so far.
 *  Q1–4:   addition only
 *  Q5–12:  addition + subtraction
 *  Q13–24: addition + subtraction + multiplication
 *  Q25–32: addition + subtraction + multiplication + division
 *  Q33+:   all of the above + square roots
 */
function generateQuestion(questionCount: number): Question {
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  let a: number, b: number, answer: number, questionText: string;

  // Determine which operations are available based on question number
  const hasSubtraction   = questionCount >= 5;
  const hasMultiplication = questionCount >= 13;
  const hasDivision      = questionCount >= 25;
  const hasSquareRoot    = questionCount >= 33;

  // Build pool of available operations
  const ops: string[] = ['+'];
  if (hasSubtraction)    ops.push('-');
  if (hasMultiplication) ops.push('×');
  if (hasDivision)       ops.push('÷');
  if (hasSquareRoot)     ops.push('√');

  const op = ops[Math.floor(Math.random() * ops.length)];

  if (op === '+') {
    const range = hasMultiplication ? 20 : hasSubtraction ? 15 : 10;
    a = 1 + Math.floor(Math.random() * range);
    b = 1 + Math.floor(Math.random() * range);
    answer = a + b;
    questionText = `${a} + ${b} = ?`;
  } else if (op === '-') {
    const range = hasDivision ? 20 : 15;
    a = 2 + Math.floor(Math.random() * range);
    b = 1 + Math.floor(Math.random() * a);
    answer = a - b;
    questionText = `${a} − ${b} = ?`;
  } else if (op === '×') {
    const maxFactor = hasDivision ? 10 : 8;
    a = 2 + Math.floor(Math.random() * maxFactor);
    b = 2 + Math.floor(Math.random() * maxFactor);
    answer = a * b;
    questionText = `${a} × ${b} = ?`;
  } else if (op === '÷') {
    b = 2 + Math.floor(Math.random() * 8);
    answer = 2 + Math.floor(Math.random() * 8);
    a = b * answer;
    questionText = `${a} ÷ ${b} = ?`;
  } else {
    // √ square root
    const square = PERFECT_SQUARES[Math.floor(Math.random() * PERFECT_SQUARES.length)];
    answer = Math.round(Math.sqrt(square));
    questionText = `√${square} = ?`;
  }

  // Generate 3 wrong answers
  const wrongSet = new Set<number>();
  const range = questionCount < 5 ? 5 : questionCount < 13 ? 6 : 8;
  while (wrongSet.size < 3) {
    const offset = Math.floor(Math.random() * (range * 2 + 1)) - range;
    const wrong = answer + (offset === 0 ? 1 : offset);
    if (wrong !== answer && wrong >= 0 && !wrongSet.has(wrong)) {
      wrongSet.add(wrong);
    }
  }

  const options = [answer, ...Array.from(wrongSet)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { question: questionText, answer, options, themeIcon: theme.icon };
}

export function MathRush({ onEnd, onDeductEnergy, onApplyReward, energy, soundEnabled = true, personalBest = 0 }: MiniGameProps) {
  const sfx = useGameSFX(soundEnabled);
  const lastTickSecRef = useRef<number>(-1);
  // Brief screen shake on wrong answer — quick visceral feedback that
  // doesn't disrupt the rapid-fire question flow.
  const shakeControls = useAnimation();
  // Stash PB at game start so end-screen comparison stays stable
  const previousBestRef = useRef(0);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0); // 1-based count of questions asked
  const [isPlaying, setIsPlaying] = useState(false); // Start with false, show overlay first
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false); // Track if energy was available when game started
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  const cumulativeRef = useRef({ xp: 0, hadAnyEnergy: false });
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timer, setTimer] = useState(INITIAL_TIMER);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'correct' | 'wrong' | '' }>({ text: '', type: '' });
  const [waitingForNext, setWaitingForNext] = useState(false);
  const timerIntervalRef = useRef<number | null>(null);
  // Easy mode: toggled in the start overlay. Adds a 2-life buffer so a single
  // wrong answer doesn't end the run — important for the younger end of the
  // 8–12 demographic.
  const [easyMode, setEasyMode] = useState(false);
  const [livesRemaining, setLivesRemaining] = useState(0);

  const getTimerForScore = useCallback((currentScore: number) => {
    // Timer decay: 50ms per correct answer, floored at 4s.
    // Was 100ms decay floored at 3s — too steep for the 8–12 demo. Now 6s → 4s
    // takes 40 correct answers to reach instead of 30, and the floor leaves
    // breathing room for accuracy under pressure.
    const timerMs = Math.max(4000, 6000 - currentScore * 50);
    return timerMs / 1000;
  }, []);

  const loadNewQuestion = useCallback((currentQCount: number) => {
    const newQuestion = generateQuestion(currentQCount + 1); // +1 because this will be the next question
    const newTimer = getTimerForScore(score);
    setCurrentQuestion(newQuestion);
    setTimer(newTimer);
    setQuestionCount(currentQCount + 1);
    setSelectedAnswer(null);
    setFeedback({ text: '', type: '' });
    setWaitingForNext(false);
  }, [score, getTimerForScore]);

  const startGame = useCallback(() => {
    const hadEnergy = Math.floor(energy) >= 1;
    if (hadEnergy) onDeductEnergy?.();
    setHadEnergyAtStart(hadEnergy);
    setScore(0);
    setQuestionCount(0);
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    setIsPlaying(true);
    setIsPaused(false);
    setLivesRemaining(easyMode ? 2 : 1);
    lastTickSecRef.current = -1;
    previousBestRef.current = personalBest;
    sfx.play('start');
    loadNewQuestion(0);
  }, [loadNewQuestion, energy, onDeductEnergy, sfx, easyMode, personalBest]);

  // Timer countdown - only when playing and question is loaded
  useEffect(() => {
    if (!isPlaying || isPaused || !currentQuestion || waitingForNext) return;

    timerIntervalRef.current = window.setInterval(() => {
      setTimer(prev => {
        if (prev <= 0.1) {
          // Time's up - game over
          setFeedback({ text: '⏰ Time\'s up!', type: 'wrong' });
          setTimeout(() => {
            setIsPlaying(false);
          }, 800);
          return 0;
        }
        const next = prev - 0.1;
        // One quiet tick per whole second remaining when ≤2s left
        const flooredSec = Math.ceil(next);
        if (next <= 2 && flooredSec !== lastTickSecRef.current && flooredSec > 0) {
          lastTickSecRef.current = flooredSec;
          sfx.play('tick');
        }
        return next;
      });
    }, 100);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isPlaying, isPaused, currentQuestion, waitingForNext, sfx]);

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameEnded(true);
    // Only calculate and show rewards if energy was available at start
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('math-rush', score);
      cumulativeRef.current.xp += rewards.xp;
      cumulativeRef.current.hadAnyEnergy = true;
      onApplyReward?.(rewards.coins, rewards.opals);
      setFinalRewards({
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
      setTimeout(() => {
        if (rewards.tier === 'exceptional') sfx.play('tier_exceptional');
        else if (rewards.tier === 'good') sfx.play('tier_good');
        else sfx.play('lose');
      }, 350);
    } else {
      // No rewards if no energy
      setFinalRewards({
        tier: 'normal',
        xp: 0,
        coins: 0,
        opals: undefined,
      });
      setTimeout(() => sfx.play('lose'), 350);
    }
    setShowOverlay(true);
  }, [score, hadEnergyAtStart, sfx, onApplyReward]);

  const handleAnswer = useCallback((answer: number) => {
    if (!currentQuestion || selectedAnswer !== null || waitingForNext) return;

    setSelectedAnswer(answer);
    setWaitingForNext(true);

    if (answer === currentQuestion.answer) {
      // Correct!
      setFeedback({ text: 'Correct!', type: 'correct' });
      setScore(prev => prev + 1);
      // Pitch climbs slightly with score so the run feels like a building combo
      sfx.play('correct', { pitch: 1 + Math.min(0.5, score * 0.03) });
      setTimeout(() => {
        if (isPlaying) { // Only load next if still playing
          loadNewQuestion(questionCount);
        }
      }, 500);
    } else {
      // Wrong answer — easy mode burns a life and continues; standard ends the run
      const remaining = livesRemaining - 1;
      setLivesRemaining(remaining);
      sfx.play('wrong');
      // Brief screen shake — 200ms — adds visceral weight without slowing the run
      shakeControls.start({
        x: [0, -6, 6, -4, 4, 0],
        transition: { duration: 0.2, ease: 'easeOut' },
      });
      if (remaining > 0) {
        setFeedback({ text: 'Oops! Keep going.', type: 'wrong' });
        setTimeout(() => {
          if (isPlaying) loadNewQuestion(questionCount);
        }, 700);
      } else {
        setFeedback({ text: 'Wrong!', type: 'wrong' });
        setTimeout(() => {
          endGame();
        }, 800);
      }
    }
  }, [currentQuestion, selectedAnswer, waitingForNext, loadNewQuestion, questionCount, isPlaying, endGame, sfx, score, livesRemaining, shakeControls]);

  // Handle timer running out
  useEffect(() => {
    if (timer <= 0 && isPlaying && currentQuestion && !waitingForNext) {
      setFeedback({ text: '⏰ Time\'s up!', type: 'wrong' });
      setTimeout(() => {
        endGame();
      }, 800);
    }
  }, [timer, isPlaying, currentQuestion, waitingForNext, endGame]);

  return (
    <GameWrapper
      gameName="Math Rush"
      score={score}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
      gameEnded={gameEnded}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100">
        {/* Start/End Overlay */}
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-violet-900/80 via-purple-900/80 to-indigo-900/80 backdrop-blur-md z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100 rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-purple-300/80 shadow-2xl relative overflow-hidden"
            >
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/30 rounded-full blur-xl -ml-12 -mb-12" />
              
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
                        className="flex justify-center mb-4"
                      >
                        <Target className="w-16 h-16 text-purple-500" />
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Math Rush
                      </h2>
                      <div className="space-y-2 text-purple-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <Droplets className="w-5 h-5 text-sky-400" />
                          Solve equations before time runs out!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <Zap className="w-5 h-5 text-amber-400" />
                          Timer speeds up as you go!
                        </p>
                        <div className="bg-purple-100/70 rounded-xl px-3 py-2 text-left text-xs space-y-0.5 mt-1">
                          <p>Q1–4: <span className="font-bold">Addition</span></p>
                          <p>Q5–12: <span className="font-bold">+ Subtraction</span></p>
                          <p>Q13–24: <span className="font-bold">+ Multiplication</span></p>
                          <p>Q25–32: <span className="font-bold">+ Division</span></p>
                          <p>Q33+: <span className="font-bold">+ Square Roots</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Difficulty toggle: Easy (2 lives) vs Standard (1 life) — designed
                        so younger players self-select forgiveness without singling them out. */}
                    <div className="bg-white/50 rounded-xl p-1 mb-4 grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setEasyMode(true)}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          easyMode
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow'
                            : 'text-purple-700 hover:bg-white/40'
                        }`}
                      >
                        <Heart className="w-4 h-4" /> Easy · 2 lives
                      </button>
                      <button
                        type="button"
                        onClick={() => setEasyMode(false)}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          !easyMode
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow'
                            : 'text-purple-700 hover:bg-white/40'
                        }`}
                      >
                        <Zap className="w-4 h-4" /> Standard · 1 life
                      </button>
                    </div>

                    <EnergyEmptyBanner visible={energy < 1} tone="light" />
                    <motion.button
                      onClick={startGame}
                      className="w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg relative overflow-hidden group"
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span>Start Game</span>
                        <Rocket className="w-5 h-5" />
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                    </motion.button>
                  </>
                ) : gameEnded && finalRewards ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="flex justify-center mb-4">
                        {score >= 15 ? <Star className="w-16 h-16 text-amber-400" /> : score >= 8 ? <Trophy className="w-16 h-16 text-yellow-500" /> : <Gamepad2 className="w-16 h-16 text-purple-400" />}
                      </div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Game Over!
                      </h2>
                      <p className="text-purple-800 text-center mb-3 text-2xl font-bold">
                        {score} correct {score === 1 ? 'answer' : 'answers'}
                      </p>

                      {/* Tier delta + coaching with operator-aware copy */}
                      <div className="mb-4">
                        <EndScreenFooter
                          gameId="math-rush"
                          score={score}
                          tier={(finalRewards?.tier as 'normal' | 'good' | 'exceptional') || 'normal'}
                          context={{ highestOperator: highestOperatorReached(questionCount) }}
                          energyReduced={!hadEnergyAtStart}
                          tone="light"
                          previousBest={previousBestRef.current}
                        />
                      </div>

                      {/* Rewards display - only show if energy was used */}
                      {hadEnergyAtStart && finalRewards && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-purple-200">
                          <p className="text-purple-700 font-bold text-lg mb-2">Rewards:</p>
                          <div className="flex flex-col gap-2 text-purple-800">
                            <div className="flex items-center justify-center gap-2">
                              <Star className="w-5 h-5 text-yellow-400" />
                              <span className="font-semibold">+{finalRewards.xp} XP</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <CoinIcon size={20} />
                              <span className="font-semibold">+{finalRewards.coins} Coins</span>
                            </div>
                            {finalRewards.opals && (
                              <div className="flex items-center justify-center gap-2">
                                <OpalIcon size={20} />
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
                          startGame();
                        }}
                        className="flex-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg relative overflow-hidden group"
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
                          const cum = cumulativeRef.current;
                          if (cum.hadAnyEnergy && finalRewards) {
                            onEnd({
                              score,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: cum.xp,
                              coins: 0,
                            });
                          } else {
                            onEnd({
                              score,
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

        {/* Operator-legend HUD strip + lives indicator — persistent during play.
            Shows the operators currently in rotation so the player isn't surprised
            when × or ÷ first appear. Lives only render in easy mode. */}
        {isPlaying && currentQuestion && (
          <div className="w-full max-w-md mb-3 z-10 flex items-center justify-between gap-3">
            <div className="flex-1 bg-white/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/40 shadow-sm">
              <p className="text-center text-purple-800 text-xs font-bold tracking-wider">
                <span className="text-purple-500/70 mr-2">Active:</span>
                <span className="font-mono">{activeOperators(questionCount)}</span>
              </p>
            </div>
            {easyMode && (
              <div className="flex items-center gap-0.5 bg-white/50 backdrop-blur-sm rounded-full px-2.5 py-1.5 border border-white/40 shadow-sm">
                {[0, 1].map(i => (
                  <Heart
                    key={i}
                    className={`w-4 h-4 ${
                      i < livesRemaining
                        ? 'text-rose-500 fill-rose-500'
                        : 'text-rose-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timer bar */}
        {isPlaying && currentQuestion && (() => {
          const currentTimerMax = getTimerForScore(score);
          const timerPercent = (timer / currentTimerMax) * 100;
          return (
            <div className="w-full max-w-md mb-6 z-10">
              <div className="h-3 bg-white/30 rounded-full overflow-hidden border-2 border-white/50">
                <motion.div
                  className="h-full"
                  style={{
                    background: timerPercent > 30 
                      ? 'linear-gradient(to right, #4fc3f7, #29b6f6)' 
                      : 'linear-gradient(to right, #ef5350, #e53935)',
                  }}
                  initial={{ width: '100%' }}
                  animate={{ width: `${timerPercent}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
              <p className="text-center text-white font-bold text-sm mt-2 drop-shadow-lg">
                {Math.ceil(timer)}s
              </p>
            </div>
          );
        })()}

        {/* Question — outer wrapper handles wrong-answer shake; inner card
            keeps its existing mount-in entrance animation. */}
        {isPlaying && currentQuestion && (
          <motion.div animate={shakeControls} className="w-full max-w-md mb-6">
          <motion.div
            key={currentQuestion.question}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-4 border-purple-300 w-full"
          >
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">{currentQuestion.themeIcon}</div>
              <p className="text-3xl font-bold text-purple-800 mb-2">
                {currentQuestion.question}
              </p>
            </div>

            {/* Feedback */}
            {feedback.text && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-center mb-4 text-xl font-bold ${
                  feedback.type === 'correct' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {feedback.text}
              </motion.div>
            )}

            {/* Answer options */}
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuestion.answer;
                const showResult = selectedAnswer !== null;
                
                let bgColor = 'bg-purple-100 hover:bg-purple-200 active:bg-purple-300';
                if (showResult) {
                  if (isCorrect) {
                    bgColor = 'bg-green-400';
                  } else if (isSelected && !isCorrect) {
                    bgColor = 'bg-red-400';
                  } else {
                    bgColor = 'bg-gray-200';
                  }
                }

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    disabled={selectedAnswer !== null || waitingForNext}
                    className={`${bgColor} rounded-xl p-4 text-2xl font-bold text-purple-900 border-2 border-purple-300 transition-all disabled:cursor-not-allowed disabled:opacity-70`}
                    whileTap={selectedAnswer === null && !waitingForNext ? { scale: 0.95 } : {}}
                    animate={showResult && isCorrect ? { scale: [1, 1.1, 1] } : {}}
                  >
                    {option}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
          </motion.div>
        )}

        {/* Score display */}
        {isPlaying && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 border-2 border-purple-300">
            <p className="text-purple-800 font-bold text-lg">
              Score: {score}
            </p>
          </div>
        )}
      </div>
    </GameWrapper>
  );
}
