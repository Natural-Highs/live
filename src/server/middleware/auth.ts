/**
 * Auth middleware for server functions
 *
 * Provides authentication and authorization middleware patterns for
 * server functions. Replaces direct validateSession() calls with
 * a cleaner middleware pattern.
 *
 * Story -1.2, Task 5, Task 7, Task 8
 *
 * @module server/middleware/auth
 */

import {clearSession, getSessionData, validateSessionEnvironment} from '@/lib/session'
import {adminAuth} from '@/lib/firebase/firebase.admin'
import {AuthenticationError} from '../functions/utils/errors'
import type {SessionUser} from '../functions/auth'

/**
 * Require authenticated session.
 *
 * Validates the TanStack session and returns the authenticated user.
 * Throws AuthenticationError if not authenticated.
 *
 * Security:
 * - Session is already decrypted/verified by iron-webcrypto
 * - Cross-environment replay protection via validateSessionEnvironment (R-023)
 *
 * @returns SessionUser object with user data and claims
 * @throws AuthenticationError if not authenticated
 *
 * @example
 * ```typescript
 * export const myProtectedFn = createServerFn({method: 'POST'}).handler(async () => {
 *   const user = await requireAuth()
 *   // user is guaranteed to be authenticated
 *   return {message: `Hello, ${user.displayName}`}
 * })
 * ```
 */
