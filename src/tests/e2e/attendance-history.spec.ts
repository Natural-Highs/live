/**
 * Attendance History & Account Activity E2E Tests
 *
 * Tests verify attendance history and account activity display:
 * - AC1: User navigates to history and sees events
 * - AC2: Guest check-ins display with "Guest" badge
 * - AC3: Account activity shows recent check-ins with timestamps
 * - Empty state displays correctly for new users
 *
 * Test Strategy:
 * - Use session fixtures for authenticated state
 * - Use Firestore fixtures to seed events and userEvents
 * - Use data-testid selectors for stability
 */

import {getApps, initializeApp} from 'firebase-admin/app'
import {getFirestore} from 'firebase-admin/firestore'
import {expect, test} from '../fixtures'
import {clearAuthenticatedUser, injectAuthenticatedUser} from '../fixtures/session.fixture'
import {TEST_CODES} from '../factories/events.factory'

const EMULATOR_PROJECT_ID = 'demo-natural-highs'
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180'

// Test user IDs
const TEST_USER_WITH_HISTORY = {
	uid: 'test-user-history-123',
	email: 'history-test@example.com',
	displayName: 'History Test User'
}

const TEST_USER_EMPTY = {
	uid: 'test-user-empty-456',
	email: 'empty-test@example.com',
	displayName: 'Empty Test User'
}

const TEST_USER_GUEST_CONVERTED = {
	uid: 'test-user-converted-789',
	email: 'converted-test@example.com',
	displayName: 'Converted Guest User'
}

/**
 * Get or create the Firebase Admin app for E2E tests.
 */
function getTestApp() {
	process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST

	const existingApps = getApps()
	const existingTestApp = existingApps.find(app => app.name === 'e2e-test-app')

	if (existingTestApp) {
		return existingTestApp
	}

	return initializeApp({projectId: EMULATOR_PROJECT_ID}, 'e2e-test-app')
}

/**
 * Get Firestore instance for E2E tests.
 */
function getTestDb() {
	const app = getTestApp()
	return getFirestore(app)
}

/**
 * Seed user with attendance history (regular check-ins).
 * Only seeds events and userEvents - user document is created by injectAuthenticatedUser.
 */
async function seedUserWithHistory(uid: string) {
	const db = getTestDb()
	const now = new Date()
	const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
	const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

	// Create events
	await db.collection('events').doc('event-workshop').set({
		name: 'Mindfulness Workshop',
		eventCode: TEST_CODES.VALID,
		startDate: lastWeek,
		location: 'Community Center',
		isActive: false,
		createdAt: lastMonth,
		updatedAt: lastWeek
	})

	await db.collection('events').doc('event-retreat').set({
		name: 'Weekend Retreat',
		eventCode: '5678',
		startDate: lastMonth,
		location: 'Mountain Lodge',
		isActive: false,
		createdAt: lastMonth,
		updatedAt: lastMonth
	})

	// Create userEvents (check-ins)
	await db.collection('userEvents').add({
		userId: uid,
		eventId: 'event-workshop',
		registeredAt: lastWeek,
		createdAt: lastWeek
	})

	await db.collection('userEvents').add({
		userId: uid,
		eventId: 'event-retreat',
		registeredAt: lastMonth,
		createdAt: lastMonth
	})
}

/**
 * Seed user with guest-converted check-ins (wasGuest: true).
 * Only seeds events and userEvents - user document is created by injectAuthenticatedUser.
 */
async function seedUserWithGuestHistory(uid: string) {
	const db = getTestDb()
	const now = new Date()
	const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

	// Create event
	await db.collection('events').doc('event-guest-converted').set({
		name: 'Community Gathering',
		eventCode: '9012',
		startDate: lastWeek,
		location: 'Town Hall',
		isActive: false,
		createdAt: lastWeek,
		updatedAt: lastWeek
	})

	// Create userEvent with migratedFromGuestEventId (marks as guest)
	await db.collection('userEvents').add({
		userId: uid,
		eventId: 'event-guest-converted',
		registeredAt: lastWeek,
		createdAt: now,
		migratedFromGuestEventId: 'guest-event-old-123'
	})
}

/**
 * Seed empty user (no events).
 * User document is created by injectAuthenticatedUser.
 */
async function seedEmptyUser(_uid: string) {
	// No-op: user document is created by injectAuthenticatedUser
	// Empty user just means no events/userEvents
}

/**
 * Clean up test data.
 */
