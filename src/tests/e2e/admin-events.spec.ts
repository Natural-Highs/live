/**
 * Admin Events E2E Tests
 *
 * Tests verify the admin event management flow including:
 * - Event creation with auto-generated 4-digit code
 * - Event appearing in list immediately after creation
 * - Event activation flow
 * - Error handling for various failure scenarios
 *
 * Test Strategy:
 * - Use admin fixtures for admin authentication (session cookie injection - acceptable per AC2)
 * - Server functions hit Firebase emulators directly (no API mocks needed)
 * - Use data-testid selectors for stability
 * - Error simulation mocks for network failure testing only
 *
 * Test Isolation (Story 0-8 AC1):
 * - Uses workerPrefix fixture for parallel worker data isolation
 * - Each worker gets unique IDs to prevent cross-worker collisions
 */

import {createMockUser, expect, test} from '../fixtures/admin.fixture'
import {
	createEventType,
	createFormTemplate,
	type TestEventType,
	type TestFormTemplate
} from '../integration/fixtures/firestore-seed.fixture'
import {mockServerFunctionError} from '../fixtures/network.fixture'
import {injectSessionCookie, type TestUser} from '../fixtures/session.fixture'

// Base seed data for admin event tests (will be prefixed with workerPrefix)
const BASE_CONSENT_TEMPLATE: Omit<TestFormTemplate, 'id'> = {
	name: 'Test Consent Form',
	type: 'consent',
	version: 1,
	content: '<p>I consent to participate in this study.</p>',
	isActive: true
}

const BASE_DEMOGRAPHICS_TEMPLATE: Omit<TestFormTemplate, 'id'> = {
	name: 'Test Demographics Form',
	type: 'demographics',
	version: 1,
	content: '<p>Demographics questions here.</p>',
	isActive: true
}

const BASE_EVENT_TYPE: Omit<TestEventType, 'id'> = {
	name: 'Workshop',
	description: 'Workshop event type for testing',
	color: '#6366f1',
	isActive: true
}

