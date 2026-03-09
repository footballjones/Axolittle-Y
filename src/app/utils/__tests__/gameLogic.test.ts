import { describe, it, expect } from 'vitest';
import { generateAxolotl, calculateLevel, getXPForNextLevel, getCurrentLevelXP } from '../gameLogic';

describe('gameLogic', () => {
  describe('generateAxolotl', () => {
    it('should create axolotl with provided name', () => {
      const axo = generateAxolotl('Test Name');
      expect(axo.name).toBe('Test Name');
      expect(axo.stage).toBe('baby');
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
    it('should return level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should return level 2 for 10 XP', () => {
      expect(calculateLevel(10)).toBe(2);
    });

    it('should calculate higher levels correctly', () => {
      // Level 3 = 10 + 5 = 15 XP
      expect(calculateLevel(15)).toBe(3);
      // Level 4 = 10 + 5 + 5 = 20 XP
      expect(calculateLevel(20)).toBe(4);
    });
  });

  describe('getXPForNextLevel', () => {
    it('should return 10 XP for level 1 to 2', () => {
      expect(getXPForNextLevel(1)).toBe(10);
    });

    it('should return 5 XP for level 2 to 3', () => {
      expect(getXPForNextLevel(2)).toBe(5);
    });

    it('should return 5 XP for subsequent levels', () => {
      expect(getXPForNextLevel(5)).toBe(5);
      expect(getXPForNextLevel(10)).toBe(5);
    });
  });

  describe('getCurrentLevelXP', () => {
    it('should return 0 for 0 XP (level 1)', () => {
      expect(getCurrentLevelXP(0)).toBe(0);
    });

    it('should return XP within level 2', () => {
      // At 10 XP (level 2 start), should return 10
      expect(getCurrentLevelXP(10)).toBe(10);
      // At 12 XP (level 2, 2 XP into level), should return 2
      expect(getCurrentLevelXP(12)).toBe(2);
    });

    it('should return XP within current level for higher levels', () => {
      // At 20 XP (level 4 start), should return 5 (20 - 15)
      expect(getCurrentLevelXP(20)).toBe(5);
    });
  });
});
