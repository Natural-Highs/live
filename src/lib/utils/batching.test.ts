/**
 * Unit tests for batching utility functions
 * Following Test Pyramid Balance directive: Unit tests for utility functions
 */
import { createBatches, FIRESTORE_IN_OPERATOR_LIMIT } from './batching';

describe('Batching Utilities', () => {
  describe('createBatches', () => {
    it('should return empty array for empty input', () => {
      const result = createBatches([], 5);
      expect(result).toEqual([]);
    });

    it('should create single batch when items fit in one batch', () => {
      const items = [1, 2, 3, 4, 5];
      const result = createBatches(items, 10);
      expect(result).toEqual([[1, 2, 3, 4, 5]]);
    });

    it('should create multiple batches when items exceed batch size', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const result = createBatches(items, 5);
      expect(result).toEqual([[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11]]);
    });

    it('should handle batch size of 1', () => {
      const items = [1, 2, 3];
      const result = createBatches(items, 1);
      expect(result).toEqual([[1], [2], [3]]);
    });

    it('should handle batch size larger than array length', () => {
      const items = [1, 2, 3];
      const result = createBatches(items, 10);
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should work with strings', () => {
      const items = ['a', 'b', 'c', 'd', 'e', 'f'];
      const result = createBatches(items, 3);
      expect(result).toEqual([
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
      ]);
    });

    it('should work with objects', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
      const result = createBatches(items, 2);
      expect(result).toEqual([
        [{ id: 1 }, { id: 2 }],
        [{ id: 3 }, { id: 4 }],
      ]);
    });

    it('should use Firestore limit constant', () => {
      expect(FIRESTORE_IN_OPERATOR_LIMIT).toBe(10);
    });
  });
});
