import {getSessionData, validateSessionEnvironment} from '@/lib/session'
import type {SessionUser} from '../auth'
import {AuthenticationError} from './errors'

/**
 * Validate TanStack session and return authenticated user.
 *
 * Uses getSessionData() from src/lib/session.ts which reads the encrypted
 * nh-session cookie via TanStack Start's useSession (iron-webcrypto).
 *
 * Security:
 * - Session is already decrypted/verified by iron-webcrypto
 * - Cross-environment replay protection via validateSessionEnvironment (R-023)
 * - No Firebase Admin call needed - session was validated at creation time
 *
 * @deprecated Use `requireAuth()` from `@/server/middleware/auth` instead.
 * This function will be removed in a future version.
 */
export async function validateSession(): Promise<SessionUser> {
	const sessionData = await getSessionData()

	// Check if session has a user
	if (!sessionData.userId) {
		throw new AuthenticationError('No session found')
	}

	// Validate environment to prevent cross-env replay attacks (R-023)
	if (!validateSessionEnvironment(sessionData)) {
		throw new AuthenticationError('Session environment mismatch')
	}

	return {
		uid: sessionData.userId,
		email: sessionData.email ?? null,
		displayName: sessionData.displayName ?? null,
		photoURL: null,
		claims: sessionData.claims ?? {}
	}
}

/**
 * Validate session and require admin privileges
 *
 * @deprecated Use `requireAdmin()` from `@/server/middleware/auth` instead.
 * The middleware version verifies admin claims against Firebase (R-004).
 */
export async function requireAdmin(): Promise<SessionUser> {
	const user = await validateSession()

	if (!user.claims.admin) {
		throw new AuthenticationError('Admin privileges required')
	}

	return user
}

/**
 * Validate session and require consent form signed
 *
 * @deprecated Use `requireConsent()` from `@/server/middleware/auth` instead.
 */
export async function requireConsent(): Promise<SessionUser> {
	const user = await validateSession()

	if (!user.claims.signedConsentForm) {
		throw new AuthenticationError('Consent form must be signed')
	}

	return user
}
