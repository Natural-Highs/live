/**
 * Unit tests for event filtering business logic
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */

import type { EventDocument } from '../../server/types/events';
import { shouldIncludeEvent, shouldShowAllEvents } from './event-filtering';

describe('Event Filtering', () => {
  describe('shouldShowAllEvents', () => {
    it('should return true for admin users', () => {
      expect(shouldShowAllEvents(true)).toBe(true);
    });

    it('should return false for regular users', () => {
      expect(shouldShowAllEvents(false)).toBe(false);
    });
  });

  describe('shouldIncludeEvent', () => {
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

    it('should include all events for admin users', () => {
      const activeEvent = { ...baseEvent, isActive: true };
      const inactiveEvent = { ...baseEvent, isActive: false };

      expect(shouldIncludeEvent(activeEvent, true)).toBe(true);
      expect(shouldIncludeEvent(inactiveEvent, true)).toBe(true);
    });

    it('should include only active events for regular users', () => {
      const activeEvent = { ...baseEvent, isActive: true };
      const inactiveEvent = { ...baseEvent, isActive: false };

      expect(shouldIncludeEvent(activeEvent, false)).toBe(true);
      expect(shouldIncludeEvent(inactiveEvent, false)).toBe(false);
    });

    it('should handle undefined isActive for regular users', () => {
      const eventWithUndefinedActive = {
        ...baseEvent,
        isActive: undefined,
      } as unknown as EventDocument;

      expect(shouldIncludeEvent(eventWithUndefinedActive, false)).toBe(false);
    });

    it('should handle null isActive for regular users', () => {
      const eventWithNullActive = { ...baseEvent, isActive: null as unknown as boolean };

      expect(shouldIncludeEvent(eventWithNullActive, false)).toBe(false);
    });
  });
});
