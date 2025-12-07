/**
 * Unit tests for age calculation and category determination
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */
import { calculateAge, determineAgeCategory, determineAgeCategoryFromDOB } from './age';

describe('Age Calculation', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly for simple case', () => {
      const dob = new Date('2000-01-01');
      const reference = new Date('2020-01-01');
      expect(calculateAge(dob, reference)).toBe(20);
    });

    it('should handle birthday not yet occurred this year', () => {
      const dob = new Date('2000-12-31');
      const reference = new Date('2020-06-15'); // Before birthday
      expect(calculateAge(dob, reference)).toBe(19);
    });

    it('should handle birthday already occurred this year', () => {
      const dob = new Date('2000-06-01');
      const reference = new Date('2020-12-15'); // After birthday
      expect(calculateAge(dob, reference)).toBe(20);
    });

    it('should handle birthday on reference date', () => {
      const dob = new Date('2000-06-15');
      const reference = new Date('2020-06-15'); // On birthday
      expect(calculateAge(dob, reference)).toBe(20);
    });

    it('should handle day before birthday', () => {
      const dob = new Date('2000-06-15');
      const reference = new Date('2020-06-14'); // Day before
      expect(calculateAge(dob, reference)).toBe(19);
    });

    it('should handle Firestore Timestamp-like object', () => {
      const dob = {
        toDate: () => new Date('2000-01-01'),
      };
      const reference = new Date('2020-01-01');
      expect(calculateAge(dob, reference)).toBe(20);
    });

    it('should use current date as default reference', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 25);
      const age = calculateAge(dob);
      expect(age).toBe(25);
    });
  });

  describe('determineAgeCategory', () => {
    it('should return under18 for age less than 18', () => {
      expect(determineAgeCategory(17)).toBe('under18');
      expect(determineAgeCategory(0)).toBe('under18');
      expect(determineAgeCategory(10)).toBe('under18');
    });

    it('should return adult for age 18-64', () => {
      expect(determineAgeCategory(18)).toBe('adult');
      expect(determineAgeCategory(30)).toBe('adult');
      expect(determineAgeCategory(64)).toBe('adult');
    });

    it('should return senior for age 65 and above', () => {
      expect(determineAgeCategory(65)).toBe('senior');
      expect(determineAgeCategory(80)).toBe('senior');
      expect(determineAgeCategory(100)).toBe('senior');
    });
  });

  describe('determineAgeCategoryFromDOB', () => {
    it('should determine category from date of birth', () => {
      const dob = new Date('2010-01-01');
      const reference = new Date('2025-01-01'); // 15 years old
      expect(determineAgeCategoryFromDOB(dob, reference)).toBe('under18');
    });

    it('should determine adult category correctly', () => {
      const dob = new Date('1995-01-01');
      const reference = new Date('2025-01-01'); // 30 years old
      expect(determineAgeCategoryFromDOB(dob, reference)).toBe('adult');
    });

    it('should determine senior category correctly', () => {
      const dob = new Date('1950-01-01');
      const reference = new Date('2025-01-01'); // 75 years old
      expect(determineAgeCategoryFromDOB(dob, reference)).toBe('senior');
    });

    it('should handle Firestore Timestamp-like object', () => {
      const dob = {
        toDate: () => new Date('2000-01-01'),
      };
      const reference = new Date('2025-01-01'); // 25 years old
      expect(determineAgeCategoryFromDOB(dob, reference)).toBe('adult');
    });
  });
});
