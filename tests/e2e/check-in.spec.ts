/**
 * User Check-in E2E Tests
 *
 * Tests verify the authenticated user check-in flow including:
 * - Entering a valid 4-digit event code via OTP-style input
 * - Auto-submit on 4th digit entry (no button needed)
 * - Successful check-in with full-screen confirmation overlay
 * - Event details display (name, date, location)
 * - Personalized welcome message
 * - Auto-dismiss and tap-to-dismiss behavior
 * - Shake animation on error
 * - Performance timing (<3 seconds)
 * - Error handling for invalid codes
 *
 * Test Strategy:
 * - Uses auth fixtures with session cookie injection (not localStorage)
 * - Mock API endpoints for check-in operations
 * - Use data-testid selectors for stability
 *
 * Note: Uses fill() for InputOTP which triggers onComplete callback for auto-submit.
 */

import {TEST_CODES} from '../factories/events.factory'
import {expect, test} from '../fixtures/auth.fixture'

test.describe('User Check-in Flow', () => {
	test.describe('AC1: Check-in Happy Path', () => {
		test('should display OTP-style check-in input on dashboard', async ({
			page,
			authenticatedUser: _
		}) => {
			// GIVEN: User is authenticated with consent (via session cookie fixture)
			// authenticatedUser fixture injects session cookie with signedConsentForm: true

			// WHEN: User navigates to dashboard
			await page.goto('/dashboard')

			// THEN: OTP-style check-in input should be visible
			await expect(page.getByTestId('event-code-input')).toBeVisible()
			// Should have 4 OTP slots
			const slots = page.getByTestId('input-otp-slot')
			await expect(slots).toHaveCount(4)
		})

		test('should auto-submit when 4 digits are entered (no button needed)', async ({
			page,
			authenticatedUser: _
		}) => {
			// Mock successful check-in with event details
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							message: 'Welcome back!',
							eventName: 'Community Session',
							eventDate: '2025-01-15T10:00:00Z',
							eventLocation: 'Main Hall'
						})
					})
				} else {
					route.continue()
				}
			})

			// Navigate to dashboard
			await page.goto('/dashboard')
			// Wait for React hydration before interacting with form inputs
			await page.waitForLoadState('networkidle')

			// WHEN: User enters 4 digits (auto-submits on 4th digit)
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should show full-screen success confirmation overlay
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()
		})

		test('should show success confirmation with welcome message after valid check-in', async ({
			page,
			authenticatedUser
		}) => {
			// Mock successful check-in with event details
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							message: 'Welcome back!',
							eventName: 'Community Session',
							eventDate: '2025-01-15T10:00:00Z',
							eventLocation: 'Main Hall'
						})
					})
				} else {
					route.continue()
				}
			})

			// Navigate to dashboard
			await page.goto('/dashboard')
			// Wait for React hydration before interacting with form inputs
			await page.waitForLoadState('networkidle')

			// WHEN: User enters valid event code (auto-submits)
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should show success confirmation with personalized welcome
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()
			const firstName = authenticatedUser.displayName?.split(' ')[0] || 'Friend'
			await expect(page.getByText(new RegExp(`Welcome back, ${firstName}`))).toBeVisible()
		})

		test('should clear input after confirmation dismissed', async ({
			page,
			authenticatedUser: _
		}) => {
			// Mock successful check-in
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							message: 'Successfully registered for event',
							eventName: 'Test Event',
							eventDate: '2025-01-15T10:00:00Z',
							eventLocation: 'Test Location'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: User completes check-in (auto-submit on 4th digit)
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// Wait for confirmation overlay
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()

			// Click to dismiss
			await page.getByTestId('success-confirmation-overlay').click()

			// THEN: Overlay should be dismissed and input cleared
			await expect(page.getByTestId('success-confirmation-overlay')).not.toBeVisible()
			await expect(page.getByTestId('event-code-input')).toHaveValue('')
		})
	})

	test.describe('AC1: Success Confirmation Display (FR81)', () => {
		test('should display event name in confirmation overlay', async ({
			page,
			authenticatedUser: _
		}) => {
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							eventName: 'Morning Meditation Circle',
							eventDate: '2025-02-20T08:00:00Z',
							eventLocation: 'Wellness Center'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should display event name
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()
			await expect(page.getByText('Morning Meditation Circle')).toBeVisible()
		})

		test('should display event date in confirmation overlay', async ({
			page,
			authenticatedUser: _
		}) => {
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							eventName: 'Test Event',
							eventDate: '2025-01-15T10:00:00Z',
							eventLocation: 'Test Location'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should display formatted event date
			await expect(page.getByTestId('event-date')).toBeVisible()
			await expect(page.getByTestId('event-date')).toContainText(/January 15, 2025/)
		})

		test('should display event location in confirmation overlay', async ({
			page,
			authenticatedUser: _
		}) => {
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							eventName: 'Test Event',
							eventDate: '2025-01-15T10:00:00Z',
							eventLocation: 'Community Center Room 204'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should display event location
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()
			await expect(page.getByText('Community Center Room 204')).toBeVisible()
		})

		test('should display animated checkmark in confirmation overlay', async ({
			page,
			authenticatedUser: _
		}) => {
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							eventName: 'Test Event',
							eventDate: '2025-01-15T10:00:00Z',
							eventLocation: 'Test Location'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should display animated checkmark
			await expect(page.getByTestId('success-checkmark')).toBeVisible()
		})
	})

	test.describe('AC2: Confirmation Dismissal', () => {
		test('should dismiss confirmation on tap/click', async ({page, authenticatedUser: _}) => {
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							eventName: 'Test Event',
							eventDate: '2025-01-15T10:00:00Z',
							eventLocation: 'Test Location'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// Wait for confirmation
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()

			// WHEN: User clicks anywhere on the overlay
			await page.getByTestId('success-confirmation-overlay').click()

			// THEN: Confirmation should be dismissed
			await expect(page.getByTestId('success-confirmation-overlay')).not.toBeVisible()
		})

		test('should auto-dismiss confirmation after 3 seconds', async ({
			page,
			authenticatedUser: _
		}) => {
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							eventName: 'Test Event',
							eventDate: '2025-01-15T10:00:00Z',
							eventLocation: 'Test Location'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// Wait for confirmation to appear
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()

			// THEN: Confirmation should auto-dismiss after 3 seconds
			await expect(page.getByTestId('success-confirmation-overlay')).not.toBeVisible({
				timeout: 4000
			})
		})
	})

	test.describe('AC2: Returning User Check-in Flow', () => {
		test('should show Welcome back with user name after successful check-in', async ({
			page,
			authenticatedUser
		}) => {
			// GIVEN: User is authenticated (returning user)
			// Mock successful check-in with personalized welcome message
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							message: `Welcome back, ${authenticatedUser.displayName}!`,
							eventName: 'Community Event',
							eventDate: '2025-01-15T10:00:00Z',
							eventLocation: 'Main Hall'
						})
					})
				} else {
					route.continue()
				}
			})

			// Navigate to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: Returning user enters valid event code (auto-submits on 4th digit)
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should show personalized welcome in confirmation overlay
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()
			const firstName = authenticatedUser.displayName?.split(' ')[0] || 'Friend'
			await expect(page.getByText(new RegExp(`Welcome back, ${firstName}`))).toBeVisible()
		})

		test('should not require re-entering profile data for returning user', async ({
			page,
			authenticatedUser: _
		}) => {
			// GIVEN: User is already authenticated with complete profile
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							message: 'Successfully checked in!',
							eventName: 'Test Event',
							eventDate: '2025-01-15T10:00:00Z',
							eventLocation: 'Test Location'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: Returning user enters event code (auto-submits)
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should go directly to success confirmation (no profile form shown)
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()
			// Profile form should NOT be visible
			await expect(page.getByTestId('profile-form')).not.toBeVisible()
		})
	})

	test.describe('AC3: Invalid Code Feedback (FR55)', () => {
		test('should show shake animation and error for invalid code', async ({
			page,
			authenticatedUser: _
		}) => {
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 404,
						contentType: 'application/json',
						body: JSON.stringify({
							success: false,
							error: 'Event not found with this code'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: User enters invalid code
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.INVALID)

			// THEN: Should show error with correct message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
			await expect(page.getByTestId('check-in-error')).toContainText(
				'Code not found. Double-check and try again.'
			)

			// Input should be cleared after shake animation
			await expect(page.getByTestId('event-code-input')).toHaveValue('', {timeout: 1000})
		})
	})

	test.describe('Performance Assertions', () => {
		test('should complete check-in within 3 seconds', async ({page, authenticatedUser: _}) => {
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
							message: 'Welcome back, Test User!',
							eventName: 'Test Event',
							eventDate: '2025-01-15T10:00:00Z',
							eventLocation: 'Test Location'
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

			// WHEN: User enters 4th digit (auto-submits)
			const start = Date.now()
			await input.fill(TEST_CODES.VALID)

			// Wait for success confirmation
			await page.getByTestId('success-confirmation-overlay').waitFor()
			const elapsed = Date.now() - start

			// THEN: Response time should be under 3 seconds
			expect(elapsed).toBeLessThan(3000)
		})
	})

	test.describe('Error Handling (AC3, AC5)', () => {
		test('should show error message for invalid event code', async ({
			page,
			authenticatedUser: _
		}) => {
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

			// WHEN: User enters invalid code (auto-submits on 4th digit)
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.INVALID)

			// THEN: Should show error message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
		})

		test('should show error message for expired event', async ({page, authenticatedUser: _}) => {
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

			// WHEN: User enters expired event code (auto-submits)
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.EXPIRED)

			// THEN: Should show error message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
		})

		test('should handle network failure gracefully (AC5/NFR24)', async ({
			page,
			authenticatedUser: _
		}) => {
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

			// WHEN: User submits with network failure (auto-submits on 4th digit)
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should show error message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
		})

		test('should allow retry after error', async ({page, authenticatedUser: _}) => {
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
							body: JSON.stringify({
								success: true,
								message: 'Welcome!',
								eventName: 'Test Event',
								eventDate: '2025-01-15T10:00:00Z',
								eventLocation: 'Test Location'
							})
						})
					}
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')
			const input = page.getByTestId('event-code-input')

			// First attempt - should fail (auto-submits on 4th digit)
			await input.fill(TEST_CODES.INVALID)
			await expect(page.getByTestId('check-in-error')).toBeVisible()

			// Wait for input to be cleared after shake animation
			await expect(input).toHaveValue('', {timeout: 1000})

			// WHEN: User tries again with valid code
			await input.fill(TEST_CODES.VALID)

			// THEN: Should succeed
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()
		})
	})

	test.describe('AC6: Duplicate Check-in Prevention', () => {
		test('should show already checked in message when user attempts duplicate check-in', async ({
			page,
			authenticatedUser: _
		}) => {
			// GIVEN: User is authenticated and has already checked into this event
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 409, // Conflict - already exists
						contentType: 'application/json',
						body: JSON.stringify({
							success: false,
							error: 'Already checked in',
							message: 'You have already checked in to this event'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: User tries to check in again with same code (auto-submits on 4th digit)
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should show "already checked in" error message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
			await expect(page.getByText(/already checked in/i)).toBeVisible()
		})

		test('should not create duplicate record when authenticated user re-submits', async ({
			page,
			authenticatedUser: _
		}) => {
			// GIVEN: Track API call count to verify no duplicate records
			let checkInCallCount = 0
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					checkInCallCount++
					if (checkInCallCount === 1) {
						// First call succeeds
						route.fulfill({
							status: 200,
							contentType: 'application/json',
							body: JSON.stringify({
								success: true,
								message: 'Successfully checked in!',
								eventName: 'Test Event',
								eventDate: '2025-01-15T10:00:00Z',
								eventLocation: 'Test Location'
							})
						})
					} else {
						// Subsequent calls return duplicate error
						route.fulfill({
							status: 409,
							contentType: 'application/json',
							body: JSON.stringify({
								success: false,
								error: 'Already checked in'
							})
						})
					}
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// First check-in succeeds (auto-submits on 4th digit)
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()

			// Dismiss and try again
			await page.getByTestId('success-confirmation-overlay').click()
			await expect(page.getByTestId('success-confirmation-overlay')).not.toBeVisible()

			// Try again
			await page.getByTestId('event-code-input').fill(TEST_CODES.VALID)

			// THEN: Should show error on second attempt
			await expect(page.getByTestId('check-in-error')).toBeVisible()
			expect(checkInCallCount).toBe(2) // Both calls were made, but second was rejected
		})
	})

	test.describe('AC4: Event Time Window Enforcement (FR56)', () => {
		test('should show time window error when event is not accepting check-ins', async ({
			page,
			authenticatedUser: _
		}) => {
			// Mock 403 response for time window error
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 403,
						contentType: 'application/json',
						body: JSON.stringify({
							success: false,
							error: 'This event is not currently accepting check-ins'
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: User enters event code for an event outside time window
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should show time window error message
			await expect(page.getByTestId('check-in-error')).toBeVisible()
			await expect(page.getByTestId('check-in-error')).toContainText(
				'This event is not currently accepting check-ins'
			)
		})

		test('should show scheduled time when time window error includes it', async ({
			page,
			authenticatedUser: _
		}) => {
			// Mock 403 response with scheduled time
			const scheduledTime = '2025-02-15T14:00:00Z'
			await page.route('**/api/users/eventCode', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 403,
						contentType: 'application/json',
						body: JSON.stringify({
							success: false,
							error: 'This event is not currently accepting check-ins',
							scheduledTime
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// WHEN: User enters event code for an event outside time window
			const input = page.getByTestId('event-code-input')
			await input.fill(TEST_CODES.VALID)

			// THEN: Should show time window error with scheduled time
			await expect(page.getByTestId('check-in-error')).toBeVisible()
			await expect(page.getByTestId('check-in-error')).toContainText('Scheduled:')
			await expect(page.getByTestId('check-in-error')).toContainText('Feb')
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
