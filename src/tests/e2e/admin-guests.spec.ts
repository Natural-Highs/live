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
 * - Worker-scoped isolation via workerPrefix fixture
 *
 * Requires: Firebase emulator running (FIRESTORE_EMULATOR_HOST=127.0.0.1:8180)
 */

import {expect, test} from '../fixtures/admin.fixture'
import {
	createTestEvent,
	createTestGuest,
	createTestUser,
	deleteTestEvent,
	deleteTestGuest,
	deleteTestUser
} from '../fixtures/firestore.fixture'

/**
 * NOTE: mockEventsApi was removed as part of Story 0-7 E2E mock elimination.
 * The events list now comes from the Firestore emulator via getEvents() server function.
 * Test events should be seeded with createTestEvent() - the route uses emulator data.
 */

// Worker-scoped cleanup runs automatically via firebase-reset fixture
// No manual clearFirestoreEmulator() needed - each test creates isolated data

test.describe('Admin Guest Management', () => {
	test.describe('Guest List Display', () => {
		test('should display guest management page for admin users', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event in emulator for guests
			const eventId = `${workerPrefix}__event-1`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')

			await expect(page.getByTestId('admin-guests-page')).toBeVisible()
			await expect(page.getByTestId('event-select')).toBeVisible()

			// Cleanup
			await deleteTestEvent(eventId)
		})

		test('should show message when no event is selected', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event in emulator for guests
			const eventId = `${workerPrefix}__event-1`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')

			await expect(page.getByTestId('no-event-selected')).toBeVisible()
			await expect(page.getByText('Select an event to view its guest list')).toBeVisible()

			// Cleanup
			await deleteTestEvent(eventId)
		})

		test('should display guests after selecting event', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event and guests in emulator
			const eventId = `${workerPrefix}__event-1`
			const g1Id = `${workerPrefix}__g1`
			const g2Id = `${workerPrefix}__g2`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			await createTestGuest({
				id: g1Id,
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: eventId
			})
			await createTestGuest({
				id: g2Id,
				firstName: 'Jane',
				lastName: 'Smith',
				email: 'jane@example.com',
				eventId: eventId
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')

			const eventSelect = page.getByTestId('event-select')
			await eventSelect.selectOption({value: eventId})

			await expect(page.getByTestId('admin-guest-list')).toBeVisible()
			await expect(page.getByText('John Doe')).toBeVisible()
			await expect(page.getByText('Jane Smith')).toBeVisible()

			// Cleanup
			await deleteTestGuest(g1Id)
			await deleteTestGuest(g2Id)
			await deleteTestEvent(eventId)
		})

		test('should show Missing Email badge for guests without email', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event and guest in emulator
			const eventId = `${workerPrefix}__event-1`
			const g1Id = `${workerPrefix}__g1`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			await createTestGuest({
				id: g1Id,
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: eventId
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: eventId})

			await expect(page.getByTestId(`missing-email-badge-${g1Id}`)).toBeVisible()

			// Cleanup
			await deleteTestGuest(g1Id)
			await deleteTestEvent(eventId)
		})

		test('should show Add Email button for guests without email', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event and guest in emulator
			const eventId = `${workerPrefix}__event-1`
			const g1Id = `${workerPrefix}__g1`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			await createTestGuest({
				id: g1Id,
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: eventId
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: eventId})

			await expect(page.getByTestId(`add-email-button-${g1Id}`)).toBeVisible()

			// Cleanup
			await deleteTestGuest(g1Id)
			await deleteTestEvent(eventId)
		})

		test('should not show Add Email button for guests with email', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event and guest with email in emulator
			const eventId = `${workerPrefix}__event-1`
			const g2Id = `${workerPrefix}__g2`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			await createTestGuest({
				id: g2Id,
				firstName: 'Jane',
				lastName: 'Smith',
				email: 'jane@example.com',
				eventId: eventId
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: eventId})

			await expect(page.getByTestId(`add-email-button-${g2Id}`)).toHaveCount(0)

			// Cleanup
			await deleteTestGuest(g2Id)
			await deleteTestEvent(eventId)
		})
	})

	test.describe('Add Email Modal', () => {
		test('should open add email modal when clicking Add Email button', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event and guest in emulator
			const eventId = `${workerPrefix}__event-1`
			const g1Id = `${workerPrefix}__g1`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			await createTestGuest({
				id: g1Id,
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: eventId
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: eventId})

			await page.getByTestId(`add-email-button-${g1Id}`).click()

			await expect(page.getByTestId('add-email-modal')).toBeVisible()
			// Check modal title contains guest name
			await expect(page.getByTestId('add-email-modal').getByRole('heading')).toContainText(
				'John Doe'
			)

			// Cleanup
			await deleteTestGuest(g1Id)
			await deleteTestEvent(eventId)
		})

		test('should close modal when clicking cancel', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event and guest in emulator
			const eventId = `${workerPrefix}__event-1`
			const g1Id = `${workerPrefix}__g1`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			await createTestGuest({
				id: g1Id,
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: eventId
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: eventId})
			await page.getByTestId(`add-email-button-${g1Id}`).click()

			await expect(page.getByTestId('add-email-modal')).toBeVisible()
			await page.getByTestId('cancel-email-button').click()

			await expect(page.getByTestId('add-email-modal')).not.toBeVisible()

			// Cleanup
			await deleteTestGuest(g1Id)
			await deleteTestEvent(eventId)
		})

		test('should show validation error for invalid email', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event and guest in emulator
			const eventId = `${workerPrefix}__event-1`
			const g1Id = `${workerPrefix}__g1`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			await createTestGuest({
				id: g1Id,
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: eventId
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: eventId})
			await page.getByTestId(`add-email-button-${g1Id}`).click()

			await page.getByTestId('email-input').fill('not-an-email')
			await page.getByTestId('submit-email-button').click()

			await expect(page.getByTestId('email-error')).toBeVisible()

			// Cleanup
			await deleteTestGuest(g1Id)
			await deleteTestEvent(eventId)
		})
	})

	test.describe('Duplicate Email Handling', () => {
		test('should show warning when email belongs to existing user', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event and guest in emulator
			const eventId = `${workerPrefix}__event-1`
			const g1Id = `${workerPrefix}__g1`
			const existingUserId = `${workerPrefix}__existing-user-1`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			await createTestGuest({
				id: g1Id,
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: eventId
			})
			// Create existing user with the email we'll try to add
			await createTestUser(existingUserId, {
				email: `existing-${workerPrefix}@example.com`,
				displayName: 'Existing User'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: eventId})
			await page.getByTestId(`add-email-button-${g1Id}`).click()

			await page.getByTestId('email-input').fill(`existing-${workerPrefix}@example.com`)
			await page.getByTestId('submit-email-button').click()

			await expect(page.getByTestId('duplicate-user-warning')).toBeVisible()
			await expect(page.getByTestId('link-user-button')).toBeVisible()

			// Cleanup
			await deleteTestUser(existingUserId)
			await deleteTestGuest(g1Id)
			await deleteTestEvent(eventId)
		})

		test('should show warning when email belongs to another guest', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event and guests in emulator
			const eventId = `${workerPrefix}__event-1`
			const g1Id = `${workerPrefix}__g1`
			const gOtherId = `${workerPrefix}__g-other`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			// Guest with email that will be detected as duplicate
			await createTestGuest({
				id: gOtherId,
				firstName: 'Other',
				lastName: 'Guest',
				email: `duplicate-${workerPrefix}@example.com`,
				eventId: eventId
			})
			// Guest without email that we'll try to add the duplicate email to
			await createTestGuest({
				id: g1Id,
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: eventId
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: eventId})
			await page.getByTestId(`add-email-button-${g1Id}`).click()

			await page.getByTestId('email-input').fill(`duplicate-${workerPrefix}@example.com`)
			await page.getByTestId('submit-email-button').click()

			await expect(page.getByTestId('duplicate-guest-warning')).toBeVisible()

			// Cleanup
			await deleteTestGuest(g1Id)
			await deleteTestGuest(gOtherId)
			await deleteTestEvent(eventId)
		})

		test('should link guest to existing user when confirmed', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event and guest in emulator
			const eventId = `${workerPrefix}__event-1`
			const g1Id = `${workerPrefix}__g1`
			const existingUserId = `${workerPrefix}__existing-user-1`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			await createTestGuest({
				id: g1Id,
				firstName: 'John',
				lastName: 'Doe',
				email: null,
				eventId: eventId
			})
			// Create existing user with the email we'll try to add
			await createTestUser(existingUserId, {
				email: `existing-${workerPrefix}@example.com`,
				displayName: 'Existing User'
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: eventId})
			await page.getByTestId(`add-email-button-${g1Id}`).click()

			await page.getByTestId('email-input').fill(`existing-${workerPrefix}@example.com`)
			await page.getByTestId('submit-email-button').click()

			await expect(page.getByTestId('duplicate-user-warning')).toBeVisible()
			await page.getByTestId('link-user-button').click()

			// Modal should close on success
			await expect(page.getByTestId('add-email-modal')).not.toBeVisible({timeout: 5000})

			// Cleanup
			await deleteTestUser(existingUserId)
			await deleteTestGuest(g1Id)
			await deleteTestEvent(eventId)
		})
	})

	test.describe('Empty States', () => {
		test('should show empty message when event has no guests', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// Seed event with no guests in emulator
			const eventId = `${workerPrefix}__event-1`
			await createTestEvent({
				id: eventId,
				name: 'Test Event',
				eventCode: `${workerPrefix.slice(1)}01`,
				isActive: true
			})
			// Server function hits emulator directly - no mock needed

			await page.goto('/guests')
			await page.getByTestId('event-select').selectOption({value: eventId})

			await expect(page.getByTestId('admin-guest-list-empty')).toBeVisible()

			// Cleanup
			await deleteTestEvent(eventId)
		})
	})
})