export async function requireAuth(): Promise<SessionUser> {
	const sessionData = await getSessionData()

	// Check if session has a user
	if (!sessionData.userId) {
		throw new AuthenticationError('Authentication required')
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
 * Verify Firebase user exists and is not disabled.
 *
 * Used for critical operations to detect zombie sessions (R-017).
 * If user is deleted or disabled in Firebase, clears session immediately.
 *
 * @param uid - Firebase user ID to verify
 * @returns true if user exists and is enabled
 * @throws AuthenticationError if user doesn't exist or is disabled
 */
export async function verifyFirebaseUserExists(uid: string): Promise<boolean> {
	try {
		const firebaseUser = await adminAuth.getUser(uid)

		// Check if user is disabled (banned) (R-017)
		if (firebaseUser.disabled) {
			// Clear zombie session immediately
			await clearSession()
			throw new AuthenticationError('User account is disabled')
		}

		return true
	} catch (error) {
		// If it's our AuthenticationError, rethrow it
		if (error instanceof AuthenticationError) {
			throw error
		}

		// User doesn't exist in Firebase - clear zombie session (R-013)
		await clearSession()
		throw new AuthenticationError('User account no longer exists')
	}
}

/**
 * Require authentication with Firebase user verification.
 *
 * Like requireAuth() but also verifies the Firebase user still exists
 * and is not disabled. Use for critical operations. (R-017, R-013)
 *
 * @returns SessionUser with verified Firebase existence
 * @throws AuthenticationError if not authenticated or user deleted/disabled
 */
export async function requireAuthWithFirebaseCheck(): Promise<SessionUser> {
	const user = await requireAuth()

	// Verify Firebase user still exists and is not disabled
	await verifyFirebaseUserExists(user.uid)

	return user
}

/**
 * Require admin privileges.
 *
 * First validates authentication, then checks admin claim.
 * CRITICAL: Verifies admin claim against Firebase to prevent privilege escalation (R-004).
 *
 * Security flow:
 * 1. Validate session via requireAuth()
 * 2. Check session has admin claim
 * 3. Verify admin claim against Firebase (prevents stale/tampered claims)
 *
 * @returns SessionUser with verified admin privileges
 * @throws AuthenticationError if not authenticated or not admin
 *
 * @example
 * ```typescript
 * export const adminOnlyFn = createServerFn({method: 'POST'}).handler(async () => {
 *   const admin = await requireAdmin()
 *   // admin is verified to have admin privileges
 *   return {users: await getAllUsers()}
 * })
 * ```
 */
export async function requireAdmin(): Promise<SessionUser> {
	const user = await requireAuth()

	// Session must have admin claim
	if (!user.claims.admin) {
		throw new AuthenticationError('Admin privileges required')
	}

	// Verify admin claim against Firebase (R-004)
	// This prevents privilege escalation via stale/tampered session claims
	try {
		const firebaseUser = await adminAuth.getUser(user.uid)
		const firebaseClaims = firebaseUser.customClaims ?? {}

		if (!firebaseClaims.admin) {
			// Session claims admin but Firebase says no - reject
			throw new AuthenticationError('Admin privileges required')
		}
	} catch (error) {
		// If it's our AuthenticationError, rethrow it
		if (error instanceof AuthenticationError) {
			throw error
		}
		// Firebase error (user deleted, network error, etc.) - fail closed
		throw new AuthenticationError('Admin privileges required')
	}

	return user
}

/**
 * Require consent form signed.
 *
 * First validates authentication, then checks signedConsentForm claim.
 *
 * @returns SessionUser with consent form signed
 * @throws AuthenticationError if not authenticated or consent not signed
 */
export async function requireConsent(): Promise<SessionUser> {
	const user = await requireAuth()

	if (!user.claims.signedConsentForm) {
		throw new AuthenticationError('Consent form must be signed')
	}

	return user
}

/**
 * Check if the session was created before a token revocation event.
 *
 * Handles password/passkey changes that invalidate all previous tokens (R-024).
 * If the Firebase user's tokensValidAfterTime is after the session creation time,
 * the session is invalid and must be cleared.
 *
 * @param uid - Firebase user ID
 * @param sessionCreatedAt - ISO timestamp of when the session was created
 * @returns true if session is valid (not revoked)
 * @throws AuthenticationError if session was revoked
 */
export async function checkTokenRevocation(uid: string, sessionCreatedAt?: string): Promise<boolean> {
	// If no session creation time, we can't validate revocation
	// This handles legacy sessions without the timestamp - allow them for backwards compatibility
	if (!sessionCreatedAt) {
		return true
	}

	try {
		const firebaseUser = await adminAuth.getUser(uid)

		// tokensValidAfterTime is set when revokeRefreshTokens() is called
		// or when password/email is changed
		const tokensValidAfterTime = firebaseUser.tokensValidAfterTime

		if (!tokensValidAfterTime) {
			// No revocation has ever occurred for this user
			return true
		}

		// Parse timestamps for comparison
		const sessionCreatedDate = new Date(sessionCreatedAt)
		const revocationDate = new Date(tokensValidAfterTime)

		// If session was created before the revocation timestamp,
		// it was created with a now-invalid token (R-024)
		if (sessionCreatedDate < revocationDate) {
			// Clear the invalidated session immediately
			await clearSession()
			throw new AuthenticationError('Session invalidated due to security event')
		}

		return true
	} catch (error) {
		// If it's our AuthenticationError, rethrow it
		if (error instanceof AuthenticationError) {
			throw error
		}

		// Firebase error (user deleted, network error, etc.) - fail closed
		// User deletion is handled by verifyFirebaseUserExists, so this is for network errors
		// Log original error for debugging before throwing user-friendly message
		console.error('Token revocation check failed:', error)
		throw new AuthenticationError('Unable to verify session validity')
	}
}

/**
 * Require authentication with token revocation check.
 *
 * Like requireAuth() but also checks if the session was created before
 * a token revocation event (password change, passkey change, admin revocation).
 * Use for sensitive operations. (R-024)
 *
 * @returns SessionUser with verified non-revoked session
 * @throws AuthenticationError if not authenticated or session was revoked
 */
export async function requireAuthWithRevocationCheck(): Promise<SessionUser> {
	const sessionData = await getSessionData()

	// Check if session has a user
	if (!sessionData.userId) {
		throw new AuthenticationError('Authentication required')
	}

	// Validate environment to prevent cross-env replay attacks (R-023)
	if (!validateSessionEnvironment(sessionData)) {
		throw new AuthenticationError('Session environment mismatch')
	}

	// Check token revocation (R-024)
	await checkTokenRevocation(sessionData.userId, sessionData.sessionCreatedAt)

	return {
		uid: sessionData.userId,
		email: sessionData.email ?? null,
		displayName: sessionData.displayName ?? null,
		photoURL: null,
		claims: sessionData.claims ?? {}
	}
}

/**
 * Require authentication with full Firebase verification.
 *
 * Combines:
 * - Session validation (requireAuth)
 * - Firebase user exists check (R-017, R-013)
 * - Token revocation check (R-024)
 *
 * Use for the most sensitive operations where all checks are required.
 *
 * @returns SessionUser with full verification
 * @throws AuthenticationError if any check fails
 */
export async function requireAuthFull(): Promise<SessionUser> {
	const user = await requireAuthWithRevocationCheck()

	// Also verify Firebase user still exists and is not disabled
	await verifyFirebaseUserExists(user.uid)

	return user
}
