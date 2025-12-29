/**
 * Business logic for guest user validation
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */

import type {GuestUserDocument} from '@/types/forms'

/**
 * Validate that a guest user document is valid
 *
 * @param guestData - Guest user document data
 * @returns Object with isValid flag and error message if invalid
 */
export function validateGuestUser(guestData: GuestUserDocument | null | undefined): {
	isValid: boolean
	error?: string
} {
	if (!guestData) {
		return {isValid: false, error: 'Guest not found'}
	}

	if (!guestData.isGuest) {
		return {isValid: false, error: 'Invalid guest ID'}
	}

	return {isValid: true}
}
