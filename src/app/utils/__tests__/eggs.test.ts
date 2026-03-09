import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRebirthEgg, createBreedingEgg, hatchEgg, isEggReady } from '../eggs';
import { Axolotl } from '../../types/game';

describe('eggs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const mockParent: Axolotl = {
    id: 'axo-123',
    name: 'Test Axo',
    stage: 'elder',
    stats: {
      hunger: 50,
      happiness: 50,
      cleanliness: 50,
      waterQuality: 50,
    },
    secondaryStats: {
      strength: 50,
      intellect: 50,
      stamina: 50,
      speed: 50,
    },
    age: 1000,
    experience: 100,
    color: '#FFB5E8',
    pattern: 'solid',
    generation: 2,
    parentIds: [],
    birthDate: Date.now() - 1000000,
    lastUpdated: Date.now(),
  };

  describe('createRebirthEgg', () => {
    it('should create an egg with correct generation', () => {
      const egg = createRebirthEgg(mockParent);
      expect(egg.generation).toBe(3);
      expect(egg.parentIds).toEqual([mockParent.id]);
    });

    it('should store pendingName if provided', () => {
      const egg = createRebirthEgg(mockParent, 'New Name');
      expect(egg.pendingName).toBe('New Name');
    });

    it('should not have pendingName if not provided', () => {
      const egg = createRebirthEgg(mockParent);
      expect(egg.pendingName).toBeUndefined();
    });

    it('should set incubation end time correctly', () => {
      vi.setSystemTime(new Date('2024-03-15T10:00:00Z'));
      const egg = createRebirthEgg(mockParent);
      const expectedEnd = Date.now() + (24 * 60 * 60 * 1000);
      expect(egg.incubationEndsAt).toBe(expectedEnd);
    });
  });

  describe('createBreedingEgg', () => {
    const mockParent2: Axolotl = {
      ...mockParent,
      id: 'axo-456',
      generation: 3,
    };

    it('should create an egg with max generation + 1', () => {
      const egg = createBreedingEgg(mockParent, mockParent2);
      expect(egg.generation).toBe(4);
      expect(egg.parentIds).toEqual([mockParent.id, mockParent2.id]);
    });
  });

  describe('isEggReady', () => {
    it('should return true if incubation time has passed', () => {
      vi.setSystemTime(new Date('2024-03-15T10:00:00Z'));
      const egg = createRebirthEgg(mockParent);
      
      vi.setSystemTime(new Date('2024-03-16T10:00:01Z')); // 24h 1s later
      expect(isEggReady(egg)).toBe(true);
    });

    it('should return false if incubation time has not passed', () => {
      vi.setSystemTime(new Date('2024-03-15T10:00:00Z'));
      const egg = createRebirthEgg(mockParent);
      
      vi.setSystemTime(new Date('2024-03-15T11:00:00Z')); // 1h later
      expect(isEggReady(egg)).toBe(false);
    });
  });

  describe('hatchEgg', () => {
    it('should create axolotl with provided name', () => {
      const egg = createRebirthEgg(mockParent);
      const axolotl = hatchEgg(egg, 'Hatched Name');
      expect(axolotl.name).toBe('Hatched Name');
      expect(axolotl.generation).toBe(egg.generation);
      expect(axolotl.parentIds).toEqual(egg.parentIds);
    });

    it('should use egg color and pattern', () => {
      const egg = createRebirthEgg(mockParent);
      const axolotl = hatchEgg(egg, 'Test');
      expect(axolotl.color).toBe(egg.color);
      expect(axolotl.pattern).toBe(egg.pattern);
    });
  });
});
