/**
 * Daily system utilities
 * Handles daily spin wheel, login bonuses, and streak tracking
 */

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/**
 * Check if a date string is today
 */
export function isToday(dateString: string | undefined): boolean {
  if (!dateString) return false;
  return dateString === getTodayDateString();
}

/**
 * Check if can spin today (hasn't spun yet today)
 */
export function canSpinToday(lastSpinDate?: string): boolean {
  return !isToday(lastSpinDate);
}

/**
 * Check if can claim daily login bonus (hasn't claimed today)
 */
export function canClaimDailyLogin(lastLoginDate?: string): boolean {
  return !isToday(lastLoginDate);
}

/**
 * Calculate login streak
 * Returns new streak count and whether streak was broken
 */
export function calculateLoginStreak(
  lastLoginDate: string | undefined,
  currentStreak: number = 0
): { streak: number; wasBroken: boolean } {
  if (!lastLoginDate) {
    return { streak: 1, wasBroken: false };
  }

  const today = new Date();
  const lastLogin = new Date(lastLoginDate);
  
  // Reset time to midnight for date comparison
  today.setHours(0, 0, 0, 0);
  lastLogin.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 1) {
    // Consecutive day - increment streak
    return { streak: currentStreak + 1, wasBroken: false };
  } else if (daysDiff === 0) {
    // Same day - keep streak
    return { streak: currentStreak, wasBroken: false };
  } else {
    // Streak broken - reset to 1
    return { streak: 1, wasBroken: true };
  }
}

/**
 * Check if login streak milestone is reached
 */
export function checkLoginStreakMilestone(streak: number): number | null {
  if (streak === 7 || streak === 30 || streak === 100) {
    return streak;
  }
  return null;
}
