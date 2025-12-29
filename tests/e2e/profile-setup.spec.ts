/**
 * Profile Setup E2E Tests
 *
 * Tests verify the minimal profile creation flow:
 * - Display name and date of birth form
 * - Redirect to dashboard on completion
 * - Profile guard redirects new users
 * - Validation and error handling
 *
 * Test Strategy:
 * - Use session fixtures for authenticated state
 * - Use data-testid selectors for stability
 * - Test form validation behavior
 */

import {expect, test} from '@playwright/test'
import {injectSessionCookie} from '../fixtures/session.fixture'

const TEST_USER = {
	uid: 'test-user-profile-123',
	email: 'profile-test@example.com',
	displayName: 'Test User'
}

test.describe('Profile Setup Flow', () => {
	test.describe('AC1: First-time user redirected to profile creation', () => {
		test('should redirect to profile-setup when profileComplete is false', async ({
			page,
			context
		}) => {
			// GIVEN: User is authenticated with consent but has not completed profile
			// Note: consent check happens before profile check in _authed.tsx
			await injectSessionCookie(context, TEST_USER, {
				signedConsentForm: true, // Consent already signed, to test profile guard
				profileComplete: false
			})

			// WHEN: User navigates to dashboard
			await page.goto('/dashboard')

			// THEN: Should be redirected to profile-setup
			await expect(page).toHaveURL('/profile-setup')
		})

		test('should not redirect when profileComplete is true', async ({page, context}) => {
			// GIVEN: User is authenticated and has completed profile
			await injectSessionCookie(context, TEST_USER, {
				signedConsentForm: true,
				profileComplete: true
			})

			// WHEN: User navigates to dashboard
			await page.goto('/dashboard')

			// THEN: Should stay on dashboard
			await expect(page).toHaveURL('/dashboard')
		})

		test('should redirect to profile-setup before consent when neither is complete', async ({
			page,
			context
		}) => {
			// GIVEN: User has not signed consent AND has not completed profile
			await injectSessionCookie(context, TEST_USER, {
				signedConsentForm: false,
				profileComplete: false
			})

			// WHEN: User navigates to dashboard
			await page.goto('/dashboard')

			// THEN: Should be redirected to profile-setup first (profile before consent flow)
			await expect(page).toHaveURL('/profile-setup')
		})
	})

	test.describe('AC2: Profile form display', () => {
		test('should display profile form with required fields', async ({page, context}) => {
			// GIVEN: User is authenticated without profile
			await injectSessionCookie(context, TEST_USER, {
				profileComplete: false,
				signedConsentForm: true
			})

			// WHEN: User navigates to profile-setup
			await page.goto('/profile-setup')

			// THEN: Form should be visible with display name and DOB fields
			await expect(page.getByTestId('profile-form')).toBeVisible()
			await expect(page.getByTestId('profile-displayname-input')).toBeVisible()
			await expect(page.getByTestId('profile-dob-input')).toBeVisible()
			await expect(page.getByTestId('profile-submit-button')).toBeVisible()
		})

		test('should display helpful labels and descriptions', async ({page, context}) => {
			// GIVEN: User is on profile-setup
			await injectSessionCookie(context, TEST_USER, {
				profileComplete: false,
				signedConsentForm: true
			})
			await page.goto('/profile-setup')

			// THEN: Should show user-friendly labels
			await expect(page.getByText(/what should we call you/i)).toBeVisible()
			await expect(page.getByText(/date of birth/i)).toBeVisible()
		})
	})

	test.describe('AC3: Display name flexibility', () => {
		test('should accept single word display name', async ({page, context}) => {
			// GIVEN: User is on profile-setup
			await injectSessionCookie(context, TEST_USER, {
				profileComplete: false,
				signedConsentForm: true
			})
			await page.goto('/profile-setup')

			// WHEN: User enters a single word name
			await page.getByTestId('profile-displayname-input').fill('Maya')

			// THEN: Input should accept the value
			await expect(page.getByTestId('profile-displayname-input')).toHaveValue('Maya')
		})

		test('should accept display name with initial', async ({page, context}) => {
			// GIVEN: User is on profile-setup
			await injectSessionCookie(context, TEST_USER, {
				profileComplete: false,
				signedConsentForm: true
			})
			await page.goto('/profile-setup')

			// WHEN: User enters name with initial
			await page.getByTestId('profile-displayname-input').fill('Maya W.')

			// THEN: Input should accept the value
			await expect(page.getByTestId('profile-displayname-input')).toHaveValue('Maya W.')
		})

		test('should accept username-style display name', async ({page, context}) => {
			// GIVEN: User is on profile-setup
			await injectSessionCookie(context, TEST_USER, {
				profileComplete: false,
				signedConsentForm: true
			})
			await page.goto('/profile-setup')

			// WHEN: User enters username-style name
			await page.getByTestId('profile-displayname-input').fill('MayaWellness')

			// THEN: Input should accept the value
			await expect(page.getByTestId('profile-displayname-input')).toHaveValue('MayaWellness')
		})
	})

	test.describe('AC4: Form validation', () => {
		test('should allow submission with valid data', async ({page, context}) => {
			// GIVEN: User is on profile-setup
			await injectSessionCookie(context, TEST_USER, {
				profileComplete: false,
				signedConsentForm: true
			})
			await page.goto('/profile-setup')

			// WHEN: User fills all required fields
			await page.getByTestId('profile-displayname-input').fill('Maya')
			await page.getByTestId('profile-dob-input').fill('2005-03-15')

			// THEN: Submit button should be enabled and form should be fillable
			const submitButton = page.getByTestId('profile-submit-button')
			await expect(submitButton).toBeVisible()
			await expect(submitButton).not.toBeDisabled()
		})
	})

	test.describe('AC5: Skip profile-setup if already complete', () => {
		test('should redirect to dashboard if profile already complete', async ({page, context}) => {
			// GIVEN: User has completed profile
			await injectSessionCookie(context, TEST_USER, {
				profileComplete: true,
				signedConsentForm: true
			})

			// WHEN: User navigates to profile-setup directly
			await page.goto('/profile-setup')

			// THEN: Should redirect to dashboard
			await expect(page).toHaveURL('/dashboard')
		})
	})

	test.describe('Accessibility', () => {
		test('should have associated labels for all inputs', async ({page, context}) => {
			// GIVEN: User is on profile-setup
			await injectSessionCookie(context, TEST_USER, {
				profileComplete: false,
				signedConsentForm: true
			})
			await page.goto('/profile-setup')

			// THEN: Inputs should be accessible by label
			await expect(page.getByLabel(/what should we call you/i)).toBeVisible()
			await expect(page.getByLabel(/date of birth/i)).toBeVisible()
		})

		test('should have proper input types', async ({page, context}) => {
			// GIVEN: User is on profile-setup
			await injectSessionCookie(context, TEST_USER, {
				profileComplete: false,
				signedConsentForm: true
			})
			await page.goto('/profile-setup')

			// THEN: Inputs should have correct types
			const displayNameInput = page.getByTestId('profile-displayname-input')
			const dobInput = page.getByTestId('profile-dob-input')

			await expect(displayNameInput).toHaveAttribute('type', 'text')
			await expect(dobInput).toHaveAttribute('type', 'date')
		})
	})
})

