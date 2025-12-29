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
