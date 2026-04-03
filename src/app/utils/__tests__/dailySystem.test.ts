import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTodayDateString,
  isToday,
  canSpinToday,
  canClaimDailyLogin,
  calculateLoginStreak,
  checkLoginStreakMilestone,
} from '../dailySystem';

describe('dailySystem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('getTodayDateString', () => {
    it('should return date in YYYY-MM-DD format', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      const result = getTodayDateString();
      expect(result).toBe('2024-03-15');
    });

    it('should pad single digit months and days', () => {
      vi.setSystemTime(new Date('2024-01-05T10:30:00Z'));
      const result = getTodayDateString();
      expect(result).toMatch(/2024-\d+-\d+/);
    });
  });

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      const today = getTodayDateString();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday\'s date', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      expect(isToday('2024-3-14')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isToday(undefined)).toBe(false);
    });
  });

  describe('canSpinToday', () => {
    it('should return true if last spin was not today', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      expect(canSpinToday('2024-3-14')).toBe(true);
    });

    it('should return false if last spin was today', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      const today = getTodayDateString();
      expect(canSpinToday(today)).toBe(false);
    });
  });

  describe('canClaimDailyLogin', () => {
    it('should return true if last login was not today', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      expect(canClaimDailyLogin('2024-3-14')).toBe(true);
    });

    it('should return false if last login was today', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      const today = getTodayDateString();
      expect(canClaimDailyLogin(today)).toBe(false);
    });
  });

  describe('calculateLoginStreak', () => {
    it('should return streak 1 if no last login date', () => {
      const result = calculateLoginStreak(undefined, 0);
      expect(result.streak).toBe(1);
      expect(result.wasBroken).toBe(false);
    });

    it('should increment streak for consecutive day', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      const yesterday = '2024-3-14';
      const result = calculateLoginStreak(yesterday, 5);
      expect(result.streak).toBe(6);
      expect(result.wasBroken).toBe(false);
    });

    it('should keep streak for same day', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      const today = getTodayDateString();
      const result = calculateLoginStreak(today, 5);
      expect(result.streak).toBe(5);
      expect(result.wasBroken).toBe(false);
    });

    it('should use forgiveness for a 2-day gap when available', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      const twoDaysAgo = '2024-03-13'; // daysDiff === 2, no recent forgiveness
      const result = calculateLoginStreak(twoDaysAgo, 5);
      expect(result.streak).toBe(6);
      expect(result.wasBroken).toBe(false);
      expect(result.usedForgiveness).toBe(true);
    });

    it('should reset streak for a 2-day gap when forgiveness was used recently', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      const twoDaysAgo = '2024-03-13';
      const recentForgiven = '2024-03-12'; // within the 7-day cooldown
      const result = calculateLoginStreak(twoDaysAgo, 5, recentForgiven);
      expect(result.streak).toBe(1);
      expect(result.wasBroken).toBe(true);
    });

    it('should reset streak if gap is 3 or more days', () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
      const threeDaysAgo = '2024-03-12'; // daysDiff === 3
      const result = calculateLoginStreak(threeDaysAgo, 5);
      expect(result.streak).toBe(1);
      expect(result.wasBroken).toBe(true);
    });
  });

  describe('checkLoginStreakMilestone', () => {
    // LOGIN_MILESTONES = [3, 7, 14, 30, 50]
    it('should return milestone for each defined milestone day', () => {
      expect(checkLoginStreakMilestone(3)).toBe(3);
      expect(checkLoginStreakMilestone(7)).toBe(7);
      expect(checkLoginStreakMilestone(14)).toBe(14);
      expect(checkLoginStreakMilestone(30)).toBe(30);
      expect(checkLoginStreakMilestone(50)).toBe(50);
    });

    it('should return null for non-milestone streaks', () => {
      expect(checkLoginStreakMilestone(5)).toBe(null);
      expect(checkLoginStreakMilestone(10)).toBe(null);
      expect(checkLoginStreakMilestone(100)).toBe(null);
    });
  });
});