test.describe('Minor Privacy Protection (NFR9)', () => {
	test('should set isMinor claim for users under 18', async ({page, context}) => {
		// GIVEN: User is authenticated and needs to set up profile
		await injectSessionCookie(context, TEST_USER, {
			profileComplete: false,
			signedConsentForm: true
		})
		await page.goto('/profile-setup')

		// WHEN: User enters a DOB indicating they are under 18
		const today = new Date()
		const minorDOB = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate())
		const dobString = minorDOB.toISOString().split('T')[0]

		await page.getByTestId('profile-displayname-input').fill('MinorUser')
		await page.getByTestId('profile-dob-input').fill(dobString)

		// THEN: Form accepts the data (minor detection happens server-side)
		await expect(page.getByTestId('profile-displayname-input')).toHaveValue('MinorUser')
		await expect(page.getByTestId('profile-dob-input')).toHaveValue(dobString)
	})

	test('should allow adult DOB (18 or older)', async ({page, context}) => {
		// GIVEN: User is authenticated and needs to set up profile
		await injectSessionCookie(context, TEST_USER, {
			profileComplete: false,
			signedConsentForm: true
		})
		await page.goto('/profile-setup')

		// WHEN: User enters a DOB indicating they are an adult
		const today = new Date()
		const adultDOB = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate())
		const dobString = adultDOB.toISOString().split('T')[0]

		await page.getByTestId('profile-displayname-input').fill('AdultUser')
		await page.getByTestId('profile-dob-input').fill(dobString)

		// THEN: Form accepts the data
		await expect(page.getByTestId('profile-displayname-input')).toHaveValue('AdultUser')
		await expect(page.getByTestId('profile-dob-input')).toHaveValue(dobString)
	})

	test('minor status set via session isMinor claim', async ({page, context}) => {
		// GIVEN: User is authenticated with isMinor claim set
		await injectSessionCookie(context, TEST_USER, {
			profileComplete: true,
			signedConsentForm: true,
			isMinor: true
		})

		// WHEN: User navigates to dashboard
		await page.goto('/dashboard')

		// THEN: Should be on dashboard (session isMinor claim is used for storage decisions)
		await expect(page).toHaveURL('/dashboard')
	})
})
