/**
 * Consent Form E2E Tests
 *
 * Test Strategy:
 * - Use auth fixtures to simulate authenticated user state
 * - Mock Firebase Auth and session endpoints
 * - Test form validation and submission
 */

import {expect, test} from '@playwright/test'

/**
 * Helper to set up authenticated user state
 */
async function setupAuthenticatedUser(
	page: import('@playwright/test').Page,
	context: import('@playwright/test').BrowserContext,
	options: {hasConsent?: boolean; isAdmin?: boolean} = {}
) {
	const {hasConsent = false, isAdmin = false} = options

	// Mock the auth state check endpoint
	await page.route('**/api/auth/session', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				user: {
					uid: 'test-user-123',
					email: 'test@example.com',
					displayName: 'Test User'
				},
				claims: {
					signedConsentForm: hasConsent,
					admin: isAdmin
				}
			})
		})
	})

	// Set localStorage to indicate authenticated state
	await context.addInitScript(() => {
		window.localStorage.setItem('authState', 'authenticated')
	})
}

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
			context
		}) => {
			// GIVEN: User is authenticated but has not signed consent
			await setupAuthenticatedUser(page, context, {hasConsent: false})

			// WHEN: User navigates to consent page
			await page.goto('/consent')

			// THEN: Should display the consent form
			await expect(page.getByRole('checkbox')).toBeVisible()
			await expect(page.getByRole('button', {name: /i consent/i})).toBeVisible()
		})

		test('should redirect to dashboard if user already has consent', async ({page, context}) => {
			// GIVEN: User is authenticated and has already signed consent
			await setupAuthenticatedUser(page, context, {hasConsent: true})

			// WHEN: User navigates to consent page
			await page.goto('/consent')

			// THEN: Should redirect to dashboard
			await expect(page).toHaveURL(/dashboard/)
		})
	})

	test.describe('Consent Form Submission', () => {
		test('should have submit button disabled until checkbox is checked', async ({
			page,
			context
		}) => {
			// GIVEN: User is on consent form
			await setupAuthenticatedUser(page, context, {hasConsent: false})
			await page.goto('/consent')

			// THEN: Submit button should be disabled
			const submitButton = page.getByRole('button', {name: /i consent/i})
			await expect(submitButton).toBeDisabled()

			// WHEN: User checks the consent checkbox
			await page.getByRole('checkbox').check()

			// THEN: Submit button should be enabled
			await expect(submitButton).toBeEnabled()
		})

		test('should submit consent and redirect to dashboard', async ({page, context}) => {
			// GIVEN: User is on consent form
			await setupAuthenticatedUser(page, context, {hasConsent: false})

			// Mock the consent submission endpoint
			await page.route('**/api/consent', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true})
				})
			})

			await page.goto('/consent')

			// WHEN: User checks checkbox and submits
			await page.getByRole('checkbox').check()
			await page.getByRole('button', {name: /i consent/i}).click()

			// THEN: Should redirect to dashboard
			await expect(page).toHaveURL(/dashboard/, {timeout: 5000})
		})

		test('should show error message if consent submission fails', async ({page, context}) => {
			// GIVEN: User is on consent form
			await setupAuthenticatedUser(page, context, {hasConsent: false})

			// Mock the consent submission to fail
			await page.route('**/api/consent', route => {
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({error: 'Server error'})
				})
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
		test('should display consent text explaining the study', async ({page, context}) => {
			// GIVEN: User is on consent form
			await setupAuthenticatedUser(page, context, {hasConsent: false})
			await page.goto('/consent')

			// THEN: Should display consent information
			await expect(page.getByText(/consent|participate|research/i)).toBeVisible()
		})

		test('should have accessible checkbox with proper label', async ({page, context}) => {
			// GIVEN: User is on consent form
			await setupAuthenticatedUser(page, context, {hasConsent: false})
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
			context
		}) => {
			// GIVEN: User is authenticated but has not signed consent
			await setupAuthenticatedUser(page, context, {hasConsent: false})

			// WHEN: User tries to access dashboard
			await page.goto('/dashboard')

			// THEN: Should redirect to consent page
			await expect(page).toHaveURL(/consent/)
		})

		test('should allow dashboard access after consent is signed', async ({page, context}) => {
			// GIVEN: User is authenticated and has signed consent
			await setupAuthenticatedUser(page, context, {hasConsent: true})

			// WHEN: User navigates to dashboard
			await page.goto('/dashboard')

			// THEN: Should remain on dashboard
			await expect(page).toHaveURL(/dashboard/)
		})
	})
})
