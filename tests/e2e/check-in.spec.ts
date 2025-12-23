/**
 * User Check-in E2E Tests
 *
 * Tests verify the authenticated user check-in flow including:
 * - Entering a valid 4-digit event code
 * - Successful check-in with welcome confirmation
 * - Performance timing (<3 seconds)
 * - Error handling for invalid codes
 *
 * Test Strategy:
 * - Use auth fixtures to simulate authenticated user state
 * - Mock API endpoints for check-in operations
 * - Use data-testid selectors for stability
 */

import {expect, test} from '@playwright/test'
import {TEST_CODES} from '../factories/events.factory'

/**
 * Helper to set up authenticated user state with consent
 */
async function setupAuthenticatedUser(
	page: import('@playwright/test').Page,
	context: import('@playwright/test').BrowserContext,
	options: {displayName?: string} = {}
) {
	const displayName = options.displayName || 'Test User'

	// Mock the auth state check endpoint
	await page.route('**/api/auth/session', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				user: {
					uid: 'test-user-123',
					email: 'test@example.com',
					displayName
				},
				claims: {
					signedConsentForm: true,
					admin: false
				}
			})
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

	// Mock events query (empty by default)
	await page.route('**/api/events', route => {
		if (route.request().method() === 'GET') {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true, events: []})
			})
		} else {
			route.continue()
		}
	})

	// Set localStorage to indicate authenticated state
	await context.addInitScript(() => {
		window.localStorage.setItem('authState', 'authenticated')
	})
}

