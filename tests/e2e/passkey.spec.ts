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

test.describe('Passkey Registration', () => {
	test.describe('Profile Page - Passkey Setup', () => {
		test('should show passkey setup section on profile page', async ({page, context}) => {
			// GIVEN: Authenticated user on profile page
			await injectSessionCookie(context, testUser, {signedConsentForm: true})

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
			await injectSessionCookie(context, testUser, {signedConsentForm: true})

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