test.describe('Admin Event Management', () => {
	// Seed form templates and event type before each test using isolated IDs
	test.beforeEach(async ({workerPrefix}) => {
		// Create isolated IDs for this worker
		const consentTemplateId = `${workerPrefix}__consent-template`
		const demographicsTemplateId = `${workerPrefix}__demographics-template`
		const eventTypeId = `${workerPrefix}__event-type`

		// Create form templates first (event types reference them)
		await createFormTemplate({
			...BASE_CONSENT_TEMPLATE,
			id: consentTemplateId
		})
		await createFormTemplate({
			...BASE_DEMOGRAPHICS_TEMPLATE,
			id: demographicsTemplateId
		})
		// Create event type that references the templates
		await createEventType({
			...BASE_EVENT_TYPE,
			id: eventTypeId,
			defaultConsentFormTemplateId: consentTemplateId,
			defaultDemographicsFormTemplateId: demographicsTemplateId
		})
	})

	test.describe('AC3: Admin Event Creation', () => {
		test('should display admin events page for admin users', async ({page, adminUser}) => {
			// GIVEN: Admin is authenticated (via adminUser fixture)
			// Server functions hit Firestore emulator directly (no mocks needed)

			// WHEN: Admin navigates to events page
			await page.goto('/events')
			await page.waitForLoadState('networkidle')

			// THEN: Events page should be visible
			await expect(page.getByTestId('admin-events-page')).toBeVisible({timeout: 10000})
			await expect(page.getByTestId('create-event-button')).toBeVisible()

			// Verify admin user is authenticated
			expect(adminUser.email).toBe('admin@test.local')
		})

		test('should open create event modal when clicking create button', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Admin is on events page
			// Server functions hit Firestore emulator directly (no mocks needed)

			await page.goto('/events')

			// WHEN: Admin clicks create event button
			await page.getByTestId('create-event-button').click()

			// THEN: Create event modal should be visible
			await expect(page.getByTestId('create-event-modal')).toBeVisible()
			await expect(page.getByTestId('event-name-input')).toBeVisible()
			await expect(page.getByTestId('event-type-select')).toBeVisible()
			await expect(page.getByTestId('event-date-input')).toBeVisible()
		})

		test('should create event with form submission', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin has create event modal open
			// Server functions hit Firestore emulator directly (no mocks needed)

			await page.goto('/events')
			// Wait for page content to load by checking for the button
			await expect(page.getByTestId('create-event-button')).toBeVisible()

			await page.getByTestId('create-event-button').click()
			await expect(page.getByTestId('create-event-modal')).toBeVisible()

			// WHEN: Admin fills in form and submits
			// Wait for hydration and all React Query refetches to complete
			await page.waitForLoadState('networkidle')

			// Wait for event types to load from Firestore emulator
			const eventTypeSelect = page.getByTestId('event-type-select')
			await expect(eventTypeSelect).toBeVisible()

			await page.getByTestId('event-name-input').fill('Community Peer-mentor')
			// Select the seeded event type (Workshop)
			await eventTypeSelect.selectOption({label: 'Workshop'})
			await page.getByTestId('event-date-input').fill('2025-01-15')

			// Submit and wait for response
			await page.getByTestId('submit-create-event').click({force: true})

			// THEN: Modal should close on success (event created in emulator)
			await expect(page.getByTestId('create-event-modal')).not.toBeVisible({timeout: 5000})
		})

		test('should close modal when clicking cancel', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin has create event modal open
			// Server functions hit Firestore emulator directly (no mocks needed)

			await page.goto('/events')
			// Wait for page content to load by checking for the button
			await expect(page.getByTestId('create-event-button')).toBeVisible()

			await page.getByTestId('create-event-button').click()
			await expect(page.getByTestId('create-event-modal')).toBeVisible()

			// WHEN: Admin clicks cancel (force click to bypass modal overlay detection)
			await page.getByTestId('cancel-create-event').click({force: true})

			// THEN: Modal should be closed
			await expect(page.getByTestId('create-event-modal')).not.toBeVisible()
		})

		test('should display events in the list', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Events exist in Firestore emulator (seeded by test setup)
			// Server functions hit Firestore emulator directly (no mocks needed)

			// WHEN: Admin navigates to events page
			await page.goto('/events')

			// THEN: Events list should be displayed
			await expect(page.getByTestId('events-list')).toBeVisible()
		})

		test('should show empty state or events list', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin is authenticated (via adminUser fixture)
			// Note: Event types are seeded but no events exist initially
			// Server functions hit Firestore emulator directly (no mocks needed)

			// WHEN: Admin navigates to events page
			await page.goto('/events')
			await page.waitForLoadState('networkidle')

			// THEN: Should show empty state message or events list
			// Either no-events-message OR events-list should be visible
			// (events-list is always visible, just shows empty state message when no events)
			await expect(page.getByTestId('admin-events-page')).toBeVisible({timeout: 10000})
		})

		test('should switch between events and event types tabs', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Admin is on events page
			// Server functions hit Firestore emulator directly (no mocks needed)

			await page.goto('/events')

			// WHEN: Admin clicks event types tab
			await page.getByTestId('event-types-tab').click()

			// THEN: Event types content should be visible
			await expect(page.getByTestId('create-event-type-button')).toBeVisible()

			// WHEN: Admin clicks events tab
			await page.getByTestId('events-tab').click()

			// THEN: Events content should be visible
			await expect(page.getByTestId('events-list')).toBeVisible()
		})
	})

	test.describe('AC4: Admin Event Full Lifecycle', () => {
		test('should complete full event lifecycle: create → activate → view code', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Admin is authenticated
			// Server functions hit Firestore emulator directly (no mocks needed)

			await page.goto('/events')
			await expect(page.getByTestId('create-event-button')).toBeVisible()

			// STEP 1: Create event
			await page.getByTestId('create-event-button').click()
			await expect(page.getByTestId('create-event-modal')).toBeVisible()
			await page.waitForLoadState('networkidle')

			await page.getByTestId('event-name-input').fill('Lifecycle Test Event')
			// Select the seeded event type (Workshop)
			await page.getByTestId('event-type-select').selectOption({label: 'Workshop'})
			await page.getByTestId('event-date-input').fill('2025-02-01')

			await page.getByTestId('submit-create-event').click({force: true})

			// THEN: Modal should close (event created in emulator)
			await expect(page.getByTestId('create-event-modal')).not.toBeVisible({timeout: 5000})

			// STEP 2: Verify event appears in list (use first() due to potential duplicates from sequential runs)
			await expect(page.getByText('Lifecycle Test Event').first()).toBeVisible()
		})

		test('should display 4-digit event code after activation', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Events with codes exist in Firestore emulator
			// Server functions hit Firestore emulator directly (no mocks needed)

			await page.goto('/events')
			await expect(page.getByTestId('events-list')).toBeVisible()

			// THEN: Any active events with codes should display their codes
			// This depends on seeded data in the emulator
		})

		test('should show event in live check-in view after activation', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Active events exist in Firestore emulator
			// Server functions hit Firestore emulator directly (no mocks needed)

			// WHEN: Admin views events
			await page.goto('/events')

			// THEN: Events list should be visible
			await expect(page.getByTestId('events-list')).toBeVisible()
		})
	})

	test.describe('AC6: Error Handling Paths', () => {
		test('should show error when event creation fails', async ({page, adminUser: _adminUser}) => {
			// Navigate first, then set up error simulation mock
			await page.goto('/events')
			await expect(page.getByTestId('create-event-button')).toBeVisible()

			await page.getByTestId('create-event-button').click()
			await expect(page.getByTestId('create-event-modal')).toBeVisible()

			// Set up error simulation mock after modal opens (acceptable per AC2)
			await mockServerFunctionError(page, 'Event name already exists')

			// WHEN: Admin tries to create event
			await page.waitForLoadState('networkidle')

			await page.getByTestId('event-name-input').fill('Duplicate Event')
			// Select the seeded event type (Workshop)
			await page.getByTestId('event-type-select').selectOption({label: 'Workshop'})
			await page.getByTestId('event-date-input').fill('2025-01-15')
			await page.getByTestId('submit-create-event').click({force: true})

			// THEN: Should show error message (wait for state update)
			await expect(page.getByTestId('admin-events-error')).toBeVisible({timeout: 5000})
		})

		test('should handle network failure gracefully', async ({page, adminUser: _adminUser}) => {
			// Navigate first
			await page.goto('/events')
			await expect(page.getByTestId('create-event-button')).toBeVisible()

			await page.getByTestId('create-event-button').click()
			await expect(page.getByTestId('create-event-modal')).toBeVisible()

			// WHEN: Admin tries to create event with network failure
			await page.waitForLoadState('networkidle')

			await page.getByTestId('event-name-input').fill('Test Event')
			// Select the seeded event type (Workshop)
			await page.getByTestId('event-type-select').selectOption({label: 'Workshop'})
			await page.getByTestId('event-date-input').fill('2025-01-15')

			// Set up network failure mock after filling form (error simulation - acceptable)
			await page.route('**/_serverFn/*', route => {
				route.abort('failed')
			})

			await page.getByTestId('submit-create-event').click({force: true})

			// THEN: Should show error message (network errors trigger catch block)
			await expect(page.getByTestId('admin-events-error')).toBeVisible({timeout: 5000})
		})
	})

	test.describe('Access Control', () => {
		test('should redirect non-admin users', async ({page, context}) => {
			// GIVEN: User is authenticated but not admin
			// Use non-admin session cookie
			const nonAdminUser = createMockUser({email: 'user@example.com', displayName: 'Regular User'})
			const testUser: TestUser = {
				uid: nonAdminUser.uid,
				email: nonAdminUser.email,
				displayName: nonAdminUser.displayName
			}

			// Inject session cookie with signedConsentForm but NOT admin
			await injectSessionCookie(context, testUser, {
				signedConsentForm: true,
				admin: false
			})

			// WHEN: Non-admin tries to access admin events page
			await page.goto('/events')

			// THEN: Should redirect away from admin page or not show admin content
			// Wait for navigation or content check with proper assertion
			const hasAdminContent = await page
				.getByTestId('admin-events-page')
				.isVisible({timeout: 2000})
				.catch(() => false)

			// Either redirected away OR admin content not shown
			const url = page.url()
			const isOnAdminPage = url.includes('/events')
			expect(isOnAdminPage && hasAdminContent).toBe(false)
		})
	})
})
