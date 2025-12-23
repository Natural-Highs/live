/**
 * Admin Fixtures for E2E Testing
 *
 * Extends auth.fixture.ts with admin-specific authentication.
 * Provides admin user fixtures with admin claims for testing admin routes.
 *
 * Key patterns:
 * - Extends existing authTest fixture
 * - Auto-cleanup after each test
 * - Mocks session with admin claims
 */

import {test as authTest, createMockUser} from './auth.fixture'

// Types for admin fixtures
interface MockUser {
	email: string
	uid: string
	displayName: string
	idToken: string
}

interface AdminFixtures {
	/**
	 * Creates a fully authenticated admin user with admin claims
	 * Returns mock user data for assertions
	 */
	adminUser: MockUser

	/**
	 * Sets up admin authentication state for the page
	 * Use this when you need just the auth setup without returning user data
	 */
	setupAdminAuth: () => Promise<MockUser>
}

/**
 * Pure function: Build admin session response
 */
export function buildAdminSessionResponse(user: MockUser): object {
	return {
		user: {uid: user.uid, email: user.email, displayName: user.displayName},
		claims: {signedConsentForm: true, admin: true}
	}
}

/**
 * Playwright fixture that extends auth test with admin helpers
 */
export const test = authTest.extend<AdminFixtures>({
	adminUser: async ({page, context}, use) => {
		const mockUser = createMockUser({
			email: 'admin@naturalhighs.org',
			displayName: 'Admin User'
		})

		// Set up localStorage to indicate authenticated state
		await context.addInitScript(() => {
			window.localStorage.setItem('authState', 'authenticated')
		})

		// Mock the auth state check endpoint with admin claims
		await page.route('**/api/auth/session', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(buildAdminSessionResponse(mockUser))
			})
		})

		// Mock Firebase Auth identity toolkit
		await page.route('**/identitytoolkit.googleapis.com/**', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					idToken: mockUser.idToken,
					refreshToken: 'mock-refresh-token',
					email: mockUser.email,
					localId: mockUser.uid,
					displayName: mockUser.displayName
				})
			})
		})

		// Mock session login endpoint
		await page.route('**/api/auth/sessionLogin', route => {
			// Check if it's a GET request (session check) or POST (session creation)
			if (route.request().method() === 'GET') {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({token: true})
				})
			} else {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true})
				})
			}
		})

		await use(mockUser)

		// Cleanup: Remove route handlers
		await page.unrouteAll()
	},

	setupAdminAuth: async ({page, context}, use) => {
		const setupAuth = async (): Promise<MockUser> => {
			const mockUser = createMockUser({
				email: 'admin@naturalhighs.org',
				displayName: 'Admin User'
			})

			// Set up localStorage
			await context.addInitScript(() => {
				window.localStorage.setItem('authState', 'authenticated')
			})

			// Mock session endpoint
			await page.route('**/api/auth/session', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(buildAdminSessionResponse(mockUser))
				})
			})

			// Mock session login check
			await page.route('**/api/auth/sessionLogin', route => {
				if (route.request().method() === 'GET') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({token: true})
					})
				} else {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({success: true})
					})
				}
			})

			return mockUser
		}

		await use(setupAuth)

		// Cleanup
		await page.unrouteAll()
	}
})

export {expect} from '@playwright/test'
export {createMockUser} from './auth.fixture'
