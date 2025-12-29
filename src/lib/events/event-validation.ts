/**
 * Business logic for event validation
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */

import type {EventDocument} from '../../server/types/events'

/**
 * Validate that an event can be registered for
 * Checks if event exists, is active, and not already registered
 *
 * @param event - Event document or data to validate (can be partial)
 * @param isAlreadyRegistered - Whether user is already registered for this event
 * @returns Object with isValid flag and error message if invalid
 */
export function validateEventRegistration(
	event: EventDocument | {isActive?: boolean} | null | undefined,
	isAlreadyRegistered: boolean
): {isValid: boolean; error?: string} {
	if (!event) {
		return {isValid: false, error: 'Event not found'}
	}

	if (!event.isActive) {
		return {isValid: false, error: 'Event is not active'}
	}

	if (isAlreadyRegistered) {
		return {isValid: false, error: 'Already registered for this event'}
	}

	return {isValid: true}
}

/**
 * Check if event code is valid format (4 digits)
 *
 * @param code - Event code to validate
 * @returns True if code is valid format, false otherwise
 */
export function isValidEventCodeFormat(
	code: string | null | undefined
): boolean {
	if (!code) {
		return false
	}
	return /^\d{4}$/.test(code)
}
