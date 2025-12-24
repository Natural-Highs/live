/**
 * Session Fixtures for E2E Testing
 *
 * Provides session cookie injection helpers for Playwright tests.
 * Uses iron-webcrypto to encrypt session data matching useAppSession() format.
 *
 * Key patterns:
 * - Cookie name: 'nh-session' (matches src/lib/session.ts)
 * - Encryption: iron-webcrypto seal/unseal
 * - Session data: {userId, email, displayName, claims, env}
 *
 * Usage:
 * - injectSessionCookie(context, user, claims) - Inject authenticated session
 * - injectAdminSessionCookie(context, user) - Inject admin session
 * - clearSessionCookie(context) - Remove session cookie
 */

import type {BrowserContext} from '@playwright/test'
import * as Iron from 'iron-webcrypto'

/**
 * Session data structure matching src/lib/session.ts SessionData type.
 */
export type SessionData = {
	userId: string
	email: string
	displayName: string
	claims: {
		admin?: boolean
		signedConsentForm?: boolean
	}
	env: 'development' | 'staging' | 'production'
	sessionCreatedAt?: string
}

/**
 * User data for session creation.
 */
export interface TestUser {
	uid: string
	email: string
	displayName: string
}

/**
 * Claims for session creation.
 */
export interface TestClaims {
	admin?: boolean
	signedConsentForm?: boolean
}

/**
 * H3 session structure that wraps the session data.
 * This matches what h3's useSession() seals/unseals.
 */
interface H3Session<T = SessionData> {
	id: string
	createdAt: number
	data: T
}

/**
 * Hardcoded test secret for E2E tests.
 * - 32+ characters required by iron-webcrypto
 * - Different from production secret (security isolation)
 * - No Doppler dependency in CI
 */
export const SESSION_SECRET_TEST =
	'test-session-secret-32-characters-minimum-length-for-iron-webcrypto'

/**
 * Cookie name matching src/lib/session.ts SESSION_COOKIE_NAME.
 */
export const SESSION_COOKIE_NAME = 'nh-session'

/**
 * Session max age in seconds (90 days per NFR1).
 */
export const SESSION_MAX_AGE = 90 * 24 * 60 * 60

/**
 * Iron seal options matching useSession defaults.
 *
 * IMPORTANT: These options MUST match the iron-webcrypto defaults used by
 * TanStack Start's useSession() (via h3's ironSession implementation).
 *
 * These are the standard iron-webcrypto defaults from:
 * https://github.com/brc-dd/iron-webcrypto/blob/main/src/index.ts
 *
 * If h3/TanStack Start changes their iron options in the future, these
 * MUST be updated to match, or test sessions won't be compatible with
 * production session validation.
 *
 * Verified against: h3 v1.12.0, @tanstack/react-start v1.142.5
 */
const IRON_OPTIONS: Iron.SealOptions = {
	encryption: {
		saltBits: 256,
		algorithm: 'aes-256-cbc',
		iterations: 1,
		minPasswordlength: 32
	},
	integrity: {
		saltBits: 256,
		algorithm: 'sha256',
		iterations: 1,
		minPasswordlength: 32
	},
	ttl: SESSION_MAX_AGE * 1000,
	timestampSkewSec: 60,
	localtimeOffsetMsec: 0
}

/**
 * Build encrypted session cookie value.
 *
 * Uses iron-webcrypto seal() to encrypt session data.
 * Format matches TanStack Start useSession() which uses h3/ironSession.
 *
 * IMPORTANT: h3 wraps session data in {id, createdAt, data} structure.
 * We must match this structure for cookies to be properly unsealed.
 *
 * @param user - User data (uid, email, displayName)
 * @param claims - Optional claims (admin, signedConsentForm)
 * @returns Encrypted cookie value string
 */
export async function buildTestSessionCookie(
	user: TestUser,
	claims: TestClaims = {}
): Promise<string> {
	const sessionData: SessionData = {
		userId: user.uid,
		email: user.email,
		displayName: user.displayName,
		claims: {
			signedConsentForm: true,
			...claims
		},
		env: 'development',
		sessionCreatedAt: new Date().toISOString()
	}

	// h3 wraps session data in this structure
	const h3Session: H3Session = {
		id: crypto.randomUUID(),
		createdAt: Date.now(),
		data: sessionData
	}

	// Encrypt session data using iron-webcrypto
	const sealed = await Iron.seal(crypto, h3Session, SESSION_SECRET_TEST, IRON_OPTIONS)

	return sealed
}

/**
 * Inject session cookie into browser context.
 *
 * Call this BEFORE navigation to set up authenticated state.
 *
 * @param context - Playwright BrowserContext
 * @param user - User data (uid, email, displayName)
 * @param claims - Optional claims (admin, signedConsentForm)
 *
 * @example
 * ```typescript
 * await injectSessionCookie(context, {
 *   uid: 'test-user-123',
 *   email: 'test@example.com',
 *   displayName: 'Test User'
 * }, {signedConsentForm: true})
 *
 * await page.goto('/dashboard')
 * ```
 */
export async function injectSessionCookie(
	context: BrowserContext,
	user: TestUser,
	claims: TestClaims = {}
): Promise<void> {
	const cookieValue = await buildTestSessionCookie(user, claims)

	await context.addCookies([
		{
			name: SESSION_COOKIE_NAME,
			value: cookieValue,
			domain: 'localhost',
			path: '/',
			httpOnly: true,
			secure: false, // false for local testing (localhost)
			sameSite: 'Lax'
		}
	])
}

/**
 * Inject admin session cookie into browser context.
 *
 * Convenience wrapper that sets admin: true and signedConsentForm: true.
 *
 * @param context - Playwright BrowserContext
 * @param user - User data (uid, email, displayName)
 *
 * @example
 * ```typescript
 * await injectAdminSessionCookie(context, {
 *   uid: 'admin-user-123',
 *   email: 'admin@naturalhighs.org',
 *   displayName: 'Admin User'
 * })
 *
 * await page.goto('/admin/dashboard')
 * ```
 */
export async function injectAdminSessionCookie(
	context: BrowserContext,
	user: TestUser
): Promise<void> {
	await injectSessionCookie(context, user, {
		admin: true,
		signedConsentForm: true
	})
}

/**
 * Clear session cookie from browser context.
 *
 * @param context - Playwright BrowserContext
 */
export async function clearSessionCookie(context: BrowserContext): Promise<void> {
	await context.clearCookies({name: SESSION_COOKIE_NAME})
}

/**
 * Unseal a session cookie for verification in tests.
 *
 * @param sealedValue - Encrypted cookie value
 * @returns Decrypted session data (the data property from h3's session structure)
 */
export async function unsealTestSessionCookie(sealedValue: string): Promise<SessionData> {
	const unsealed = await Iron.unseal(crypto, sealedValue, SESSION_SECRET_TEST, IRON_OPTIONS)
	// h3 wraps data in {id, createdAt, data} structure
	const h3Session = unsealed as H3Session
	return h3Session.data
}
