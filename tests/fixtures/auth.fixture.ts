/**
 * Auth Fixtures for E2E Testing
 *
 * Provides reusable authentication fixtures for Playwright tests.
 * Follows pure function → fixture pattern from fixture-architecture.md
 *
 * Key patterns:
 * - Auto-cleanup after each test
 * - Composable with other fixtures via mergeTests
 * - Mock Firebase Auth for isolated testing
 */

import {test as base} from '@playwright/test'

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
	 */
	mockSuccessfulMagicLinkSignIn: (user: MockUser) => Promise<void>

	/**
	 * Mocks Firebase Auth to return an error (expired/invalid link)
	 */
	mockFailedMagicLinkSignIn: (errorCode: string) => Promise<void>

	/**
	 * Mocks the session login endpoint
	 */
	mockSessionLogin: (success: boolean) => Promise<void>

	/**
	 * Creates a fully authenticated mock user
	 * Returns mock user data for assertions
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

	mockSessionLogin: async ({page}, use) => {
		const setupMock = async (success: boolean) => {
			await page.route('**/api/auth/sessionLogin', route => {
				if (success) {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({success: true})
					})
				} else {
					route.fulfill({
						status: 401,
						contentType: 'application/json',
						body: JSON.stringify({error: 'Session creation failed'})
					})
				}
			})
		}

		await use(setupMock)

		// Cleanup
		await page.unrouteAll()
	},

	authenticatedUser: async ({page, context}, use) => {
		const mockUser = createMockUser({
			email: 'authenticated@example.com',
			displayName: 'Authenticated User'
		})

		// Set up localStorage with email
		await context.addInitScript(email => {
			window.localStorage.setItem('emailForSignIn', email)
		}, mockUser.email)

		// Mock Firebase Auth
		await page.route('**/identitytoolkit.googleapis.com/**', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(buildFirebaseAuthResponse(mockUser))
			})
		})

		// Mock session login
		await page.route('**/api/auth/sessionLogin', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true})
			})
		})

		await use(mockUser)

		// Cleanup
		await page.unrouteAll()
		await page.evaluate(() => {
			window.localStorage.removeItem('emailForSignIn')
		})
	}
})

export {expect} from '@playwright/test'
