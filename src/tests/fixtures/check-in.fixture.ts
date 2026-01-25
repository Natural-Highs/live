/**
 * Check-in Test Fixture
 *
 * Composite fixture for check-in E2E tests that combines:
 * - Authenticated user session (via session cookie injection)
 * - Firestore event seeding for real API calls
 * - Cleanup between tests for isolation
 *
 * This fixture enables E2E tests to use real server functions
 * instead of page.route() mocks for success paths.
 *
 * Uses workerPrefix for parallel worker data isolation.
 * Event IDs are unique per worker to prevent collisions.
 *
 * @see src/tests/fixtures/auth.fixture.ts - Base auth fixture
 * @see src/tests/fixtures/firestore.fixture.ts - Firestore seeding
 */

import {mergeTests} from '@playwright/test'
import {test as authTest} from './auth.fixture'
import {test as firebaseResetTest} from './firebase-reset.fixture'
import {
	createTestEvent,
	createTestUserDocument,
	deleteTestEvent,
	deleteTestUserDocument,
	type TestEventDocument
} from './firestore.fixture'

// Merge auth and firebase-reset fixtures to get workerPrefix
const baseTest = mergeTests(authTest, firebaseResetTest)

/**
 * Generate a worker-specific event code from workerPrefix.
 * Extracts numeric worker index and pads to 4 digits.
 * Examples: w0 -> 1000, w1 -> 1001, w9 -> 1009
 */
function getWorkerEventCode(workerPrefix: string): string {
	const match = workerPrefix.match(/w(\d+)/)
	const workerIndex = match ? parseInt(match[1], 10) : 0
	return String(1000 + workerIndex).padStart(4, '0')
}

/**
 * Get default test event with worker-isolated ID and event code.
 * Uses workerPrefix for parallel worker isolation.
 */
function getDefaultTestEvent(workerPrefix: string): TestEventDocument {
	return {
		id: `${workerPrefix}__checkin-event`,
		name: 'Community Session',
		eventCode: getWorkerEventCode(workerPrefix),
		eventTypeId: 'community',
		isActive: true,
		activatedAt: new Date()
	}
}

/**
 * Check-in specific fixtures.
 */
interface CheckInFixtures {
	/**
	 * Seed the test event in Firestore.
	 * Call in beforeEach to set up event data.
	 */
	seedTestEvent: (event?: Partial<TestEventDocument>) => Promise<void>

	/**
	 * Clean up test event from Firestore.
	 * Called automatically in afterEach.
	 */
	cleanupTestEvent: () => Promise<void>

	/**
	 * Clean up all test data (events, userEvents).
	 * Called automatically in beforeEach and afterEach.
	 */
	cleanupAllTestData: () => Promise<void>

	/**
	 * The test event data for assertions.
	 */
	testEvent: TestEventDocument
}

/**
 * Base test extended with check-in fixtures.
 */
const checkInTest = baseTest.extend<CheckInFixtures>({
	testEvent: async ({workerPrefix}, use) => {
		await use(getDefaultTestEvent(workerPrefix))
	},

	seedTestEvent: async ({authenticatedUser, workerPrefix}, use) => {
		const defaultEvent = getDefaultTestEvent(workerPrefix)

		const seed = async (eventOverrides: Partial<TestEventDocument> = {}) => {
			const event: TestEventDocument = {
				...defaultEvent,
				...eventOverrides
			}

			// Create the test event
			await createTestEvent(event)

			// Also create the user document in Firestore
			// The session cookie has the user, but some routes may query Firestore
			await createTestUserDocument({
				uid: authenticatedUser.uid,
				email: authenticatedUser.email,
				displayName: authenticatedUser.displayName,
				profileComplete: true,
				signedConsentForm: true
			})
		}

		await use(seed)
	},

	cleanupTestEvent: async ({workerPrefix}, use) => {
		const defaultEvent = getDefaultTestEvent(workerPrefix)

		const cleanup = async () => {
			await deleteTestEvent(defaultEvent.id)
		}

		await use(cleanup)
	},

	cleanupAllTestData: async ({authenticatedUser, workerPrefix}, use) => {
		const defaultEvent = getDefaultTestEvent(workerPrefix)

		const cleanup = async () => {
			// Clean only this fixture's test data - NOT global emulator wipe
			// Worker-scoped cleanup runs automatically via firebase-reset fixture
			await deleteTestEvent(defaultEvent.id)
			await deleteTestUserDocument(authenticatedUser.uid)
		}

		// Don't clean in setup - let beforeEach handle it explicitly
		// This prevents race conditions with fixture ordering

		await use(cleanup)

		// Clean after test to ensure isolation
		await cleanup()
	}
})

/**
 * Merged test with auth and check-in fixtures.
 * Use this in check-in.spec.ts for full fixture access.
 */
export const test = checkInTest

export {expect} from '@playwright/test'

// Re-export for convenience
export {TEST_CODES} from '../factories/events.factory'
