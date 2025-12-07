/**
 * Business logic for guest registration
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */

/**
 * Determine if a guest requires a consent form
 * New guests always require consent, existing guests require it if they haven't signed
 *
 * @param isNewGuest - Whether this is a new guest registration
 * @param signedConsentForm - Whether the guest has already signed the consent form
 * @returns True if consent form is required, false otherwise
 */
export function requiresConsentForm(
	isNewGuest: boolean,
	signedConsentForm?: boolean
): boolean {
	if (isNewGuest) {
		return true
	}
	return !signedConsentForm
}

/**
 * Determine the identifier field name based on whether email or phone is provided
 *
 * @param email - Email address (optional)
 * @param phone - Phone number (optional)
 * @returns The field name ('email' or 'phone') and the identifier value
 */
export function getGuestIdentifier(
	email?: string,
	phone?: string
): {field: 'email' | 'phone'; value: string} | null {
	if (email) {
		return {field: 'email', value: email}
	}
	if (phone) {
		return {field: 'phone', value: phone}
	}
	return null
}

/**
 * Check if an event ID should be added to guest events list
 * Returns true if the event ID is not already in the list
 *
 * @param guestEvents - Array of event IDs the guest is registered for
 * @param eventId - Event ID to check
 * @returns True if event should be added, false if already present
 */
export function shouldAddEventToGuest(
	guestEvents: string[] | undefined,
	eventId: string
): boolean {
	if (!guestEvents || guestEvents.length === 0) {
		return true
	}
	return !guestEvents.includes(eventId)
}
