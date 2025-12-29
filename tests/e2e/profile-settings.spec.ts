/**
 * Profile Settings E2E Tests
 *
 * Tests verify the profile settings flow at the routing and access level.
 *
 * IMPORTANT: These tests require Firebase emulators running because the
 * profile settings route has a loader that calls getFullProfileFn which
 * uses Firebase Admin SDK.
 *
 * To run these tests:
 * 1. Start Firebase emulators: bun run emulators
 * 2. Run tests: FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" CI=true bunx playwright test profile-settings
 *
 * NOTE: Tests for navbar visibility (Settings link, Logout button) are
 * skipped because they depend on Firebase Auth client state which isn't
 * populated via session cookies. The session cookie handles server-side
 * auth (route guards) but the navbar's conditional rendering depends on
 * Firebase Auth's onAuthStateChanged.
 *
 * LIMITATION: E2E tests validate UI behavior only, not Firestore data persistence.
 * Playwright tests cannot query Firestore directly to verify documents are
 * correctly written. For data persistence verification:
 * - NFR39 (demographic history) is verified in unit tests (profile-settings.test.ts)
 * - Firestore security rules are tested separately
 * - Server function logic is covered by unit tests with mock Firestore
 *
 * Test Strategy:
 * - Use injectAuthenticatedUser for routes with Firestore loaders
 * - Use clearAuthenticatedUser in afterEach for test isolation
 * - Test route access and redirects
 * - Skip navbar-dependent tests
 */

import {expect, test} from '@playwright/test'
import {deleteTestUserDocument} from '../fixtures/firestore.fixture'
import {clearAuthenticatedUser, injectAuthenticatedUser} from '../fixtures/session.fixture'

// Configure serial mode - these tests share Firestore documents and must not run in parallel
test.describe.configure({mode: 'serial'})

const TEST_USER = {
	uid: 'test-user-settings-123',
	email: 'settings-test@example.com',
	displayName: 'Maya W.'
}

const DEFAULT_USER_DOC = {
	dateOfBirth: '1995-06-15',
	pronouns: 'she/her',
	gender: 'female'
}

// Skip tests if emulator is not available
// The profile settings route requires Firebase Admin in its loader
const isEmulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST)

test.describe('Profile Settings Navigation', () => {
	test.describe('Authentication Guard', () => {
		test('should redirect unauthenticated users', async ({page}) => {
			// GIVEN: User is not authenticated (no session cookie)

			// WHEN: User tries to access settings directly
			await page.goto('/settings/profile')

			// THEN: Should be redirected away from settings
			await expect(page).not.toHaveURL('/settings/profile')
		})
	})

	test.describe('Route Access', () => {
		test.skip(!isEmulatorAvailable, 'Requires Firebase emulators running')

		test.afterEach(async ({context}) => {
			await clearAuthenticatedUser(context, TEST_USER.uid)
		})

		test('should allow authenticated users to access profile settings', async ({page, context}) => {
			// GIVEN: User is authenticated with complete profile and Firestore doc
			await injectAuthenticatedUser(
				context,
				TEST_USER,
				{
					signedConsentForm: true,
					profileComplete: true
				},
				DEFAULT_USER_DOC
			)

			// WHEN: User navigates to profile settings
			await page.goto('/settings/profile')

			// THEN: Should load the profile settings page (not be redirected)
			await expect(page).toHaveURL('/settings/profile')
		})
	})
})

