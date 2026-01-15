/**
 * Admin Fixtures for E2E Testing
 *
 * Extends auth.fixture.ts with admin-specific authentication.
 * Provides admin user fixtures with admin claims for testing admin routes.
 *
 * Key patterns:
 * - Extends existing authTest fixture merged with firebaseResetTest
 * - Uses session cookie injection (not localStorage) via session.fixture.ts
 * - Auto-cleanup after each test
 * - Includes workerPrefix for parallel worker data isolation
 *
 * Architecture:
 * - session.fixture.ts provides cookie helpers
 * - auth.fixture.ts uses session helpers for authenticated fixtures
 * - firebase-reset.fixture.ts provides workerPrefix and cleanup
 * - admin.fixture.ts extends auth with admin claims via injectAdminSessionCookie()
 */

import {mergeTests} from '@playwright/test'
import {test as authTest, createMockUser, createTestAuthUser, setUserClaims} from './auth.fixture'
import {test as firebaseResetTest} from './firebase-reset.fixture'
import {clearSessionCookie, injectAdminSessionCookie, type TestUser} from './session.fixture'

const baseTest = mergeTests(authTest, firebaseResetTest)

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
	 */
	setupAdminAuth: () => Promise<MockUser>
}

/**
 * Playwright fixture that extends auth test with admin helpers
 */
export const test = baseTest.extend<AdminFixtures>({
	adminUser: async ({context, workerPrefix}, use) => {
		const adminEmail = `admin-${workerPrefix}@test.local`
		const mockUser = createMockUser({
			email: adminEmail,
			displayName: 'Admin User'
		})

		const actualUid = await createTestAuthUser({
			uid: mockUser.uid,
			email: mockUser.email,
			displayName: mockUser.displayName
		})
		await setUserClaims(actualUid, {admin: true, signedConsentForm: true})

		const testUser: TestUser = {
			uid: actualUid,
			email: mockUser.email,
			displayName: mockUser.displayName
		}

		await injectAdminSessionCookie(context, testUser)

		const returnUser: MockUser = {...mockUser, uid: actualUid}
		await use(returnUser)

		await clearSessionCookie(context)
	},

	setupAdminAuth: async ({context, workerPrefix}, use) => {
		const setupAuth = async (): Promise<MockUser> => {
			const adminEmail = `admin-${workerPrefix}@test.local`
			const mockUser = createMockUser({
				email: adminEmail,
				displayName: 'Admin User'
			})

			const actualUid = await createTestAuthUser({
				uid: mockUser.uid,
				email: mockUser.email,
				displayName: mockUser.displayName
			})
			await setUserClaims(actualUid, {admin: true, signedConsentForm: true})

			const testUser: TestUser = {
				uid: actualUid,
				email: mockUser.email,
				displayName: mockUser.displayName
			}

			await injectAdminSessionCookie(context, testUser)

			return {...mockUser, uid: actualUid}
		}

		await use(setupAuth)

		await clearSessionCookie(context)
	}
})

export {expect} from '@playwright/test'
export {createMockUser} from './auth.fixture'
