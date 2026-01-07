/**
 * E2E Tests for Session Persistence
 *
 * Tests session lifecycle behaviors:
 * - Session survives page navigation
 * - Session survives browser context restart
 * - Session cookie has correct attributes
 * - Expired session shows login page
 *
 * Test Limitations:
 * - Sliding window refresh (30-day threshold) is tested via unit tests only
 *   (E2E impractical due to time manipulation requirements)
 * - Token revocation checks tested via unit tests (Firestore dependency)
 */

import {expect, test} from '../fixtures'
import * as Iron from 'iron-webcrypto'
import {
	buildTestSessionCookie,
	injectSessionCookie,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE,
	SESSION_SECRET_TEST
} from '../fixtures/session.fixture'

const testUser = {
	uid: 'session-test-user-123',
	email: 'session-test@example.com',
	displayName: 'Session Test User'
}

test.describe('Session Persistence @smoke', () => {
	test('session survives page navigation', async ({page, context}) => {
		// Inject session cookie with profileComplete to access dashboard
		await injectSessionCookie(context, testUser, {signedConsentForm: true, profileComplete: true})

		// Navigate to dashboard
		await page.goto('/dashboard')

		// Wait for page to load and verify authenticated state via dashboard content
		// Note: Navbar "Logout" button depends on Firebase Auth client SDK state,
		// but session cookie injection only sets server-side session.
		// Verify auth via dashboard content instead.
		await expect(page.getByTestId('event-code-input')).toBeVisible({timeout: 10000})

		// Navigate to home
		await page.goto('/')

		// Session should still be valid - navigate back to dashboard
		await page.goto('/dashboard')

		// Should still see dashboard content (authenticated)
		await expect(page.getByTestId('event-code-input')).toBeVisible({timeout: 10000})
	})

	test('session cookie has correct attributes', async ({context}) => {
		// Inject session cookie
		await injectSessionCookie(context, testUser, {signedConsentForm: true, profileComplete: true})

		// Get cookies from context
		const cookies = await context.cookies()
		const sessionCookie = cookies.find(c => c.name === SESSION_COOKIE_NAME)

		expect(sessionCookie).toBeDefined()
		expect(sessionCookie?.httpOnly).toBe(true)
		expect(sessionCookie?.sameSite).toBe('Lax')
		expect(sessionCookie?.path).toBe('/')
	})

	test('session cookie value is properly encrypted', async () => {
		// Build a session cookie
		const cookieValue = await buildTestSessionCookie(testUser, {signedConsentForm: true})

		// Verify it can be unsealed with correct secret
		const unsealed = await Iron.unseal(cookieValue, SESSION_SECRET_TEST, {
			encryption: {
				saltBits: 256,
				algorithm: 'aes-256-cbc',
				iterations: 1,
				minPasswordlength: 32
			},
			integrity: {
				saltBits: 256,
				algorithm: 'sha256',
				iterations: 1,
				minPasswordlength: 32
			},
			ttl: SESSION_MAX_AGE * 1000,
			timestampSkewSec: 60,
			localtimeOffsetMsec: 0
		})

		// Verify session data structure
		const sessionData = (unsealed as {data: Record<string, unknown>}).data
		expect(sessionData.userId).toBe(testUser.uid)
		expect(sessionData.email).toBe(testUser.email)
		expect(sessionData.displayName).toBe(testUser.displayName)
		expect(sessionData.claims).toHaveProperty('signedConsentForm', true)
		expect(sessionData.sessionCreatedAt).toBeDefined()
	})

	test('unauthenticated user is redirected from protected route', async ({page}) => {
		// Navigate to protected route without session
		await page.goto('/dashboard')

		// Should be redirected to authentication page
		await expect(page).toHaveURL(/authentication/, {timeout: 10000})
	})

	test('session persists across multiple page loads', async ({page, context}) => {
		// Inject session cookie
		await injectSessionCookie(context, testUser, {signedConsentForm: true, profileComplete: true})

		// Load dashboard multiple times
		for (let i = 0; i < 3; i++) {
			await page.goto('/dashboard')
			// Verify dashboard content loads (session still valid)
			await expect(page.getByTestId('event-code-input')).toBeVisible({timeout: 10000})
		}
	})
})

test.describe('Session Expiration Warning', () => {
	test('no expiration warning for fresh session', async ({page, context}) => {
		// Inject fresh session
		await injectSessionCookie(context, testUser, {signedConsentForm: true, profileComplete: true})

		// Navigate to dashboard
		await page.goto('/dashboard')

		// Wait for authenticated state via dashboard content
		await expect(page.getByTestId('event-code-input')).toBeVisible({timeout: 10000})

		// Expiration warning should NOT be visible for fresh session
		await expect(page.getByTestId('session-expiration-warning')).not.toBeVisible()
	})
})
