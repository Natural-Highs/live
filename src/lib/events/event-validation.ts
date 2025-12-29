/**
 * Business logic for event validation
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */

import type {EventDocument} from '@/types/events'

// Default check-in window: 30 minutes before start, 2 hours after start
const DEFAULT_CHECKIN_WINDOW_BEFORE_MS = 30 * 60 * 1000 // 30 minutes
const DEFAULT_CHECKIN_WINDOW_AFTER_MS = 2 * 60 * 60 * 1000 // 2 hours

/**
 * Check if the current time is within the event's check-in window
 *
 * @param event - Event document with startDate
 * @param now - Current time (injectable for testing)
 * @returns Object with isWithinWindow flag, error message if outside, and scheduled time
 */
export function isWithinCheckInWindow(
	event: EventDocument | null | undefined,
	now: Date = new Date()
): {isWithinWindow: boolean; error?: string; scheduledTime?: string} {
	if (!event?.startDate) {
		// No start date means no time restriction
		return {isWithinWindow: true}
	}

	// Handle Date, Firestore Timestamp (with .toDate()), or string
	const rawStartDate = event.startDate as Date | string | {toDate: () => Date}
	let startDate: Date
	if (rawStartDate instanceof Date) {
		startDate = rawStartDate
	} else if (
		typeof rawStartDate === 'object' &&
		'toDate' in rawStartDate &&
		typeof rawStartDate.toDate === 'function'
	) {
		startDate = rawStartDate.toDate()
	} else {
		startDate = new Date(rawStartDate as string)
	}

	if (Number.isNaN(startDate.getTime())) {
		// Invalid date, allow check-in
		return {isWithinWindow: true}
	}

	const windowStart = new Date(startDate.getTime() - DEFAULT_CHECKIN_WINDOW_BEFORE_MS)
	const windowEnd = new Date(startDate.getTime() + DEFAULT_CHECKIN_WINDOW_AFTER_MS)

	const scheduledTime = startDate.toISOString()

	if (now < windowStart) {
		return {
			isWithinWindow: false,
			error: 'This event is not currently accepting check-ins',
			scheduledTime
		}
	}

	if (now > windowEnd) {
		return {
			isWithinWindow: false,
			error: 'This event is not currently accepting check-ins',
			scheduledTime
		}
	}

	return {isWithinWindow: true, scheduledTime}
}

/**
 * Validate that an event can be registered for
 * Checks if event exists, is active, within time window, and not already registered
 *
 * @param event - Event document or data to validate (can be partial)
 * @param isAlreadyRegistered - Whether user is already registered for this event
 * @param now - Current time (injectable for testing)
 * @returns Object with isValid flag, error message if invalid, and scheduled time if applicable
 */
export function validateEventRegistration(
	event: EventDocument | {isActive?: boolean; startDate?: Date | string} | null | undefined,
	isAlreadyRegistered: boolean,
	now: Date = new Date()
): {isValid: boolean; error?: string; scheduledTime?: string} {
	if (!event) {
		return {isValid: false, error: 'Event not found'}
	}

	if (!event.isActive) {
		return {isValid: false, error: 'Event is not active'}
	}

	if (isAlreadyRegistered) {
		return {isValid: false, error: 'Already registered for this event'}
	}

	// Check time window (FR56)
	const timeWindowResult = isWithinCheckInWindow(event as EventDocument, now)
	if (!timeWindowResult.isWithinWindow) {
		return {
			isValid: false,
			error: timeWindowResult.error,
			scheduledTime: timeWindowResult.scheduledTime
		}
	}

	return {isValid: true, scheduledTime: timeWindowResult.scheduledTime}
}

/**
 * Check if event code is valid format (4 digits)
 *
 * @param code - Event code to validate
 * @returns True if code is valid format, false otherwise
 */
export function isValidEventCodeFormat(code: string | null | undefined): boolean {
	if (!code) {
		return false
	}
	return /^\d{4}$/.test(code)
}
