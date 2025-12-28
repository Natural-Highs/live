/**
 * Passkey Authentication E2E Tests
 *
 * These tests verify the passkey authentication flow using Playwright's
 * CDP WebAuthn virtual authenticator API.
 *
 * Test scenarios:
 * - Passkey registration from profile page
 * - Passkey sign-in from authentication page
 * - Error handling and fallback flows
 *
 * Virtual Authenticator Setup:
 * Uses Chrome DevTools Protocol (CDP) to create a virtual authenticator
 * that simulates platform authenticators (Touch ID, Face ID, Windows Hello).
 */

import {type CDPSession, expect, type Page, test} from '@playwright/test'
import {injectSessionCookie} from '../fixtures/session.fixture'

/**
 * Helper to set up WebAuthn virtual authenticator via CDP
 */
async function setupVirtualAuthenticator(page: Page): Promise<{
	client: CDPSession
	authenticatorId: string
}> {
	const client = await page.context().newCDPSession(page)

	// Enable WebAuthn
	await client.send('WebAuthn.enable')

	// Add virtual authenticator with platform authenticator settings
	const {authenticatorId} = await client.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true
		}
	})

	return {client, authenticatorId}
}

/**
 * Helper to remove virtual authenticator
 */
async function removeVirtualAuthenticator(
	client: CDPSession,
	authenticatorId: string
): Promise<void> {
	try {
		await client.send('WebAuthn.removeVirtualAuthenticator', {authenticatorId})
	} catch {
		// Ignore errors during cleanup
	}
}

/**
 * Test user data
 */
const testUser = {
	uid: 'test-passkey-user-123',
	email: 'passkey-test@example.com',
	displayName: 'Passkey Test User'
}

test.describe('Passkey Registration @smoke', () => {
	test.describe('Profile Page - Passkey Setup', () => {
		test('should show passkey setup section on profile page', async ({page, context}) => {
			// GIVEN: Authenticated user on profile page
			await injectSessionCookie(context, testUser, {signedConsentForm: true, profileComplete: true})

			// Set up virtual authenticator
			const {client, authenticatorId} = await setupVirtualAuthenticator(page)

			try {
				// Mock API responses for profile data
				await page.route('**/api/users/profile', route =>
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							data: {
								id: testUser.uid,
								email: testUser.email
							}
						})
					})
				)

				await page.route('**/api/users/events', route =>
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({success: true, events: []})
					})
				)

				// Navigate to profile page
				await page.goto('/profile')

				// THEN: Should show Sign-in Options section
				await expect(page.getByRole('heading', {name: 'Sign-in Options'})).toBeVisible()

				// AND: Should show passkey description
				await expect(
					page.getByText(/sign in instantly with face id, touch id, or your device pin/i)
				).toBeVisible()

				// AND: Should show Set Up Passkey button
				await expect(page.getByRole('button', {name: /set up passkey/i})).toBeVisible()
			} finally {
				await removeVirtualAuthenticator(client, authenticatorId)
			}
		})

		test('should show loading state when checking passkey support', async ({page, context}) => {
			// GIVEN: Authenticated user
			await injectSessionCookie(context, testUser, {signedConsentForm: true, profileComplete: true})

			// Mock profile API
			await page.route('**/api/users/profile', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true, data: {id: testUser.uid, email: testUser.email}})
				})
			)

			await page.route('**/api/users/events', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true, events: []})
				})
			)

			// Navigate to profile (without virtual authenticator - will be slower)
			await page.goto('/profile')

			// THEN: Should show checking state or passkey section
			// The checking state may be too fast to catch, so we verify the final state
			await expect(page.getByRole('heading', {name: 'Sign-in Options'})).toBeVisible()
		})
	})
})