// Tests that require Firebase emulator running
test.describe('Profile Settings Form', () => {
	test.skip(!isEmulatorAvailable, 'Requires Firebase emulators running')

	test.beforeEach(async ({context}) => {
		// Create user document + session cookie before each test
		await injectAuthenticatedUser(
			context,
			TEST_USER,
			{
				signedConsentForm: true,
				profileComplete: true
			},
			DEFAULT_USER_DOC
		)
	})

	test.afterEach(async ({context}) => {
		await clearAuthenticatedUser(context, TEST_USER.uid)
	})

	test.describe('Form Display', () => {
		test('should display profile settings form with all sections', async ({page}) => {
			// WHEN: User navigates to settings
			await page.goto('/settings/profile')

			// THEN: Should see all form sections
			await expect(page.getByText('Basic Info')).toBeVisible()
			await expect(page.getByText('Demographics')).toBeVisible()
			await expect(page.getByText('Emergency Contact')).toBeVisible()
			await expect(page.getByText('Health & Safety')).toBeVisible()
		})

		test('should display all required form fields', async ({page}) => {
			// WHEN: User navigates to settings
			await page.goto('/settings/profile')

			// THEN: Should see all input fields
			await expect(page.getByTestId('profile-displayname-input')).toBeVisible()
			await expect(page.getByTestId('profile-dob-display')).toBeVisible()
			await expect(page.getByTestId('profile-pronouns-select')).toBeVisible()
			await expect(page.getByTestId('profile-gender-select')).toBeVisible()
			await expect(page.getByTestId('profile-race-ethnicity-group')).toBeVisible()
			await expect(page.getByTestId('profile-emergency-name-input')).toBeVisible()
			await expect(page.getByTestId('profile-emergency-phone-input')).toBeVisible()
			await expect(page.getByTestId('profile-emergency-email-input')).toBeVisible()
			await expect(page.getByTestId('profile-dietary-group')).toBeVisible()
			await expect(page.getByTestId('profile-medical-textarea')).toBeVisible()
			await expect(page.getByTestId('profile-settings-submit-button')).toBeVisible()
		})

		test('should display date of birth as read-only', async ({page}) => {
			// WHEN: User navigates to settings
			await page.goto('/settings/profile')

			// THEN: DOB field should be disabled
			const dobInput = page.getByTestId('profile-dob-display')
			await expect(dobInput).toBeDisabled()
		})
	})

	test.describe('Display Name Updates', () => {
		test('should allow updating display name', async ({page}) => {
			await page.goto('/settings/profile')

			// WHEN: User changes display name
			const displayNameInput = page.getByTestId('profile-displayname-input')
			await displayNameInput.clear()
			await displayNameInput.fill('Maya Updated')

			// THEN: Input should reflect new value
			await expect(displayNameInput).toHaveValue('Maya Updated')
		})

		test('should validate empty display name', async ({page}) => {
			await page.goto('/settings/profile')

			// WHEN: User clears display name and blurs
			const displayNameInput = page.getByTestId('profile-displayname-input')
			await displayNameInput.clear()
			await displayNameInput.blur()

			// THEN: Should show validation error
			await expect(page.locator('.text-destructive')).toBeVisible()
		})
	})

	test.describe('Demographics Updates', () => {
		test('should allow selecting pronouns', async ({page}) => {
			await page.goto('/settings/profile')

			// WHEN: User opens pronouns select
			await page.getByTestId('profile-pronouns-select').click()

			// THEN: Should see pronoun options
			await expect(page.getByRole('option', {name: 'she/her'})).toBeVisible()
			await expect(page.getByRole('option', {name: 'he/him'})).toBeVisible()
			await expect(page.getByRole('option', {name: 'they/them'})).toBeVisible()
		})

		test('should allow selecting gender', async ({page}) => {
			await page.goto('/settings/profile')

			// WHEN: User opens gender select
			await page.getByTestId('profile-gender-select').click()

			// THEN: Should see gender options
			await expect(page.getByRole('option', {name: 'female'})).toBeVisible()
			await expect(page.getByRole('option', {name: 'male'})).toBeVisible()
		})

		test('should allow entering medical conditions', async ({page}) => {
			await page.goto('/settings/profile')

			// WHEN: User enters medical conditions
			const medicalTextarea = page.getByTestId('profile-medical-textarea')
			await medicalTextarea.clear()
			await medicalTextarea.fill('Asthma, Allergies')

			// THEN: Should accept the input
			await expect(medicalTextarea).toHaveValue('Asthma, Allergies')
		})
	})

	test.describe('Emergency Contact Validation', () => {
		test('should validate phone format', async ({page}) => {
			await page.goto('/settings/profile')

			// WHEN: User enters invalid phone and blurs
			const phoneInput = page.getByTestId('profile-emergency-phone-input')
			await phoneInput.clear()
			await phoneInput.fill('invalid-phone')
			await phoneInput.blur()

			// THEN: Should show validation error
			await expect(page.getByText(/invalid phone format/i)).toBeVisible()
		})

		test('should validate email format', async ({page}) => {
			await page.goto('/settings/profile')

			// WHEN: User enters invalid email and blurs
			const emailInput = page.getByTestId('profile-emergency-email-input')
			await emailInput.clear()
			await emailInput.fill('invalid-email')
			await emailInput.blur()

			// THEN: Should show validation error
			await expect(page.getByText(/invalid email format/i)).toBeVisible()
		})

		test('should accept valid phone format', async ({page}) => {
			await page.goto('/settings/profile')

			// WHEN: User enters valid phone
			const phoneInput = page.getByTestId('profile-emergency-phone-input')
			await phoneInput.clear()
			await phoneInput.fill('555-123-4567')
			await phoneInput.blur()

			// THEN: Should not show validation error
			await expect(page.getByText(/invalid phone format/i)).not.toBeVisible()
		})
	})

	test.describe('Form Submission', () => {
		test('should show Save Changes button', async ({page}) => {
			await page.goto('/settings/profile')

			// THEN: Submit button should be visible
			const submitButton = page.getByTestId('profile-settings-submit-button')
			await expect(submitButton).toBeVisible()
			await expect(submitButton).toHaveText(/save changes/i)
		})

		test('should disable submit button when form has errors', async ({page}) => {
			await page.goto('/settings/profile')

			// WHEN: User clears display name (invalid state)
			const displayNameInput = page.getByTestId('profile-displayname-input')
			await displayNameInput.clear()
			await displayNameInput.blur()

			// THEN: Submit button should be disabled
			const submitButton = page.getByTestId('profile-settings-submit-button')
			await expect(submitButton).toBeDisabled()
		})

		test('should show info toast when no changes made', async ({page}) => {
			await page.goto('/settings/profile')

			// WHEN: User clicks Save without making changes
			const submitButton = page.getByTestId('profile-settings-submit-button')
			await submitButton.click()

			// THEN: Should show info toast about no changes
			await expect(page.getByText(/no changes to save/i)).toBeVisible()
		})
	})

	test.describe('Accessibility', () => {
		test('should have labels associated with inputs', async ({page}) => {
			await page.goto('/settings/profile')

			// THEN: Inputs should be accessible by label
			await expect(page.getByLabel(/what should we call you/i)).toBeVisible()
			await expect(page.getByLabel(/contact name/i)).toBeVisible()
		})

		test('should have proper input types', async ({page}) => {
			await page.goto('/settings/profile')

			// THEN: Inputs should have correct types
			const displayNameInput = page.getByTestId('profile-displayname-input')
			const phoneInput = page.getByTestId('profile-emergency-phone-input')
			const emailInput = page.getByTestId('profile-emergency-email-input')

			await expect(displayNameInput).toHaveAttribute('type', 'text')
			await expect(phoneInput).toHaveAttribute('type', 'tel')
			await expect(emailInput).toHaveAttribute('type', 'email')
		})

		test('should have submit button type', async ({page}) => {
			await page.goto('/settings/profile')

			// THEN: Submit button should have type=submit
			await expect(page.getByTestId('profile-settings-submit-button')).toHaveAttribute(
				'type',
				'submit'
			)
		})
	})
})

