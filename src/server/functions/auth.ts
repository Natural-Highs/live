import {createServerFn} from '@tanstack/react-start'

export interface SessionUser {
	uid: string
	email: string | null
	displayName: string | null
	photoURL: string | null
	claims: {
		admin?: boolean
		signedConsentForm?: boolean
	}
}

/**
 * Server function to validate auth token from __session cookie
 * and return user data with custom claims.
 * 
 * Note: Full implementation with cookie parsing will be added in Issue #7.
 * For now, returns null (auth handled client-side via AuthContext).
 */
export const getSessionUser = createServerFn({method: 'GET'}).handler(
	async (): Promise<SessionUser | null> => {
		// TODO: Issue #7 - Implement server-side auth validation
		// Will use Firebase Admin SDK to verify __session cookie
		return null
	}
)
