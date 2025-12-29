/**
 * Session Management for Natural-Highs
 *
 * Provides secure HTTP-only cookie-based session management using TanStack Start's useSession.
 * This module is SERVER-ONLY - it cannot be used in client components.
 *
 * Usage:
 * - Server functions (createServerFn)
 * - Route beforeLoad hooks
 * - API routes
 *
 * @module session
 */

import {useSession} from '@tanstack/react-start/server'

/**
 * Session data structure stored in the encrypted cookie.
 *
 * @property userId - Firebase Auth UID
 * @property email - User's email address
 * @property displayName - User's display name
 * @property claims - Custom Firebase claims (admin, signedConsentForm, passkeyEnabled, profileComplete, isMinor)
 * @property env - Environment binding to prevent cross-environment replay attacks (R-023)
 * @property sessionCreatedAt - ISO timestamp of session creation for revocation checks (R-024)
 */
export type SessionData = {
	userId?: string
	email?: string
	displayName?: string
	claims?: {
		admin?: boolean
		signedConsentForm?: boolean
		/** Set to true when user has registered a passkey */
		passkeyEnabled?: boolean
		/** Set to true when user has completed profile (display name + DOB) */
		profileComplete?: boolean
		/** Set to true when user is under 18 (determines demographics storage location) */
		isMinor?: boolean
	}
	/** Environment binding prevents cross-environment session replay (R-023) */
	env?: 'development' | 'staging' | 'production'
	/** Session creation timestamp for token revocation checks (R-024) */
	sessionCreatedAt?: string
}

/**
 * Cookie name for the session.
 * Uses 'nh-session' to avoid collision with Firebase Admin SDK's '__session' cookie.
 */
export const SESSION_COOKIE_NAME = 'nh-session'

/**
 * Session max age in seconds (90 days per NFR1).
 * Calculated as: 90 days * 24 hours * 60 minutes * 60 seconds
 */
export const SESSION_MAX_AGE = 90 * 24 * 60 * 60

/**
 * Extended session max age for passkey users (180 days per NFR1).
 * Passkey authentication provides stronger security guarantees,
 * allowing for longer session duration.
 * Calculated as: 180 days * 24 hours * 60 minutes * 60 seconds
 */
export const PASSKEY_SESSION_MAX_AGE = 180 * 24 * 60 * 60

/**
 * Validates SESSION_SECRET environment variable.
 *
 * Fails fast if:
 * - SESSION_SECRET is not set
 * - SESSION_SECRET is less than 32 characters
 *
 * @throws {Error} If SESSION_SECRET is invalid with helpful error message
 */
export function validateSessionSecret(): void {
	const secret = process.env.SESSION_SECRET

	if (!secret || secret.length < 32) {
		throw new Error(
			'SESSION_SECRET must be set and at least 32 characters. ' +
				'Run: doppler secrets set SESSION_SECRET $(openssl rand -base64 32)'
		)
	}
}

/**
 * Gets the session password for useSession.
 *
 * Note: TanStack Start's useSession (via h3) only accepts a string password.
 * For secret rotation, SESSION_SECRET_PREVIOUS is tracked but the rotation
 * window relies on session expiration (90 days) rather than multi-key decryption.
 *
 * Rotation process:
 * 1. Set SESSION_SECRET_PREVIOUS = current secret
 * 2. Set SESSION_SECRET = new secret
 * 3. Wait for session expiration window (24-48 hours recommended)
 * 4. Remove SESSION_SECRET_PREVIOUS
 *
 * @returns The current session secret string
 * @throws {Error} If no valid secret is configured
 */
function getSessionPassword(): string {
	validateSessionSecret()
	return process.env.SESSION_SECRET as string
}

/**
 * Get the previous session secret for rotation support.
 * Returns undefined if not set or invalid.
 *
 * Used during secret rotation to allow existing sessions to remain valid
 * while new sessions use the current secret.
 *
 * @returns Previous session secret if valid, undefined otherwise
 */