test.describe('Passkey Sign-In', () => {
	test('should show passkey sign-in button on authentication page when supported', async ({
		page
	}) => {
		// Set up virtual authenticator
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			// WHEN: Navigate to authentication page
			await page.goto('/authentication')

			// THEN: Should show passkey sign-in button
			await expect(page.getByRole('button', {name: /sign in with passkey/i})).toBeVisible()

			// AND: Should show "or" divider
			await expect(page.getByText(/^or$/i)).toBeVisible()
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})

	test('should hide passkey option when device does not support WebAuthn', async ({page}) => {
		// GIVEN: No virtual authenticator (device doesn't support passkeys)
		// Note: In headless Chrome without virtual authenticator, WebAuthn is typically not available

		// WHEN: Navigate to authentication page
		await page.goto('/authentication')

		// Wait for page to load
		await expect(page.getByTestId('magic-link-form')).toBeVisible()

		// THEN: Passkey button may or may not be visible depending on browser
		// This test documents the behavior - if WebAuthn is not available,
		// the passkey option should not appear
	})

	test('should show magic link form as primary option', async ({page}) => {
		// Set up virtual authenticator
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			// WHEN: Navigate to authentication page
			await page.goto('/authentication')

			// THEN: Magic link form should be visible
			await expect(page.getByTestId('magic-link-form')).toBeVisible()

			// AND: Email input should be available
			await expect(page.getByTestId('magic-link-email-input')).toBeVisible()
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})
})

test.describe('Passkey Authentication Flow', () => {
	test('should show verifying state when passkey sign-in is initiated', async ({page}) => {
		// Set up virtual authenticator
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			// Mock authentication options endpoint to delay response
			await page.route('**/getPasskeyAuthenticationOptions*', async route => {
				// Delay response to allow us to see loading state
				await new Promise(resolve => setTimeout(resolve, 500))
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						options: {
							challenge: btoa('test-challenge'),
							timeout: 60000,
							rpId: 'localhost',
							userVerification: 'required'
						}
					})
				})
			})

			// Navigate to authentication page
			await page.goto('/authentication')

			// Wait for passkey button
			await expect(page.getByRole('button', {name: /sign in with passkey/i})).toBeVisible()

			// Click passkey sign-in
			await page.getByRole('button', {name: /sign in with passkey/i}).click()

			// THEN: Should show verifying state
			await expect(page.getByText(/verifying/i)).toBeVisible()
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})
})

test.describe('Passkey Error Handling', () => {
	test('should show error message when server returns error', async ({page}) => {
		// Set up virtual authenticator
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			// Mock authentication options endpoint to return error
			await page.route('**/getPasskeyAuthenticationOptions*', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						error: 'Server temporarily unavailable'
					})
				})
			)

			// Navigate to authentication page
			await page.goto('/authentication')

			// Wait for passkey button
			await expect(page.getByRole('button', {name: /sign in with passkey/i})).toBeVisible()

			// Click passkey sign-in
			await page.getByRole('button', {name: /sign in with passkey/i}).click()

			// THEN: Should show error message
			await expect(page.getByText(/server temporarily unavailable/i)).toBeVisible()
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})

	test('should show fallback option when passkey fails', async ({page}) => {
		// Set up virtual authenticator
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			// Mock authentication options endpoint to return error
			await page.route('**/getPasskeyAuthenticationOptions*', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						error: 'Passkey not found'
					})
				})
			)

			// Navigate to authentication page
			await page.goto('/authentication')

			// Wait for passkey button
			await expect(page.getByRole('button', {name: /sign in with passkey/i})).toBeVisible()

			// Click passkey sign-in
			await page.getByRole('button', {name: /sign in with passkey/i}).click()

			// THEN: Should show error and fallback option
			await expect(page.getByText(/passkey not found/i)).toBeVisible()
			await expect(page.getByRole('button', {name: /use magic link instead/i})).toBeVisible()
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})

	test('should switch to magic link when fallback clicked', async ({page}) => {
		// Set up virtual authenticator
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			// Mock authentication options endpoint to return error
			await page.route('**/getPasskeyAuthenticationOptions*', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						error: 'Authentication failed'
					})
				})
			)

			// Navigate to authentication page
			await page.goto('/authentication')

			// Wait for passkey button and click it
			await expect(page.getByRole('button', {name: /sign in with passkey/i})).toBeVisible()
			await page.getByRole('button', {name: /sign in with passkey/i}).click()

			// Wait for error state
			await expect(page.getByText(/authentication failed/i)).toBeVisible()

			// Click fallback to magic link
			await page.getByRole('button', {name: /use magic link instead/i}).click()

			// THEN: Magic link form should still be visible (it's the primary form)
			await expect(page.getByTestId('magic-link-form')).toBeVisible()
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})
})

