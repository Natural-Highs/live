/**
 * Auth middleware for server functions
 *
 * Provides authentication and authorization middleware patterns for
 * server functions. Replaces direct validateSession() calls with
 * a cleaner middleware pattern.
 *
 * @module server/middleware/auth
 */

import {adminAuth} from '@/lib/firebase/firebase.admin'
import {clearSession, getSessionData, validateSessionEnvironment} from '@/lib/session'
import type {SessionUser} from '../functions/auth'
import {AuthenticationError} from '../functions/utils/errors'
import {checkSessionRevoked, refreshSessionTimestamp, shouldRefreshSession} from './session'

/**
 * Require authenticated session with session validation.
 *
 * Validates the TanStack session and returns the authenticated user.
 * Performs session validation including:
 * - Session existence check
 * - Environment binding validation (R-023)
 * - Firestore-based session revocation check (NFR2)
 * - Sliding window session refresh (after 30 days)
 *
 * Throws AuthenticationError if not authenticated or session invalid.
 *
 * @param options - Configuration options
 * @param options.skipRefresh - Skip session refresh (for read-only operations)
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
export async function requireAuth(options?: {skipRefresh?: boolean}): Promise<SessionUser> {
	const sessionData = await getSessionData()

	// Check if session has a user
	if (!sessionData.userId) {
		throw new AuthenticationError('Authentication required')
	}

	// Validate environment to prevent cross-env replay attacks (R-023)
	if (!validateSessionEnvironment(sessionData)) {
		throw new AuthenticationError('Session environment mismatch')
	}

	// Check Firestore-based session revocation events (NFR2)
	const isRevoked = await checkSessionRevoked(sessionData.userId, sessionData.sessionCreatedAt)
	if (isRevoked) {
		await clearSession()
		throw new AuthenticationError('Session has been revoked')
	}

	// Sliding window session refresh (after 30 days)
	if (!options?.skipRefresh && shouldRefreshSession(sessionData.sessionCreatedAt)) {
		await refreshSessionTimestamp()
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
 * CREDENTIAL CHANGE DETECTION:
 * Firebase automatically updates tokensValidAfterTime when:
 * - Password is changed
 * - Email is changed
 * - Admin calls revokeRefreshTokens()
 *
 * Since we use server-side sessions (not Firebase ID tokens for auth),
 * credential changes are detected on the NEXT request when this function
 * is called via requireAuthWithRevocationCheck(). There is no webhook/
 * push notification - detection is pull-based.
 *
 * For immediate invalidation, admin can call forceLogoutUserFn() which
 * both revokes Firebase tokens AND creates a Firestore revocation event.
 *
 * @param uid - Firebase user ID
 * @param sessionCreatedAt - ISO timestamp of when the session was created
 * @returns true if session is valid (not revoked)
 * @throws AuthenticationError if session was revoked
 */
export async function checkTokenRevocation(
	uid: string,
	sessionCreatedAt?: string
): Promise<boolean> {
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
		throw new AuthenticationError('Unable to verify session validity')
	}
}

/**
 * Require authentication with Firebase token revocation check.
 *
 * Extends requireAuth() with an additional Firebase Admin call to verify
 * the session wasn't created before a credential change event.
 *
 * Use this for SENSITIVE operations where you need to detect:
 * - Password changes
 * - Email changes
 * - Admin-initiated token revocation
 *
 * Note: requireAuth() already checks Firestore-based revocation events
 * (passkey removal, user-requested logout). This function adds Firebase's
 * tokensValidAfterTime check which catches credential changes.
 *
 * Performance: Makes an additional Firebase Admin API call. Use sparingly.
 *
 * @param options - Configuration options
 * @param options.skipRefresh - Skip session refresh (for read-only operations)
 * @returns SessionUser with verified non-revoked session
 * @throws AuthenticationError if not authenticated or session was revoked
 */
export async function requireAuthWithRevocationCheck(options?: {
	skipRefresh?: boolean
}): Promise<SessionUser> {
	// First do standard auth checks (Firestore revocation, env binding, refresh)
	const user = await requireAuth(options)

	// Additionally check Firebase token revocation (R-024)
	// This catches password/email changes that don't create Firestore events
	const sessionData = await getSessionData()
	await checkTokenRevocation(user.uid, sessionData.sessionCreatedAt)

	return user
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
