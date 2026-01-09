import {createServerFn} from '@tanstack/react-start'
import {z} from 'zod'
import {adminAuth, shouldUseEmulators} from '@/lib/firebase/firebase.admin'
import {clearSession, getSessionData, type SessionData, updateSession} from '@/lib/session'
import {requireAdmin} from '@/server/middleware/auth'
import {getSessionExpiration, isSessionExpiringSoon} from '@/server/middleware/session'
import {AuthenticationError, ValidationError} from './utils/errors'
import {captureServerError} from './utils/sentry.server'

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
 * 1. Validate input with Zod schema via inputValidator
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
export const createSessionFn = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => {
		const result = createSessionSchema.safeParse(d)
		if (!result.success) {
			throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
		}
		return result.data
	})
	.handler(async ({data}): Promise<{success: true; user: SessionUser}> => {
		const {uid, email, displayName, idToken} = data

		// Verify ID token with Firebase Admin SDK (R-010: atomic - verify BEFORE session update)
		// Firebase Admin automatically validates:
		// - Token signature
		// - Token expiration (exp claim)
		// - Token issuer (iss claim)
		let claims: SessionUser['claims'] = {}

		// In emulator mode, skip strict token verification for E2E testing
		// The emulator doesn't support verifying mock tokens from HTTP mocks
		// Production still requires full token verification (R-010)
		if (shouldUseEmulators) {
			// Trust the provided UID in emulator mode
			// This allows E2E tests to mock Firebase Auth and still create sessions
			claims = {
				admin: false,
				signedConsentForm: false
			}
		} else {
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
			claims = {
				admin: decodedToken.admin === true,
				signedConsentForm: decodedToken.signedConsentForm === true
			}
		}

		// Determine current environment for session binding (R-023)
		const env = process.env.NODE_ENV as SessionData['env']

		// Session fixation prevention (R-022):
		// Clear any existing session before creating new one
		// This ensures a fresh session ID is generated
		//
		// ARCHITECTURE NOTE: There's a theoretical race condition window (~4ms) between
		// clearSession() and updateSession() where concurrent login requests could interfere.
		// This follows "last-write-wins" semantics for concurrent session operations.
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
	})

/**
 * Log out the current user by clearing the session.
 *
 * Security:
 * - Clears session completely (removes cookie)
 * - Redirects to home page
 * - Session fixation prevention: clearing generates new session on next login (R-022)
 */
export const logoutFn = createServerFn({method: 'POST'}).handler(async (): Promise<void> => {
	// Clear session (removes nh-session cookie)
	await clearSession()
	// Note: Navigation handled by client to ensure Set-Cookie header is received
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
export const forceLogoutUserFn = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => {
		const result = forceLogoutSchema.safeParse(d)
		if (!result.success) {
			throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
		}
		return result.data
	})
	.handler(async ({data}): Promise<{success: true; revokedAt: string}> => {
		const {uid} = data

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
	})

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
export const logMagicLinkAttemptFn = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => logMagicLinkAttemptSchema.parse(d))
	.handler(async ({data}): Promise<{success: true}> => {
		const {success, errorCode, emailDomain} = data

		// Log magic link attempts to Sentry for monitoring
		if (!success && errorCode) {
			captureServerError(new Error(`Magic link attempt failed: ${errorCode}`), {
				errorCode,
				emailDomain,
				context: 'magic_link_attempt'
			})
		}

		return {success: true}
	})

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
		hasPasskey: boolean
		/** Whether user has completed profile setup (display name + DOB) */
		hasProfile: boolean
		/** Whether session expires within 7 days */
		isSessionExpiring: boolean
		/** Session expiration date (ISO string) or null */
		sessionExpiresAt: string | null
	}> => {
		const sessionData = await getSessionData()

		if (!sessionData.userId) {
			return {
				user: null,
				isAuthenticated: false,
				hasConsent: false,
				isAdmin: false,
				hasPasskey: false,
				hasProfile: false,
				isSessionExpiring: false,
				sessionExpiresAt: null
			}
		}

		const user: SessionUser = {
			uid: sessionData.userId,
			email: sessionData.email ?? null,
			displayName: sessionData.displayName ?? null,
			photoURL: null,
			claims: sessionData.claims ?? {}
		}

		const expiration = getSessionExpiration(sessionData)

		return {
			user,
			isAuthenticated: true,
			hasConsent: sessionData.claims?.signedConsentForm === true,
			isAdmin: sessionData.claims?.admin === true,
			hasPasskey: sessionData.claims?.passkeyEnabled === true,
			hasProfile: sessionData.claims?.profileComplete === true,
			isSessionExpiring: isSessionExpiringSoon(sessionData),
			sessionExpiresAt: expiration?.toISOString() ?? null
		}
	}
)
