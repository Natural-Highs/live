/**
 * Auth Fixtures for E2E Testing
 *
 * Provides reusable authentication fixtures for Playwright tests.
 * Follows pure function -> fixture pattern from fixture-architecture.md
 *
 * Key patterns:
 * - Uses session cookie injection (not localStorage) for authenticated state
 * - Keeps magic link helpers for Firebase auth flow testing
 * - Auto-cleanup after each test
 * - Composable with other fixtures via mergeTests
 *
 * Architecture:
 * - session.fixture.ts provides cookie helpers
 * - auth.fixture.ts uses session helpers for authenticated fixtures
 * - admin.fixture.ts extends auth with admin claims
 */

import {test as base} from '@playwright/test'
import {type Auth as AdminAuth, getAuth as getAdminAuth} from 'firebase-admin/auth'
import {getTestApp} from '../common'
import {clearSessionCookie, injectSessionCookie, type TestUser} from './session.fixture'

// Types for auth fixtures
interface MockUser {
	email: string
	uid: string
	displayName: string
	idToken: string
}

interface AuthFixtures {
	/**
	 * Sets up localStorage with email for same-device magic link flow
	 */
	setMagicLinkEmail: (email: string) => Promise<void>

	/**
	 * Clears magic link email from localStorage
	 */
	clearMagicLinkEmail: () => Promise<void>

	/**
	 * Mocks Firebase Auth signInWithEmailLink to succeed
	 * Use for testing the magic link sign-in flow (Firebase auth, not session cookies)
	 */
	mockSuccessfulMagicLinkSignIn: (user: MockUser) => Promise<void>

	/**
	 * Mocks Firebase Auth to return an error (expired/invalid link)
	 */
	mockFailedMagicLinkSignIn: (errorCode: string) => Promise<void>

	/**
	 * Creates a fully authenticated user with session cookie.
	 * Returns mock user data for assertions.
	 *
	 * Uses session cookie injection (not localStorage) to match
	 * the actual application auth flow via useAppSession().
	 */
	authenticatedUser: MockUser
}

/**
 * Lazy-initialized Admin Auth for tests.
 * Uses the shared Firebase app from common layer.
 */
let adminAuth: AdminAuth | null = null

/**
 * Get Admin Auth instance for E2E tests.
 * Uses the shared test app from src/tests/common/ - single source of truth.
 */
function getTestAdminAuth(): AdminAuth {
	if (adminAuth) {
		return adminAuth
	}

	const app = getTestApp()
	adminAuth = getAdminAuth(app)

	return adminAuth
}

/**
 * Create a user in the Firebase Auth emulator.
 *
 * Handles parallel test execution by checking both UID and email.
 * If a user with the same email already exists, returns that user's UID.
 *
 * @param user - User data to create
 * @returns The created user's UID (may differ from input if email already exists)
 */
export async function createTestAuthUser(user: {
	uid: string
	email: string
	displayName?: string
	password?: string
}): Promise<string> {
	const auth = getTestAdminAuth()

	// Check if user exists by UID
	try {
		const existingUser = await auth.getUser(user.uid).catch(() => null)
		if (existingUser) {
			return existingUser.uid
		}
	} catch {
		// User doesn't exist by UID, continue
	}

	// Check if user exists by email (for parallel test execution)
	try {
		const existingByEmail = await auth.getUserByEmail(user.email).catch(() => null)
		if (existingByEmail) {
			return existingByEmail.uid
		}
	} catch {
		// User doesn't exist by email, continue
	}

	// Create new user
	try {
		const userRecord = await auth.createUser({
			uid: user.uid,
			email: user.email,
			displayName: user.displayName,
			password: user.password ?? 'testPassword123!'
		})
		return userRecord.uid
	} catch (error) {
		// Handle race condition: another worker created the user
		if (error instanceof Error && error.message.includes('already in use')) {
			const existingByEmail = await auth.getUserByEmail(user.email)
			return existingByEmail.uid
		}
		throw error
	}
}

/**
 * Delete a user from the Firebase Auth emulator.
 *
 * @param uid - User ID to delete
 */
export async function deleteTestAuthUser(uid: string): Promise<void> {
	const auth = getTestAdminAuth()

	try {
		await auth.deleteUser(uid)
	} catch {
		// User may not exist, ignore error
	}
}

