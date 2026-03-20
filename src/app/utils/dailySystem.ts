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
 * Check if the player can use their free miss forgiveness.
 * Returns true if lastMissForgivenDate is undefined or was more than 7 days ago.
 */
export function canUseForgiveness(lastMissForgivenDate?: string): boolean {
  if (!lastMissForgivenDate) return true;

  const today = new Date();
  const lastForgiven = new Date(lastMissForgivenDate);
  today.setHours(0, 0, 0, 0);
  lastForgiven.setHours(0, 0, 0, 0);

  const daysSinceForgiven = Math.floor(
    (today.getTime() - lastForgiven.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceForgiven >= 7;
}

/**
 * Calculate login streak
 * Returns new streak count, whether streak was broken, and whether forgiveness was used
 * Allows 1 free missed day every 7 days (daysDiff === 2 counts as consecutive if forgiveness available)
 */
export function calculateLoginStreak(
  lastLoginDate: string | undefined,
  currentStreak: number = 0,
  lastMissForgivenDate?: string
): { streak: number; wasBroken: boolean; usedForgiveness: boolean } {
  if (!lastLoginDate) {
    return { streak: 1, wasBroken: false, usedForgiveness: false };
  }

  const today = new Date();
  const lastLogin = new Date(lastLoginDate);

  // Reset time to midnight for date comparison
  today.setHours(0, 0, 0, 0);
  lastLogin.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 1) {
    // Consecutive day - increment streak
    return { streak: currentStreak + 1, wasBroken: false, usedForgiveness: false };
  } else if (daysDiff === 0) {
    // Same day - keep streak
    return { streak: currentStreak, wasBroken: false, usedForgiveness: false };
  } else if (daysDiff === 2 && canUseForgiveness(lastMissForgivenDate)) {
    // Missed exactly 1 day — use the free miss forgiveness (1 per 7 days)
    return { streak: currentStreak + 1, wasBroken: false, usedForgiveness: true };
  } else {
    // Streak broken - reset to 1
    return { streak: 1, wasBroken: true, usedForgiveness: false };
  }
}

/** All milestone days in ascending order */
export const LOGIN_MILESTONES = [3, 7, 14, 30, 50] as const;

/**
 * Check if login streak milestone is reached
 */
export function checkLoginStreakMilestone(streak: number): number | null {
  if ((LOGIN_MILESTONES as readonly number[]).includes(streak)) {
    return streak;
  }
  return null;
}
