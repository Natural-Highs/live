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
 * - Worker isolation via `workerPrefix` fixture prevents parallel test collisions
 * - Use session fixtures for authenticated state
 * - Use Firestore fixtures to seed events and userEvents
 * - Use data-testid selectors for stability
 * - Use toPass() for data propagation assertions
 */

import {deleteTestUser, getTestDb} from '../common'
import {TEST_CODES} from '../factories/events.factory'
import {expect, test} from '../fixtures'
import type {TestUser} from '../fixtures/session.fixture'
import {clearAuthenticatedUser, injectAuthenticatedUser} from '../fixtures/session.fixture'

/**
 * Generate worker-isolated test user.
 * Each worker gets unique IDs to prevent parallel test collisions.
 */
function getTestUserWithHistory(workerPrefix: string): TestUser {
	return {
		uid: `${workerPrefix}__test-user-history`,
		email: `${workerPrefix}__history-test@example.com`,
		displayName: 'History Test User'
	}
}

function getTestUserEmpty(workerPrefix: string): TestUser {
	return {
		uid: `${workerPrefix}__test-user-empty`,
		email: `${workerPrefix}__empty-test@example.com`,
		displayName: 'Empty Test User'
	}
}

function getTestUserGuestConverted(workerPrefix: string): TestUser {
	return {
		uid: `${workerPrefix}__test-user-converted`,
		email: `${workerPrefix}__converted-test@example.com`,
		displayName: 'Converted Guest User'
	}
}

/**
 * Get worker-isolated event IDs.
 */
function getEventIds(workerPrefix: string) {
	return {
		workshop: `${workerPrefix}__event-workshop`,
		retreat: `${workerPrefix}__event-retreat`,
		guestConverted: `${workerPrefix}__event-guest-converted`
	}
}

/**
 * Seed user with attendance history (regular check-ins).
 * Only seeds events and userEvents - user document is created by injectAuthenticatedUser.
 */
async function seedUserWithHistory(uid: string, workerPrefix: string) {
	const db = getTestDb()
	const eventIds = getEventIds(workerPrefix)
	const now = new Date()
	const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
	const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

	// Create events with worker-isolated IDs
	await db.collection('events').doc(eventIds.workshop).set({
		name: 'Mindfulness Workshop',
		eventCode: TEST_CODES.VALID,
		startDate: lastWeek,
		location: 'Community Center',
		isActive: false,
		createdAt: lastMonth,
		updatedAt: lastWeek
	})

	await db.collection('events').doc(eventIds.retreat).set({
		name: 'Weekend Retreat',
		eventCode: '5678',
		startDate: lastMonth,
		location: 'Mountain Lodge',
		isActive: false,
		createdAt: lastMonth,
		updatedAt: lastMonth
	})

	// Create userEvents (check-ins) with isolated event IDs
	await db.collection('userEvents').add({
		userId: uid,
		eventId: eventIds.workshop,
		registeredAt: lastWeek,
		createdAt: lastWeek
	})

	await db.collection('userEvents').add({
		userId: uid,
		eventId: eventIds.retreat,
		registeredAt: lastMonth,
		createdAt: lastMonth
	})
}

/**
 * Seed user with guest-converted check-ins (wasGuest: true).
 * Only seeds events and userEvents - user document is created by injectAuthenticatedUser.
 */
async function seedUserWithGuestHistory(uid: string, workerPrefix: string) {
	const db = getTestDb()
	const eventIds = getEventIds(workerPrefix)
	const now = new Date()
	const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

	// Create event with worker-isolated ID
	await db.collection('events').doc(eventIds.guestConverted).set({
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
		eventId: eventIds.guestConverted,
		registeredAt: lastWeek,
		createdAt: now,
		migratedFromGuestEventId: `${workerPrefix}__guest-event-old`
	})
}

/**
 * Clean up test data.
 * Uses deleteTestUser to properly handle subcollections (private, passkeys, demographicHistory).
 */
async function cleanupTestData(uid: string, workerPrefix: string) {
	const db = getTestDb()
	const eventIds = getEventIds(workerPrefix)

	// Delete userEvents for this user
	const userEventsSnapshot = await db.collection('userEvents').where('userId', '==', uid).get()
	const batch = db.batch()
	for (const doc of userEventsSnapshot.docs) {
		batch.delete(doc.ref)
	}
	await batch.commit()

	// Delete test events with worker-isolated IDs
	for (const eventId of Object.values(eventIds)) {
		await db.collection('events').doc(eventId).delete()
	}

	// Delete user document and subcollections using proper helper
	await deleteTestUser(uid)
}

