/**
 * Magic Link Integration Tests
 *
 * Tests the complete magic link authentication flow against Firebase emulators.
 * NO Firebase Auth mocking - uses real emulator with OOB Code API.
 *
 * Test scenarios:
 * - Request magic link, fetch OOB code, complete sign-in
 * - Magic link expiration handling
 * - Session creation after successful auth
 *
 * @see AC2: OOB Code API for Magic Link Testing
 * @see ADR-3: Magic Link Testing Approach
 */

import {mergeTests} from '@playwright/test'
import {test as firebaseTest} from './fixtures/firebase.fixture'
import {expect, test as oobTest} from './fixtures/oob-codes.fixture'

// Merge fixtures for combined functionality
const test = mergeTests(firebaseTest, oobTest)

// Test user email - uses emulator, no real email sent
const TEST_EMAIL = 'integration-test@example.com'

test.describe('Magic Link Integration - AC2', () => {
	test.beforeEach(async ({clearAllTestData, clearOobCodes, verifyEmulators}) => {
		// Verify emulators are available
		await verifyEmulators()

		// Clear all test data for isolation
		await clearAllTestData()
		await clearOobCodes()
	})

	test('should request magic link and fetch OOB code via API', async ({
		page,
		getMagicLinkCode,
		projectId
	}) => {
		// GIVEN: User is on the authentication page
		await page.goto('/authentication')

		// Wait for the form to be visible
		await expect(page.getByTestId('magic-link-form')).toBeVisible()

		// WHEN: User enters email and submits
		await page.getByTestId('magic-link-email-input').fill(TEST_EMAIL)
		await page.getByTestId('send-magic-link-button').click()

		// THEN: Magic link sent confirmation should appear
		// The MagicLinkRequest component calls onSuccess which typically shows a "check email" message
		// Wait for either success message or navigation
		await expect(page.getByText(/check your email|magic link sent|email sent/i)).toBeVisible({
			timeout: 10000
		})

		// AND: OOB code should be available via API (no real email sent)
		const magicLink = await getMagicLinkCode(TEST_EMAIL, {
			maxWaitMs: 10000
		})

		// Verify we got a valid magic link URL
		expect(magicLink).toBeTruthy()
		expect(magicLink).toContain('oobCode=')
		expect(magicLink).toContain(projectId)
	})

	test('should complete sign-in using OOB code link', async ({page, getMagicLinkCode}) => {
		// GIVEN: Magic link has been requested
		await page.goto('/authentication')
		await expect(page.getByTestId('magic-link-form')).toBeVisible()

		await page.getByTestId('magic-link-email-input').fill(TEST_EMAIL)
		await page.getByTestId('send-magic-link-button').click()

		// Wait for success
		await expect(page.getByText(/check your email|magic link sent|email sent/i)).toBeVisible({
			timeout: 10000
		})

		// WHEN: User clicks the magic link (fetched via OOB API)
		const magicLink = await getMagicLinkCode(TEST_EMAIL)

		// Store email in localStorage (simulates same-device flow)
		await page.evaluate(email => {
			window.localStorage.setItem('emailForSignIn', email)
		}, TEST_EMAIL)

		// Navigate to the magic link
		await page.goto(magicLink)

		// THEN: Sign-in should succeed
		// The magic-link route shows success or redirects to dashboard
		await expect(
			page.getByTestId('magic-link-success').or(page.getByText(/welcome|dashboard/i))
		).toBeVisible({timeout: 15000})
	})

	test('should handle cross-device sign-in (no localStorage email)', async ({
		page,
		getMagicLinkCode
	}) => {
		// GIVEN: Magic link requested on one device
		await page.goto('/authentication')
		await expect(page.getByTestId('magic-link-form')).toBeVisible()

		await page.getByTestId('magic-link-email-input').fill(TEST_EMAIL)
		await page.getByTestId('send-magic-link-button').click()

		await expect(page.getByText(/check your email|magic link sent|email sent/i)).toBeVisible({
			timeout: 10000
		})

		const magicLink = await getMagicLinkCode(TEST_EMAIL)

		// WHEN: User opens link on different device (no localStorage email)
		// Clear any stored email to simulate cross-device
		await page.evaluate(() => {
			window.localStorage.removeItem('emailForSignIn')
		})

		await page.goto(magicLink)

		// THEN: Should prompt for email confirmation
		await expect(page.getByTestId('cross-device-email-prompt')).toBeVisible({timeout: 10000})

		// WHEN: User enters their email
		await page.getByTestId('cross-device-email-input').fill(TEST_EMAIL)
		await page.getByTestId('cross-device-continue-button').click()

		// THEN: Sign-in should complete
		await expect(
			page.getByTestId('magic-link-success').or(page.getByText(/welcome|dashboard/i))
		).toBeVisible({timeout: 15000})
	})

	test('should show error for invalid/expired magic link', async ({page}) => {
		// GIVEN: User has an invalid magic link
		const invalidLink = '/magic-link?oobCode=invalid-code&mode=signIn'

		// Store email to bypass cross-device prompt
		await page.evaluate(() => {
			window.localStorage.setItem('emailForSignIn', 'test@example.com')
		})

		// WHEN: User navigates to invalid link
		await page.goto(invalidLink)

		// THEN: Error should be displayed
		await expect(page.getByTestId('magic-link-error')).toBeVisible({timeout: 10000})
		await expect(page.getByText(/expired|invalid|already been used/i)).toBeVisible()

		// AND: Option to request new link should be available
		await expect(page.getByTestId('request-new-link-button')).toBeVisible()
	})

	test('should create session after successful magic link auth', async ({
		page,
		getMagicLinkCode
	}) => {
		// GIVEN: Magic link flow completed
		await page.goto('/authentication')
		await expect(page.getByTestId('magic-link-form')).toBeVisible()

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

		// Wait for sign-in success
		await expect(
			page.getByTestId('magic-link-success').or(page.getByText(/welcome|dashboard/i))
		).toBeVisible({timeout: 15000})

		// THEN: Session cookie should be set
		const cookies = await page.context().cookies()
		const sessionCookie = cookies.find(c => c.name === 'nh-session')

		expect(sessionCookie).toBeTruthy()
		expect(sessionCookie?.httpOnly).toBe(true)
		expect(sessionCookie?.sameSite).toBe('Lax')
	})

	test('should use real Firebase Auth without mocking', async ({page, verifyEmulators}) => {
		// This test verifies the integration test setup is correct
		// by checking we're connected to real emulators

		// GIVEN: Emulators are running
		const health = await verifyEmulators()

		// THEN: Both emulators should be accessible
		expect(health.auth).toBe(true)
		expect(health.firestore).toBe(true)

		// AND: Page loads without mocked routes
		await page.goto('/authentication')
		await expect(page.getByTestId('magic-link-form')).toBeVisible()
	})
})