async function cleanupTestData(uid: string) {
	const db = getTestDb()

	// Delete userEvents for this user
	const userEventsSnapshot = await db.collection('userEvents').where('userId', '==', uid).get()
	for (const doc of userEventsSnapshot.docs) {
		await doc.ref.delete()
	}

	// Delete test events
	const eventIds = ['event-workshop', 'event-retreat', 'event-guest-converted']
	for (const eventId of eventIds) {
		await db.collection('events').doc(eventId).delete()
	}

	// Delete user document
	await db.collection('users').doc(uid).delete()
}

test.describe('Attendance History (AC1, AC2)', () => {
	test.describe('AC1: User navigates to history and sees events', () => {
		test.beforeEach(async () => {
			await seedUserWithHistory(TEST_USER_WITH_HISTORY.uid)
		})

		test.afterEach(async ({context}) => {
			await clearAuthenticatedUser(context, TEST_USER_WITH_HISTORY.uid)
			await cleanupTestData(TEST_USER_WITH_HISTORY.uid)
		})

		test('should display attendance history section on profile', async ({page, context}) => {
			// GIVEN: User is authenticated with event history
			await injectAuthenticatedUser(
				context,
				TEST_USER_WITH_HISTORY,
				{signedConsentForm: true, profileComplete: true},
				{dateOfBirth: '1990-01-15'}
			)

			// WHEN: User navigates to profile
			await page.goto('/profile')

			// THEN: Attendance history section should be visible
			await expect(page.getByTestId('attendance-history-section')).toBeVisible()
			await expect(page.getByText('Attendance History')).toBeVisible()
		})

		test('should display chronological list of attended events', async ({page, context}) => {
			// GIVEN: User is authenticated with multiple events
			await injectAuthenticatedUser(
				context,
				TEST_USER_WITH_HISTORY,
				{signedConsentForm: true, profileComplete: true},
				{dateOfBirth: '1990-01-15'}
			)

			// WHEN: User navigates to profile
			await page.goto('/profile')

			// THEN: Should see event cards in the history
			await expect(page.getByTestId('attendance-history')).toBeVisible()
			const eventCards = page.getByTestId('attendance-history-item')
			await expect(eventCards).toHaveCount(2)
		})

		test('should display event name and date', async ({page, context}) => {
			// GIVEN: User is authenticated with events
			await injectAuthenticatedUser(
				context,
				TEST_USER_WITH_HISTORY,
				{signedConsentForm: true, profileComplete: true},
				{dateOfBirth: '1990-01-15'}
			)

			// WHEN: User navigates to profile
			await page.goto('/profile')

			// THEN: Should see event details in attendance history section
			const historySection = page.getByTestId('attendance-history-section')
			await expect(historySection.getByText('Mindfulness Workshop')).toBeVisible()
			await expect(historySection.getByText('Weekend Retreat')).toBeVisible()
		})
	})

	test.describe('AC2: Guest check-ins display with Guest badge', () => {
		test.beforeEach(async () => {
			await seedUserWithGuestHistory(TEST_USER_GUEST_CONVERTED.uid)
		})

		test.afterEach(async ({context}) => {
			await clearAuthenticatedUser(context, TEST_USER_GUEST_CONVERTED.uid)
			await cleanupTestData(TEST_USER_GUEST_CONVERTED.uid)
		})

		test('should display Guest badge for pre-conversion check-ins', async ({page, context}) => {
			// GIVEN: User has check-ins from before account creation (guest check-ins)
			await injectAuthenticatedUser(
				context,
				TEST_USER_GUEST_CONVERTED,
				{signedConsentForm: true, profileComplete: true},
				{dateOfBirth: '1990-01-15'}
			)

			// WHEN: User navigates to profile
			await page.goto('/profile')

			// THEN: Should see Guest badge on migrated event
			await expect(page.getByTestId('guest-badge')).toBeVisible()
			await expect(page.getByTestId('guest-badge')).toHaveText('Guest')
		})

		test('should show clean event name without inline text', async ({page, context}) => {
			// GIVEN: User with guest history
			await injectAuthenticatedUser(
				context,
				TEST_USER_GUEST_CONVERTED,
				{signedConsentForm: true, profileComplete: true},
				{dateOfBirth: '1990-01-15'}
			)

			// WHEN: User navigates to profile
			await page.goto('/profile')

			// THEN: Event name should not have "(as Guest)" inline text
			const historySection = page.getByTestId('attendance-history-section')
			await expect(historySection.getByText('Community Gathering')).toBeVisible()
			// Badge should be separate from the name
			await expect(page.getByTestId('guest-badge')).toBeVisible()
		})
	})

	test.describe('Empty state for new users', () => {
		test.beforeEach(async () => {
			await seedEmptyUser(TEST_USER_EMPTY.uid)
		})

		test.afterEach(async ({context}) => {
			await clearAuthenticatedUser(context, TEST_USER_EMPTY.uid)
			await cleanupTestData(TEST_USER_EMPTY.uid)
		})

		test('should display empty state when no events attended', async ({page, context}) => {
			// GIVEN: User has no event history
			await injectAuthenticatedUser(
				context,
				TEST_USER_EMPTY,
				{signedConsentForm: true, profileComplete: true},
				{dateOfBirth: '1990-01-15'}
			)

			// WHEN: User navigates to profile
			await page.goto('/profile')

			// THEN: Should see empty state message
			await expect(page.getByTestId('attendance-history-empty')).toBeVisible()
			await expect(page.getByText('No events attended yet')).toBeVisible()
		})
	})
})

