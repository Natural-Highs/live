/**
 * Concurrent Sessions E2E Test
 *
 * Validates that multiple browser contexts with different user sessions
 * can operate simultaneously without interference.
 *
 * This test addresses AC #5: Multi-device session isolation.
 *
 * Key validations:
 * - Two different users can have active sessions simultaneously
 * - Session cookies are isolated per browser context
 * - Actions in one context don't affect the other
 * - Both contexts maintain their own session state
 */

import {expect, test} from '../fixtures'
import {
	clearSessionCookie,
	injectAdminSessionCookie,
	injectSessionCookie,
	type TestUser
} from '../fixtures/session.fixture'

test.describe('Concurrent Sessions', () => {
	test('two different users can access protected routes simultaneously', async ({browser}) => {
		// Create two separate browser contexts (simulating different devices/browsers)
		const contextA = await browser.newContext()
		const contextB = await browser.newContext()
		let pageA: Awaited<ReturnType<typeof contextA.newPage>> | undefined
		let pageB: Awaited<ReturnType<typeof contextB.newPage>> | undefined

		try {
			// Create two different users
			const userA: TestUser = {
				uid: `user-a-${Date.now()}`,
				email: 'user-a@example.com',
				displayName: 'User A'
			}

			const userB: TestUser = {
				uid: `user-b-${Date.now()}`,
				email: 'user-b@example.com',
				displayName: 'User B'
			}

			// Inject different session cookies into each context
			await injectSessionCookie(contextA, userA, {signedConsentForm: true})
			await injectSessionCookie(contextB, userB, {signedConsentForm: true})

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
			// Clean up in correct order: cookies first, then pages, then contexts
			await clearSessionCookie(contextA)
			await clearSessionCookie(contextB)
			await pageA?.close()
			await pageB?.close()
			await contextA.close()
			await contextB.close()
		}
	})

	test('admin and regular user sessions coexist without interference', async ({browser}) => {
		const adminContext = await browser.newContext()
		const userContext = await browser.newContext()
		let adminPage: Awaited<ReturnType<typeof adminContext.newPage>> | undefined
		let userPage: Awaited<ReturnType<typeof userContext.newPage>> | undefined

		try {
			const adminUser: TestUser = {
				uid: `admin-${Date.now()}`,
				email: 'admin@naturalhighs.org',
				displayName: 'Admin User'
			}

			const regularUser: TestUser = {
				uid: `regular-${Date.now()}`,
				email: 'regular@example.com',
				displayName: 'Regular User'
			}

			// Inject admin session (with admin: true claim)
			await injectAdminSessionCookie(adminContext, adminUser)
			// Inject regular user session (no admin claim)
			await injectSessionCookie(userContext, regularUser, {signedConsentForm: true})

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
			// Clean up in correct order: cookies first, then pages, then contexts
			await clearSessionCookie(adminContext)
			await clearSessionCookie(userContext)
			await adminPage?.close()
			await userPage?.close()
			await adminContext.close()
			await userContext.close()
		}
	})

	test('session in one context does not leak to another', async ({browser}) => {
		const authenticatedContext = await browser.newContext()
		const unauthenticatedContext = await browser.newContext()
		let authPage: Awaited<ReturnType<typeof authenticatedContext.newPage>> | undefined
		let unauthPage: Awaited<ReturnType<typeof unauthenticatedContext.newPage>> | undefined

		try {
			const user: TestUser = {
				uid: `leak-test-${Date.now()}`,
				email: 'leak-test@example.com',
				displayName: 'Leak Test User'
			}

			// Only inject session into first context
			await injectSessionCookie(authenticatedContext, user, {
				signedConsentForm: true
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
			// Clean up in correct order: cookies first, then pages, then contexts
			await clearSessionCookie(authenticatedContext)
			await authPage?.close()
			await unauthPage?.close()
			await authenticatedContext.close()
			await unauthenticatedContext.close()
		}
	})

	test('clearing session in one context does not affect another', async ({browser}) => {
		const contextA = await browser.newContext()
		const contextB = await browser.newContext()
		let pageA: Awaited<ReturnType<typeof contextA.newPage>> | undefined
		let pageB: Awaited<ReturnType<typeof contextB.newPage>> | undefined

		try {
			const userA: TestUser = {
				uid: `clear-test-a-${Date.now()}`,
				email: 'clear-a@example.com',
				displayName: 'Clear Test A'
			}

			const userB: TestUser = {
				uid: `clear-test-b-${Date.now()}`,
				email: 'clear-b@example.com',
				displayName: 'Clear Test B'
			}

			// Both contexts have sessions
			await injectSessionCookie(contextA, userA, {signedConsentForm: true})
			await injectSessionCookie(contextB, userB, {signedConsentForm: true})

			// Clear session from context A only
			await clearSessionCookie(contextA)

			pageA = await contextA.newPage()
			pageB = await contextB.newPage()

			// Navigate both to protected route
			await Promise.all([pageA.goto('/dashboard'), pageB.goto('/dashboard')])

			await Promise.all([
				pageA.waitForURL(/\/authentication|\/dashboard|\/consent/),
				pageB.waitForURL(/\/dashboard|\/consent/)
			])

			// Context A (cleared) should be redirected to auth
			expect(pageA.url()).toContain('/authentication')

			// Context B should still have access
			expect(pageB.url()).not.toContain('/authentication')
		} finally {
			// Clean up in correct order: cookies first, then pages, then contexts
			await clearSessionCookie(contextB)
			await pageA?.close()
			await pageB?.close()
			await contextA.close()
			await contextB.close()
		}
	})
})
