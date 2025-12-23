/**
 * Guest Check-in E2E Tests
 *
 * Tests verify the guest check-in flow including:
 * - Entering event code on /guests/entry
 * - Choice between login and continue as guest
 * - Guest form completion on /guest
 * - Success confirmation and redirection
 *
 * Test Strategy:
 * - No auth fixtures needed (guest flow is unauthenticated)
 * - Mock API endpoints for event validation and guest check-in
 * - Use data-testid selectors for stability
 */

import {expect, test} from '@playwright/test'
import {TEST_CODES} from '../factories/events.factory'

/**
 * Helper to mock event code validation API
 */
async function mockEventCodeValidation(
	page: import('@playwright/test').Page,
	success: boolean,
	eventName = 'Test Event'
) {
	await page.route('**/api/guests/validateCode', route => {
		if (success) {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					eventId: 'event-123',
					eventName
				})
			})
		} else {
			route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					error: 'Invalid event code'
				})
			})
		}
	})
}

/**
 * Helper to mock guest check-in API
 */
async function mockGuestCheckIn(page: import('@playwright/test').Page, success: boolean) {
	await page.route('**/api/users/eventCode', route => {
		if (success) {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					message: 'Successfully checked in as guest!'
				})
			})
		} else {
			route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					error: 'Failed to check in'
				})
			})
		}
	})
}

/**
 * Helper to mock events list API
 */
async function mockEventsApi(page: import('@playwright/test').Page) {
	await page.route('**/api/events', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({success: true, events: []})
		})
	})
}

/**
 * Helper to mock consent form template API
 */
async function mockConsentFormApi(page: import('@playwright/test').Page) {
	await page.route('**/api/forms/consent', route => {
		if (route.request().method() === 'GET') {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					template: {
						id: 'consent-1',
						name: 'Standard Consent Form',
						questions: [
							{id: 'q1', text: 'I understand the terms of participation', type: 'checkbox'}
						]
					}
				})
			})
		} else {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true})
			})
		}
	})
}

