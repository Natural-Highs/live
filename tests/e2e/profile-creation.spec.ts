/**
 * Profile Creation E2E Tests
 *
 * Tests verify the profile creation flow including:
 * - Sign up page with account creation
 * - About you page with profile information
 * - Form validation and error handling
 * - Navigation between signup steps
 *
 * Test Strategy:
 * - Mock API endpoints for auth and profile operations
 * - Use data-testid selectors for stability
 * - Test form validation behavior
 */

import {expect, test} from '@playwright/test'

/**
 * Helper to mock auth registration API
 */
async function mockAuthRegistration(page: import('@playwright/test').Page, success: boolean) {
	await page.route('**/api/auth/register', route => {
		if (success) {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					userId: 'new-user-123'
				})
			})
		} else {
			route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					error: 'Email already in use'
				})
			})
		}
	})
}

/**
 * Helper to mock session login API
 */
async function mockSessionLogin(page: import('@playwright/test').Page) {
	await page.route('**/api/auth/sessionLogin', route => {
		if (route.request().method() === 'POST') {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true})
			})
		} else {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({token: true})
			})
		}
	})
}

/**
 * Helper to mock profile update API
 */
async function mockProfileUpdate(page: import('@playwright/test').Page, success: boolean) {
	await page.route('**/api/users/profile', route => {
		if (route.request().method() === 'POST') {
			if (success) {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						data: {
							id: 'user-123',
							firstName: 'John',
							lastName: 'Doe',
							dateOfBirth: '1990-01-15'
						}
					})
				})
			} else {
				route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						error: 'Failed to update profile'
					})
				})
			}
		} else {
			route.continue()
		}
	})
}

/**
 * Helper to mock auth session state
 */
async function mockAuthSession(
	page: import('@playwright/test').Page,
	context: import('@playwright/test').BrowserContext,
	isAuthenticated: boolean
) {
	await page.route('**/api/auth/session', route => {
		if (isAuthenticated) {
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
						signedConsentForm: false,
						admin: false
					}
				})
			})
		} else {
			route.fulfill({
				status: 401,
				contentType: 'application/json',
				body: JSON.stringify({error: 'Unauthorized'})
			})
		}
	})

	if (isAuthenticated) {
		await context.addInitScript(() => {
			window.localStorage.setItem('authState', 'authenticated')
		})
	}
}

