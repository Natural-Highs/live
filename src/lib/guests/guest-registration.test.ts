/**
 * Unit tests for guest registration business logic
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */

import {getGuestIdentifier, requiresConsentForm, shouldAddEventToGuest} from './guest-registration'

describe('Guest Registration Business Logic', () => {
	describe('requiresConsentForm', () => {
		it('should return true for new guests', () => {
			expect(requiresConsentForm(true, false)).toBe(true)
			expect(requiresConsentForm(true, true)).toBe(true)
			expect(requiresConsentForm(true, undefined)).toBe(true)
		})

		it('should return true for existing guests who have not signed', () => {
			expect(requiresConsentForm(false, false)).toBe(true)
			expect(requiresConsentForm(false, undefined)).toBe(true)
		})

		it('should return false for existing guests who have signed', () => {
			expect(requiresConsentForm(false, true)).toBe(false)
		})
	})

	describe('getGuestIdentifier', () => {
		it('should return email field when email is provided', () => {
			const result = getGuestIdentifier('test@example.com', undefined)
			expect(result).toEqual({field: 'email', value: 'test@example.com'})
		})

		it('should return phone field when phone is provided and email is not', () => {
			const result = getGuestIdentifier(undefined, '1234567890')
			expect(result).toEqual({field: 'phone', value: '1234567890'})
		})

		it('should prefer email over phone when both are provided', () => {
			const result = getGuestIdentifier('test@example.com', '1234567890')
			expect(result).toEqual({field: 'email', value: 'test@example.com'})
		})

		it('should return null when neither email nor phone is provided', () => {
			const result = getGuestIdentifier(undefined, undefined)
			expect(result).toBeNull()
		})

		it('should return null when both are empty strings', () => {
			const result = getGuestIdentifier('', '')
			expect(result).toBeNull()
		})
	})

	describe('shouldAddEventToGuest', () => {
		it('should return true when guestEvents is undefined', () => {
			expect(shouldAddEventToGuest(undefined, 'event-123')).toBe(true)
		})

		it('should return true when guestEvents is empty array', () => {
			expect(shouldAddEventToGuest([], 'event-123')).toBe(true)
		})

		it('should return true when event is not in the list', () => {
			expect(shouldAddEventToGuest(['event-1', 'event-2'], 'event-123')).toBe(true)
		})

		it('should return false when event is already in the list', () => {
			expect(shouldAddEventToGuest(['event-1', 'event-123', 'event-2'], 'event-123')).toBe(false)
		})

		it('should return true for first event when list has other events', () => {
			expect(shouldAddEventToGuest(['event-2'], 'event-1')).toBe(true)
		})
	})
})
