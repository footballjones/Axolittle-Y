import { describe, it, expect } from 'vitest';
import { generateAxolotl, calculateLevel, getXPForNextLevel, getCurrentLevelXP } from '../gameLogic';

describe('gameLogic', () => {
  describe('generateAxolotl', () => {
    it('should create axolotl with provided name', () => {
      const axo = generateAxolotl('Test Name');
      expect(axo.name).toBe('Test Name');
      expect(axo.stage).toBe('hatchling');
      expect(axo.experience).toBe(0);
    });

    it('should set generation correctly', () => {
      const axo = generateAxolotl('Test', 3);
      expect(axo.generation).toBe(3);
    });

    it('should set parentIds correctly', () => {
      const parentIds = ['parent1', 'parent2'];
      const axo = generateAxolotl('Test', 1, parentIds);
      expect(axo.parentIds).toEqual(parentIds);
    });

    it('should use inherited color and pattern if provided', () => {
      const axo = generateAxolotl('Test', 1, [], '#FF0000', 'striped');
      expect(axo.color).toBe('#FF0000');
      expect(axo.pattern).toBe('striped');
    });
  });

  describe('calculateLevel', () => {
    // Progressive XP curve: L2 costs 1, L3 costs 2, … up to L16 (cap at 15).
    // Cumulative thresholds: L2=1, L3=3, L4=6, L5=10, L6=15, L7=21 …
    it('should return level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should return level 2 for 1 XP', () => {
      expect(calculateLevel(1)).toBe(2);
    });

    it('should calculate higher levels correctly', () => {
      // L5 threshold = 1+2+3+4 = 10 XP
      expect(calculateLevel(10)).toBe(5);
      // L6 threshold = 1+2+3+4+5 = 15 XP
      expect(calculateLevel(15)).toBe(6);
      // 20 XP is between L6 (15) and L7 (21), so still level 6
      expect(calculateLevel(20)).toBe(6);
    });
  });

  describe('getXPForNextLevel', () => {
    // Cost to advance from level N is min(N, 15)
    it('should return 1 XP for level 1 to 2', () => {
      expect(getXPForNextLevel(1)).toBe(1);
    });

    it('should return 2 XP for level 2 to 3', () => {
      expect(getXPForNextLevel(2)).toBe(2);
    });

    it('should scale with level until the cap (10)', () => {
      expect(getXPForNextLevel(5)).toBe(5);
      expect(getXPForNextLevel(10)).toBe(10);
    });

    it('should cap at 10 XP for level 11 and beyond', () => {
      expect(getXPForNextLevel(11)).toBe(10);
      expect(getXPForNextLevel(20)).toBe(10);
    });
  });

  describe('getCurrentLevelXP', () => {
    it('should return 0 for 0 XP (level 1)', () => {
      expect(getCurrentLevelXP(0)).toBe(0);
    });

    it('should return 0 at the exact start of level 5 (10 XP)', () => {
      expect(getCurrentLevelXP(10)).toBe(0);
    });

    it('should return progress within current level', () => {
      // 12 XP = level 5 (threshold 10) + 2 XP progress
      expect(getCurrentLevelXP(12)).toBe(2);
    });

    it('should return 0 at the exact start of level 7 (21 XP)', () => {
      // L7 threshold = 1+2+3+4+5+6 = 21 XP
      expect(getCurrentLevelXP(21)).toBe(0);
    });
  });
});
