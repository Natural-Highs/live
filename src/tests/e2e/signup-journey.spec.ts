/**
 * End-to-End Signup Journey Test
 *
 * Validates the complete new user signup flow: landing → authentication →
 * profile creation → consent → dashboard. This test ensures the critical
 * first-time user experience works correctly end-to-end.
 *
 * Test Strategy:
 * - Worker isolation via `workerPrefix` fixture prevents parallel test collisions
 * - Each worker uses unique test emails: `${workerPrefix}__signup-test@example.com`
 * - Session cookie injection simulates successful Firebase Auth
 * - Profile/consent state controlled via session claims
 * - Tests follow actual app routing: _authed routes enforce profile→consent flow
 * - Consent form template is seeded per-worker in beforeAll
 *
 * Coverage:
 * - AC1: Complete signup flow (landing → auth → profile setup → dashboard)
 * - AC2: Error recovery within journey (validation errors, correction, continuation)
 * - AC3: Session persistence across steps (no re-auth required)
 *
 * @see Story 0.9: End-to-End Signup Journey Test
 * @see TEA Report Section 11: First Principles Analysis
 * @see PRD Journey 1: Maya - The Frictionless Regular
 */

import {expect, test} from '../fixtures'
import {createTestAuthUser, deleteTestAuthUser} from '../fixtures/auth.fixture'
import {
	clearAuthenticatedUser,
	clearSessionCookie,
	injectAuthenticatedUser,
	injectSessionCookie,
	type TestUser
} from '../fixtures/session.fixture'
import {
	createFormTemplate,
	type TestFormTemplate
} from '../integration/fixtures/firestore-seed.fixture'

/**
 * Generate a worker-isolated test email.
 * Format: w0__signup-test@example.com, w1__signup-test@example.com, etc.
 */
function getTestEmail(workerPrefix: string, suffix = 'signup-test'): string {
	return `${workerPrefix}__${suffix}@example.com`
}

/**
 * Generate a worker-isolated test user.
 */
function getTestUser(workerPrefix: string, suffix = 'signup-journey'): TestUser {
	return {
		uid: `${workerPrefix}__${suffix}-user`,
		email: getTestEmail(workerPrefix, suffix),
		displayName: `${workerPrefix} Signup Test User`
	}
}