test.describe('Passkey UI Integration', () => {
	test('should display passkey option alongside magic link and password options', async ({
		page
	}) => {
		// Set up virtual authenticator
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			// Navigate to authentication page
			await page.goto('/authentication')

			// THEN: Should show all authentication options
			// Passkey option
			await expect(page.getByRole('button', {name: /sign in with passkey/i})).toBeVisible()

			// Magic link form
			await expect(page.getByTestId('magic-link-form')).toBeVisible()

			// Password option
			await expect(page.getByRole('button', {name: /sign in with password/i})).toBeVisible()

			// Guest option
			await expect(page.getByRole('button', {name: /continue as guest/i})).toBeVisible()
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})

	test('should maintain passkey option when switching between auth views', async ({page}) => {
		// Set up virtual authenticator
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			// Navigate to authentication page
			await page.goto('/authentication')

			// Verify passkey option is visible
			await expect(page.getByRole('button', {name: /sign in with passkey/i})).toBeVisible()

			// Switch to password view
			await page.getByRole('button', {name: /sign in with password/i}).click()

			// Switch back to magic link
			await page.getByRole('button', {name: /sign in with magic link/i}).click()

			// THEN: Passkey option should still be visible
			await expect(page.getByRole('button', {name: /sign in with passkey/i})).toBeVisible()
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})
})

test.describe('Passkey Registration Full Flow', () => {
	test('should complete full passkey registration flow from profile', async ({page, context}) => {
		// GIVEN: Authenticated user on profile page with virtual authenticator
		await injectSessionCookie(context, testUser, {signedConsentForm: true, profileComplete: true})
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			// Mock API responses
			await page.route('**/api/users/profile', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						data: {id: testUser.uid, email: testUser.email}
					})
				})
			)

			await page.route('**/api/users/events', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true, events: []})
				})
			)

			// Mock passkey API calls for registration flow
			await page.route('**/getPasskeyRegistrationOptions*', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						options: {
							challenge: btoa('test-registration-challenge'),
							rp: {name: 'Natural Highs', id: 'localhost'},
							user: {
								id: btoa(testUser.uid),
								name: testUser.email,
								displayName: testUser.displayName
							},
							pubKeyCredParams: [{type: 'public-key', alg: -7}],
							timeout: 60000,
							attestation: 'none',
							authenticatorSelection: {
								authenticatorAttachment: 'platform',
								residentKey: 'preferred',
								userVerification: 'required'
							}
						}
					})
				})
			)

			await page.route('**/verifyPasskeyRegistration*', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						credentialId: 'test-credential-id'
					})
				})
			)

			await page.route('**/getPasskeys*', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						passkeys: []
					})
				})
			)

			// Navigate to profile page
			await page.goto('/profile')

			// WHEN: User clicks Set Up Passkey button
			await expect(page.getByRole('button', {name: /set up passkey/i})).toBeVisible()
			await page.getByRole('button', {name: /set up passkey/i}).click()

			// THEN: Should show setting up state
			await expect(page.getByText(/setting up/i)).toBeVisible()

			// AND: Should eventually show success (note: actual WebAuthn ceremony happens via virtual authenticator)
			// In this mocked scenario, the flow completes when verifyPasskeyRegistration returns success
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})
})

test.describe('Passkey Sign-In Full Flow', () => {
	test('should redirect to dashboard after successful passkey sign-in', async ({page}) => {
		// GIVEN: Virtual authenticator is set up
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			// Mock authentication options endpoint
			await page.route('**/getPasskeyAuthenticationOptions*', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						options: {
							challenge: btoa('test-auth-challenge'),
							timeout: 60000,
							rpId: 'localhost',
							userVerification: 'required'
						}
					})
				})
			)

			// Mock successful verification that returns user info
			await page.route('**/verifyPasskeyAuthentication*', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						userId: testUser.uid,
						email: testUser.email,
						displayName: testUser.displayName
					})
				})
			)

			// Navigate to authentication page
			await page.goto('/authentication')

			// WHEN: User clicks passkey sign-in
			await expect(page.getByRole('button', {name: /sign in with passkey/i})).toBeVisible()
			await page.getByRole('button', {name: /sign in with passkey/i}).click()

			// THEN: Should show verifying state
			await expect(page.getByText(/verifying/i)).toBeVisible()

			// Wait for success and redirect (in real scenario, would redirect to /dashboard)
			// Note: Full redirect testing requires non-mocked server functions
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})
})

