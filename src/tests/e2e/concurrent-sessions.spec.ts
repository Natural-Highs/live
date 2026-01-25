/**
 * Concurrent Sessions E2E Test
 *
 * Validates that multiple browser contexts with different user sessions
 * can operate simultaneously without interference.
 *
 *
 * Key validations:
 * - Two different users can have active sessions simultaneously
 * - Session cookies are isolated per browser context
 * - Actions in one context don't affect the other
 * - Both contexts maintain their own session state
 *
 * Test Isolation:
 * - Uses workerPrefix fixture for parallel worker data isolation
 * - Each worker gets unique user IDs to prevent cross-worker collisions
 */

import {expect, test} from '../fixtures'
import {
	clearAuthenticatedUser,
	clearSessionCookie,
	injectAuthenticatedUser,
	type TestUser
} from '../fixtures/session.fixture'

test.describe('Concurrent Sessions', () => {
	test('two different users can access protected routes simultaneously', async ({
		browser,
		workerPrefix
	}) => {
		// Create two separate browser contexts (simulating different devices/browsers)
		const contextA = await browser.newContext()
		const contextB = await browser.newContext()
		let pageA: Awaited<ReturnType<typeof contextA.newPage>> | undefined
		let pageB: Awaited<ReturnType<typeof contextB.newPage>> | undefined

		// Create two different users with worker-isolated IDs
		const userA: TestUser = {
			uid: `${workerPrefix}__user-a-${Date.now()}`,
			email: `${workerPrefix}-user-a@example.com`,
			displayName: 'User A'
		}

		const userB: TestUser = {
			uid: `${workerPrefix}__user-b-${Date.now()}`,
			email: `${workerPrefix}-user-b@example.com`,
			displayName: 'User B'
		}

		try {
			// Inject session cookies AND create Firestore user documents
			await injectAuthenticatedUser(contextA, userA, {
				signedConsentForm: true,
				profileComplete: true
			})
			await injectAuthenticatedUser(contextB, userB, {
				signedConsentForm: true,
				profileComplete: true
			})

			// Create pages in each context
			pageA = await contextA.newPage()
			pageB = await contextB.newPage()

			// Both users navigate to protected route simultaneously
			await Promise.all([pageA.goto('/dashboard'), pageB.goto('/dashboard')])

			// Both should have access (not redirected to login)
			// Wait for dashboard content to be visible (deterministic, avoids networkidle flakiness)
			await Promise.all([
				pageA.waitForURL(/\/dashboard|\/consent/),
				pageB.waitForURL(/\/dashboard|\/consent/)
			])

			// Verify both pages are on protected routes (not redirected away)
			const urlA = pageA.url()
			const urlB = pageB.url()

			// Neither should be on authentication page
			expect(urlA).not.toContain('/authentication')
			expect(urlB).not.toContain('/authentication')
		} finally {
			// Clean up: delete user documents and clear cookies
			await clearAuthenticatedUser(contextA, userA.uid)
			await clearAuthenticatedUser(contextB, userB.uid)
			await pageA?.close()
			await pageB?.close()
			await contextA.close()
			await contextB.close()
		}
	})

	test('admin and regular user sessions coexist without interference', async ({
		browser,
		workerPrefix
	}) => {
		const adminContext = await browser.newContext()
		const userContext = await browser.newContext()
		let adminPage: Awaited<ReturnType<typeof adminContext.newPage>> | undefined
		let userPage: Awaited<ReturnType<typeof userContext.newPage>> | undefined

		const adminUser: TestUser = {
			uid: `${workerPrefix}__admin-${Date.now()}`,
			email: `${workerPrefix}-admin@naturalhighs.org`,
			displayName: 'Admin User'
		}

		const regularUser: TestUser = {
			uid: `${workerPrefix}__regular-${Date.now()}`,
			email: `${workerPrefix}-regular@example.com`,
			displayName: 'Regular User'
		}

		try {
			// Inject admin session with Firestore doc (with admin: true claim)
			await injectAuthenticatedUser(adminContext, adminUser, {
				admin: true,
				signedConsentForm: true,
				profileComplete: true
			})
			// Inject regular user session with Firestore doc (no admin claim)
			await injectAuthenticatedUser(userContext, regularUser, {
				signedConsentForm: true,
				profileComplete: true
			})

			adminPage = await adminContext.newPage()
			userPage = await userContext.newPage()

			// Admin accesses admin route
			await adminPage.goto('/admin-dashboard')
			await adminPage.waitForURL(/\/admin-dashboard|\/dashboard/)

			// Regular user accesses regular protected route
			await userPage.goto('/dashboard')
			await userPage.waitForURL(/\/dashboard|\/consent/)

			// Admin should have access to admin route
			const adminUrl = adminPage.url()
			expect(adminUrl).not.toContain('/authentication')

			// Regular user should be on dashboard (not admin)
			const userUrl = userPage.url()
			expect(userUrl).not.toContain('/authentication')

			// Verify regular user cannot access admin routes
			await userPage.goto('/admin-dashboard')
			await userPage.waitForURL(/\/dashboard|\/authentication/)

			// Regular user should be redirected away from admin route
			const userAdminAttemptUrl = userPage.url()
			expect(userAdminAttemptUrl).not.toContain('/admin-dashboard')
		} finally {
			// Clean up: delete user documents and clear cookies
			await clearAuthenticatedUser(adminContext, adminUser.uid)
			await clearAuthenticatedUser(userContext, regularUser.uid)
			await adminPage?.close()
			await userPage?.close()
			await adminContext.close()
			await userContext.close()
		}
	})

	test('session in one context does not leak to another', async ({browser, workerPrefix}) => {
		const authenticatedContext = await browser.newContext()
		const unauthenticatedContext = await browser.newContext()
		let authPage: Awaited<ReturnType<typeof authenticatedContext.newPage>> | undefined
		let unauthPage: Awaited<ReturnType<typeof unauthenticatedContext.newPage>> | undefined

		const user: TestUser = {
			uid: `${workerPrefix}__leak-test-${Date.now()}`,
			email: `${workerPrefix}-leak-test@example.com`,
			displayName: 'Leak Test User'
		}

		try {
			// Only inject session AND create Firestore doc for first context
			await injectAuthenticatedUser(authenticatedContext, user, {
				signedConsentForm: true,
				profileComplete: true
			})

			authPage = await authenticatedContext.newPage()
			unauthPage = await unauthenticatedContext.newPage()

			// Authenticated user accesses protected route
			await authPage.goto('/dashboard')
			await authPage.waitForURL(/\/dashboard|\/consent/)

			// Unauthenticated context tries to access same route
			await unauthPage.goto('/dashboard')
			await unauthPage.waitForURL(/\/authentication/)

			// Authenticated context should stay on dashboard
			expect(authPage.url()).not.toContain('/authentication')

			// Unauthenticated context should be redirected to auth
			expect(unauthPage.url()).toContain('/authentication')
		} finally {
			// Clean up: delete user document and clear cookie
			await clearAuthenticatedUser(authenticatedContext, user.uid)
			await authPage?.close()
			await unauthPage?.close()
			await authenticatedContext.close()
			await unauthenticatedContext.close()
		}
	})

	test('clearing session in one context does not affect another', async ({
		browser,
		workerPrefix
	}) => {
		const contextA = await browser.newContext()
		const contextB = await browser.newContext()
		let pageA: Awaited<ReturnType<typeof contextA.newPage>> | undefined
		let pageB: Awaited<ReturnType<typeof contextB.newPage>> | undefined

		const userA: TestUser = {
			uid: `${workerPrefix}__clear-test-a-${Date.now()}`,
			email: `${workerPrefix}-clear-a@example.com`,
			displayName: 'Clear Test A'
		}

		const userB: TestUser = {
			uid: `${workerPrefix}__clear-test-b-${Date.now()}`,
			email: `${workerPrefix}-clear-b@example.com`,
			displayName: 'Clear Test B'
		}

		try {
			// Both contexts have sessions AND Firestore docs
			await injectAuthenticatedUser(contextA, userA, {
				signedConsentForm: true,
				profileComplete: true
			})
			await injectAuthenticatedUser(contextB, userB, {
				signedConsentForm: true,
				profileComplete: true
			})

			// Clear session from context A only (but keep Firestore doc for cleanup)
			await clearSessionCookie(contextA)

			pageA = await contextA.newPage()
			pageB = await contextB.newPage()

			// Navigate both to protected route
			await Promise.all([pageA.goto('/dashboard'), pageB.goto('/dashboard')])

			await Promise.all([
				pageA.waitForURL(/\/authentication|\/dashboard|\/consent/),
				pageB.waitForURL(/\/dashboard|\/consent/)
			])

			// Context A (cleared session) should be redirected to auth
			expect(pageA.url()).toContain('/authentication')

			// Context B should still have access
			expect(pageB.url()).not.toContain('/authentication')
		} finally {
			// Clean up: delete both user documents
			await clearAuthenticatedUser(contextA, userA.uid)
			await clearAuthenticatedUser(contextB, userB.uid)
			await pageA?.close()
			await pageB?.close()
			await contextA.close()
			await contextB.close()
		}
	})
})