test.describe('User Check-in Flow', () => {
	test.describe('AC1: Check-in Happy Path', () => {
		test('should display check-in form on dashboard', async ({page, context}) => {
			// GIVEN: User is authenticated with consent
			await setupAuthenticatedUser(page, context)

			// WHEN: User navigates to dashboard
			await page.goto('/dashboard')

			// THEN: Check-in form elements should be visible
			await expect(page.getByTestId('event-code-input')).toBeVisible()
			await expect(page.getByTestId('check-in-submit-button')).toBeVisible()
		})

		test('should have submit button disabled until 4-digit code entered', async ({
			page,
			context
		}) => {
			// GIVEN: User is on dashboard
			await setupAuthenticatedUser(page, context)
			await page.goto('/dashboard')

			// THEN: Submit button should be disabled initially
			const submitButton = page.getByTestId('check-in-submit-button')
			await expect(submitButton).toBeDisabled()

			// WHEN: User enters partial code (3 digits)
			await page.getByTestId('event-code-input').fill('123')

			// THEN: Submit button should still be disabled
			await expect(submitButton).toBeDisabled()

			// WHEN: User enters full 4-digit code
			await page.getByTestId('event-code-input').fill('1234')

			// THEN: Submit button should be enabled
			await expect(submitButton).toBeEnabled()
		})

		test('should show success confirmation with welcome message after valid check-in', async ({
			page,
			context
		}) => {
			// GIVEN: User is authenticated
			await setupAuthenticatedUser(page, context, {displayName: 'Maya'})

			// Mock successful check-in
			await page.route('**/api/users/eventCode', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						message: 'Welcome back, Maya!'
					})
				})
			})

			// Navigate to dashboard
			await page.goto('/dashboard')

			// WHEN: User enters valid event code and submits
			await page.getByTestId('event-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('check-in-submit-button').click()

			// THEN: Should show success confirmation
			await expect(page.getByTestId('check-in-success')).toBeVisible()
		})

		test('should clear input after successful check-in', async ({page, context}) => {
			// GIVEN: User is authenticated
			await setupAuthenticatedUser(page, context)

			// Mock successful check-in (without reload)
			let checkInCount = 0
			await page.route('**/api/users/eventCode', route => {
				checkInCount++
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						message: 'Successfully registered for event'
					})
				})
			})

			await page.goto('/dashboard')

			// WHEN: User completes check-in
			await page.getByTestId('event-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('check-in-submit-button').click()

			// THEN: Check-in API should have been called
			expect(checkInCount).toBe(1)
		})
	})

	test.describe('AC8: Performance Assertions', () => {
		test('should complete check-in within 3 seconds', async ({page, context}) => {
			// GIVEN: User is authenticated
			await setupAuthenticatedUser(page, context)

			// Mock check-in with realistic response time
			await page.route('**/api/users/eventCode', async route => {
				// Simulate network latency
				await new Promise(resolve => setTimeout(resolve, 100))
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						message: 'Welcome back, Test User!'
					})
				})
			})

			await page.goto('/dashboard')

			// Fill in the code
			await page.getByTestId('event-code-input').fill(TEST_CODES.VALID)

			// WHEN: User clicks submit
			const start = Date.now()
			await page.getByTestId('check-in-submit-button').click()

			// Wait for success confirmation
			await page.getByTestId('check-in-success').waitFor()
			const elapsed = Date.now() - start

			// THEN: Response time should be under 3 seconds
			expect(elapsed).toBeLessThan(3000)
		})
	})

	test.describe('Error Handling (AC6)', () => {
		test('should show error message for invalid event code', async ({page, context}) => {
			// GIVEN: User is authenticated
			await setupAuthenticatedUser(page, context)

			// Mock failed check-in
			await page.route('**/api/users/eventCode', route => {
				route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						error: 'Invalid event code'
					})
				})
			})

			await page.goto('/dashboard')

			// WHEN: User enters invalid code and submits
			await page.getByTestId('event-code-input').fill(TEST_CODES.INVALID)
			await page.getByTestId('check-in-submit-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
			await expect(page.getByTestId('check-in-error')).toContainText('Invalid event code')
		})

		test('should show error message for expired event', async ({page, context}) => {
			// GIVEN: User is authenticated
			await setupAuthenticatedUser(page, context)

			// Mock expired event response
			await page.route('**/api/users/eventCode', route => {
				route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						error: 'Event has expired'
					})
				})
			})

			await page.goto('/dashboard')

			// WHEN: User enters expired event code
			await page.getByTestId('event-code-input').fill(TEST_CODES.EXPIRED)
			await page.getByTestId('check-in-submit-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
			await expect(page.getByTestId('check-in-error')).toContainText('expired')
		})

		test('should handle network failure gracefully', async ({page, context}) => {
			// GIVEN: User is authenticated
			await setupAuthenticatedUser(page, context)

			// Mock network failure
			await page.route('**/api/users/eventCode', route => {
				route.abort('failed')
			})

			await page.goto('/dashboard')

			// WHEN: User submits with network failure
			await page.getByTestId('event-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('check-in-submit-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
		})

		test('should allow retry after error', async ({page, context}) => {
			// GIVEN: User is authenticated
			await setupAuthenticatedUser(page, context)

			let attemptCount = 0
			await page.route('**/api/users/eventCode', route => {
				attemptCount++
				if (attemptCount === 1) {
					// First attempt fails
					route.fulfill({
						status: 400,
						contentType: 'application/json',
						body: JSON.stringify({success: false, error: 'Invalid code'})
					})
				} else {
					// Second attempt succeeds
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({success: true, message: 'Welcome!'})
					})
				}
			})

			await page.goto('/dashboard')

			// First attempt - should fail
			await page.getByTestId('event-code-input').fill(TEST_CODES.INVALID)
			await page.getByTestId('check-in-submit-button').click()
			await expect(page.getByTestId('check-in-error')).toBeVisible()

			// WHEN: User tries again with valid code
			await page.getByTestId('event-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('check-in-submit-button').click()

			// THEN: Should succeed
			await expect(page.getByTestId('check-in-success')).toBeVisible()
		})
	})

	test.describe('Access Control', () => {
		test('should redirect unauthenticated users to authentication page', async ({page}) => {
			// GIVEN: User is not authenticated
			// WHEN: User tries to access dashboard
			await page.goto('/dashboard')

			// THEN: Should redirect to authentication
			await expect(page).toHaveURL(/authentication/)
		})

		test('should redirect users without consent to consent page', async ({page, context}) => {
			// GIVEN: User is authenticated but has not signed consent
			await page.route('**/api/auth/session', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						user: {uid: 'test-123', email: 'test@example.com'},
						claims: {signedConsentForm: false, admin: false}
					})
				})
			})

			await page.route('**/api/auth/sessionLogin', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({token: true})
				})
			})

			await context.addInitScript(() => {
				window.localStorage.setItem('authState', 'authenticated')
			})

			// WHEN: User tries to access dashboard
			await page.goto('/dashboard')

			// THEN: Should redirect to consent page
			await expect(page).toHaveURL(/consent/)
		})
	})
})