test.describe('Magic Link Edge Cases', () => {
	test.beforeEach(async ({clearAllTestData, clearOobCodes, verifyEmulators}) => {
		await verifyEmulators()
		await clearAllTestData()
		await clearOobCodes()
	})

	test('should handle rapid multiple magic link requests for same email', async ({
		page,
		getOobCodesForEmail
	}) => {
		// GIVEN: User on authentication page
		await page.goto('/authentication')
		await expect(page.getByTestId('magic-link-form')).toBeVisible()

		// WHEN: User requests magic link multiple times rapidly
		for (let i = 0; i < 3; i++) {
			await page.getByTestId('magic-link-email-input').fill('')
			await page.getByTestId('magic-link-email-input').fill(TEST_EMAIL)
			await page.getByTestId('send-magic-link-button').click()

			// Wait briefly between requests
			await page.waitForTimeout(500)
		}

		// THEN: Multiple codes should exist but most recent should be returned
		const codes = await getOobCodesForEmail(TEST_EMAIL)

		// Multiple codes may exist
		expect(codes.length).toBeGreaterThanOrEqual(1)

		// All codes should be for the same email
		for (const code of codes) {
			expect(code.email.toLowerCase()).toBe(TEST_EMAIL.toLowerCase())
			expect(code.requestType).toBe('EMAIL_SIGNIN')
		}
	})

	test('should handle email case insensitivity', async ({page, getMagicLinkCode}) => {
		const mixedCaseEmail = 'Test.User@Example.COM'
		const lowerCaseEmail = mixedCaseEmail.toLowerCase()

		// GIVEN: Request with mixed case email
		await page.goto('/authentication')
		await expect(page.getByTestId('magic-link-form')).toBeVisible()

		await page.getByTestId('magic-link-email-input').fill(mixedCaseEmail)
		await page.getByTestId('send-magic-link-button').click()

		await expect(page.getByText(/check your email|magic link sent|email sent/i)).toBeVisible({
			timeout: 10000
		})

		// WHEN: Searching for code with lowercase email
		const magicLink = await getMagicLinkCode(lowerCaseEmail)

		// THEN: Should find the code regardless of case
		expect(magicLink).toBeTruthy()
		expect(magicLink).toContain('oobCode=')
	})
})