test.describe('Guest Check-in Flow', () => {
	test.describe('AC2: Guest Check-in Flow', () => {
		test('should display event code entry form on /guests/entry', async ({page}) => {
			// GIVEN: Guest navigates to guest entry page
			// WHEN: Page loads
			await page.goto('/guests/entry')

			// THEN: Event code input should be visible
			await expect(page.getByTestId('guest-entry-code-input')).toBeVisible()
			await expect(page.getByTestId('guest-entry-continue-button')).toBeVisible()
		})

		test('should validate event code and show choice screen', async ({page}) => {
			// GIVEN: Mock valid event code
			await mockEventCodeValidation(page, true)

			await page.goto('/guests/entry')

			// WHEN: Guest enters valid event code
			await page.getByTestId('guest-entry-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('guest-entry-continue-button').click()

			// THEN: Should show choice screen
			await expect(page.getByTestId('guest-choice-screen')).toBeVisible()
			await expect(page.getByTestId('guest-code-valid-alert')).toBeVisible()
			await expect(page.getByTestId('guest-login-button')).toBeVisible()
			await expect(page.getByTestId('guest-continue-as-guest-button')).toBeVisible()
		})

		test('should navigate to /guest when choosing continue as guest', async ({page}) => {
			// GIVEN: Mock APIs
			await mockEventCodeValidation(page, true)
			await mockEventsApi(page)
			await mockConsentFormApi(page)

			await page.goto('/guests/entry')

			// Enter valid code
			await page.getByTestId('guest-entry-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('guest-entry-continue-button').click()

			// Wait for choice screen
			await expect(page.getByTestId('guest-choice-screen')).toBeVisible()

			// WHEN: Guest clicks continue as guest
			await page.getByTestId('guest-continue-as-guest-button').click()

			// THEN: Should navigate to /guest
			await expect(page).toHaveURL('/guest')
		})

		test('should navigate to /authentication when choosing login', async ({page}) => {
			// GIVEN: Mock valid event code
			await mockEventCodeValidation(page, true)

			await page.goto('/guests/entry')

			// Enter valid code
			await page.getByTestId('guest-entry-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('guest-entry-continue-button').click()

			// Wait for choice screen
			await expect(page.getByTestId('guest-choice-screen')).toBeVisible()

			// WHEN: Guest clicks login
			await page.getByTestId('guest-login-button').click()

			// THEN: Should navigate to authentication
			await expect(page).toHaveURL('/authentication')
		})

		test('should display guest check-in form on /guest', async ({page}) => {
			// GIVEN: Mock APIs
			await mockEventsApi(page)
			await mockConsentFormApi(page)

			// WHEN: Guest navigates directly to /guest
			await page.goto('/guest')

			// THEN: Event code input should be visible
			await expect(page.getByTestId('guest-event-code-input')).toBeVisible()
			await expect(page.getByTestId('guest-check-in-submit')).toBeVisible()
		})

		test('should show success confirmation after guest check-in', async ({page}) => {
			// GIVEN: Mock APIs
			await mockEventsApi(page)
			await mockConsentFormApi(page)
			await mockGuestCheckIn(page, true)

			await page.goto('/guest')

			// WHEN: Guest enters code and submits
			await page.getByTestId('guest-event-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('guest-check-in-submit').click()

			// THEN: Should show success confirmation
			await expect(page.getByTestId('guest-check-in-success')).toBeVisible()
		})
	})

	test.describe('AC6: Error Handling Paths', () => {
		test('should show error for invalid event code on entry page', async ({page}) => {
			// GIVEN: Mock invalid event code
			await mockEventCodeValidation(page, false)

			await page.goto('/guests/entry')

			// WHEN: Guest enters invalid code
			await page.getByTestId('guest-entry-code-input').fill(TEST_CODES.INVALID)
			await page.getByTestId('guest-entry-continue-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('guest-entry-error')).toBeVisible()
			await expect(page.getByTestId('guest-entry-error')).toContainText('Invalid event code')
		})

		test('should show error for invalid event code on guest page', async ({page}) => {
			// GIVEN: Mock APIs
			await mockEventsApi(page)
			await mockConsentFormApi(page)
			await mockGuestCheckIn(page, false)

			await page.goto('/guest')

			// WHEN: Guest enters invalid code
			await page.getByTestId('guest-event-code-input').fill(TEST_CODES.INVALID)
			await page.getByTestId('guest-check-in-submit').click()

			// THEN: Should show error message
			await expect(page.getByTestId('guest-check-in-error')).toBeVisible()
		})

		test('should handle network failure gracefully on entry page', async ({page}) => {
			// GIVEN: Mock network failure
			await page.route('**/api/guests/validateCode', route => {
				route.abort('failed')
			})

			await page.goto('/guests/entry')

			// WHEN: Guest tries to validate code with network failure
			await page.getByTestId('guest-entry-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('guest-entry-continue-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('guest-entry-error')).toBeVisible()
		})

		test('should allow retry after error on entry page', async ({page}) => {
			// GIVEN: First attempt fails, second succeeds
			let attemptCount = 0
			await page.route('**/api/guests/validateCode', route => {
				attemptCount++
				if (attemptCount === 1) {
					route.fulfill({
						status: 400,
						contentType: 'application/json',
						body: JSON.stringify({success: false, error: 'Invalid code'})
					})
				} else {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({success: true, eventId: 'event-123', eventName: 'Test'})
					})
				}
			})

			await page.goto('/guests/entry')

			// First attempt - should fail
			await page.getByTestId('guest-entry-code-input').fill(TEST_CODES.INVALID)
			await page.getByTestId('guest-entry-continue-button').click()
			await expect(page.getByTestId('guest-entry-error')).toBeVisible()

			// WHEN: Guest tries again with valid code
			await page.getByTestId('guest-entry-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('guest-entry-continue-button').click()

			// THEN: Should show choice screen
			await expect(page.getByTestId('guest-choice-screen')).toBeVisible()
		})

		test('should handle expired session gracefully', async ({page}) => {
			// GIVEN: Mock session check that indicates no session
			await page.route('**/api/auth/sessionLogin', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({token: false})
				})
			})

			// Mock event validation
			await mockEventCodeValidation(page, true)

			await page.goto('/guests/entry')

			// WHEN: Guest enters valid code
			await page.getByTestId('guest-entry-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('guest-entry-continue-button').click()

			// THEN: Should show choice screen (not auto-redirect to profile)
			await expect(page.getByTestId('guest-choice-screen')).toBeVisible()
		})
	})

	test.describe('Event Code Storage', () => {
		test('should store event details in sessionStorage after validation', async ({page}) => {
			// GIVEN: Mock valid event code
			await mockEventCodeValidation(page, true, 'Community Yoga Session')

			await page.goto('/guests/entry')

			// WHEN: Guest enters valid code
			await page.getByTestId('guest-entry-code-input').fill(TEST_CODES.VALID)
			await page.getByTestId('guest-entry-continue-button').click()

			// Wait for choice screen
			await expect(page.getByTestId('guest-choice-screen')).toBeVisible()

			// THEN: Event details should be stored in sessionStorage
			const eventId = await page.evaluate(() => sessionStorage.getItem('guestEventId'))
			const eventName = await page.evaluate(() => sessionStorage.getItem('guestEventName'))
			const eventCode = await page.evaluate(() => sessionStorage.getItem('guestEventCode'))

			expect(eventId).toBe('event-123')
			expect(eventName).toBe('Community Yoga Session')
			expect(eventCode).toBe(TEST_CODES.VALID)
		})
	})
})