test.describe('Minor Privacy Protection (NFR9)', () => {
	test.skip(!isEmulatorAvailable, 'Requires Firebase emulators running')

	const MINOR_USER = {
		uid: 'minor-user-settings-123',
		email: 'minor@example.com',
		displayName: 'Minor User'
	}

	test.afterEach(async () => {
		// Clean up any minor user created during tests
		try {
			await deleteTestUserDocument(MINOR_USER.uid)
		} catch {
			// Ignore if not found
		}
	})

	test('should access profile settings as a minor user', async ({page, context}) => {
		// GIVEN: User is authenticated as a minor with Firestore doc
		await injectAuthenticatedUser(
			context,
			MINOR_USER,
			{
				signedConsentForm: true,
				profileComplete: true,
				isMinor: true
			},
			{
				dateOfBirth: '2012-03-20'
			}
		)

		// WHEN: Minor navigates to settings
		await page.goto('/settings/profile')

		// THEN: Should see the profile settings form
		await expect(page.getByTestId('profile-settings-form')).toBeVisible()
	})

	test('should allow minor to update demographics', async ({page, context}) => {
		// GIVEN: User is authenticated as a minor
		await injectAuthenticatedUser(
			context,
			{
				uid: 'minor-user-settings-456',
				email: 'minor2@example.com',
				displayName: 'Minor User 2'
			},
			{
				signedConsentForm: true,
				profileComplete: true,
				isMinor: true
			},
			{
				dateOfBirth: '2012-03-20'
			}
		)

		await page.goto('/settings/profile')

		// WHEN: Minor updates display name
		const displayNameInput = page.getByTestId('profile-displayname-input')
		await displayNameInput.clear()
		await displayNameInput.fill('Minor Updated')

		// THEN: Should accept the input
		await expect(displayNameInput).toHaveValue('Minor Updated')

		// Cleanup
		await deleteTestUserDocument('minor-user-settings-456')
	})

	test('should display demographics form sections for minor', async ({page, context}) => {
		// GIVEN: User is authenticated as a minor
		await injectAuthenticatedUser(
			context,
			{
				uid: 'minor-user-settings-789',
				email: 'minor3@example.com',
				displayName: 'Minor User 3'
			},
			{
				signedConsentForm: true,
				profileComplete: true,
				isMinor: true
			},
			{
				dateOfBirth: '2012-03-20'
			}
		)

		await page.goto('/settings/profile')

		// THEN: Should see all demographics sections (same as adults)
		await expect(page.getByText('Basic Info')).toBeVisible()
		await expect(page.getByText('Demographics')).toBeVisible()
		await expect(page.getByText('Emergency Contact')).toBeVisible()
		await expect(page.getByText('Health & Safety')).toBeVisible()

		// All form fields should be present
		await expect(page.getByTestId('profile-displayname-input')).toBeVisible()
		await expect(page.getByTestId('profile-pronouns-select')).toBeVisible()
		await expect(page.getByTestId('profile-gender-select')).toBeVisible()

		// Cleanup
		await deleteTestUserDocument('minor-user-settings-789')
	})

	test('should allow minor to select pronouns', async ({page, context}) => {
		// GIVEN: User is authenticated as a minor
		await injectAuthenticatedUser(
			context,
			{
				uid: 'minor-user-pronouns-test',
				email: 'minor-pronouns@example.com',
				displayName: 'Minor Pronouns Test'
			},
			{
				signedConsentForm: true,
				profileComplete: true,
				isMinor: true
			},
			{
				dateOfBirth: '2012-03-20'
			}
		)

		await page.goto('/settings/profile')

		// WHEN: Minor opens pronouns select
		await page.getByTestId('profile-pronouns-select').click()

		// THEN: Should see pronoun options (demographics accessible to minors)
		await expect(page.getByRole('option', {name: 'they/them'})).toBeVisible()

		// Cleanup
		await deleteTestUserDocument('minor-user-pronouns-test')
	})
})

