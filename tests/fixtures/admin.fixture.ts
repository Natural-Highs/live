/**
 * Admin Fixtures for E2E Testing
 *
 * Extends auth.fixture.ts with admin-specific authentication.
 * Provides admin user fixtures with admin claims for testing admin routes.
 *
 * Key patterns:
 * - Extends existing authTest fixture
 * - Uses session cookie injection (not localStorage) via session.fixture.ts
 * - Auto-cleanup after each test
 *
 * Architecture:
 * - session.fixture.ts provides cookie helpers
 * - auth.fixture.ts uses session helpers for authenticated fixtures
 * - admin.fixture.ts extends auth with admin claims via injectAdminSessionCookie()
 */

import {test as authTest, createMockUser} from './auth.fixture'
import {clearSessionCookie, injectAdminSessionCookie, type TestUser} from './session.fixture'

// Types for admin fixtures
interface MockUser {
	email: string
	uid: string
	displayName: string
	idToken: string
}

interface AdminFixtures {
	/**
	 * Creates a fully authenticated admin user with admin claims.
	 * Uses session cookie injection with {admin: true, signedConsentForm: true}.
	 * Returns mock user data for assertions.
	 */
	adminUser: MockUser

	/**
	 * Sets up admin authentication state for the page.
	 * Use this when you need just the auth setup without returning user data.
	 */
	setupAdminAuth: () => Promise<MockUser>
}

/**
 * Playwright fixture that extends auth test with admin helpers
 */
export const test = authTest.extend<AdminFixtures>({
	adminUser: async ({context}, use) => {
		const mockUser = createMockUser({
			email: 'admin@naturalhighs.org',
			displayName: 'Admin User'
		})

		// Convert MockUser to TestUser format for session injection
		const testUser: TestUser = {
			uid: mockUser.uid,
			email: mockUser.email,
			displayName: mockUser.displayName
		}

		// Inject admin session cookie with {admin: true, signedConsentForm: true}
		// This replaces localStorage testAuthState injection
		await injectAdminSessionCookie(context, testUser)

		await use(mockUser)

		// Cleanup: Clear session cookie
		await clearSessionCookie(context)
	},

	setupAdminAuth: async ({context}, use) => {
		const setupAuth = async (): Promise<MockUser> => {
			const mockUser = createMockUser({
				email: 'admin@naturalhighs.org',
				displayName: 'Admin User'
			})

			// Convert MockUser to TestUser format for session injection
			const testUser: TestUser = {
				uid: mockUser.uid,
				email: mockUser.email,
				displayName: mockUser.displayName
			}

			// Inject admin session cookie
			await injectAdminSessionCookie(context, testUser)

			return mockUser
		}

		await use(setupAuth)

		// Cleanup: Clear session cookie
		await clearSessionCookie(context)
	}
})

export {expect} from '@playwright/test'
export {createMockUser} from './auth.fixture'