test.describe('Attendance History (AC1, AC2)', () => {
	test.describe('AC1: User navigates to history and sees events', () => {
		test('should display attendance history section on profile', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUserWithHistory(workerPrefix)
			await seedUserWithHistory(testUser.uid, workerPrefix)

			try {
				// GIVEN: User is authenticated with event history
				await injectAuthenticatedUser(
					context,
					testUser,
					{signedConsentForm: true, profileComplete: true},
					{dateOfBirth: '1990-01-15'}
				)

				// WHEN: User navigates to profile
				await page.goto('/profile')

				// THEN: Attendance history section should be visible
				await expect(page.getByTestId('attendance-history-section')).toBeVisible()
				await expect(page.getByText('Attendance History')).toBeVisible()
			} finally {
				await clearAuthenticatedUser(context, testUser.uid)
				await cleanupTestData(testUser.uid, workerPrefix)
			}
		})

		test('should display chronological list of attended events', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUserWithHistory(workerPrefix)
			await seedUserWithHistory(testUser.uid, workerPrefix)

			try {
				// GIVEN: User is authenticated with multiple events
				await injectAuthenticatedUser(
					context,
					testUser,
					{signedConsentForm: true, profileComplete: true},
					{dateOfBirth: '1990-01-15'}
				)

				// WHEN: User navigates to profile
				await page.goto('/profile')

				// THEN: Should see event cards in the history (use toPass for data propagation)
				await expect(async () => {
					await expect(page.getByTestId('attendance-history')).toBeVisible()
					const eventCards = page.getByTestId('attendance-history-item')
					await expect(eventCards.first()).toBeVisible()
					await expect(eventCards).toHaveCount(2)
				}).toPass({timeout: 15000})
			} finally {
				await clearAuthenticatedUser(context, testUser.uid)
				await cleanupTestData(testUser.uid, workerPrefix)
			}
		})

		test('should display event name and date', async ({page, context, workerPrefix}) => {
			const testUser = getTestUserWithHistory(workerPrefix)
			await seedUserWithHistory(testUser.uid, workerPrefix)

			try {
				// GIVEN: User is authenticated with events
				await injectAuthenticatedUser(
					context,
					testUser,
					{signedConsentForm: true, profileComplete: true},
					{dateOfBirth: '1990-01-15'}
				)

				// WHEN: User navigates to profile
				await page.goto('/profile')

				// THEN: Should see event details in attendance history section (use toPass for data propagation)
				const historySection = page.getByTestId('attendance-history-section')
				await expect(async () => {
					await expect(historySection).toBeVisible()
					await expect(historySection.getByText('Mindfulness Workshop')).toBeVisible()
					await expect(historySection.getByText('Weekend Retreat')).toBeVisible()
				}).toPass({timeout: 15000})
			} finally {
				await clearAuthenticatedUser(context, testUser.uid)
				await cleanupTestData(testUser.uid, workerPrefix)
			}
		})
	})

	test.describe('AC2: Guest check-ins display with Guest badge', () => {
		test('should display Guest badge for pre-conversion check-ins', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUserGuestConverted(workerPrefix)
			await seedUserWithGuestHistory(testUser.uid, workerPrefix)

			try {
				// GIVEN: User has check-ins from before account creation (guest check-ins)
				await injectAuthenticatedUser(
					context,
					testUser,
					{signedConsentForm: true, profileComplete: true},
					{dateOfBirth: '1990-01-15'}
				)

				// WHEN: User navigates to profile
				await page.goto('/profile')

				// THEN: Should see Guest badge on migrated event (use toPass for data propagation)
				await expect(async () => {
					await expect(page.getByTestId('attendance-history-section')).toBeVisible()
					await expect(page.getByTestId('guest-badge')).toBeVisible()
					await expect(page.getByTestId('guest-badge')).toHaveText('Guest')
				}).toPass({timeout: 15000})
			} finally {
				await clearAuthenticatedUser(context, testUser.uid)
				await cleanupTestData(testUser.uid, workerPrefix)
			}
		})

		test('should show clean event name without inline text', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUserGuestConverted(workerPrefix)
			await seedUserWithGuestHistory(testUser.uid, workerPrefix)

			try {
				// GIVEN: User with guest history
				await injectAuthenticatedUser(
					context,
					testUser,
					{signedConsentForm: true, profileComplete: true},
					{dateOfBirth: '1990-01-15'}
				)

				// WHEN: User navigates to profile
				await page.goto('/profile')

				// THEN: Event name should not have "(as Guest)" inline text (use toPass for data propagation)
				const historySection = page.getByTestId('attendance-history-section')
				await expect(async () => {
					await expect(historySection).toBeVisible()
					await expect(historySection.getByText('Community Gathering')).toBeVisible()
					await expect(page.getByTestId('guest-badge')).toBeVisible()
				}).toPass({timeout: 15000})
			} finally {
				await clearAuthenticatedUser(context, testUser.uid)
				await cleanupTestData(testUser.uid, workerPrefix)
			}
		})
	})

	test.describe('Empty state for new users', () => {
		test('should display empty state when no events attended', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUserEmpty(workerPrefix)

			try {
				// GIVEN: User has no event history
				await injectAuthenticatedUser(
					context,
					testUser,
					{signedConsentForm: true, profileComplete: true},
					{dateOfBirth: '1990-01-15'}
				)

				// WHEN: User navigates to profile
				await page.goto('/profile')

				// THEN: Should see empty state message
				await expect(page.getByTestId('attendance-history-empty')).toBeVisible()
				await expect(page.getByText('No events attended yet')).toBeVisible()
			} finally {
				await clearAuthenticatedUser(context, testUser.uid)
				await cleanupTestData(testUser.uid, workerPrefix)
			}
		})
	})
})

