/**
 * Unit tests for event validation business logic
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */

<<<<<<< HEAD
import type {EventDocument} from '../../server/types/events'
import {isValidEventCodeFormat, validateEventRegistration} from './event-validation'
=======
import type {EventDocument} from '@/types/events'
import {
	isValidEventCodeFormat,
	isWithinCheckInWindow,
	validateEventRegistration
} from './event-validation'
>>>>>>> 62ec4374 (feat(check-in): add success confirmation with time window validation)

describe('Event Validation', () => {
	describe('isWithinCheckInWindow', () => {
		// Use fixed "now" date for deterministic tests
		const baseNow = new Date('2025-01-15T10:00:00Z')

		const createEvent = (startDate: Date | string | null | undefined): EventDocument => ({
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
			startDate: startDate as Date
		})

		describe('when event has no startDate', () => {
			it('should return isWithinWindow=true for null startDate', () => {
				const event = createEvent(null)
				const result = isWithinCheckInWindow(event, baseNow)
				expect(result.isWithinWindow).toBe(true)
				expect(result.error).toBeUndefined()
			})

			it('should return isWithinWindow=true for undefined startDate', () => {
				const event = createEvent(undefined)
				const result = isWithinCheckInWindow(event, baseNow)
				expect(result.isWithinWindow).toBe(true)
				expect(result.error).toBeUndefined()
			})

			it('should return isWithinWindow=true for null event', () => {
				const result = isWithinCheckInWindow(null, baseNow)
				expect(result.isWithinWindow).toBe(true)
			})

			it('should return isWithinWindow=true for undefined event', () => {
				const result = isWithinCheckInWindow(undefined, baseNow)
				expect(result.isWithinWindow).toBe(true)
			})
		})

		describe('when startDate is invalid', () => {
			it('should return isWithinWindow=true for invalid date string', () => {
				const event = createEvent('invalid-date')
				const result = isWithinCheckInWindow(event, baseNow)
				expect(result.isWithinWindow).toBe(true)
			})
		})

		describe('time window boundaries (30min before, 2hr after)', () => {
			// Event starts at 10:00
			const eventStart = new Date('2025-01-15T10:00:00Z')
			const event = createEvent(eventStart)

			it('should return isWithinWindow=true exactly at window start (30min before event)', () => {
				const now = new Date('2025-01-15T09:30:00Z')
				const result = isWithinCheckInWindow(event, now)
				expect(result.isWithinWindow).toBe(true)
				expect(result.scheduledTime).toBe(eventStart.toISOString())
			})

			it('should return isWithinWindow=false 1 second before window start', () => {
				const now = new Date('2025-01-15T09:29:59Z')
				const result = isWithinCheckInWindow(event, now)
				expect(result.isWithinWindow).toBe(false)
				expect(result.error).toBe('This event is not currently accepting check-ins')
				expect(result.scheduledTime).toBe(eventStart.toISOString())
			})

			it('should return isWithinWindow=true at event start time', () => {
				const now = new Date('2025-01-15T10:00:00Z')
				const result = isWithinCheckInWindow(event, now)
				expect(result.isWithinWindow).toBe(true)
			})

			it('should return isWithinWindow=true 1 hour after event start', () => {
				const now = new Date('2025-01-15T11:00:00Z')
				const result = isWithinCheckInWindow(event, now)
				expect(result.isWithinWindow).toBe(true)
			})

			it('should return isWithinWindow=true exactly at window end (2hr after event)', () => {
				const now = new Date('2025-01-15T12:00:00Z')
				const result = isWithinCheckInWindow(event, now)
				expect(result.isWithinWindow).toBe(true)
			})

			it('should return isWithinWindow=false 1 second after window end', () => {
				const now = new Date('2025-01-15T12:00:01Z')
				const result = isWithinCheckInWindow(event, now)
				expect(result.isWithinWindow).toBe(false)
				expect(result.error).toBe('This event is not currently accepting check-ins')
				expect(result.scheduledTime).toBe(eventStart.toISOString())
			})

			it('should return isWithinWindow=false long after event', () => {
				const now = new Date('2025-01-15T15:00:00Z')
				const result = isWithinCheckInWindow(event, now)
				expect(result.isWithinWindow).toBe(false)
			})

			it('should return isWithinWindow=false long before event', () => {
				const now = new Date('2025-01-15T06:00:00Z')
				const result = isWithinCheckInWindow(event, now)
				expect(result.isWithinWindow).toBe(false)
			})
		})

		describe('startDate as ISO string', () => {
			it('should parse ISO date string correctly', () => {
				const event = createEvent('2025-01-15T10:00:00Z')
				const now = new Date('2025-01-15T10:30:00Z')
				const result = isWithinCheckInWindow(event, now)
				expect(result.isWithinWindow).toBe(true)
			})
		})

		describe('startDate as Firestore Timestamp-like object', () => {
			it('should handle Firestore Timestamp with toDate() method', () => {
				const eventStart = new Date('2025-01-15T10:00:00Z')
				const firestoreTimestamp = {toDate: () => eventStart}
				const event = createEvent(firestoreTimestamp as unknown as Date)
				const now = new Date('2025-01-15T10:30:00Z')
				const result = isWithinCheckInWindow(event, now)
				expect(result.isWithinWindow).toBe(true)
				expect(result.scheduledTime).toBe(eventStart.toISOString())
			})

			it('should correctly enforce time window for Firestore Timestamp', () => {
				const eventStart = new Date('2025-01-15T10:00:00Z')
				const firestoreTimestamp = {toDate: () => eventStart}
				const event = createEvent(firestoreTimestamp as unknown as Date)

				// Before window (more than 30min before)
				const beforeWindow = new Date('2025-01-15T09:00:00Z')
				expect(isWithinCheckInWindow(event, beforeWindow).isWithinWindow).toBe(false)

				// At window start (exactly 30min before)
				const atWindowStart = new Date('2025-01-15T09:30:00Z')
				expect(isWithinCheckInWindow(event, atWindowStart).isWithinWindow).toBe(true)

				// After window (more than 2hr after)
				const afterWindow = new Date('2025-01-15T13:00:00Z')
				expect(isWithinCheckInWindow(event, afterWindow).isWithinWindow).toBe(false)
			})
		})

		describe('default now parameter', () => {
			it('should use current time when now is not provided', () => {
				// Event far in the future
				const event = createEvent(new Date('2099-01-15T10:00:00Z'))
				const result = isWithinCheckInWindow(event)
				expect(result.isWithinWindow).toBe(false)
			})
		})
	})

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
			createdBy: 'user-1'
		}

		it('should return valid for active event when not registered', () => {
			const result = validateEventRegistration(baseEvent, false)
			expect(result.isValid).toBe(true)
			expect(result.error).toBeUndefined()
		})

		it('should return invalid when event is null', () => {
			const result = validateEventRegistration(null, false)
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('Event not found')
		})

		it('should return invalid when event is undefined', () => {
			const result = validateEventRegistration(undefined, false)
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('Event not found')
		})

		it('should return invalid when event is not active', () => {
			const inactiveEvent = {...baseEvent, isActive: false}
			const result = validateEventRegistration(inactiveEvent, false)
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('Event is not active')
		})

		it('should return invalid when already registered', () => {
			const result = validateEventRegistration(baseEvent, true)
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('Already registered for this event')
		})

		it('should return invalid when event is not active and already registered', () => {
			const inactiveEvent = {...baseEvent, isActive: false}
			const result = validateEventRegistration(inactiveEvent, true)
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('Event is not active')
		})

		describe('time window validation (FR56)', () => {
			const eventStart = new Date('2025-01-15T10:00:00Z')
			const eventWithStartDate: EventDocument = {
				...baseEvent,
				startDate: eventStart
			}

			it('should return invalid when check-in is before time window opens', () => {
				const now = new Date('2025-01-15T09:00:00Z') // 1 hour before event
				const result = validateEventRegistration(eventWithStartDate, false, now)
				expect(result.isValid).toBe(false)
				expect(result.error).toBe('This event is not currently accepting check-ins')
				expect(result.scheduledTime).toBe(eventStart.toISOString())
			})

			it('should return valid when check-in is at window start (30min before)', () => {
				const now = new Date('2025-01-15T09:30:00Z')
				const result = validateEventRegistration(eventWithStartDate, false, now)
				expect(result.isValid).toBe(true)
				expect(result.scheduledTime).toBe(eventStart.toISOString())
			})

			it('should return valid during event', () => {
				const now = new Date('2025-01-15T10:30:00Z')
				const result = validateEventRegistration(eventWithStartDate, false, now)
				expect(result.isValid).toBe(true)
			})

			it('should return valid at window end (2hr after start)', () => {
				const now = new Date('2025-01-15T12:00:00Z')
				const result = validateEventRegistration(eventWithStartDate, false, now)
				expect(result.isValid).toBe(true)
			})

			it('should return invalid when check-in is after time window closes', () => {
				const now = new Date('2025-01-15T13:00:00Z') // 3 hours after event
				const result = validateEventRegistration(eventWithStartDate, false, now)
				expect(result.isValid).toBe(false)
				expect(result.error).toBe('This event is not currently accepting check-ins')
				expect(result.scheduledTime).toBe(eventStart.toISOString())
			})

			it('should return valid when event has no startDate (no time restriction)', () => {
				const result = validateEventRegistration(baseEvent, false)
				expect(result.isValid).toBe(true)
			})

			it('should check time window before checking already registered (isActive first)', () => {
				// Event is not active - should fail on isActive check first
				const inactiveEvent = {...eventWithStartDate, isActive: false}
				const now = new Date('2025-01-15T06:00:00Z') // way before window
				const result = validateEventRegistration(inactiveEvent, true, now)
				expect(result.isValid).toBe(false)
				expect(result.error).toBe('Event is not active')
			})
		})
	})

	describe('isValidEventCodeFormat', () => {
		it('should return true for valid 4-digit codes', () => {
			expect(isValidEventCodeFormat('1234')).toBe(true)
			expect(isValidEventCodeFormat('0000')).toBe(true)
			expect(isValidEventCodeFormat('9999')).toBe(true)
		})

		it('should return false for codes that are not 4 digits', () => {
			expect(isValidEventCodeFormat('123')).toBe(false)
			expect(isValidEventCodeFormat('12345')).toBe(false)
			expect(isValidEventCodeFormat('12')).toBe(false)
			expect(isValidEventCodeFormat('1')).toBe(false)
		})

		it('should return false for codes with non-numeric characters', () => {
			expect(isValidEventCodeFormat('123a')).toBe(false)
			expect(isValidEventCodeFormat('abcd')).toBe(false)
			expect(isValidEventCodeFormat('12-4')).toBe(false)
			expect(isValidEventCodeFormat('12 4')).toBe(false)
		})

		it('should return false for null', () => {
			expect(isValidEventCodeFormat(null)).toBe(false)
		})

		it('should return false for undefined', () => {
			expect(isValidEventCodeFormat(undefined)).toBe(false)
		})

		it('should return false for empty string', () => {
			expect(isValidEventCodeFormat('')).toBe(false)
		})
	})
})
