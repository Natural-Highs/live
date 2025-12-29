/**
 * Magic Link Authentication E2E Tests
 *
 * These tests verify the magic link authentication flow including:
 * - Requesting a magic link from the sign-in page
 * - Same-device sign-in (email stored in localStorage)
 * - Cross-device sign-in (email prompt)
 * - Error handling for expired/invalid links
 * - UI integration with existing auth options
 *
 * Test Strategy:
 * - Mock Firebase Auth calls using route interception (network-first)
 * - Simulate localStorage for same-device vs cross-device scenarios
 * - Use data-testid selectors for stability
 *
 * RED PHASE: Tests are designed to fail due to missing data-testid attributes
 */

import {expect, test} from '@playwright/test'

/**
 * Helper to build a mock Firebase magic link URL
 * Simulates the URL structure Firebase uses for email sign-in links
 */
function buildMagicLinkUrl(_email: string, valid = true): string {
	const baseUrl = 'http://localhost:3000/magic-link'
	const mode = 'signIn'
	const oobCode = valid ? 'valid-oob-code-123' : 'invalid-oob-code'
	const apiKey = 'test-api-key'
	const continueUrl = encodeURIComponent('http://localhost:3000/magic-link')

	return `${baseUrl}?mode=${mode}&oobCode=${oobCode}&apiKey=${apiKey}&continueUrl=${continueUrl}`
}

