/**
 * E2E Tests for Protected Route Architecture
 *
 * Tests the layout-based authentication system using TanStack Router:
 * - _authed.tsx layout protects all authenticated routes
 * - _authed/_admin.tsx layout adds admin check
 * - Session data flows from __root.tsx beforeLoad
 *
 * Uses session cookie injection (not localStorage) to match actual auth flow.
 *
 * Covers: Protected route architecture with layout-based auth
 */

import {test as base, expect} from '@playwright/test'
import {createMockUser} from '../fixtures/auth.fixture'
import {
	clearSessionCookie,
	injectAdminSessionCookie,
	injectSessionCookie,
	type TestUser
} from '../fixtures/session.fixture'

// Extend base test with route protection helpers
const test = base.extend<{
	setupUnauthenticated: () => Promise<void>
	setupAuthenticated: (options?: {consent?: boolean; admin?: boolean}) => Promise<void>
}>({
	setupUnauthenticated: async ({context}, use) => {
		const setup = async () => {
			// Clear any session cookie
			await clearSessionCookie(context)
		}

		await use(setup)
	},

	setupAuthenticated: async ({context}, use) => {
		const setup = async (options: {consent?: boolean; admin?: boolean} = {}) => {
			const {consent = true, admin = false} = options
			const mockUser = createMockUser({
				email: admin ? 'admin@naturalhighs.org' : 'user@naturalhighs.org',
				displayName: admin ? 'Admin User' : 'Test User'
			})

			// Convert MockUser to TestUser format
			const testUser: TestUser = {
				uid: mockUser.uid,
				email: mockUser.email,
				displayName: mockUser.displayName
			}

			// Inject session cookie with appropriate claims
			if (admin) {
				await injectAdminSessionCookie(context, testUser)
			} else {
				await injectSessionCookie(context, testUser, {
					signedConsentForm: consent,
					admin: false
				})
			}
		}

		await use(setup)

		// Cleanup
		await clearSessionCookie(context)
	}
})

test.describe('Unauthenticated User Redirects @smoke', () => {
	test('redirects from /dashboard to /authentication', async ({page, setupUnauthenticated}) => {
		await setupUnauthenticated()

		const response = await page.goto('/dashboard')
		expect(response?.status()).toBeLessThan(500)

		// Should be redirected to authentication
		await page.waitForURL(/\/authentication/)
		expect(page.url()).toContain('/authentication')
	})

	test('redirects from /profile to /authentication', async ({page, setupUnauthenticated}) => {
		await setupUnauthenticated()

		await page.goto('/profile')
		await page.waitForURL(/\/authentication/)
		expect(page.url()).toContain('/authentication')
	})

	test('redirects from /surveys to /authentication', async ({page, setupUnauthenticated}) => {
		await setupUnauthenticated()

		await page.goto('/surveys')
		await page.waitForURL(/\/authentication/)
		expect(page.url()).toContain('/authentication')
	})

	test('redirects from /admin-dashboard to /authentication', async ({
		page,
		setupUnauthenticated
	}) => {
		await setupUnauthenticated()

		await page.goto('/admin-dashboard')
		await page.waitForURL(/\/authentication/)
		expect(page.url()).toContain('/authentication')
	})
})

test.describe('Authenticated User Without Consent', () => {
	test('redirects from /dashboard to /consent', async ({page, setupAuthenticated}) => {
		await setupAuthenticated({consent: false, admin: false})

		await page.goto('/dashboard')
		await page.waitForURL(/\/consent/)
		expect(page.url()).toContain('/consent')
	})

	test('allows access to /consent page', async ({page, setupAuthenticated}) => {
		await setupAuthenticated({consent: false, admin: false})

		// Mock consent form API
		await page.route('**/api/forms/consent', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					template: {id: 'test', name: 'Test Consent', questions: []}
				})
			})
		})

		const response = await page.goto('/consent')
		expect(response?.status()).toBeLessThan(500)

		// Should stay on consent page
		await expect(page).toHaveURL(/\/consent/)
		await expect(page.getByRole('heading', {name: /Consent Form/i})).toBeVisible()
	})
})

