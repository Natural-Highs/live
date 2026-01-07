/**
 * Admin Guests E2E Tests
 *
 * Tests verify the admin guest management flow including:
 * - Guest list display for selected event
 * - Adding email to guest without email
 * - Handling duplicate email detection
 * - Linking guest to existing user
 *
 * Test Strategy:
 * - Use admin fixtures for admin authentication (session cookie injection)
 * - Use Firestore emulator fixtures for guest data (emulator-first)
 * - Server functions hit emulator directly (no REST API mocks)
 * - Use data-testid selectors for stability
 *
 * Requires: Firebase emulator running (FIRESTORE_EMULATOR_HOST=127.0.0.1:8180)
 */

import {expect, test} from '../fixtures/admin.fixture'
import {
	clearFirestoreEmulator,
	createTestEvent,
	createTestGuest,
	createTestUser,
	deleteAllTestEvents,
	deleteAllTestGuests,
	deleteTestUser
} from '../fixtures/firestore.fixture'
import {TEST_CODES} from '../factories/events.factory'

/**
 * NOTE: mockEventsApi was removed as part of Story 0-7 E2E mock elimination.
 * The events list now comes from the Firestore emulator via getEvents() server function.
 * Test events should be seeded with createTestEvent() - the route uses emulator data.
 */

// Clean up emulator data before test suite
test.beforeAll(async () => {
	await clearFirestoreEmulator()
})

// Clean up test data after each test for isolation
test.afterEach(async () => {
	await deleteAllTestEvents()
	await deleteAllTestGuests()
})