test.describe('Account Activity (AC3)', () => {
	test.describe('AC3: Account activity shows recent check-ins with timestamps', () => {
		test.beforeEach(async () => {
			await seedUserWithHistory(TEST_USER_WITH_HISTORY.uid)
		})

		test.afterEach(async ({context}) => {
			await clearAuthenticatedUser(context, TEST_USER_WITH_HISTORY.uid)
			await cleanupTestData(TEST_USER_WITH_HISTORY.uid)
		})

		test('should display account activity section on profile', async ({page, context}) => {
			// GIVEN: User is authenticated with activity
			await injectAuthenticatedUser(
				context,
				TEST_USER_WITH_HISTORY,
				{signedConsentForm: true, profileComplete: true},
				{dateOfBirth: '1990-01-15'}
			)

			// WHEN: User navigates to profile
			await page.goto('/profile')

			// THEN: Account activity section should be visible
			await expect(page.getByTestId('account-activity-section')).toBeVisible()
			await expect(page.getByText('Account Activity')).toBeVisible()
		})

		test('should display activity items with type and timestamp', async ({page, context}) => {
			// GIVEN: User with check-in activity
			await injectAuthenticatedUser(
				context,
				TEST_USER_WITH_HISTORY,
				{signedConsentForm: true, profileComplete: true},
				{dateOfBirth: '1990-01-15'}
			)

			// WHEN: User navigates to profile
			await page.goto('/profile')

			// THEN: Should see activity items with check-in type
			await expect(page.getByTestId('account-activity')).toBeVisible()
			const activityItems = page.getByTestId('account-activity-item')
			// Should have check-in activities + consent activity
			expect(await activityItems.count()).toBeGreaterThanOrEqual(2)
		})

		test('should display consent signing in activity', async ({page, context}) => {
			// GIVEN: User who has signed consent
			await injectAuthenticatedUser(
				context,
				TEST_USER_WITH_HISTORY,
				{signedConsentForm: true, profileComplete: true},
				{dateOfBirth: '1990-01-15'}
			)

			// WHEN: User navigates to profile
			await page.goto('/profile')

			// THEN: Should see consent activity
			await expect(page.getByText('Signed consent form')).toBeVisible()
		})

		test('should display check-in activities with event names', async ({page, context}) => {
			// GIVEN: User with check-in history
			await injectAuthenticatedUser(
				context,
				TEST_USER_WITH_HISTORY,
				{signedConsentForm: true, profileComplete: true},
				{dateOfBirth: '1990-01-15'}
			)

			// WHEN: User navigates to profile
			await page.goto('/profile')

			// THEN: Should see check-in descriptions with event names
			const activitySection = page.getByTestId('account-activity-section')
			await expect(activitySection.getByText(/Checked in to/).first()).toBeVisible()
		})
	})

	test.describe('Minimal activity state', () => {
		test.beforeEach(async () => {
			await seedEmptyUser(TEST_USER_EMPTY.uid)
		})

		test.afterEach(async ({context}) => {
			await clearAuthenticatedUser(context, TEST_USER_EMPTY.uid)
			await cleanupTestData(TEST_USER_EMPTY.uid)
		})

		test('should display only consent activity when no check-ins', async ({page, context}) => {
			// GIVEN: User has signed consent but no check-in activity
			await injectAuthenticatedUser(
				context,
				TEST_USER_EMPTY,
				{signedConsentForm: true, profileComplete: true},
				{dateOfBirth: '1990-01-15'}
			)

			// WHEN: User navigates to profile
			await page.goto('/profile')

			// THEN: Should see only consent activity (no check-ins)
			const activitySection = page.getByTestId('account-activity-section')
			await expect(activitySection.getByText('Signed consent form')).toBeVisible()
			// Only one activity item (consent)
			const activityItems = page.getByTestId('account-activity-item')
			await expect(activityItems).toHaveCount(1)
		})
	})
})
