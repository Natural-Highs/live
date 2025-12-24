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
 * - Uses auth fixtures with session cookie injection (not localStorage)
 * - Mock API endpoints for check-in operations
 * - Use data-testid selectors for stability
 *
 * Note: Uses pressSequentially() instead of fill() for input fields because
 * React controlled components require individual key events to trigger state updates.
 */

import {TEST_CODES} from '../factories/events.factory'
import {expect, test} from '../fixtures/auth.fixture'

test.describe('User Check-in Flow', () => {
	test.describe('AC1: Check-in Happy Path', () => {
		test('should display check-in form on dashboard', async ({page, authenticatedUser}) => {
			// GIVEN: User is authenticated with consent (via session cookie fixture)
			// authenticatedUser fixture injects session cookie with signedConsentForm: true

			// WHEN: User navigates to dashboard
			await page.goto('/dashboard')

			// THEN: Check-in form elements should be visible
			await expect(page.getByTestId('event-code-input')).toBeVisible()
			await expect(page.getByTestId('check-in-submit-button')).toBeVisible()
		})

		test('should have submit button disabled until 4-digit code entered', async ({
			page,
			authenticatedUser
		}) => {
			// GIVEN: User is on dashboard
			await page.goto('/dashboard')

			// Wait for page to be fully interactive (hydrated)
			await page.waitForLoadState('networkidle')

			// THEN: Submit button should be disabled initially
			const submitButton = page.getByTestId('check-in-submit-button')
			await expect(submitButton).toBeDisabled()

			// WHEN: User enters partial code (3 digits)
			const input = page.getByTestId('event-code-input')
			await input.fill('123')

			// THEN: Submit button should still be disabled
			await expect(submitButton).toBeDisabled()

			// WHEN: User enters full 4-digit code
			await input.fill('1234')

			// THEN: Submit button should be enabled
			await expect(submitButton).toBeEnabled()
		})

		test('should show success confirmation with welcome message after valid check-in', async ({
			page,
			authenticatedUser
		}) => {
			// Mock successful check-in
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							message: 'Welcome back!'
						})
					})
				} else {
					route.continue()
				}
			})

			// Navigate to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: User enters valid event code and submits
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)
			await page.getByTestId('check-in-submit-button').click()

			// THEN: Should show success confirmation
			await expect(page.getByTestId('check-in-success')).toBeVisible()
		})

		test('should clear input after successful check-in', async ({page, authenticatedUser}) => {
			// Mock successful check-in
			let checkInCount = 0
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					checkInCount++
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							message: 'Successfully registered for event'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: User completes check-in
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)
			await page.getByTestId('check-in-submit-button').click()

			// Wait for success message
			await expect(page.getByTestId('check-in-success')).toBeVisible()

			// THEN: Check-in API should have been called and input cleared
			expect(checkInCount).toBe(1)
			await expect(page.getByTestId('event-code-input')).toHaveValue('')
		})
	})

	test.describe('AC8: Performance Assertions', () => {
		test('should complete check-in within 3 seconds', async ({page, authenticatedUser}) => {
			// Mock check-in with realistic response time
			await page.route('**/api/users/eventCode', async route => {
				if (route.request().method() === 'POST') {
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
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Fill in the code
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

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
		test('should show error message for invalid event code', async ({page, authenticatedUser}) => {
			// Mock failed check-in
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 400,
						contentType: 'application/json',
						body: JSON.stringify({
							success: false,
							error: 'Invalid event code'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: User enters invalid code and submits
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.INVALID)
			await page.getByTestId('check-in-submit-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
			await expect(page.getByTestId('check-in-error')).toContainText('Invalid event code')
		})

		test('should show error message for expired event', async ({page, authenticatedUser}) => {
			// Mock expired event response
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 400,
						contentType: 'application/json',
						body: JSON.stringify({
							success: false,
							error: 'Event has expired'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: User enters expired event code
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.EXPIRED)
			await page.getByTestId('check-in-submit-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
			await expect(page.getByTestId('check-in-error')).toContainText('expired')
		})

		test('should handle network failure gracefully', async ({page, authenticatedUser}) => {
			// Mock network failure
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.abort('failed')
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: User submits with network failure
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)
			await page.getByTestId('check-in-submit-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
		})

		test('should allow retry after error', async ({page, authenticatedUser}) => {
			let attemptCount = 0
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
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
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')
			const input = page.getByTestId('event-code-input')

			// First attempt - should fail
			await input.fill(TEST_CODES.INVALID)
			await page.getByTestId('check-in-submit-button').click()
			await expect(page.getByTestId('check-in-error')).toBeVisible()

			// WHEN: User tries again with valid code
			await input.fill(TEST_CODES.VALID)
			await page.getByTestId('check-in-submit-button').click()

			// THEN: Should succeed
			await expect(page.getByTestId('check-in-success')).toBeVisible()
		})
	})

	test.describe('Access Control', () => {
		// Note: This test does NOT use authenticatedUser fixture to test unauthenticated access
		test('should redirect unauthenticated users to authentication page', async ({page}) => {
			// GIVEN: User is not authenticated (no session cookie)
			// WHEN: User tries to access dashboard
			await page.goto('/dashboard')

			// THEN: Should redirect to authentication
			await expect(page).toHaveURL(/authentication/)
		})
	})
})