/**
 * Concurrent Edit Protection E2E Tests
 *
 * LIMITATION: Full conflict scenario testing (version mismatch, dialog appearance,
 * refresh/overwrite buttons) requires simulating two concurrent sessions modifying
 * the same document. This is complex to orchestrate in E2E tests because:
 * - Requires two browser contexts with different session cookies
 * - Must coordinate timing of Firestore writes
 * - Race conditions make tests flaky
 *
 * The conflict detection and resolution logic is verified in unit tests:
 * - src/server/functions/profile-settings.test.ts (ConflictError throwing)
 * - src/routes/_authed/settings/profile.tsx unit coverage (dialog rendering)
 *
 * E2E tests here validate that the UI components render correctly and the
 * basic flow works when no conflicts occur.
 */
test.describe('Concurrent Edit Protection', () => {
	test.skip(!isEmulatorAvailable, 'Requires Firebase emulators running')

	test.beforeEach(async ({context}) => {
		await injectAuthenticatedUser(
			context,
			TEST_USER,
			{
				signedConsentForm: true,
				profileComplete: true
			},
			DEFAULT_USER_DOC
		)
	})

	test.afterEach(async ({context}) => {
		await clearAuthenticatedUser(context, TEST_USER.uid)
	})

	test('should show Save Changes button by default', async ({page}) => {
		await page.goto('/settings/profile')

		// THEN: Save button should be visible and enabled
		const submitButton = page.getByTestId('profile-settings-submit-button')
		await expect(submitButton).toBeVisible()
		await expect(submitButton).toHaveText(/save changes/i)
	})
})
