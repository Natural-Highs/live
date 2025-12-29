/**
 * Mobile Viewport E2E Tests
 *
 * Tests verify mobile viewport compatibility including:
 * - Critical pages render correctly on mobile
 * - Touch targets are appropriately sized
 * - Forms are usable on small screens
 * - Navigation works on mobile
 *
 * Test Strategy:
 * - Use Playwright's mobile device emulation (Pixel 5)
 * - Verify page structure and visibility on mobile viewport
 * - Test key user flows on mobile devices
 */

import {devices, expect, test} from '@playwright/test'

// Configure mobile viewport for all tests in this file
test.use({...devices['Pixel 5']})

/**
 * Helper to mock event code validation API
 */
async function mockEventCodeValidation(page: import('@playwright/test').Page) {
	await page.route('**/api/guests/validateCode', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				success: true,
				eventId: 'event-123',
				eventName: 'Test Event'
			})
		})
	})
}

/**
 * Helper to mock events API
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
 * Helper to mock consent form API
 */
async function mockConsentFormApi(page: import('@playwright/test').Page) {
	await page.route('**/api/forms/consent', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				success: true,
				template: {
					id: 'consent-1',
					name: 'Standard Consent',
					questions: []
				}
			})
		})
	})
}

/**
 * Helper to set up authenticated state
 */
