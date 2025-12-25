import {redirect} from '@tanstack/react-router'
import {createServerFn} from '@tanstack/react-start'
import {z} from 'zod'
import {adminAuth} from '@/lib/firebase/firebase.admin'
import {clearSession, getSessionData, type SessionData, updateSession} from '@/lib/session'
import {requireAdmin} from '@/server/middleware/auth'
import {validateSession} from './utils/auth'
import {AuthenticationError, ValidationError} from './utils/errors'

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
 * Input schema for createSessionFn
 */
const createSessionSchema = z.object({
	uid: z.string().min(1, {error: 'UID is required'}),
	email: z.string().email({error: 'Invalid email format'}).nullable(),
	displayName: z.string().nullable(),
	idToken: z.string().min(1, {error: 'ID token is required'})
})

/**
 * Create a TanStack session after Firebase authentication succeeds.
 *
 * Security flow:
 * 1. Validate input with Zod schema
 * 2. Verify ID token with Firebase Admin SDK (prevents spoofing)
 * 3. Extract custom claims from verified token
 * 4. Clear any existing session first (session fixation prevention - R-022)
 * 5. Create new session with verified data
 * 6. Return user data for client state sync
 *
 * @param data - Firebase user data and ID token
 * @returns Session user data on success
 * @throws ValidationError for invalid input
 * @throws AuthenticationError for invalid/expired token
 */
export const createSessionFn = createServerFn({method: 'POST'}).handler(
	async ({data}: {data: unknown}): Promise<{success: true; user: SessionUser}> => {
		// Validate input (Zod v4 pattern)
		const parseResult = createSessionSchema.safeParse(data)
		if (!parseResult.success) {
			throw new ValidationError(parseResult.error.issues[0]?.message ?? 'Invalid input')
		}

		const {uid, email, displayName, idToken} = parseResult.data

		// Verify ID token with Firebase Admin SDK (R-010: atomic - verify BEFORE session update)
		// Firebase Admin automatically validates:
		// - Token signature
		// - Token expiration (exp claim)
		// - Token issuer (iss claim)
		let decodedToken: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>
		try {
			// checkRevoked: true ensures revoked tokens are rejected (R-024)
			decodedToken = await adminAuth.verifyIdToken(idToken, true)
		} catch (_error) {
			// Token verification failed - do NOT create session (R-010)
			throw new AuthenticationError('Invalid or expired authentication token')
		}

		// Verify UID matches token (R-012: strict equality check)
		if (decodedToken.uid !== uid) {
			throw new AuthenticationError('Token UID mismatch')
		}

		// Extract custom claims from verified token
		const claims: SessionUser['claims'] = {
			admin: decodedToken.admin === true,
			signedConsentForm: decodedToken.signedConsentForm === true
		}

		// Determine current environment for session binding (R-023)
		const env = process.env.NODE_ENV as SessionData['env']

		// Session fixation prevention (R-022):
		// Clear any existing session before creating new one
		// This ensures a fresh session ID is generated
		//
		// ARCHITECTURE NOTE: There's a theoretical race condition window (~4ms) between
		// clearSession() and updateSession() where concurrent login requests could interfere.
		// This follows "last-write-wins" semantics as documented in Story -1.2 Dev Notes.
		// The risk is LOW (requires precise timing) with HIGH impact (session corruption).
		// Mitigation: Application-level request deduplication should prevent this in practice.
		// TanStack session layer doesn't provide mutex/locking as of TanStack Start v1.142.5.
		await clearSession()

		// Create new session with verified data
		// Store sessionCreatedAt for token revocation checks (R-024)
		await updateSession({
			userId: uid,
			email: email ?? undefined,
			displayName: displayName ?? undefined,
			claims,
			env,
			sessionCreatedAt: new Date().toISOString()
		})

		// Return user data for client state sync
		const user: SessionUser = {
			uid,
			email,
			displayName,
			photoURL: null,
			claims
		}

		return {success: true, user}
	}
)

/**
 * Log out the current user by clearing the session.
 *
 * Security:
 * - Clears session completely (removes cookie)
 * - Redirects to home page
 * - Session fixation prevention: clearing generates new session on next login (R-022)
 */
export const logoutFn = createServerFn({method: 'POST'}).handler(async (): Promise<never> => {
	// Clear session (removes nh-session cookie)
	await clearSession()

	// Redirect to home page
	throw redirect({to: '/'})
})

/**
 * Get the current authenticated user from session.
 *
 * @returns SessionUser if authenticated, null otherwise
 */
export const getCurrentUserFn = createServerFn({method: 'GET'}).handler(
	async (): Promise<SessionUser | null> => {
		const sessionData = await getSessionData()

		if (!sessionData.userId) {
			return null
		}

		return {
			uid: sessionData.userId,
			email: sessionData.email ?? null,
			displayName: sessionData.displayName ?? null,
			photoURL: null,
			claims: sessionData.claims ?? {}
		}
	}
)