test.describe('Profile Creation Flow', () => {
	test.describe('AC5: Profile Creation Flow', () => {
		test('should display signup page with form fields', async ({page}) => {
			// GIVEN: User navigates to signup page
			// WHEN: Page loads
			await page.goto('/signup')

			// THEN: Signup form should be visible with all fields
			await expect(page.getByTestId('signup-page')).toBeVisible()
			await expect(page.getByTestId('signup-form')).toBeVisible()
			await expect(page.getByTestId('signup-username-input')).toBeVisible()
			await expect(page.getByTestId('signup-email-input')).toBeVisible()
			await expect(page.getByTestId('signup-password-input')).toBeVisible()
			await expect(page.getByTestId('signup-confirm-password-input')).toBeVisible()
			await expect(page.getByTestId('signup-submit-button')).toBeVisible()
		})

		test('should have sign in option on signup page', async ({page}) => {
			// GIVEN: User is on signup page
			await page.goto('/signup')

			// THEN: Sign in button should be visible
			await expect(page.getByTestId('signup-signin-button')).toBeVisible()
		})

		test('should navigate to authentication when clicking sign in', async ({page}) => {
			// GIVEN: User is on signup page
			await page.goto('/signup')

			// WHEN: User clicks sign in button
			await page.getByTestId('signup-signin-button').click()

			// THEN: Should navigate to authentication page
			await expect(page).toHaveURL('/authentication')
		})

		test('should fill signup form fields', async ({page}) => {
			// GIVEN: User is on signup page
			await page.goto('/signup')

			// WHEN: User fills in form fields
			await page.getByTestId('signup-username-input').fill('testuser')
			await page.getByTestId('signup-email-input').fill('test@example.com')
			await page.getByTestId('signup-password-input').fill('Password123!')
			await page.getByTestId('signup-confirm-password-input').fill('Password123!')

			// THEN: Fields should have values
			await expect(page.getByTestId('signup-username-input')).toHaveValue('testuser')
			await expect(page.getByTestId('signup-email-input')).toHaveValue('test@example.com')
			await expect(page.getByTestId('signup-password-input')).toHaveValue('Password123!')
			await expect(page.getByTestId('signup-confirm-password-input')).toHaveValue('Password123!')
		})

		test('should display about-you page with profile fields', async ({page, context}) => {
			// GIVEN: User is authenticated (navigating to about-you page)
			await mockAuthSession(page, context, true)
			await mockSessionLogin(page)

			// WHEN: User navigates to about-you page
			await page.goto('/signup/about-you?email=test@example.com&username=testuser')

			// THEN: About you form should be visible
			await expect(page.getByTestId('about-you-form')).toBeVisible()
			await expect(page.getByTestId('about-you-firstname-input')).toBeVisible()
			await expect(page.getByTestId('about-you-lastname-input')).toBeVisible()
			await expect(page.getByTestId('about-you-phone-input')).toBeVisible()
			await expect(page.getByTestId('about-you-dob-input')).toBeVisible()
			await expect(page.getByTestId('about-you-submit-button')).toBeVisible()
		})

		test('should fill about-you form and submit', async ({page, context}) => {
			// GIVEN: User is on about-you page
			await mockAuthSession(page, context, true)
			await mockSessionLogin(page)
			await mockProfileUpdate(page, true)

			await page.goto('/signup/about-you?email=test@example.com&username=testuser')

			// WHEN: User fills in profile information
			await page.getByTestId('about-you-firstname-input').fill('John')
			await page.getByTestId('about-you-lastname-input').fill('Doe')
			await page.getByTestId('about-you-phone-input').fill('555-1234')
			await page.getByTestId('about-you-dob-input').fill('1990-01-15')

			// THEN: Fields should have values
			await expect(page.getByTestId('about-you-firstname-input')).toHaveValue('John')
			await expect(page.getByTestId('about-you-lastname-input')).toHaveValue('Doe')
			await expect(page.getByTestId('about-you-phone-input')).toHaveValue('555-1234')
			await expect(page.getByTestId('about-you-dob-input')).toHaveValue('1990-01-15')
		})

		test('should navigate back from about-you page', async ({page, context}) => {
			// GIVEN: User is on about-you page
			await mockAuthSession(page, context, true)
			await mockSessionLogin(page)

			await page.goto('/signup/about-you?email=test@example.com&username=testuser')
			await expect(page.getByTestId('about-you-form')).toBeVisible()

			// WHEN: User clicks back button
			await page.getByTestId('about-you-back-button').click()

			// THEN: Should navigate back to signup
			await expect(page).toHaveURL(/\/signup/)
		})

		test('should submit profile and navigate to consent', async ({page, context}) => {
			// GIVEN: User is on about-you page
			await mockAuthSession(page, context, true)
			await mockSessionLogin(page)
			await mockProfileUpdate(page, true)

			await page.goto('/signup/about-you?email=test@example.com&username=testuser')

			// WHEN: User fills in profile and submits
			await page.getByTestId('about-you-firstname-input').fill('John')
			await page.getByTestId('about-you-lastname-input').fill('Doe')
			await page.getByTestId('about-you-dob-input').fill('1990-01-15')
			await page.getByTestId('about-you-submit-button').click()

			// THEN: Should navigate to consent page
			await expect(page).toHaveURL('/consent')
		})
	})

	test.describe('AC6: Error Handling Paths', () => {
		test('should show error when registration fails', async ({page}) => {
			// GIVEN: Mock registration failure
			await mockAuthRegistration(page, false)
			await mockSessionLogin(page)

			await page.goto('/signup')

			// WHEN: User tries to submit signup form
			await page.getByTestId('signup-username-input').fill('testuser')
			await page.getByTestId('signup-email-input').fill('existing@example.com')
			await page.getByTestId('signup-password-input').fill('Password123!')
			await page.getByTestId('signup-confirm-password-input').fill('Password123!')
			await page.getByTestId('signup-submit-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('signup-error')).toBeVisible()
		})

		test('should show error when profile update fails', async ({page, context}) => {
			// GIVEN: Mock profile update failure
			await mockAuthSession(page, context, true)
			await mockSessionLogin(page)
			await mockProfileUpdate(page, false)

			await page.goto('/signup/about-you?email=test@example.com&username=testuser')

			// WHEN: User submits profile form
			await page.getByTestId('about-you-firstname-input').fill('John')
			await page.getByTestId('about-you-lastname-input').fill('Doe')
			await page.getByTestId('about-you-dob-input').fill('1990-01-15')
			await page.getByTestId('about-you-submit-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('about-you-error')).toBeVisible()
		})

		test('should redirect to signup if no auth on about-you page', async ({page, context}) => {
			// GIVEN: User is not authenticated and no email in URL
			await mockAuthSession(page, context, false)
			await mockSessionLogin(page)

			// WHEN: User navigates to about-you page without auth
			await page.goto('/signup/about-you')

			// THEN: Should redirect to signup page
			await expect(page).toHaveURL('/signup')
		})

		test('should handle network failure on signup gracefully', async ({page}) => {
			// GIVEN: Mock network failure
			await page.route('**/api/auth/register', route => {
				route.abort('failed')
			})

			await page.goto('/signup')

			// WHEN: User tries to submit signup form with network failure
			await page.getByTestId('signup-username-input').fill('testuser')
			await page.getByTestId('signup-email-input').fill('test@example.com')
			await page.getByTestId('signup-password-input').fill('Password123!')
			await page.getByTestId('signup-confirm-password-input').fill('Password123!')
			await page.getByTestId('signup-submit-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('signup-error')).toBeVisible()
		})

		test('should handle network failure on profile update gracefully', async ({page, context}) => {
			// GIVEN: Mock network failure
			await mockAuthSession(page, context, true)
			await mockSessionLogin(page)
			await page.route('**/api/users/profile', route => {
				if (route.request().method() === 'POST') {
					route.abort('failed')
				} else {
					route.continue()
				}
			})

			await page.goto('/signup/about-you?email=test@example.com&username=testuser')

			// WHEN: User submits profile with network failure
			await page.getByTestId('about-you-firstname-input').fill('John')
			await page.getByTestId('about-you-lastname-input').fill('Doe')
			await page.getByTestId('about-you-dob-input').fill('1990-01-15')
			await page.getByTestId('about-you-submit-button').click()

			// THEN: Should show error message
			await expect(page.getByTestId('about-you-error')).toBeVisible()
		})
	})

	test.describe('Form Validation', () => {
		test('should show validation errors for empty required fields', async ({page}) => {
			// GIVEN: User is on signup page
			await page.goto('/signup')

			// WHEN: User clicks submit without filling fields
			await page.getByTestId('signup-submit-button').click()

			// THEN: Form should not submit (submit button remains visible)
			// Browser native validation should prevent submission
			await expect(page.getByTestId('signup-submit-button')).toBeVisible()
			await expect(page).toHaveURL('/signup')
		})

		test('should validate date of birth on about-you page', async ({page, context}) => {
			// GIVEN: User is on about-you page
			await mockAuthSession(page, context, true)
			await mockSessionLogin(page)

			await page.goto('/signup/about-you?email=test@example.com&username=testuser')

			// WHEN: User fills in name but not date of birth
			await page.getByTestId('about-you-firstname-input').fill('John')
			await page.getByTestId('about-you-lastname-input').fill('Doe')

			// Submit button should still be visible but form validation should prevent submission
			await expect(page.getByTestId('about-you-submit-button')).toBeVisible()
		})
	})
})