test.describe('Account Activity (AC3)', () => {
	test.describe('AC3: Account activity shows recent check-ins with timestamps', () => {
		test('should display account activity section on profile', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUserWithHistory(workerPrefix)
			await seedUserWithHistory(testUser.uid, workerPrefix)

			try {
				// GIVEN: User is authenticated with activity
				await injectAuthenticatedUser(
					context,
					testUser,
					{signedConsentForm: true, profileComplete: true},
					{dateOfBirth: '1990-01-15'}
				)

				// WHEN: User navigates to profile
				await page.goto('/profile')

				// THEN: Account activity section should be visible
				await expect(page.getByTestId('account-activity-section')).toBeVisible()
				await expect(page.getByText('Account Activity')).toBeVisible()
			} finally {
				await clearAuthenticatedUser(context, testUser.uid)
				await cleanupTestData(testUser.uid, workerPrefix)
			}
		})

		test('should display activity items with type and timestamp', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUserWithHistory(workerPrefix)
			await seedUserWithHistory(testUser.uid, workerPrefix)

			try {
				// GIVEN: User with check-in activity
				await injectAuthenticatedUser(
					context,
					testUser,
					{signedConsentForm: true, profileComplete: true},
					{dateOfBirth: '1990-01-15'}
				)

				// WHEN: User navigates to profile
				await page.goto('/profile')

				// THEN: Should see activity items with check-in type (use toPass for data propagation)
				await expect(async () => {
					await expect(page.getByTestId('account-activity')).toBeVisible()
					const activityItems = page.getByTestId('account-activity-item')
					await expect(activityItems.first()).toBeVisible()
					expect(await activityItems.count()).toBeGreaterThanOrEqual(2)
				}).toPass({timeout: 15000})
			} finally {
				await clearAuthenticatedUser(context, testUser.uid)
				await cleanupTestData(testUser.uid, workerPrefix)
			}
		})

		test('should display consent signing in activity', async ({page, context, workerPrefix}) => {
			const testUser = getTestUserWithHistory(workerPrefix)
			await seedUserWithHistory(testUser.uid, workerPrefix)

			try {
				// GIVEN: User who has signed consent
				await injectAuthenticatedUser(
					context,
					testUser,
					{signedConsentForm: true, profileComplete: true},
					{dateOfBirth: '1990-01-15'}
				)

				// WHEN: User navigates to profile
				await page.goto('/profile')

				// THEN: Should see consent activity (use toPass for data propagation)
				await expect(async () => {
					await expect(page.getByTestId('account-activity-section')).toBeVisible()
					await expect(page.getByText('Signed consent form')).toBeVisible()
				}).toPass({timeout: 15000})
			} finally {
				await clearAuthenticatedUser(context, testUser.uid)
				await cleanupTestData(testUser.uid, workerPrefix)
			}
		})

		test('should display check-in activities with event names', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUserWithHistory(workerPrefix)
			await seedUserWithHistory(testUser.uid, workerPrefix)

			try {
				// GIVEN: User with check-in history
				await injectAuthenticatedUser(
					context,
					testUser,
					{signedConsentForm: true, profileComplete: true},
					{dateOfBirth: '1990-01-15'}
				)

				// WHEN: User navigates to profile
				await page.goto('/profile')

				// THEN: Should see check-in descriptions with event names (use toPass for data propagation)
				const activitySection = page.getByTestId('account-activity-section')
				await expect(async () => {
					await expect(activitySection).toBeVisible()
					await expect(activitySection.getByText(/Checked in to/).first()).toBeVisible()
				}).toPass({timeout: 15000})
			} finally {
				await clearAuthenticatedUser(context, testUser.uid)
				await cleanupTestData(testUser.uid, workerPrefix)
			}
		})
	})

	test.describe('Minimal activity state', () => {
		test('should display only consent activity when no check-ins', async ({
			page,
			context,
			workerPrefix
		}) => {
			const testUser = getTestUserEmpty(workerPrefix)

			try {
				// GIVEN: User has signed consent but no check-in activity
				await injectAuthenticatedUser(
					context,
					testUser,
					{signedConsentForm: true, profileComplete: true},
					{dateOfBirth: '1990-01-15'}
				)

				// WHEN: User navigates to profile
				await page.goto('/profile')

				// THEN: Should see only consent activity (no check-ins) (use toPass for data propagation)
				await expect(async () => {
					const activitySection = page.getByTestId('account-activity-section')
					await expect(activitySection).toBeVisible()
					await expect(activitySection.getByText('Signed consent form')).toBeVisible()
					const activityItems = page.getByTestId('account-activity-item')
					await expect(activityItems).toHaveCount(1)
				}).toPass({timeout: 15000})
			} finally {
				await clearAuthenticatedUser(context, testUser.uid)
				await cleanupTestData(testUser.uid, workerPrefix)
			}
		})
	})
})
