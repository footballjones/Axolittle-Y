/**
 * Daily Login Bonus Component
 * Shows daily coin reward and login streak progress
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { GAME_CONFIG } from '../config/game';
import { canClaimDailyLogin, calculateLoginStreak, checkLoginStreakMilestone, getTodayDateString } from '../utils/dailySystem';

interface DailyLoginBonusProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: (reward: { coins: number; opals?: number; decoration?: string }) => void;
  lastLoginDate?: string;
  loginStreak?: number;
  coins: number;
  opals: number;
}

export function DailyLoginBonus({ 
  isOpen, 
  onClose, 
  onClaim, 
  lastLoginDate, 
  loginStreak = 0,
  coins,
  opals,
}: DailyLoginBonusProps) {
  const canClaim = canClaimDailyLogin(lastLoginDate);
  const { streak: newStreak, wasBroken } = calculateLoginStreak(lastLoginDate, loginStreak);
  const milestone = checkLoginStreakMilestone(newStreak);
  const milestoneReward = milestone ? GAME_CONFIG.loginStreakRewards[milestone as keyof typeof GAME_CONFIG.loginStreakRewards] : null;

  const handleClaim = () => {
    if (!canClaim) return;

    const reward: { coins: number; opals?: number; decoration?: string } = {
      coins: GAME_CONFIG.dailyLoginCoinBonus,
    };

    // Add milestone rewards if reached
    if (milestoneReward) {
      reward.opals = milestoneReward.opals;
      if (milestoneReward.decoration) {
        reward.decoration = milestoneReward.decoration;
      }
    }

    onClaim(reward);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 60%, #fef9c3 100%)',
                border: '2px solid rgba(168,85,247,0.4)',
                boxShadow: '0 20px 60px rgba(168,85,247,0.3)',
              }}
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 rounded-full p-1.5 border border-violet-200/60 bg-white/60 active:bg-white/90"
                >
                  <X className="w-4 h-4 text-violet-400" strokeWidth={2.5} />
                </button>

                <div className="text-center">
                  <div className="text-5xl mb-3">🎁</div>
                  <h2 className="text-2xl font-bold text-violet-800 mb-1">
                    Daily Login Bonus
                  </h2>
                  <p className="text-sm text-violet-600">
                    {canClaim ? 'Claim your daily reward!' : 'Already claimed today!'}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                {/* Daily coin reward */}
                {canClaim && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-amber-300"
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2">🪙</div>
                      <p className="text-lg font-bold text-amber-800">
                        {GAME_CONFIG.dailyLoginCoinBonus} Coins
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Daily login reward
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Streak display */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-violet-200">
                  <div className="text-center mb-3">
                    <p className="text-sm font-bold text-violet-700 mb-1">Login Streak</p>
                    <div className="flex items-center justify-center gap-2">
                      {[...Array(Math.min(newStreak, 7))].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-3 h-3 rounded-full bg-violet-500"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                        />
                      ))}
                      {newStreak > 7 && (
                        <span className="text-xs font-bold text-violet-600">+{newStreak - 7}</span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-violet-800 mt-2">
                      {newStreak} {newStreak === 1 ? 'day' : 'days'}
                    </p>
                  </div>

                  {/* Milestone progress */}
                  <div className="space-y-2">
                    {[7, 30, 100].map(milestoneDays => {
                      const isReached = newStreak >= milestoneDays;
                      const isNext = newStreak < milestoneDays && (milestoneDays === 7 || newStreak >= [7, 30, 100].find(d => d < milestoneDays)!);
                      
                      return (
                        <div
                          key={milestoneDays}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                            isReached ? 'bg-violet-100' : isNext ? 'bg-violet-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isReached ? (
                              <span className="text-lg">✅</span>
                            ) : (
                              <span className="text-lg">🎯</span>
                            )}
                            <span className={`text-xs font-bold ${isReached ? 'text-violet-700' : 'text-gray-600'}`}>
                              Day {milestoneDays}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-violet-500" />
                            <span className="text-xs font-bold text-violet-700">
                              {GAME_CONFIG.loginStreakRewards[milestoneDays as keyof typeof GAME_CONFIG.loginStreakRewards].opals} 🪬
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Milestone reward notification */}
                {milestoneReward && canClaim && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 mb-4 border-2 border-purple-300"
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎉</div>
                      <p className="text-sm font-bold text-purple-800 mb-1">
                        Streak Milestone Reached!
                      </p>
                      <p className="text-xs text-purple-600">
                        +{milestoneReward.opals} Opals
                        {milestoneReward.decoration && ' + Exclusive Decoration'}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Claim button */}
                <motion.button
                  onClick={handleClaim}
                  disabled={!canClaim}
                  className="w-full py-4 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: canClaim
                      ? 'linear-gradient(135deg, rgba(168,85,247,0.9) 0%, rgba(217,70,239,0.9) 100%)'
                      : 'linear-gradient(135deg, rgba(203,213,225,0.9) 0%, rgba(148,163,184,0.9) 100%)',
                  }}
                  whileTap={canClaim ? { scale: 0.95 } : {}}
                >
                  {canClaim ? 'Claim Reward!' : 'Already Claimed'}
                </motion.button>

                {!canClaim && (
                  <p className="text-center text-xs text-violet-500 mt-2">
                    Come back tomorrow for another bonus! 🌅
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
