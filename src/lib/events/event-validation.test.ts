/**
 * Unit tests for event validation business logic
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */

import type { EventDocument } from '../../server/types/events';
import { isValidEventCodeFormat, validateEventRegistration } from './event-validation';

describe('Event Validation', () => {
  describe('validateEventRegistration', () => {
    const baseEvent: EventDocument = {
      id: 'event-1',
      name: 'Test Event',
      eventTypeId: 'type-1',
      eventDate: new Date(),
      consentFormTemplateId: 'consent-1',
      demographicsFormTemplateId: 'demo-1',
      surveyTemplateId: 'survey-1',
      collectAdditionalDemographics: false,
      isActive: true,
      code: '1234',
      activatedAt: new Date(),
      surveyAccessibleAt: new Date(),
      surveyAccessibleOverride: false,
      createdAt: new Date(),
      createdBy: 'user-1',
    };

    it('should return valid for active event when not registered', () => {
      const result = validateEventRegistration(baseEvent, false);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid when event is null', () => {
      const result = validateEventRegistration(null, false);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Event not found');
    });

    it('should return invalid when event is undefined', () => {
      const result = validateEventRegistration(undefined, false);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Event not found');
    });

    it('should return invalid when event is not active', () => {
      const inactiveEvent = { ...baseEvent, isActive: false };
      const result = validateEventRegistration(inactiveEvent, false);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Event is not active');
    });

    it('should return invalid when already registered', () => {
      const result = validateEventRegistration(baseEvent, true);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Already registered for this event');
    });

    it('should return invalid when event is not active and already registered', () => {
      const inactiveEvent = { ...baseEvent, isActive: false };
      const result = validateEventRegistration(inactiveEvent, true);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Event is not active');
    });
  });

  describe('isValidEventCodeFormat', () => {
    it('should return true for valid 4-digit codes', () => {
      expect(isValidEventCodeFormat('1234')).toBe(true);
      expect(isValidEventCodeFormat('0000')).toBe(true);
      expect(isValidEventCodeFormat('9999')).toBe(true);
    });

    it('should return false for codes that are not 4 digits', () => {
      expect(isValidEventCodeFormat('123')).toBe(false);
      expect(isValidEventCodeFormat('12345')).toBe(false);
      expect(isValidEventCodeFormat('12')).toBe(false);
      expect(isValidEventCodeFormat('1')).toBe(false);
    });

    it('should return false for codes with non-numeric characters', () => {
      expect(isValidEventCodeFormat('123a')).toBe(false);
      expect(isValidEventCodeFormat('abcd')).toBe(false);
      expect(isValidEventCodeFormat('12-4')).toBe(false);
      expect(isValidEventCodeFormat('12 4')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidEventCodeFormat(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidEventCodeFormat(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidEventCodeFormat('')).toBe(false);
    });
  });
});
