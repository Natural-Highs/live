/**
 * Utility functions for building Firebase custom claims
 */

export interface UserCustomClaims {
	admin?: boolean
	signedConsentForm?: boolean
}

export interface UserData {
	isAdmin?: boolean
	signedConsentForm?: boolean
}

/**
 * Build custom claims object from user data
 * @param userData - User data containing admin and consent form status
 * @returns Custom claims object for Firebase Auth
 */
export function buildCustomClaims(
	userData: UserData | null | undefined
): UserCustomClaims {
	return {
		admin: userData?.isAdmin ?? false,
		signedConsentForm: userData?.signedConsentForm ?? false
	}
}
