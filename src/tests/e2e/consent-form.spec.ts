/**
 * Consent Form E2E Tests
 *
 * Test Strategy (Post Story 0-7):
 * - Use auth fixtures to simulate authenticated user state via session cookies
 * - Server functions hit Firestore emulator directly (no REST API mocks)
 * - Error simulation mocks target /_serverFn/* paths (acceptable per AC2)
 * - Test form validation and submission
 */

import {expect, test as base} from '../fixtures'
import {clearSessionCookie, injectSessionCookie, type TestUser} from '../fixtures/session.fixture'

// Test user data
const testUser: TestUser = {
	uid: 'consent-test-user-123',
	email: 'consent-test@example.com',
	displayName: 'Consent Test User'
}

// Extend test with auth helpers
const test = base.extend<{
	authenticatedWithoutConsent: TestUser
	authenticatedWithConsent: TestUser
}>({
	authenticatedWithoutConsent: async ({context}, use) => {
		// Inject session cookie WITHOUT consent signed
		// profileComplete: true so dashboard is accessible
		await injectSessionCookie(context, testUser, {
			signedConsentForm: false,
			profileComplete: true
		})
		await use(testUser)
		await clearSessionCookie(context)
	},
	authenticatedWithConsent: async ({context}, use) => {
		// Inject session cookie WITH consent signed
		await injectSessionCookie(context, testUser, {
			signedConsentForm: true,
			profileComplete: true
		})
		await use(testUser)
		await clearSessionCookie(context)
	}
})

test.describe('Consent Form Flow @smoke', () => {
	test.describe('Consent Form Access', () => {
		test('should redirect unauthenticated users to authentication page', async ({page}) => {
			// GIVEN: User is not authenticated
			// WHEN: User tries to access consent page
			await page.goto('/consent')

			// THEN: Should redirect to authentication
			await expect(page).toHaveURL(/authentication/)
		})

		test('should show consent form for authenticated users without consent', async ({
			page,
			authenticatedWithoutConsent: _
		}) => {
			// GIVEN: User is authenticated but has not signed consent

			// WHEN: User navigates to consent page
			await page.goto('/consent')

			// THEN: Should display the consent form
			await expect(page.getByRole('checkbox')).toBeVisible()
			await expect(page.getByRole('button', {name: /i consent/i})).toBeVisible()
		})

		test('should redirect to dashboard if user already has consent', async ({
			page,
			authenticatedWithConsent: _
		}) => {
			// GIVEN: User is authenticated and has already signed consent

			// WHEN: User navigates to consent page
			await page.goto('/consent')

			// THEN: Should redirect to dashboard
			await expect(page).toHaveURL(/dashboard/)
		})
	})

	test.describe('Consent Form Submission', () => {
		test('should have submit button disabled until checkbox is checked', async ({
			page,
			authenticatedWithoutConsent: _
		}) => {
			// GIVEN: User is on consent form
			await page.goto('/consent')

			// THEN: Submit button should be disabled
			const submitButton = page.getByRole('button', {name: /i consent/i})
			await expect(submitButton).toBeDisabled()

			// WHEN: User checks the consent checkbox
			await page.getByRole('checkbox').check()

			// THEN: Submit button should be enabled
			await expect(submitButton).toBeEnabled()
		})

		test('should submit consent and redirect to dashboard', async ({
			page,
			authenticatedWithoutConsent: _
		}) => {
			// GIVEN: User is on consent form
			// Server function hits emulator directly - no mock needed

			await page.goto('/consent')

			// WHEN: User checks checkbox and submits
			await page.getByRole('checkbox').check()
			await page.getByRole('button', {name: /i consent/i}).click()

			// THEN: Should redirect to dashboard
			await expect(page).toHaveURL(/dashboard/, {timeout: 5000})
		})

		test('should show error message if consent submission fails', async ({
			page,
			authenticatedWithoutConsent: _
		}) => {
			// GIVEN: User is on consent form
			// Mock server function to simulate error (acceptable per AC2)
			await page.route('**/_serverFn/*', route => {
				if (route.request().method() === 'POST') {
					route.fulfill({
						status: 500,
						contentType: 'application/json',
						body: JSON.stringify({error: 'Server error'})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/consent')

			// WHEN: User tries to submit consent
			await page.getByRole('checkbox').check()
			await page.getByRole('button', {name: /i consent/i}).click()

			// THEN: Should show error message
			await expect(page.getByText(/error|failed/i)).toBeVisible()
		})
	})

	test.describe('Consent Form Content', () => {
		test('should display consent text explaining the study', async ({
			page,
			authenticatedWithoutConsent: _
		}) => {
			// GIVEN: User is on consent form
			await page.goto('/consent')

			// THEN: Should display consent information
			await expect(page.getByText(/consent|participate|research/i)).toBeVisible()
		})

		test('should have accessible checkbox with proper label', async ({
			page,
			authenticatedWithoutConsent: _
		}) => {
			// GIVEN: User is on consent form
			await page.goto('/consent')

			// THEN: Checkbox should have accessible label
			const checkbox = page.getByRole('checkbox')
			await expect(checkbox).toBeVisible()

			// AND: Label should be associated with checkbox
			const label = page.getByText(/i have read and understand/i)
			await expect(label).toBeVisible()
		})
	})

	test.describe('Protected Route Access', () => {
		test('should redirect to consent from dashboard if consent not signed', async ({
			page,
			authenticatedWithoutConsent: _
		}) => {
			// GIVEN: User is authenticated but has not signed consent

			// WHEN: User tries to access dashboard
			await page.goto('/dashboard')

			// THEN: Should redirect to consent page
			await expect(page).toHaveURL(/consent/)
		})

		test('should allow dashboard access after consent is signed', async ({
			page,
			authenticatedWithConsent: _
		}) => {
			// GIVEN: User is authenticated and has signed consent

			// WHEN: User navigates to dashboard
			await page.goto('/dashboard')

			// THEN: Should remain on dashboard
			await expect(page).toHaveURL(/dashboard/)
		})
	})
})
