import {createServerFn} from '@tanstack/react-start'
import {validateSession} from './utils/auth'

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
 */
export const getSessionUser = createServerFn({method: 'GET'}).handler(
	async (): Promise<SessionUser | null> => {
		try {
			const user = await validateSession()
			return user
		} catch {
			// No valid session
			return null
		}
	}
)
