/**
 * Unit tests for validation utility functions
 * Following Test Pyramid Balance directive: Unit tests for utility functions
 */
import { hasRequiredFields, isValidObject, passwordsMatch } from './validation';

describe('Validation Utilities', () => {
  describe('isValidObject', () => {
    it('should return true for plain objects', () => {
      expect(isValidObject({})).toBe(true);
      expect(isValidObject({ key: 'value' })).toBe(true);
      expect(isValidObject({ nested: { key: 'value' } })).toBe(true);
    });

    it('should return false for arrays', () => {
      expect(isValidObject([])).toBe(false);
      expect(isValidObject([1, 2, 3])).toBe(false);
      expect(isValidObject([{ key: 'value' }])).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidObject(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidObject(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isValidObject('string')).toBe(false);
      expect(isValidObject(123)).toBe(false);
      expect(isValidObject(true)).toBe(false);
      expect(isValidObject(false)).toBe(false);
    });

    it('should return true for Date objects', () => {
      expect(isValidObject(new Date())).toBe(true);
    });

    it('should return true for objects with null values', () => {
      expect(isValidObject({ key: null })).toBe(true);
    });
  });

  describe('passwordsMatch', () => {
    it('should return true when passwords match', () => {
      expect(passwordsMatch('password123', 'password123')).toBe(true);
      expect(passwordsMatch('', '')).toBe(true);
      expect(passwordsMatch('complex!@#$%^&*()', 'complex!@#$%^&*()')).toBe(true);
    });

    it('should return false when passwords do not match', () => {
      expect(passwordsMatch('password123', 'password456')).toBe(false);
      expect(passwordsMatch('password', 'Password')).toBe(false);
      expect(passwordsMatch('password', 'password ')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(passwordsMatch('Password', 'password')).toBe(false);
      expect(passwordsMatch('PASSWORD', 'password')).toBe(false);
    });
  });

  describe('hasRequiredFields', () => {
    it('should return true when all required fields are present and non-empty', () => {
      const fields = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      expect(hasRequiredFields(fields, ['username', 'email', 'password'])).toBe(true);
    });

    it('should return false when a required field is missing', () => {
      const fields = {
        username: 'testuser',
        email: 'test@example.com',
      };
      expect(hasRequiredFields(fields, ['username', 'email', 'password'])).toBe(false);
    });

    it('should return false when a required field is undefined', () => {
      const fields = {
        username: 'testuser',
        email: undefined,
        password: 'password123',
      };
      expect(hasRequiredFields(fields, ['username', 'email', 'password'])).toBe(false);
    });

    it('should return false when a required field is null', () => {
      const fields = {
        username: 'testuser',
        email: null,
        password: 'password123',
      };
      expect(hasRequiredFields(fields, ['username', 'email', 'password'])).toBe(false);
    });

    it('should return false when a required field is empty string', () => {
      const fields = {
        username: 'testuser',
        email: '',
        password: 'password123',
      };
      expect(hasRequiredFields(fields, ['username', 'email', 'password'])).toBe(false);
    });

    it('should return true for empty required fields array', () => {
      const fields = { username: 'testuser' };
      expect(hasRequiredFields(fields, [])).toBe(true);
    });

    it('should return true when field value is 0 (not considered empty)', () => {
      const fields = {
        age: 0,
        name: 'test',
      };
      expect(hasRequiredFields(fields, ['age', 'name'])).toBe(true);
    });

    it('should return true when field value is false (not considered empty)', () => {
      const fields = {
        active: false,
        name: 'test',
      };
      expect(hasRequiredFields(fields, ['active', 'name'])).toBe(true);
    });
  });
});
