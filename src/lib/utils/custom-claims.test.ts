/**
 * Unit tests for custom claims utility functions
 * Following Test Pyramid Balance directive: Unit tests for utility functions
 */
import { buildCustomClaims, type UserData } from './custom-claims';

describe('Custom Claims Utilities', () => {
  describe('buildCustomClaims', () => {
    it('should build claims with admin and signedConsentForm when both are true', () => {
      const userData: UserData = {
        isAdmin: true,
        signedConsentForm: true,
      };

      const result = buildCustomClaims(userData);

      expect(result).toEqual({
        admin: true,
        signedConsentForm: true,
      });
    });

    it('should build claims with both false when both are false', () => {
      const userData: UserData = {
        isAdmin: false,
        signedConsentForm: false,
      };

      const result = buildCustomClaims(userData);

      expect(result).toEqual({
        admin: false,
        signedConsentForm: false,
      });
    });

    it('should default to false when values are undefined', () => {
      const userData: UserData = {};

      const result = buildCustomClaims(userData);

      expect(result).toEqual({
        admin: false,
        signedConsentForm: false,
      });
    });

    it('should default to false when userData is null', () => {
      const result = buildCustomClaims(null);

      expect(result).toEqual({
        admin: false,
        signedConsentForm: false,
      });
    });

    it('should default to false when userData is undefined', () => {
      const result = buildCustomClaims(undefined);

      expect(result).toEqual({
        admin: false,
        signedConsentForm: false,
      });
    });

    it('should handle only admin being set', () => {
      const userData: UserData = {
        isAdmin: true,
      };

      const result = buildCustomClaims(userData);

      expect(result).toEqual({
        admin: true,
        signedConsentForm: false,
      });
    });

    it('should handle only signedConsentForm being set', () => {
      const userData: UserData = {
        signedConsentForm: true,
      };

      const result = buildCustomClaims(userData);

      expect(result).toEqual({
        admin: false,
        signedConsentForm: true,
      });
    });
  });
});