test.describe('Authenticated User With Consent', () => {
	test('allows access to /dashboard', async ({page, setupAuthenticated}) => {
		await setupAuthenticated({consent: true, admin: false})

		// Mock dashboard API
		await page.route('**/api/users/profile', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true, data: {id: 'test', email: 'user@test.com'}})
			})
		})

		const response = await page.goto('/dashboard')
		expect(response?.status()).toBeLessThan(500)

		await expect(page).toHaveURL(/\/dashboard/)
	})

	test('redirects from /consent to /dashboard when consent already signed', async ({
		page,
		setupAuthenticated
	}) => {
		await setupAuthenticated({consent: true, admin: false})

		await page.goto('/consent')
		await page.waitForURL(/\/dashboard/)
		expect(page.url()).toContain('/dashboard')
	})

	test('redirects non-admin from /admin-dashboard to /dashboard', async ({
		page,
		setupAuthenticated
	}) => {
		await setupAuthenticated({consent: true, admin: false})

		await page.goto('/admin-dashboard')
		await page.waitForURL(/\/dashboard/)
		expect(page.url()).toContain('/dashboard')
	})
})

test.describe('Admin User Access', () => {
	test('allows admin access to /admin-dashboard', async ({page, setupAuthenticated}) => {
		await setupAuthenticated({consent: true, admin: true})

		// Mock admin stats API
		await page.route('**/api/admin/stats', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					stats: {totalUsers: 10, totalEvents: 5, totalResponses: 20, activeEvents: 2}
				})
			})
		})

		const response = await page.goto('/admin-dashboard')
		expect(response?.status()).toBeLessThan(500)

		await expect(page).toHaveURL(/\/admin-dashboard/)
		await expect(page.getByRole('heading', {name: /Admin Dashboard/i})).toBeVisible()
	})

	test('allows admin access to /events', async ({page, setupAuthenticated}) => {
		await setupAuthenticated({consent: true, admin: true})

		// Mock events API
		await page.route('**/api/events', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true, events: []})
			})
		})
		await page.route('**/api/eventTypes', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true, eventTypes: []})
			})
		})
		await page.route('**/api/formTemplates', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true, templates: []})
			})
		})

		const response = await page.goto('/events')
		expect(response?.status()).toBeLessThan(500)

		await expect(page).toHaveURL(/\/events/)
	})
})

test.describe('Public Routes', () => {
	test('allows access to home page without auth', async ({page, setupUnauthenticated}) => {
		await setupUnauthenticated()

		const response = await page.goto('/')
		expect(response?.status()).toBeLessThan(500)

		await expect(page.getByRole('heading', {name: 'Natural Highs'})).toBeVisible()
	})

	test('allows access to /authentication without auth', async ({page, setupUnauthenticated}) => {
		await setupUnauthenticated()

		const response = await page.goto('/authentication')
		expect(response?.status()).toBeLessThan(500)

		await expect(page.locator('body')).not.toBeEmpty()
	})

	test('redirects authenticated user from /authentication to /dashboard', async ({
		page,
		setupAuthenticated
	}) => {
		await setupAuthenticated({consent: true, admin: false})

		await page.goto('/authentication')
		await page.waitForURL(/\/dashboard/)
		expect(page.url()).toContain('/dashboard')
	})

	test('allows access to /guest without auth', async ({page, setupUnauthenticated}) => {
		await setupUnauthenticated()

		// Mock consent form and events APIs
		await page.route('**/api/forms/consent', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					template: {id: 'test', name: 'Consent', questions: []}
				})
			})
		})
		await page.route('**/api/events', route => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true, events: []})
			})
		})

		const response = await page.goto('/guest')
		expect(response?.status()).toBeLessThan(500)
	})

	test('allows access to /signup without auth', async ({page, setupUnauthenticated}) => {
		await setupUnauthenticated()

		const response = await page.goto('/signup')
		expect(response?.status()).toBeLessThan(500)

		await expect(page.getByTestId('signup-page')).toBeVisible()
	})
})
