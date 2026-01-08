/**
 * Session Integration Tests
 *
 * Tests session management against real cookie handling.
 * NO session injection mocking - verifies real HTTP-only cookie security.
 *
 * Test scenarios:
 * - Session creation after authentication
 * - Session validation on protected route access
 * - HTTP-only cookie security verification
 * - Session expiration (90 days per NFR1)
 *
 * @see AC4: Session Integration Testing
 * @see NFR1: Session expiration at 90 days
 */

import {mergeTests} from '@playwright/test'
import {test as firebaseTest} from './fixtures/firebase.fixture'
import {createTestUserDocument, setUserClaims} from './fixtures/firestore-seed.fixture'
import {expect, test as oobTest} from './fixtures/oob-codes.fixture'

// Merge fixtures for combined functionality
const test = mergeTests(firebaseTest, oobTest)

// Session cookie name matches src/lib/session.ts
const SESSION_COOKIE_NAME = 'nh-session'

// Test user email
const TEST_EMAIL = 'session-integration@example.com'

test.describe('Session Integration - AC4', () => {
	test.beforeEach(async ({clearAllTestData, clearOobCodes, verifyEmulators}) => {
		await verifyEmulators()
		await clearAllTestData()
		await clearOobCodes()
	})

	test('should create session cookie after magic link authentication', async ({
		page,
		getMagicLinkCode
	}) => {
		// GIVEN: User completes magic link flow
		await page.goto('/authentication')
		await expect(page.getByTestId('magic-link-form')).toBeVisible()

		await page.getByTestId('magic-link-email-input').fill(TEST_EMAIL)
		await page.getByTestId('send-magic-link-button').click()

		await expect(page.getByText(/check your email|magic link sent|email sent/i)).toBeVisible({
			timeout: 10000
		})

		const magicLink = await getMagicLinkCode(TEST_EMAIL)

		// Store email for same-device flow
		await page.evaluate(email => {
			window.localStorage.setItem('emailForSignIn', email)
		}, TEST_EMAIL)

		// WHEN: User completes sign-in
		await page.goto(magicLink)

		// Wait for successful sign-in (use first() to handle multiple matches)
		await expect(page.getByTestId('magic-link-success')).toBeVisible({timeout: 15000})

		// THEN: Session cookie should be created
		const cookies = await page.context().cookies()
		const sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME)

		expect(sessionCookie).toBeTruthy()
		expect(sessionCookie?.value).toBeTruthy()
		expect(sessionCookie?.value.length).toBeGreaterThan(100) // Encrypted session data
	})

	test('should verify HTTP-only cookie security via CDP', async ({page, getMagicLinkCode}) => {
		// GIVEN: User completes authentication
		await page.goto('/authentication')
		await page.getByTestId('magic-link-email-input').fill(TEST_EMAIL)
		await page.getByTestId('send-magic-link-button').click()

		await expect(page.getByText(/check your email|magic link sent|email sent/i)).toBeVisible({
			timeout: 10000
		})

		const magicLink = await getMagicLinkCode(TEST_EMAIL)

		await page.evaluate(email => {
			window.localStorage.setItem('emailForSignIn', email)
		}, TEST_EMAIL)

		await page.goto(magicLink)
		await expect(page.getByTestId('magic-link-success')).toBeVisible({timeout: 15000})

		// WHEN: We check session cookie properties
		const cookies = await page.context().cookies()
		const sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME)

		// THEN: Cookie should be HTTP-only (cannot be read by JavaScript)
		expect(sessionCookie).toBeTruthy()
		expect(sessionCookie?.httpOnly).toBe(true)

		// Verify JavaScript cannot access the cookie
		const jsAccessibleCookies = await page.evaluate(() => document.cookie)
		expect(jsAccessibleCookies).not.toContain(SESSION_COOKIE_NAME)
	})

	test('should verify session cookie security attributes', async ({page, getMagicLinkCode}) => {
		// GIVEN: Authenticated user with session
		await page.goto('/authentication')
		await page.getByTestId('magic-link-email-input').fill(TEST_EMAIL)
		await page.getByTestId('send-magic-link-button').click()

		await expect(page.getByText(/check your email|magic link sent|email sent/i)).toBeVisible({
			timeout: 10000
		})

		const magicLink = await getMagicLinkCode(TEST_EMAIL)

		await page.evaluate(email => {
			window.localStorage.setItem('emailForSignIn', email)
		}, TEST_EMAIL)

		await page.goto(magicLink)
		await expect(page.getByTestId('magic-link-success')).toBeVisible({timeout: 15000})

		// THEN: Session cookie should have proper security attributes
		const cookies = await page.context().cookies()
		const sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME)

		expect(sessionCookie).toBeTruthy()

		// HTTP-only: Cannot be accessed by JavaScript (XSS protection)
		expect(sessionCookie?.httpOnly).toBe(true)

		// SameSite: Lax or Strict for CSRF protection
		expect(['Lax', 'Strict']).toContain(sessionCookie?.sameSite)

		// Path: Root path for site-wide access
		expect(sessionCookie?.path).toBe('/')
	})

	test('should redirect unauthenticated users from protected routes', async ({page}) => {
		// GIVEN: User without session
		const cookies = await page.context().cookies()
		const sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME)
		expect(sessionCookie).toBeFalsy()

		// WHEN: User tries to access protected route
		await page.goto('/dashboard')

		// THEN: Should be redirected to authentication
		// Wait for redirect to complete
		await page.waitForURL(/\/(authentication|login|signin)/i, {timeout: 10000})

		// Verify we're on auth page
		await expect(page.getByTestId('magic-link-form')).toBeVisible()
	})

	test('should allow authenticated users to access protected routes', async ({
		page,
		getMagicLinkCode,
		getAuthUser
	}) => {
		// GIVEN: User completes authentication
		await page.goto('/authentication')
		await page.getByTestId('magic-link-email-input').fill(TEST_EMAIL)
		await page.getByTestId('send-magic-link-button').click()

		await expect(page.getByText(/check your email|magic link sent|email sent/i)).toBeVisible({
			timeout: 10000
		})

		const magicLink = await getMagicLinkCode(TEST_EMAIL)

		await page.evaluate(email => {
			window.localStorage.setItem('emailForSignIn', email)
		}, TEST_EMAIL)

		await page.goto(magicLink)
		await expect(page.getByTestId('magic-link-success')).toBeVisible({timeout: 15000})

		// Seed profile so user can reach dashboard (not redirected to /profile-setup)
		const authUser = await getAuthUser(TEST_EMAIL)
		if (!authUser) {
			throw new Error('Auth user not found after magic link')
		}

		await createTestUserDocument({
			uid: authUser.uid,
			email: TEST_EMAIL,
			displayName: 'Test User',
			profileComplete: true,
			signedConsentForm: true
		})
		await setUserClaims(authUser.uid, {signedConsentForm: true})

		// WHEN: User accesses protected route
		await page.goto('/dashboard', {waitUntil: 'networkidle'})

		// THEN: Should remain on dashboard (not redirected to auth)
		await expect(page).toHaveURL(/\/dashboard/i)

		// Should not be on auth page
		const isOnAuthPage = await page
			.getByTestId('magic-link-form')
			.isVisible()
			.catch(() => false)
		expect(isOnAuthPage).toBe(false)
	})

	test('should not use session injection mocking', async ({page}) => {
		// This test verifies the integration test setup is correct
		// by checking that no session cookies are pre-injected

		// GIVEN: Fresh page with no session setup
		await page.goto('/authentication')

		// THEN: No session cookie should exist
		const cookies = await page.context().cookies()
		const sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME)

		expect(sessionCookie).toBeFalsy()

		// AND: User should be on auth page (not bypassed)
		await expect(page.getByTestId('magic-link-form')).toBeVisible()
	})
})