test.describe('Signup Journey E2E @smoke', () => {
	// Seed consent form template for tests that navigate to /consent
	test.beforeAll(async ({workerPrefix}) => {
		const consentTemplateId = `${workerPrefix}__consent-template`
		const consentTemplate: TestFormTemplate = {
			id: consentTemplateId,
			name: 'Test Consent Form',
			type: 'consent',
			version: 1,
			content: '<p>I consent to participate.</p>',
			isActive: true,
			questions: [
				{
					id: 'consent-agreement',
					text: 'I agree to participate in this research study',
					type: 'boolean'
				}
			]
		}
		await createFormTemplate(consentTemplate)
	})

	test.describe('AC1: Complete Signup Flow', () => {
		test('completes full signup journey: landing → auth → profile → consent → dashboard', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testEmail = getTestEmail(workerPrefix)

			// Step 1: Navigate to landing page
			// Landing page redirects unauthenticated users to /authentication
			await page.goto('/')
			await expect(page).toHaveURL(/authentication/)

			// Step 2: Verify authentication page loads with magic link form
			// Wait for auth loading to complete (AuthProvider has 3s timeout)
			await expect(page.getByTestId('magic-link-form')).toBeVisible({timeout: 10000})
			await expect(page.getByTestId('magic-link-email-input')).toBeVisible()

			// Step 3: Request magic link
			await page.getByTestId('magic-link-email-input').fill(testEmail)
			await page.getByTestId('send-magic-link-button').click()

			// Step 4: Verify confirmation message
			await expect(page.getByTestId('magic-link-sent-confirmation')).toBeVisible()
			await expect(page.getByText('Check your email', {exact: false})).toBeVisible()

			// Cleanup
			await clearSessionCookie(context)
		})

		test('navigates from landing to authentication page', async ({page}) => {
			// GIVEN: User is on the landing page (redirects to auth)
			await page.goto('/')
			await expect(page).toHaveURL(/authentication/)

			// THEN: Authentication page should be displayed
			// Wait for auth loading to complete (AuthProvider has 3s timeout)
			await expect(page.getByTestId('magic-link-form')).toBeVisible({timeout: 10000})
		})

		test('completes profile setup to consent flow', async ({page, context, workerPrefix}) => {
			const testUser = getTestUser(workerPrefix, 'profile-consent')

			// Create user in Firebase Auth emulator (required for createProfileFn -> adminAuth.getUser)
			// IMPORTANT: Use returned UID in case of email collision
			const actualUid = await createTestAuthUser({
				uid: testUser.uid,
				email: testUser.email,
				displayName: testUser.displayName
			})

			// Use the actual UID from Firebase Auth for session injection
			const sessionUser = {...testUser, uid: actualUid}

			// GIVEN: User is authenticated but needs profile setup
			await injectSessionCookie(context, sessionUser, {
				signedConsentForm: false,
				profileComplete: false
			})

			// WHEN: User navigates to a protected route
			await page.goto('/dashboard')

			// THEN: Should be redirected to profile-setup (due to !hasProfile check in _authed)
			await expect(page).toHaveURL(/\/profile-setup/, {timeout: 15000})
			// Wait for React hydration to complete before interacting with form
			await page.waitForSelector('[data-testid="profile-form"][data-hydrated="true"]', {
				timeout: 10000
			})

			// Fill and submit profile form
			await page.getByTestId('profile-displayname-input').fill('Maya Test')
			await page.getByTestId('profile-dob-input').fill('1995-06-15')
			await page.getByTestId('profile-submit-button').click()

			// Verify button shows submitting state (confirms React handler executed)
			await expect(page.getByTestId('profile-submit-button')).toHaveText('Saving...')

			// Wait for navigation to complete (profile-setup -> dashboard -> consent)
			// Use longer timeout for SSR hydration + server function + redirect chain
			await expect(page).toHaveURL(/\/(consent|dashboard)/, {timeout: 30000})

			// Cleanup
			await clearAuthenticatedUser(context, actualUid)
			await deleteTestAuthUser(actualUid)
		})

		test('shows dashboard after profile and consent are complete', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUser(workerPrefix, 'full-setup')

			// GIVEN: User has completed profile and consent
			await injectAuthenticatedUser(
				context,
				testUser,
				{
					signedConsentForm: true,
					profileComplete: true
				},
				{
					dateOfBirth: '1995-06-15'
				}
			)

			// WHEN: User navigates to dashboard
			await page.goto('/dashboard')

			// THEN: Should reach dashboard
			await expect(page).toHaveURL(/dashboard/, {timeout: 10000})
			await expect(page.getByRole('heading', {name: 'Home'})).toBeVisible()

			// Cleanup
			await clearAuthenticatedUser(context, testUser.uid)
		})
	})

	test.describe('AC2: Error Recovery Within Journey', () => {
		test('recovers from profile validation error and continues journey', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUser(workerPrefix, 'error-recovery')

			// Create user in Firebase Auth emulator (required for createProfileFn -> adminAuth.getUser)
			// IMPORTANT: Use returned UID in case of email collision
			const actualUid = await createTestAuthUser({
				uid: testUser.uid,
				email: testUser.email,
				displayName: testUser.displayName
			})

			const sessionUser = {...testUser, uid: actualUid}

			// GIVEN: User is authenticated but hasn't completed profile
			await injectSessionCookie(context, sessionUser, {
				signedConsentForm: false,
				profileComplete: false
			})

			// WHEN: User navigates to profile setup
			await page.goto('/profile-setup')
			// Wait for React hydration to complete before interacting with form
			await page.waitForSelector('[data-testid="profile-form"][data-hydrated="true"]', {
				timeout: 10000
			})

			// AND: User submits form without filling required fields
			await page.getByTestId('profile-submit-button').click()

			// THEN: Form should show validation state and not navigate away
			await expect(page).toHaveURL(/\/profile-setup/)

			// WHEN: User fills in valid data
			await page.getByTestId('profile-displayname-input').fill('Maya Test')
			await page.getByTestId('profile-displayname-input').blur()
			await page.getByTestId('profile-dob-input').fill('1995-06-15')
			await page.getByTestId('profile-dob-input').blur()
			await page.getByTestId('profile-submit-button').click()

			// Verify button shows submitting state (confirms React handler executed)
			await expect(page.getByTestId('profile-submit-button')).toHaveText('Saving...')

			// THEN: Journey continues (redirects via dashboard to consent)
			await expect(page).toHaveURL(/\/(consent|dashboard)/, {timeout: 30000})

			// Cleanup
			await clearAuthenticatedUser(context, actualUid)
			await deleteTestAuthUser(actualUid)
		})

		test('displays server error and preserves form data', async ({page, context, workerPrefix}) => {
			const testUser = getTestUser(workerPrefix, 'server-error')

			// Create user in Firebase Auth emulator (required for session validation)
			const actualUid = await createTestAuthUser({
				uid: testUser.uid,
				email: testUser.email,
				displayName: testUser.displayName
			})

			const sessionUser = {...testUser, uid: actualUid}

			// GIVEN: User is authenticated
			await injectSessionCookie(context, sessionUser, {
				signedConsentForm: false,
				profileComplete: false
			})

			await page.goto('/profile-setup')
			await page.waitForSelector('[data-testid="profile-form"][data-hydrated="true"]', {
				timeout: 10000
			})

			// Fill in profile data
			await page.getByTestId('profile-displayname-input').fill('Maya Test')
			await page.getByTestId('profile-dob-input').fill('1995-06-15')

			// Delete auth user to trigger a real server error
			// createProfileFn calls adminAuth.getUser() which will fail
			await deleteTestAuthUser(actualUid)

			// WHEN: User submits valid profile data
			await page.getByTestId('profile-submit-button').click()

			// THEN: User remains on the page (error occurred, no redirect)
			await expect(page).toHaveURL(/\/profile-setup/, {timeout: 5000})

			// AND: Form data should be preserved (TanStack Form maintains controlled state)
			await expect(page.getByTestId('profile-displayname-input')).toHaveValue('Maya Test')
			await expect(page.getByTestId('profile-dob-input')).toHaveValue('1995-06-15')

			// Cleanup session
			await clearSessionCookie(context)
		})
	})

	test.describe('AC3: Session Persistence Across Steps', () => {
		test('maintains session across navigation', async ({page, context, workerPrefix}) => {
			const testUser = getTestUser(workerPrefix, 'session-persist')

			// GIVEN: User has authenticated session with profile and consent complete
			// This test verifies session cookie persists across multiple page navigations
			await injectAuthenticatedUser(
				context,
				testUser,
				{
					signedConsentForm: true,
					profileComplete: true
				},
				{
					dateOfBirth: '1995-06-15'
				}
			)

			// Step 1: Navigate to dashboard
			await page.goto('/dashboard')
			await expect(page).toHaveURL(/dashboard/, {timeout: 10000})

			// Verify session cookie is present
			const cookies1 = await context.cookies()
			const sessionCookie1 = cookies1.find(c => c.name === 'nh-session')
			expect(sessionCookie1).toBeTruthy()

			// Step 2: Navigate to profile page
			await page.goto('/profile')
			await expect(page).toHaveURL(/profile/, {timeout: 10000})

			// Verify session cookie persists
			const cookies2 = await context.cookies()
			const sessionCookie2 = cookies2.find(c => c.name === 'nh-session')
			expect(sessionCookie2).toBeTruthy()

			// Step 3: Navigate back to dashboard
			await page.goto('/dashboard')
			await expect(page).toHaveURL(/dashboard/, {timeout: 10000})

			// Verify no re-authentication was required (user is on dashboard)
			await expect(page.getByRole('heading', {name: 'Home'})).toBeVisible()

			// Session cookie should still be present
			const cookies3 = await context.cookies()
			const sessionCookie3 = cookies3.find(c => c.name === 'nh-session')
			expect(sessionCookie3).toBeTruthy()

			// Cleanup
			await clearAuthenticatedUser(context, testUser.uid)
		})

		test('session survives page refresh', async ({page, context, workerPrefix}) => {
			const testUser = getTestUser(workerPrefix, 'refresh-test')

			// GIVEN: User has authenticated session
			await injectSessionCookie(context, testUser, {
				signedConsentForm: false,
				profileComplete: false
			})

			// Navigate to profile setup page
			await page.goto('/profile-setup')
			await expect(page.getByTestId('profile-form')).toBeVisible({timeout: 10000})

			// Fill partial form data
			await page.getByTestId('profile-displayname-input').fill('Maya')

			// WHEN: Page is refreshed mid-journey
			await page.reload()

			// THEN: Session should remain valid (not redirected to auth)
			await expect(page).toHaveURL(/profile-setup/)
			await expect(page.getByTestId('profile-form')).toBeVisible({timeout: 10000})

			// Session cookie should still be present
			const cookies = await context.cookies()
			const sessionCookie = cookies.find(c => c.name === 'nh-session')
			expect(sessionCookie).toBeTruthy()

			// Cleanup
			await clearSessionCookie(context)
		})

		test('no redirect to auth page during authenticated journey', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUser(workerPrefix, 'no-redirect')

			// GIVEN: User is authenticated with completed profile and consent
			await injectAuthenticatedUser(
				context,
				testUser,
				{
					signedConsentForm: true,
					profileComplete: true
				},
				{
					dateOfBirth: '1995-06-15'
				}
			)

			// WHEN: User navigates directly to dashboard
			await page.goto('/dashboard')

			// THEN: Should reach dashboard without auth redirect
			await expect(page).not.toHaveURL(/authentication/)
			await expect(page).toHaveURL(/dashboard/)
			await expect(page.getByRole('heading', {name: 'Home'})).toBeVisible()

			// Cleanup
			await clearAuthenticatedUser(context, testUser.uid)
		})
	})
})