test.describe('Admin Guest Management', () => {
	test.describe('Guest List Display', () => {
		test('should display guest management page for admin users', async ({
			page,
			adminUser: _adminUser
		}) => {
			// Seed event in emulator for guests
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')

			await expect(page.getByTestId('admin-guests-page')).toBeVisible()
			await expect(page.getByTestId('event-select')).toBeVisible()
		})

		test('should show message when no event is selected', async ({page, adminUser: _adminUser}) => {
			// Seed event in emulator for guests
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')

			await expect(page.getByTestId('no-event-selected')).toBeVisible()
			await expect(page.getByText('Select an event to view its guest list')).toBeVisible()
		})

		test('should display guests after selecting event', async ({page, adminUser: _adminUser}) => {
			// Seed event and guests in emulator
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			await createTestGuest({
				id: 'g1',
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: 'event-1'
			})
			await createTestGuest({
				id: 'g2',
				firstName: 'Jane',
				lastName: 'Smith',
				email: 'jane@example.com',
				eventId: 'event-1'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')

			const eventSelect = page.getByTestId('event-select')
			await eventSelect.selectOption({value: 'event-1'})

			await expect(page.getByTestId('admin-guest-list')).toBeVisible()
			await expect(page.getByText('John Doe')).toBeVisible()
			await expect(page.getByText('Jane Smith')).toBeVisible()
		})

		test('should show Missing Email badge for guests without email', async ({
			page,
			adminUser: _adminUser
		}) => {
			// Seed event and guest in emulator
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			await createTestGuest({
				id: 'g1',
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: 'event-1'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: 'event-1'})

			await expect(page.getByTestId('missing-email-badge-g1')).toBeVisible()
		})

		test('should show Add Email button for guests without email', async ({
			page,
			adminUser: _adminUser
		}) => {
			// Seed event and guest in emulator
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			await createTestGuest({
				id: 'g1',
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: 'event-1'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: 'event-1'})

			await expect(page.getByTestId('add-email-button-g1')).toBeVisible()
		})

		test('should not show Add Email button for guests with email', async ({
			page,
			adminUser: _adminUser
		}) => {
			// Seed event and guest with email in emulator
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			await createTestGuest({
				id: 'g2',
				firstName: 'Jane',
				lastName: 'Smith',
				email: 'jane@example.com',
				eventId: 'event-1'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: 'event-1'})

			await expect(page.getByTestId('add-email-button-g2')).toHaveCount(0)
		})
	})

	test.describe('Add Email Modal', () => {
		test('should open add email modal when clicking Add Email button', async ({
			page,
			adminUser: _adminUser
		}) => {
			// Seed event and guest in emulator
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			await createTestGuest({
				id: 'g1',
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: 'event-1'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: 'event-1'})

			await page.getByTestId('add-email-button-g1').click()

			await expect(page.getByTestId('add-email-modal')).toBeVisible()
			// Check modal title contains guest name
			await expect(page.getByTestId('add-email-modal').getByRole('heading')).toContainText(
				'John Doe'
			)
		})

		test('should close modal when clicking cancel', async ({page, adminUser: _adminUser}) => {
			// Seed event and guest in emulator
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			await createTestGuest({
				id: 'g1',
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: 'event-1'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: 'event-1'})
			await page.getByTestId('add-email-button-g1').click()

			await expect(page.getByTestId('add-email-modal')).toBeVisible()
			await page.getByTestId('cancel-email-button').click()

			await expect(page.getByTestId('add-email-modal')).not.toBeVisible()
		})

		test('should show validation error for invalid email', async ({
			page,
			adminUser: _adminUser
		}) => {
			// Seed event and guest in emulator
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			await createTestGuest({
				id: 'g1',
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: 'event-1'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: 'event-1'})
			await page.getByTestId('add-email-button-g1').click()

			await page.getByTestId('email-input').fill('not-an-email')
			await page.getByTestId('submit-email-button').click()

			await expect(page.getByTestId('email-error')).toBeVisible()
		})
	})

	test.describe('Duplicate Email Handling', () => {
		test('should show warning when email belongs to existing user', async ({
			page,
			adminUser: _adminUser
		}) => {
			// Seed event and guest in emulator
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			await createTestGuest({
				id: 'g1',
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: 'event-1'
			})
			// Create existing user with the email we'll try to add
			await createTestUser('existing-user-1', {
				email: 'existing@example.com',
				displayName: 'Existing User'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: 'event-1'})
			await page.getByTestId('add-email-button-g1').click()

			await page.getByTestId('email-input').fill('existing@example.com')
			await page.getByTestId('submit-email-button').click()

			await expect(page.getByTestId('duplicate-user-warning')).toBeVisible()
			await expect(page.getByTestId('link-user-button')).toBeVisible()

			// Cleanup user created for this test
			await deleteTestUser('existing-user-1')
		})

		test('should show warning when email belongs to another guest', async ({
			page,
			adminUser: _adminUser
		}) => {
			// Seed event and guests in emulator
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			// Guest with email that will be detected as duplicate
			await createTestGuest({
				id: 'g-other',
				firstName: 'Other',
				lastName: 'Guest',
				email: 'duplicate@example.com',
				eventId: 'event-1'
			})
			// Guest without email that we'll try to add the duplicate email to
			await createTestGuest({
				id: 'g1',
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: 'event-1'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: 'event-1'})
			await page.getByTestId('add-email-button-g1').click()

			await page.getByTestId('email-input').fill('duplicate@example.com')
			await page.getByTestId('submit-email-button').click()

			await expect(page.getByTestId('duplicate-guest-warning')).toBeVisible()
		})

		test('should link guest to existing user when confirmed', async ({
			page,
			adminUser: _adminUser
		}) => {
			// Seed event and guest in emulator
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			await createTestGuest({
				id: 'g1',
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: 'event-1'
			})
			// Create existing user with the email we'll try to add
			await createTestUser('existing-user-1', {
				email: 'existing@example.com',
				displayName: 'Existing User'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: 'event-1'})
			await page.getByTestId('add-email-button-g1').click()

			await page.getByTestId('email-input').fill('existing@example.com')
			await page.getByTestId('submit-email-button').click()

			await expect(page.getByTestId('duplicate-user-warning')).toBeVisible()
			await page.getByTestId('link-user-button').click()

			// Modal should close on success
			await expect(page.getByTestId('add-email-modal')).not.toBeVisible({timeout: 5000})

			// Cleanup user created for this test
			await deleteTestUser('existing-user-1')
		})
	})

	test.describe('Empty States', () => {
		test('should show empty message when event has no guests', async ({
			page,
			adminUser: _adminUser
		}) => {
			// Seed event with no guests in emulator
			await createTestEvent({
				id: 'event-1',
				name: 'Test Event',
				eventCode: TEST_CODES.VALID,
				isActive: true
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: 'event-1'})

			await expect(page.getByTestId('admin-guest-list-empty')).toBeVisible()
		})
	})
})
