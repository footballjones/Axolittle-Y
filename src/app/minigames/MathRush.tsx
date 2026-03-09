/**
 * Math Rush - Solve math equations fast!
 * Equations appear with multiple choice. Timer counts down.
 * Score = number of correct answers
 * Features: Emoji themes, progressive difficulty, division support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const INITIAL_TIMER = 10; // seconds per question
const MIN_TIMER = 3; // Minimum timer as difficulty increases

const THEMES = [
  { emoji: '🦐', name: 'ghost shrimp' },
  { emoji: '🐚', name: 'shells' },
  { emoji: '💎', name: 'gems' },
  { emoji: '🫧', name: 'bubbles' },
];

interface Question {
  question: string;
  answer: number;
  options: number[];
  themeEmoji: string;
}

function generateQuestion(level: number): Question {
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  let a: number, b: number, op: string, answer: number, questionText: string;

  // Progressive difficulty based on score (level = score / 3, max level 4)
  const actualLevel = Math.min(Math.floor(level / 3), 4);

  if (actualLevel < 1) {
    // Level 0: Addition only (easier numbers)
    a = 1 + Math.floor(Math.random() * 10);
    b = 1 + Math.floor(Math.random() * 10);
    op = '+';
    answer = a + b;
    questionText = `${a} ${theme.emoji} + ${b} ${theme.emoji} = ?`;
  } else if (actualLevel < 2) {
    // Level 1: Addition & subtraction (easier subtraction)
    if (Math.random() < 0.5) {
      a = 2 + Math.floor(Math.random() * 15);
      b = 1 + Math.floor(Math.random() * a);
      op = '-';
      answer = a - b;
      questionText = `${a} ${theme.emoji} − ${b} ${theme.emoji} = ?`;
    } else {
      a = 1 + Math.floor(Math.random() * 15);
      b = 1 + Math.floor(Math.random() * 15);
      op = '+';
      answer = a + b;
      questionText = `${a} ${theme.emoji} + ${b} ${theme.emoji} = ?`;
    }
  } else if (actualLevel < 3) {
    // Level 2: Multiplication (smaller numbers)
    a = 2 + Math.floor(Math.random() * 8);
    b = 2 + Math.floor(Math.random() * 8);
    op = '×';
    answer = a * b;
    questionText = `${a} × ${b} ${theme.emoji} = ?`;
  } else {
    // Level 3+: Mixed including division
    const ops = ['+', '-', '×', '÷'];
    op = ops[Math.floor(Math.random() * ops.length)];
    
    if (op === '÷') {
      // Division: make sure it divides evenly
      b = 2 + Math.floor(Math.random() * 8);
      answer = 2 + Math.floor(Math.random() * 8);
      a = b * answer;
      questionText = `${a} ${theme.emoji} ÷ ${b} = ?`;
    } else if (op === '×') {
      a = 2 + Math.floor(Math.random() * 10);
      b = 2 + Math.floor(Math.random() * 10);
      answer = a * b;
      questionText = `${a} × ${b} ${theme.emoji} = ?`;
    } else if (op === '-') {
      a = 5 + Math.floor(Math.random() * 20);
      b = 1 + Math.floor(Math.random() * a);
      answer = a - b;
      questionText = `${a} ${theme.emoji} − ${b} ${theme.emoji} = ?`;
    } else {
      a = 1 + Math.floor(Math.random() * 20);
      b = 1 + Math.floor(Math.random() * 20);
      answer = a + b;
      questionText = `${a} ${theme.emoji} + ${b} ${theme.emoji} = ?`;
    }
  }

  // Generate wrong answers (closer to correct answer for harder questions)
  const wrongSet = new Set<number>();
  const range = actualLevel < 2 ? 5 : 7; // Smaller range for easier questions
  while (wrongSet.size < 3) {
    let wrong = answer + (Math.floor(Math.random() * (range * 2 + 1)) - range);
    if (wrong !== answer && wrong >= 0 && !wrongSet.has(wrong)) {
      wrongSet.add(wrong);
    }
  }

  const options = [answer, ...Array.from(wrongSet)];
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { question: questionText, answer, options, themeEmoji: theme.emoji };
}

export function MathRush({ onEnd, energy }: MiniGameProps) {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); // Start with false, show overlay first
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false); // Track if energy was available when game started
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timer, setTimer] = useState(INITIAL_TIMER);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'correct' | 'wrong' | '' }>({ text: '', type: '' });
  const [waitingForNext, setWaitingForNext] = useState(false);
  const timerIntervalRef = useRef<number>();

  const getTimerForScore = useCallback((currentScore: number) => {
    // Timer gets faster: 6000ms - score * 100, minimum 3000ms (converted to seconds)
    // Slower speed-up: decreases by 0.1s per correct answer instead of 0.2s
    const timerMs = Math.max(3000, 6000 - currentScore * 100);
    return timerMs / 1000; // Convert to seconds
  }, []);

  const loadNewQuestion = useCallback(() => {
    const newQuestion = generateQuestion(score);
    const newTimer = getTimerForScore(score);
    setCurrentQuestion(newQuestion);
    setTimer(newTimer);
    setSelectedAnswer(null);
    setFeedback({ text: '', type: '' });
    setWaitingForNext(false);
  }, [score, getTimerForScore]);

  const startGame = useCallback(() => {
    // Store whether energy was available when game started
    setHadEnergyAtStart(energy > 0);
    setScore(0);
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    setIsPlaying(true);
    setIsPaused(false);
    loadNewQuestion();
  }, [loadNewQuestion, energy]);

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
        return prev - 0.1;
      });
    }, 100);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isPlaying, isPaused, currentQuestion, waitingForNext]);

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameEnded(true);
    // Only calculate and show rewards if energy was available at start
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('math-rush', score);
      setFinalRewards({
        tier: rewards.tier,
        xp: rewards.xp,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    } else {
      // No rewards if no energy
      setFinalRewards({
        tier: 'normal',
        xp: 0,
        coins: 0,
        opals: undefined,
      });
    }
    setShowOverlay(true);
  }, [score, hadEnergyAtStart]);

  const handleAnswer = useCallback((answer: number) => {
    if (!currentQuestion || selectedAnswer !== null || waitingForNext) return;
    
    setSelectedAnswer(answer);
    setWaitingForNext(true);
    
    if (answer === currentQuestion.answer) {
      // Correct!
      setFeedback({ text: '✓ Correct!', type: 'correct' });
      setScore(prev => prev + 1);
      setTimeout(() => {
        if (isPlaying) { // Only load next if still playing
          loadNewQuestion();
        }
      }, 500);
    } else {
      // Wrong answer - end game
      setFeedback({ text: '✗ Wrong!', type: 'wrong' });
      setTimeout(() => {
        endGame();
      }, 800);
    }
  }, [currentQuestion, selectedAnswer, waitingForNext, loadNewQuestion, isPlaying, endGame]);

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
                        className="text-6xl mb-4"
                      >
                        🔢
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Math Rush
                      </h2>
                      <div className="space-y-2 text-purple-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🦐</span>
                          Solve equations before time runs out!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚡</span>
                          Each correct answer speeds up the timer
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">💎</span>
                          Get as many right as you can!
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={startGame}
                      className="w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg relative overflow-hidden group"
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span>Start Game</span>
                        <span className="text-xl">🚀</span>
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
                      <div className="text-6xl mb-4">
                        {score >= 15 ? '✨' : score >= 8 ? '🎉' : '🎮'}
                      </div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Game Over!
                      </h2>
                      <p className="text-purple-800 text-center mb-2 text-2xl font-bold">
                        {score} correct {score === 1 ? 'answer' : 'answers'}
                      </p>
                      <p className="text-purple-600 text-center mb-4 text-sm font-medium">
                        {score >= 15 ? '🌟 Exceptional performance!' : score >= 8 ? '🎯 Good job!' : '💪 Keep practicing!'}
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
                          // Call onEnd with actual rewards when leaving (only if energy was used)
                          if (hadEnergyAtStart && finalRewards) {
                            onEnd({
                              score,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: finalRewards.xp,
                              coins: finalRewards.coins,
                              opals: finalRewards.opals,
                            });
                          } else {
                            // No rewards if no energy
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

        {/* Question */}
        {isPlaying && currentQuestion && (
          <motion.div
            key={currentQuestion.question}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 mb-6 shadow-2xl border-4 border-purple-300 max-w-md w-full"
          >
            <div className="text-center mb-6">
              <p className="text-5xl mb-4">{currentQuestion.themeEmoji}</p>
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