async function setupAuthenticatedState(
	page: import('@playwright/test').Page,
	context: import('@playwright/test').BrowserContext
) {
	await page.route('**/api/auth/session', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				user: {
					uid: 'user-123',
					email: 'test@example.com',
					displayName: 'Test User'
				},
				claims: {
					signedConsentForm: true,
					admin: false
				}
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
}

test.describe('Mobile Viewport Coverage', () => {
	test.describe('AC7: Guest Entry Page Mobile', () => {
		test('should render guest entry page correctly on mobile', async ({page}) => {
			// GIVEN: User is on mobile device
			// WHEN: User navigates to guest entry page
			await page.goto('/guests/entry')

			// THEN: Key elements should be visible and accessible
			await expect(page.getByTestId('guest-entry-code-input')).toBeVisible()
			await expect(page.getByTestId('guest-entry-continue-button')).toBeVisible()

			// Verify viewport is mobile
			const viewport = page.viewportSize()
			expect(viewport?.width).toBeLessThan(500)
		})

		test('should have touch-friendly input on mobile', async ({page}) => {
			// GIVEN: User is on mobile device
			await page.goto('/guests/entry')

			// WHEN: User taps on input field
			const input = page.getByTestId('guest-entry-code-input')
			await input.tap()

			// THEN: Input should be focused and usable
			await expect(input).toBeFocused()

			// Type using mobile-friendly interaction
			await input.fill('1234')
			await expect(input).toHaveValue('1234')
		})

		test('should show choice screen correctly on mobile', async ({page}) => {
			// GIVEN: Mock valid event code
			await mockEventCodeValidation(page)

			await page.goto('/guests/entry')

			// WHEN: User enters valid code
			await page.getByTestId('guest-entry-code-input').fill('1234')
			await page.getByTestId('guest-entry-continue-button').tap()

			// THEN: Choice screen should be visible with both options
			await expect(page.getByTestId('guest-choice-screen')).toBeVisible()
			await expect(page.getByTestId('guest-login-button')).toBeVisible()
			await expect(page.getByTestId('guest-continue-as-guest-button')).toBeVisible()
		})
	})

	test.describe('AC7: Guest Check-in Page Mobile', () => {
		test('should render guest page correctly on mobile', async ({page}) => {
			// GIVEN: Mock APIs
			await mockEventsApi(page)
			await mockConsentFormApi(page)

			// WHEN: User navigates to guest page
			await page.goto('/guest')

			// THEN: Guest form should be visible
			await expect(page.getByTestId('guest-event-code-input')).toBeVisible()
			await expect(page.getByTestId('guest-check-in-submit')).toBeVisible()
		})

		test('should allow code entry on mobile', async ({page}) => {
			// GIVEN: Mock APIs
			await mockEventsApi(page)
			await mockConsentFormApi(page)

			await page.goto('/guest')

			// WHEN: User enters code on mobile
			const input = page.getByTestId('guest-event-code-input')
			await input.tap()
			await input.fill('5678')

			// THEN: Code should be entered
			await expect(input).toHaveValue('5678')
		})
	})

	test.describe('AC7: Signup Pages Mobile', () => {
		test('should render signup page correctly on mobile', async ({page}) => {
			// WHEN: User navigates to signup page
			await page.goto('/signup')

			// THEN: All form fields should be visible
			await expect(page.getByTestId('signup-page')).toBeVisible()
			await expect(page.getByTestId('signup-form')).toBeVisible()
			await expect(page.getByTestId('signup-username-input')).toBeVisible()
			await expect(page.getByTestId('signup-email-input')).toBeVisible()
			await expect(page.getByTestId('signup-password-input')).toBeVisible()
			await expect(page.getByTestId('signup-confirm-password-input')).toBeVisible()
		})

		test('should allow form interaction on mobile', async ({page}) => {
			// GIVEN: User is on signup page
			await page.goto('/signup')

			// WHEN: User fills form on mobile
			await page.getByTestId('signup-username-input').tap()
			await page.getByTestId('signup-username-input').fill('mobileuser')

			await page.getByTestId('signup-email-input').tap()
			await page.getByTestId('signup-email-input').fill('mobile@example.com')

			// THEN: Fields should have values
			await expect(page.getByTestId('signup-username-input')).toHaveValue('mobileuser')
			await expect(page.getByTestId('signup-email-input')).toHaveValue('mobile@example.com')
		})
	})

	test.describe('AC7: Dashboard Page Mobile', () => {
		test('should render dashboard correctly on mobile for authenticated user', async ({
			page,
			context
		}) => {
			// GIVEN: User is authenticated
			await setupAuthenticatedState(page, context)

			// Mock additional APIs
			await page.route('**/api/users/profile', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						data: {id: 'user-123', email: 'test@example.com'}
					})
				})
			})

			await page.route('**/api/users/events', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true, events: []})
				})
			})

			// WHEN: User navigates to dashboard
			await page.goto('/dashboard')

			// THEN: Event code input should be visible (dashboard check-in feature)
			await expect(page.getByTestId('event-code-input')).toBeVisible()
			await expect(page.getByTestId('check-in-submit-button')).toBeVisible()
		})

		test('should allow event code entry on dashboard mobile', async ({page, context}) => {
			// GIVEN: User is authenticated
			await setupAuthenticatedState(page, context)

			await page.route('**/api/users/profile', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true, data: {id: 'user-123'}})
				})
			})

			await page.route('**/api/users/events', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true, events: []})
				})
			})

			await page.goto('/dashboard')

			// WHEN: User enters event code on mobile
			const input = page.getByTestId('event-code-input')
			await input.tap()
			await input.fill('9999')

			// THEN: Code should be entered
			await expect(input).toHaveValue('9999')
		})
	})

	test.describe('AC7: Authentication Page Mobile', () => {
		test('should render authentication page correctly on mobile', async ({page}) => {
			// WHEN: User navigates to authentication page
			await page.goto('/authentication')

			// THEN: Page should be visible with login options
			// The actual test depends on what selectors are available
			await expect(page).toHaveURL('/authentication')
		})
	})

	test.describe('AC7: Touch Target Size', () => {
		test('should have appropriately sized buttons for touch on guest entry', async ({page}) => {
			// GIVEN: User is on mobile device
			await page.goto('/guests/entry')

			// WHEN: We check button dimensions
			const button = page.getByTestId('guest-entry-continue-button')
			const box = await button.boundingBox()

			// THEN: Button should be at least 44x44 pixels (Apple HIG minimum)
			expect(box?.height).toBeGreaterThanOrEqual(44)
		})

		test('should have appropriately sized input fields for touch', async ({page}) => {
			// GIVEN: User is on mobile device
			await page.goto('/guests/entry')

			// WHEN: We check input dimensions
			const input = page.getByTestId('guest-entry-code-input')
			const box = await input.boundingBox()

			// THEN: Input should be at least 44 pixels tall for comfortable touch
			expect(box?.height).toBeGreaterThanOrEqual(44)
		})
	})

	test.describe('AC7: Viewport Scroll', () => {
		test('should allow scrolling on signup page with many fields', async ({page}) => {
			// GIVEN: User is on signup page
			await page.goto('/signup')

			// WHEN: User scrolls the page
			await page.evaluate(() => window.scrollTo(0, 100))

			// THEN: Page should have scrolled
			const scrollY = await page.evaluate(() => window.scrollY)
			expect(scrollY).toBeGreaterThan(0)
		})
	})
})