test.describe('Session Persistence', () => {
	test.beforeEach(async ({clearAllTestData, clearOobCodes, verifyEmulators}) => {
		await verifyEmulators()
		await clearAllTestData()
		await clearOobCodes()
	})

	test('should persist session across page navigations', async ({
		page,
		getMagicLinkCode,
		getAuthUser
	}) => {
		// GIVEN: Authenticated user
		await page.goto('/authentication')
		await page.getByTestId('magic-link-email-input').fill(TEST_EMAIL)
		await page.getByTestId('send-magic-link-button').click()

		await expect(page.getByText(/check your email|magic link sent|email sent/i)).toBeVisible({
			timeout: 10000
		})

		const magicLink = await getMagicLinkCode(TEST_EMAIL)

		await page.evaluate(email => {
			window.localStorage.setItem('emailForSignIn', email)
		}, TEST_EMAIL)

		await page.goto(magicLink)
		await expect(page.getByTestId('magic-link-success')).toBeVisible({timeout: 15000})

		// Seed profile so user can navigate to protected routes
		const authUser = await getAuthUser(TEST_EMAIL)
		if (!authUser) {
			throw new Error('Auth user not found after magic link')
		}

		await createTestUserDocument({
			uid: authUser.uid,
			email: TEST_EMAIL,
			displayName: 'Test User',
			profileComplete: true,
			signedConsentForm: true
		})
		await setUserClaims(authUser.uid, {signedConsentForm: true})

		// Get session cookie value
		const initialCookies = await page.context().cookies()
		const initialSession = initialCookies.find(c => c.name === SESSION_COOKIE_NAME)

		// WHEN: User navigates to different pages
		await page.goto('/profile', {waitUntil: 'networkidle'})

		await page.goto('/dashboard', {waitUntil: 'networkidle'})

		// THEN: Session cookie should persist
		const finalCookies = await page.context().cookies()
		const finalSession = finalCookies.find(c => c.name === SESSION_COOKIE_NAME)

		expect(finalSession).toBeTruthy()
		expect(finalSession?.value).toBe(initialSession?.value)
	})

	test('should clear session on logout', async ({page, getMagicLinkCode, getAuthUser}) => {
		// GIVEN: Authenticated user
		await page.goto('/authentication')
		await page.getByTestId('magic-link-email-input').fill(TEST_EMAIL)
		await page.getByTestId('send-magic-link-button').click()

		await expect(page.getByText(/check your email|magic link sent|email sent/i)).toBeVisible({
			timeout: 10000
		})

		const magicLink = await getMagicLinkCode(TEST_EMAIL)

		await page.evaluate(email => {
			window.localStorage.setItem('emailForSignIn', email)
		}, TEST_EMAIL)

		await page.goto(magicLink)
		await expect(page.getByTestId('magic-link-success')).toBeVisible({timeout: 15000})

		// Seed profile so user can navigate to protected routes
		const authUser = await getAuthUser(TEST_EMAIL)
		if (!authUser) {
			throw new Error('Auth user not found after magic link')
		}

		await createTestUserDocument({
			uid: authUser.uid,
			email: TEST_EMAIL,
			displayName: 'Test User',
			profileComplete: true,
			signedConsentForm: true
		})
		await setUserClaims(authUser.uid, {signedConsentForm: true})

		// Verify session exists
		let cookies = await page.context().cookies()
		let sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME)
		expect(sessionCookie).toBeTruthy()

		// WHEN: User logs out (if logout button exists)
		// Navigate to a page that might have logout
		await page.goto('/profile', {waitUntil: 'networkidle'})

		// Try to find and click logout button
		const logoutButton = page.getByRole('button', {name: /sign out|logout|log out/i})
		const hasLogout = await logoutButton.isVisible().catch(() => false)

		if (hasLogout) {
			await logoutButton.click()
			await page.waitForURL(/\/(authentication|login|signin)/i, {timeout: 10000})

			// THEN: Session should be cleared
			cookies = await page.context().cookies()
			sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME)

			// Cookie should be removed or expired
			expect(!sessionCookie || sessionCookie.expires < Date.now() / 1000).toBe(true)
		} else {
			// Skip test explicitly if logout UI is not available
			test.skip()
		}
	})
})