test.describe('Magic Link Authentication', () => {
	test.describe('Scenario 1: Request magic link from sign-in page', () => {
		test('should display magic link form as primary sign-in option', async ({page}) => {
			// GIVEN: User navigates to authentication page
			await page.goto('/authentication')

			// THEN: Magic link form should be visible as the first option
			await expect(page.getByTestId('magic-link-form')).toBeVisible()

			// AND: Email input field should be present
			await expect(page.getByTestId('magic-link-email-input')).toBeVisible()

			// AND: Send Magic Link button should be present
			await expect(page.getByTestId('send-magic-link-button')).toBeVisible()
		})

		test('should show confirmation message after submitting email', async ({page}) => {
			// GIVEN: User is on authentication page
			await page.goto('/authentication')

			// WHEN: User enters valid email and clicks Send Magic Link
			await page.getByTestId('magic-link-email-input').fill('maya@example.com')
			await page.getByTestId('send-magic-link-button').click()

			// THEN: Should show confirmation message
			await expect(page.getByTestId('magic-link-sent-confirmation')).toBeVisible()

			// AND: Confirmation should display "Check your email"
			await expect(page.getByText('Check your email', {exact: false})).toBeVisible()
		})

		test('should store email in localStorage for same-device handling', async ({page}) => {
			// GIVEN: User is on authentication page
			await page.goto('/authentication')

			// WHEN: User enters email and submits magic link request
			const testEmail = 'maya@example.com'
			await page.getByTestId('magic-link-email-input').fill(testEmail)
			await page.getByTestId('send-magic-link-button').click()

			// Wait for confirmation to appear
			await expect(page.getByTestId('magic-link-sent-confirmation')).toBeVisible()

			// THEN: Email should be stored in localStorage
			const storedEmail = await page.evaluate(() => window.localStorage.getItem('emailForSignIn'))
			expect(storedEmail).toBe(testEmail)
		})

		test('should show validation error for invalid email format', async ({page}) => {
			// GIVEN: User is on authentication page
			await page.goto('/authentication')

			// WHEN: User enters invalid email format
			await page.getByTestId('magic-link-email-input').fill('invalid-email')
			await page.getByTestId('magic-link-email-input').blur()

			// THEN: Should show validation error
			await expect(page.getByTestId('magic-link-email-error')).toBeVisible()
		})
	})

	test.describe('Scenario 2: Complete sign-in on same device', () => {
		test('should auto-sign-in when email is in localStorage', async ({page, context}) => {
			// GIVEN: User requested magic link and email is stored in localStorage
			const testEmail = 'maya@example.com'

			// Set up localStorage before navigation
			await context.addInitScript(email => {
				window.localStorage.setItem('emailForSignIn', email)
			}, testEmail)

			// AND: Mock Firebase signInWithEmailLink to succeed
			await page.route('**/identitytoolkit.googleapis.com/**', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						idToken: 'mock-id-token',
						refreshToken: 'mock-refresh-token',
						email: testEmail,
						localId: 'test-uid-123',
						displayName: 'Maya'
					})
				})
			})

			// AND: Mock session login endpoint
			await page.route('**/api/auth/sessionLogin', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true})
				})
			})

			// WHEN: User clicks magic link (navigates to /magic-link with valid params)
			await page.goto(buildMagicLinkUrl(testEmail))

			// THEN: Should show success state with welcome message
			await expect(page.getByTestId('magic-link-success')).toBeVisible()

			// AND: Should show "Welcome back, Maya"
			await expect(page.getByText('Welcome back', {exact: false})).toBeVisible()
		})

		test('should clear email from localStorage after successful sign-in', async ({
			page,
			context
		}) => {
			// GIVEN: Email is stored in localStorage
			const testEmail = 'maya@example.com'
			await context.addInitScript(email => {
				window.localStorage.setItem('emailForSignIn', email)
			}, testEmail)

			// Mock successful authentication
			await page.route('**/identitytoolkit.googleapis.com/**', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						idToken: 'mock-id-token',
						email: testEmail,
						localId: 'test-uid-123'
					})
				})
			})

			await page.route('**/api/auth/sessionLogin', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true})
				})
			})

			// WHEN: User completes magic link sign-in
			await page.goto(buildMagicLinkUrl(testEmail))
			await expect(page.getByTestId('magic-link-success')).toBeVisible()

			// THEN: Email should be cleared from localStorage
			const storedEmail = await page.evaluate(() => window.localStorage.getItem('emailForSignIn'))
			expect(storedEmail).toBeNull()
		})

		test('should redirect to dashboard after successful sign-in', async ({page, context}) => {
			// GIVEN: Same-device magic link flow
			const testEmail = 'maya@example.com'
			await context.addInitScript(email => {
				window.localStorage.setItem('emailForSignIn', email)
			}, testEmail)

			await page.route('**/identitytoolkit.googleapis.com/**', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						idToken: 'mock-id-token',
						email: testEmail,
						localId: 'test-uid-123'
					})
				})
			})

			await page.route('**/api/auth/sessionLogin', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true})
				})
			})

			// WHEN: User completes sign-in
			await page.goto(buildMagicLinkUrl(testEmail))

			// THEN: Should redirect to dashboard
			await page.waitForURL('**/dashboard', {timeout: 5000})
			expect(page.url()).toContain('/dashboard')
		})
	})

	test.describe('Scenario 3: Complete sign-in on different device', () => {
		test('should prompt for email when localStorage is empty', async ({page}) => {
			// GIVEN: User clicks magic link on a different device (no localStorage)
			// Note: Not setting localStorage to simulate different device

			// WHEN: User navigates to magic link URL
			await page.goto(buildMagicLinkUrl('maya@example.com'))

			// THEN: Should show cross-device email prompt
			await expect(page.getByTestId('cross-device-email-prompt')).toBeVisible()

			// AND: Email input should be present for confirmation
			await expect(page.getByTestId('cross-device-email-input')).toBeVisible()
		})

		test('should complete sign-in after email confirmation', async ({page}) => {
			// GIVEN: User is on different device (no localStorage)
			const testEmail = 'maya@example.com'

			// Mock successful authentication
			await page.route('**/identitytoolkit.googleapis.com/**', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						idToken: 'mock-id-token',
						email: testEmail,
						localId: 'test-uid-123',
						displayName: 'Maya'
					})
				})
			})

			await page.route('**/api/auth/sessionLogin', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({success: true})
				})
			})

			// Navigate to magic link page
			await page.goto(buildMagicLinkUrl(testEmail))

			// WHEN: User enters email for confirmation
			await page.getByTestId('cross-device-email-input').fill(testEmail)
			await page.getByTestId('cross-device-continue-button').click()

			// THEN: Should show success and redirect
			await expect(page.getByTestId('magic-link-success')).toBeVisible()
		})
	})

	test.describe('Scenario 4: Invalid or expired magic link', () => {
		test('should show error for expired magic link', async ({page}) => {
			// GIVEN: User has an expired magic link
			// Mock Firebase to return expired code error
			await page.route('**/identitytoolkit.googleapis.com/**', route => {
				route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({
						error: {
							code: 400,
							message: 'EXPIRED_OOB_CODE'
						}
					})
				})
			})

			// WHEN: User clicks the expired magic link
			await page.goto(buildMagicLinkUrl('maya@example.com', false))

			// THEN: Should show error message about expired link
			await expect(page.getByTestId('magic-link-error')).toBeVisible()

			await expect(page.getByText('expired', {exact: false})).toBeVisible()
		})

		test('should show error for invalid magic link', async ({page}) => {
			// GIVEN: User has an invalid magic link
			await page.route('**/identitytoolkit.googleapis.com/**', route => {
				route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({
						error: {
							code: 400,
							message: 'INVALID_OOB_CODE'
						}
					})
				})
			})

			// WHEN: User clicks the invalid link
			await page.goto(buildMagicLinkUrl('maya@example.com', false))

			// THEN: Should show error message
			await expect(page.getByTestId('magic-link-error')).toBeVisible()
		})

		test('should show button to request new link on error', async ({page}) => {
			// GIVEN: User has an invalid magic link
			await page.route('**/identitytoolkit.googleapis.com/**', route => {
				route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({
						error: {code: 400, message: 'INVALID_OOB_CODE'}
					})
				})
			})

			// WHEN: User sees error state
			await page.goto(buildMagicLinkUrl('maya@example.com', false))

			// THEN: Should show "Request a new link" button
			await expect(page.getByTestId('request-new-link-button')).toBeVisible()
		})

		test('should navigate to auth page when requesting new link', async ({page}) => {
			// GIVEN: User is on error page with option to request new link
			await page.route('**/identitytoolkit.googleapis.com/**', route => {
				route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({
						error: {code: 400, message: 'INVALID_OOB_CODE'}
					})
				})
			})

			await page.goto(buildMagicLinkUrl('maya@example.com', false))

			// WHEN: User clicks request new link button
			await page.getByTestId('request-new-link-button').click()

			// THEN: Should navigate to authentication page
			await expect(page).toHaveURL('/authentication')
		})
	})

	test.describe('Scenario 5: Non-existent account handling', () => {
		test('should show generic confirmation to prevent user enumeration', async ({page}) => {
			// GIVEN: User enters email that has no account
			await page.goto('/authentication')

			// Mock Firebase to simulate non-existent user
			// Note: The app should still show success to prevent enumeration
			await page.route('**/identitytoolkit.googleapis.com/**', route => {
				// Firebase may succeed or fail for non-existent users
				// App should handle both cases gracefully
				route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({
						error: {code: 400, message: 'EMAIL_NOT_FOUND'}
					})
				})
			})

			// WHEN: User submits email for non-existent account
			await page.getByTestId('magic-link-email-input').fill('newuser@example.com')
			await page.getByTestId('send-magic-link-button').click()

			// THEN: Should still show confirmation (to prevent enumeration)
			// The message should be generic like "If an account exists..."
			await expect(page.getByTestId('magic-link-sent-confirmation')).toBeVisible()
		})
	})

	test.describe('Scenario 6: UI integration with existing auth options', () => {
		test('should show three sign-in options in correct order', async ({page}) => {
			// GIVEN: User is on authentication page
			await page.goto('/authentication')

			// THEN: Should show Magic Link as first option
			await expect(page.getByTestId('magic-link-form')).toBeVisible()

			// AND: Should show Password option as second
			await expect(page.getByRole('button', {name: /sign in with password/i})).toBeVisible()

			// AND: Should show Guest option as third
			await expect(page.getByRole('button', {name: /continue as guest/i})).toBeVisible()
		})

		test('should switch to password view when clicking password option', async ({page}) => {
			// GIVEN: User is on authentication page with magic link form
			await page.goto('/authentication')

			// WHEN: User clicks "Sign in with Password"
			await page.getByRole('button', {name: /sign in with password/i}).click()

			// THEN: Should show password form
			await expect(page.getByTestId('password-login-form')).toBeVisible()

			// AND: Magic link form should be hidden
			await expect(page.getByTestId('magic-link-form')).not.toBeVisible()
		})

		test('should switch back to magic link from password view', async ({page}) => {
			// GIVEN: User is on password sign-in view
			await page.goto('/authentication')
			await page.getByRole('button', {name: /sign in with password/i}).click()

			// WHEN: User clicks "Sign in with Magic Link"
			await page.getByRole('button', {name: /sign in with magic link/i}).click()

			// THEN: Should show magic link form again
			await expect(page.getByTestId('magic-link-form')).toBeVisible()
		})

		test('should navigate to guest flow when clicking guest option', async ({page}) => {
			// GIVEN: User is on authentication page
			await page.goto('/authentication')

			// WHEN: User clicks "Continue as Guest"
			await page.getByRole('button', {name: /continue as guest/i}).click()

			// THEN: Should navigate to guest page
			await expect(page).toHaveURL('/guest')
		})
	})

	test.describe('Resend functionality', () => {
		test('should allow resending magic link', async ({page}) => {
			// GIVEN: User has submitted email and sees confirmation
			await page.goto('/authentication')
			await page.getByTestId('magic-link-email-input').fill('maya@example.com')
			await page.getByTestId('send-magic-link-button').click()

			// Wait for confirmation
			await expect(page.getByTestId('magic-link-sent-confirmation')).toBeVisible()

			// WHEN: User clicks resend link
			await page.getByTestId('resend-magic-link-button').click()

			// THEN: Should show resend success message
			await expect(page.getByText('Link resent', {exact: false})).toBeVisible()
		})

		test('should limit resend attempts to 3', async ({page}) => {
			// GIVEN: User has sent initial magic link
			await page.goto('/authentication')
			await page.getByTestId('magic-link-email-input').fill('maya@example.com')
			await page.getByTestId('send-magic-link-button').click()
			await expect(page.getByTestId('magic-link-sent-confirmation')).toBeVisible()

			// WHEN: User resends 3 times
			for (let i = 0; i < 3; i++) {
				await page.getByTestId('resend-magic-link-button').click()
				// Wait for button state to update after each click
				await expect(page.getByTestId('resend-magic-link-button')).toBeVisible()
			}

			// THEN: Resend button should be disabled
			await expect(page.getByTestId('resend-magic-link-button')).toBeDisabled()
		})
	})
})