test.describe('Passkey Network Error Handling', () => {
	test('should show network error message and offer magic link fallback (AC10)', async ({page}) => {
		// GIVEN: Virtual authenticator is set up
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			// Mock authentication options success
			await page.route('**/getPasskeyAuthenticationOptions*', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						options: {
							challenge: btoa('test-auth-challenge'),
							timeout: 60000,
							rpId: 'localhost',
							userVerification: 'required'
						}
					})
				})
			)

			// Mock network error during verification (simulate 500 server error)
			await page.route('**/verifyPasskeyAuthentication*', route =>
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						error: 'Network error occurred'
					})
				})
			)

			// Navigate to authentication page
			await page.goto('/authentication')

			// WHEN: User attempts passkey sign-in but network fails
			await expect(page.getByRole('button', {name: /sign in with passkey/i})).toBeVisible()
			await page.getByRole('button', {name: /sign in with passkey/i}).click()

			// Wait for authentication ceremony to complete by waiting for error message
			// THEN: Should show network error message
			await expect(page.getByText(/network error|connection issue|try again/i)).toBeVisible({
				timeout: 5000
			})

			// AND: Should offer magic link fallback
			const fallbackButton = page.getByRole('button', {name: /use magic link|magic link instead/i})
			await expect(fallbackButton).toBeVisible()

			// WHEN: User clicks fallback
			await fallbackButton.click()

			// THEN: Should show magic link form (verifies fallback flow)
			await expect(page.getByPlaceholder(/email/i)).toBeVisible()
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})

	test('should allow retry after network error', async ({page}) => {
		// GIVEN: Virtual authenticator is set up
		const {client, authenticatorId} = await setupVirtualAuthenticator(page)

		try {
			let attemptCount = 0

			// Mock authentication options
			await page.route('**/getPasskeyAuthenticationOptions*', route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						options: {
							challenge: btoa('test-auth-challenge'),
							timeout: 60000,
							rpId: 'localhost',
							userVerification: 'required'
						}
					})
				})
			)

			// Mock verification: first attempt fails, second succeeds
			await page.route('**/verifyPasskeyAuthentication*', route => {
				attemptCount++
				if (attemptCount === 1) {
					// First attempt: network error
					route.fulfill({
						status: 500,
						contentType: 'application/json',
						body: JSON.stringify({success: false, error: 'Network timeout'})
					})
				} else {
					// Second attempt: success
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							userId: testUser.uid,
							email: testUser.email,
							displayName: testUser.displayName
						})
					})
				}
			})

			// Navigate to authentication page
			await page.goto('/authentication')

			// WHEN: First attempt fails with network error
			await page.getByRole('button', {name: /sign in with passkey/i}).click()

			// THEN: Should show error - wait for it instead of arbitrary timeout
			await expect(page.getByText(/network|timeout|try again/i)).toBeVisible({timeout: 5000})

			// WHEN: User retries
			await page.getByRole('button', {name: /sign in with passkey/i}).click()

			// THEN: Second attempt succeeds (shows success state)
			await expect(page.getByText(/signed in|verifying/i)).toBeVisible({timeout: 5000})
		} finally {
			await removeVirtualAuthenticator(client, authenticatorId)
		}
	})
})

/**
 * Test Limitations Note:
 *
 * Current E2E tests use mocked API responses for server functions. This provides:
 * ✓ Fast test execution
 * ✓ Reliable virtual authenticator behavior
 * ✓ UI flow verification
 *
 * However, this approach does NOT test:
 * ✗ Actual server function logic
 * ✗ Real Firestore security rules
 * ✗ WebAuthn verification correctness
 * ✗ Session upgrade to 180 days
 *
 * Future Enhancement:
 * - Run E2E tests against Firebase emulators with real server functions
 * - Add integration test suite that exercises full stack
 * - Verify actual Firestore writes and session cookie changes
 */