/**
 * Generate a magic link for email sign-in testing.
 *
 * Uses Firebase Admin SDK to generate a real magic link that works with the emulator.
 * The generated link can be used in E2E tests to simulate clicking the magic link.
 *
 * @param email - Email address for the magic link
 * @param continueUrl - URL to redirect to after sign-in (default: http://localhost:3000/magic-link)
 * @returns The magic link URL
 */
export async function generateMagicLink(
	email: string,
	continueUrl: string = 'http://localhost:3000/magic-link'
): Promise<string> {
	const auth = getTestAdminAuth()

	const link = await auth.generateSignInWithEmailLink(email, {
		url: continueUrl,
		handleCodeInApp: true
	})

	return link
}

/**
 * Set custom claims for a user.
 *
 * @param uid - User ID to set claims for
 * @param claims - Claims to set (e.g., { admin: true, signedConsentForm: true })
 */
export async function setUserClaims(uid: string, claims: Record<string, unknown>): Promise<void> {
	const auth = getTestAdminAuth()

	await auth.setCustomUserClaims(uid, claims)
}

/**
 * Pure function: Build mock user data
 * Can be called without Playwright for unit testing
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
	return {
		email: 'test@example.com',
		uid: `test-uid-${Date.now()}`,
		displayName: 'Test User',
		idToken: `mock-id-token-${Date.now()}`,
		...overrides
	}
}

/**
 * Pure function: Build Firebase identity toolkit response
 * Used for mocking Firebase Auth SDK calls in magic link flow tests
 */
export function buildFirebaseAuthResponse(user: MockUser): object {
	return {
		idToken: user.idToken,
		refreshToken: 'mock-refresh-token',
		email: user.email,
		localId: user.uid,
		displayName: user.displayName
	}
}

/**
 * Pure function: Build Firebase error response
 */
export function buildFirebaseErrorResponse(errorCode: string): object {
	return {
		error: {
			code: 400,
			message: errorCode
		}
	}
}

/**
 * Playwright fixture that extends base test with auth helpers
 */
export const test = base.extend<AuthFixtures>({
	setMagicLinkEmail: async ({context}, use) => {
		const setEmail = async (email: string) => {
			await context.addInitScript(emailValue => {
				window.localStorage.setItem('emailForSignIn', emailValue)
			}, email)
		}

		await use(setEmail)
	},

	clearMagicLinkEmail: async ({page}, use) => {
		const clearEmail = async () => {
			await page.evaluate(() => {
				window.localStorage.removeItem('emailForSignIn')
			})
		}

		await use(clearEmail)
	},

	mockSuccessfulMagicLinkSignIn: async ({page}, use) => {
		const setupMock = async (user: MockUser) => {
			await page.route('**/identitytoolkit.googleapis.com/**', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(buildFirebaseAuthResponse(user))
				})
			})
		}

		await use(setupMock)

		// Cleanup: Remove route handlers
		await page.unrouteAll()
	},

	mockFailedMagicLinkSignIn: async ({page}, use) => {
		const setupMock = async (errorCode: string) => {
			await page.route('**/identitytoolkit.googleapis.com/**', route => {
				route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify(buildFirebaseErrorResponse(errorCode))
				})
			})
		}

		await use(setupMock)

		// Cleanup
		await page.unrouteAll()
	},

	authenticatedUser: async ({context}, use) => {
		const mockUser = createMockUser({
			email: 'authenticated@example.com',
			displayName: 'Authenticated User'
		})

		// Convert MockUser to TestUser format for session injection
		const testUser: TestUser = {
			uid: mockUser.uid,
			email: mockUser.email,
			displayName: mockUser.displayName
		}

		// Inject session cookie with default claims
		// signedConsentForm: true - user has signed consent
		// profileComplete: true - user has completed profile (can access dashboard)
		//
		// Note: The dashboard route requires profileComplete: true in session claims.
		// Without this, the route redirects to profile creation flow.
		// See: src/routes/_authed/dashboard.tsx loader or beforeLoad guards
		await injectSessionCookie(context, testUser, {signedConsentForm: true, profileComplete: true})

		await use(mockUser)

		// Cleanup: Clear session cookie
		await clearSessionCookie(context)
	}
})

export {expect} from '@playwright/test'