/**
 * Server function to validate auth token from session cookie
 * and return user data with custom claims.
 *
 * @deprecated Use getCurrentUserFn instead
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

/**
 * Input schema for forceLogoutUserFn
 */
const forceLogoutSchema = z.object({
	uid: z.string().min(1, {error: 'User ID is required'})
})

/**
 * Force logout a user by revoking their Firebase refresh tokens.
 *
 * Admin-only function that invalidates all active sessions for a user.
 * Uses Firebase Admin SDK's revokeRefreshTokens() to revoke all tokens.
 *
 * Security:
 * - Requires admin privileges (verified via requireAdmin middleware)
 * - Revokes all Firebase tokens, forcing re-authentication
 * - Any existing sessions will fail on next Firebase verification (R-017)
 *
 * @param data - Object containing uid of user to force logout
 * @returns Success status and revocation timestamp
 * @throws AuthenticationError if not admin
 * @throws ValidationError for invalid input
 */
export const forceLogoutUserFn = createServerFn({method: 'POST'}).handler(
	async ({data}: {data: unknown}): Promise<{success: true; revokedAt: string}> => {
		// Validate input
		const parseResult = forceLogoutSchema.safeParse(data)
		if (!parseResult.success) {
			throw new ValidationError(parseResult.error.issues[0]?.message ?? 'Invalid input')
		}

		const {uid} = parseResult.data

		// Require admin privileges - uses middleware with Firebase claim verification (R-004)
		await requireAdmin()

		// Revoke all refresh tokens for the target user
		// This invalidates all their sessions across all devices
		try {
			await adminAuth.revokeRefreshTokens(uid)

			// Get the revocation timestamp
			const userRecord = await adminAuth.getUser(uid)
			const revokedAt = userRecord.tokensValidAfterTime ?? new Date().toISOString()

			return {success: true, revokedAt}
		} catch (error) {
			// Handle Firebase errors
			const firebaseError = error as {code?: string}
			if (firebaseError.code === 'auth/user-not-found') {
				throw new ValidationError('User not found')
			}
			throw new AuthenticationError('Failed to revoke user tokens')
		}
	}
)

/**
 * Input schema for logMagicLinkAttemptFn
 */
const logMagicLinkAttemptSchema = z.object({
	success: z.boolean(),
	errorCode: z.string().optional(),
	// Email domain only (not full email) to prevent PII in logs while allowing pattern detection
	emailDomain: z.string().optional()
})

/**
 * Log magic link send attempts for security monitoring.
 *
 * Called from client after sendSignInLinkToEmail() to track success/failure rates.
 * Logs are aggregated server-side to detect:
 * - High failure rates (>5% indicates Firebase config or email delivery issues)
 * - Domain-specific issues (e.g., corporate email blockers)
 * - Potential abuse patterns
 *
 * Security:
 * - NO PII logged (email domain only, not full email)
 * - Client-side still shows success to prevent user enumeration
 * - Server-side monitoring can alert on high error rates
 *
 * @param data - Attempt outcome and email domain
 * @returns Success status
 */
export const logMagicLinkAttemptFn = createServerFn({method: 'POST'}).handler(
	async ({data}: {data: unknown}): Promise<{success: true}> => {
		const parseResult = logMagicLinkAttemptSchema.safeParse(data)
		if (!parseResult.success) {
			// Silently fail validation - logging is best-effort
			return {success: true}
		}

		const {success, errorCode, emailDomain} = parseResult.data

		// TODO: Replace console.error with proper monitoring service
		// For now, log to console which is captured by hosting provider (Render)
		if (!success) {
			console.error('[MagicLink] Send failed', {
				errorCode,
				emailDomain: emailDomain || 'unknown',
				timestamp: new Date().toISOString()
			})
		} else {
			console.log('[MagicLink] Send success', {
				emailDomain: emailDomain || 'unknown',
				timestamp: new Date().toISOString()
			})
		}

		return {success: true}
	}
)

/**
 * Get session data for route context.
 *
 * Called from __root.tsx beforeLoad to provide session state to all routes.
 * Returns a simplified auth context object for route guards.
 *
 * @returns Auth context with user data or null if not authenticated
 */
export const getSessionForRoutesFn = createServerFn({method: 'GET'}).handler(
	async (): Promise<{
		user: SessionUser | null
		isAuthenticated: boolean
		hasConsent: boolean
		isAdmin: boolean
	}> => {
		const sessionData = await getSessionData()

		if (!sessionData.userId) {
			return {
				user: null,
				isAuthenticated: false,
				hasConsent: false,
				isAdmin: false
			}
		}

		const user: SessionUser = {
			uid: sessionData.userId,
			email: sessionData.email ?? null,
			displayName: sessionData.displayName ?? null,
			photoURL: null,
			claims: sessionData.claims ?? {}
		}

		return {
			user,
			isAuthenticated: true,
			hasConsent: sessionData.claims?.signedConsentForm === true,
			isAdmin: sessionData.claims?.admin === true
		}
	}
)