export function getPreviousSessionSecret(): string | undefined {
	const previous = process.env.SESSION_SECRET_PREVIOUS
	return previous && previous.length >= 32 ? previous : undefined
}

/**
 * Creates a secure session manager using TanStack Start's useSession.
 *
 * Security features:
 * - HTTP-only cookies (XSS protection)
 * - Secure flag in production (HTTPS only)
 * - SameSite=lax (CSRF protection)
 * - 90-day expiration (NFR1)
 * - iron-webcrypto encryption/signing (built into useSession)
 *
 * @example
 * ```typescript
 * // In a server function
 * export const loginFn = createServerFn({method: 'POST'}).handler(async ({data}) => {
 *   const session = await useAppSession()
 *   await session.update({
 *     userId: user.uid,
 *     email: user.email,
 *     claims: {admin: false},
 *     env: process.env.NODE_ENV as SessionData['env']
 *   })
 * })
 * ```
 *
 * @returns Session object with data, update, and clear methods
 */
export async function useAppSession() {
	const password = getSessionPassword()
	const isProduction = process.env.NODE_ENV === 'production'

	return useSession<SessionData>({
		name: SESSION_COOKIE_NAME,
		password,
		cookie: {
			httpOnly: true,
			secure: isProduction,
			sameSite: 'lax',
			maxAge: SESSION_MAX_AGE
		}
	})
}

/**
 * Clears the current session (logout).
 *
 * @example
 * ```typescript
 * export const logoutFn = createServerFn({method: 'POST'}).handler(async () => {
 *   await clearSession()
 *   throw redirect({to: '/'})
 * })
 * ```
 */
export async function clearSession(): Promise<void> {
	const session = await useAppSession()
	await session.clear()
}

/**
 * Updates session data (partial update supported).
 *
 * @param data - Partial session data to merge with existing data
 *
 * @example
 * ```typescript
 * // Update only claims, preserve other session data
 * await updateSession({claims: {signedConsentForm: true}})
 * ```
 */
export async function updateSession(data: Partial<SessionData>): Promise<void> {
	const session = await useAppSession()
	await session.update(data)
}

/**
 * Gets the current session data.
 *
 * @returns Current session data or empty object if no session
 *
 * @example
 * ```typescript
 * const sessionData = await getSessionData()
 * if (sessionData.userId) {
 *   // User is authenticated
 * }
 * ```
 */
export async function getSessionData(): Promise<SessionData> {
	const session = await useAppSession()
	return session.data
}

/**
 * Validates that a session belongs to the current environment.
 * Prevents cross-environment session replay attacks (R-023).
 *
 * @param sessionData - Session data to validate
 * @returns true if session environment matches current environment
 */
export function validateSessionEnvironment(sessionData: SessionData): boolean {
	const currentEnv = process.env.NODE_ENV as SessionData['env']
	return !sessionData.env || sessionData.env === currentEnv
}

/**
 * Creates a session with extended duration for passkey authentication.
 * Uses 180-day maxAge per NFR1 for passkey-authenticated users.
 *
 * This function should be called when verifying passkey authentication
 * to create a session with the extended duration.
 *
 * @returns Session object configured for passkey users
 */
export async function usePasskeySession() {
	const password = getSessionPassword()
	const isProduction = process.env.NODE_ENV === 'production'

	return useSession<SessionData>({
		name: SESSION_COOKIE_NAME,
		password,
		cookie: {
			httpOnly: true,
			secure: isProduction,
			sameSite: 'lax',
			maxAge: PASSKEY_SESSION_MAX_AGE
		}
	})
}

/**
 * Creates or refreshes a passkey session with extended duration.
 * Use this when authenticating via passkey to get 180-day session.
 *
 * @param data - Session data to set
 */
export async function createPasskeySession(data: SessionData): Promise<void> {
	const session = await usePasskeySession()
	await session.update(data)
}
