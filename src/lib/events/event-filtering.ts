/**
 * Business logic for event filtering and query building
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */

import type {EventDocument} from '../../server/types/events'

/**
 * Determine if user should see all events (admin) or only active events (regular user)
 *
 * @param isAdmin - Whether the user is an admin
 * @returns True if user should see all events, false if only active events
 */
export function shouldShowAllEvents(isAdmin: boolean): boolean {
	return isAdmin
}

/**
 * Check if event should be included in results based on user role
 *
 * @param event - Event document to check
 * @param isAdmin - Whether the user is an admin
 * @returns True if event should be included, false otherwise
 */
export function shouldIncludeEvent(
	event: EventDocument,
	isAdmin: boolean
): boolean {
	if (isAdmin) {
		return true // Admins see all events
	}
	return event.isActive === true // Regular users only see active events
}
