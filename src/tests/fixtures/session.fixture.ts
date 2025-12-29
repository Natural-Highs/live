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
 * - injectAuthenticatedUser(context, user, claims, userDocData) - Session + Firestore
 * - clearAuthenticatedUser(context, uid) - Clear session + delete user doc
 */

import type {BrowserContext} from '@playwright/test'
import * as Iron from 'iron-webcrypto'
import {SESSION_SECRET_TEST} from '../../playwright.config'
import {SESSION_COOKIE_NAME, SESSION_MAX_AGE} from '../../src/lib/session'

// Re-export session constants for test usage
export {SESSION_COOKIE_NAME, SESSION_MAX_AGE, SESSION_SECRET_TEST}

import {
	createTestUserDocument,
	deleteTestUserDocument,
	type MinorDemographicsData,
	type TestUserDocument
} from './firestore.fixture'

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
		passkeyEnabled?: boolean
		profileComplete?: boolean
		isMinor?: boolean
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
	passkeyEnabled?: boolean
	profileComplete?: boolean
	isMinor?: boolean
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

	// Encrypt session data using iron-webcrypto v2 API
	// Note: v2 removed the crypto parameter - it uses globalThis.crypto internally
	const sealed = await Iron.seal(h3Session, SESSION_SECRET_TEST, IRON_OPTIONS)

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
	// iron-webcrypto v2 API - no crypto parameter needed
	const unsealed = await Iron.unseal(sealedValue, SESSION_SECRET_TEST, IRON_OPTIONS)
	// h3 wraps data in {id, createdAt, data} structure
	const h3Session = unsealed as H3Session
	return h3Session.data
}

/**
 * Additional user document data for Firestore seeding.
 * Optional fields that extend the base TestUser.
 */
export interface TestUserDocData {
	dateOfBirth?: string
	pronouns?: string | null
	gender?: string | null
	raceEthnicity?: string[] | null
	emergencyContactName?: string | null
	emergencyContactPhone?: string | null
	emergencyContactEmail?: string | null
	dietaryRestrictions?: string[] | null
	medicalConditions?: string | null
}

/**
 * Inject session cookie AND create user document in Firestore.
 *
 * Use this for routes with Firestore loaders (e.g., /settings/profile).
 * Creates both the authenticated session and the user document needed
 * by server functions like getFullProfileFn().
 *
 * @param context - Playwright BrowserContext
 * @param user - User data (uid, email, displayName)
 * @param claims - Optional claims (admin, signedConsentForm, isMinor)
 * @param userDocData - Additional user document data (demographics, DOB)
 *
 * @example
 * ```typescript
 * await injectAuthenticatedUser(context, {
 *   uid: 'test-user-123',
 *   email: 'test@example.com',
 *   displayName: 'Test User'
 * }, {
 *   signedConsentForm: true,
 *   profileComplete: true
 * }, {
 *   dateOfBirth: '1995-06-15',
 *   pronouns: 'she/her'
 * })
 * ```
 */
export async function injectAuthenticatedUser(
	context: BrowserContext,
	user: TestUser,
	claims: TestClaims = {},
	userDocData?: TestUserDocData
): Promise<void> {
	const isMinor = claims.isMinor ?? false

	const userDoc: TestUserDocument = {
		uid: user.uid,
		email: user.email,
		displayName: user.displayName,
		dateOfBirth: userDocData?.dateOfBirth ?? '1990-01-15',
		isMinor,
		profileComplete: claims.profileComplete ?? true,
		profileVersion: 1
	}

	if (!isMinor && userDocData) {
		if (userDocData.pronouns !== undefined) userDoc.pronouns = userDocData.pronouns
		if (userDocData.gender !== undefined) userDoc.gender = userDocData.gender
		if (userDocData.raceEthnicity !== undefined) userDoc.raceEthnicity = userDocData.raceEthnicity
		if (userDocData.emergencyContactName !== undefined)
			userDoc.emergencyContactName = userDocData.emergencyContactName
		if (userDocData.emergencyContactPhone !== undefined)
			userDoc.emergencyContactPhone = userDocData.emergencyContactPhone
		if (userDocData.emergencyContactEmail !== undefined)
			userDoc.emergencyContactEmail = userDocData.emergencyContactEmail
		if (userDocData.dietaryRestrictions !== undefined)
			userDoc.dietaryRestrictions = userDocData.dietaryRestrictions
		if (userDocData.medicalConditions !== undefined)
			userDoc.medicalConditions = userDocData.medicalConditions
	}

	let minorDemographics: MinorDemographicsData | undefined
	if (isMinor && userDocData) {
		minorDemographics = {
			pronouns: userDocData.pronouns,
			gender: userDocData.gender,
			raceEthnicity: userDocData.raceEthnicity,
			emergencyContactName: userDocData.emergencyContactName,
			emergencyContactPhone: userDocData.emergencyContactPhone,
			emergencyContactEmail: userDocData.emergencyContactEmail,
			dietaryRestrictions: userDocData.dietaryRestrictions,
			medicalConditions: userDocData.medicalConditions
		}
	}

	await createTestUserDocument(userDoc, minorDemographics)

	await injectSessionCookie(context, user, claims)
}

/**
 * Clear session and delete user document from Firestore.
 *
 * Call in afterEach to ensure test isolation.
 *
 * @param context - Playwright BrowserContext
 * @param uid - User ID to delete
 *
 * @example
 * ```typescript
 * test.afterEach(async ({ context }) => {
 *   await clearAuthenticatedUser(context, TEST_USER.uid)
 * })
 * ```
 */
export async function clearAuthenticatedUser(context: BrowserContext, uid: string): Promise<void> {
	await clearSessionCookie(context)
	await deleteTestUserDocument(uid)
}
