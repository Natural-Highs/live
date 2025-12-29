/**
 * Firebase Auto-Reset Fixture for E2E Testing
 *
 * Provides automatic Firestore cleanup before each test to ensure
 * test isolation. Uses the emulator REST API for efficient bulk deletion.
 *
 * Key patterns:
 * - Auto-fixture clears Firestore before each test (not after)
 * - Uses emulator REST API for fast bulk deletion
 * - Composable with other fixtures via mergeTests
 *
 * IMPORTANT: This fixture requires the Firebase emulator to be running.
 * The emulator host is configured via FIRESTORE_EMULATOR_HOST environment variable.
 *
 * @example
 * ```typescript
 * import {test, expect} from '../fixtures'
 *
 * // autoCleanFirestore is applied automatically - no explicit call needed
 * test('creates user document', async ({page, autoCleanFirestore}) => {
 *   // Firestore is already clean at this point
 *   await page.goto('/profile')
 *   // ... test that creates data
 *   // Data will be cleaned before the next test
 * })
 * ```
 */

import {test as base} from '@playwright/test'
import {clearFirestoreEmulator, isFirestoreEmulatorAvailable} from './firestore.fixture'

/**
 * Firebase reset fixture types
 */
interface FirebaseResetFixtures {
	/**
	 * Auto-fixture that clears Firestore before each test.
	 * This fixture runs automatically - no explicit call needed.
	 *
	 * The fixture clears all data BEFORE the test runs, ensuring
	 * a clean slate for each test regardless of previous test outcomes.
	 */
	autoCleanFirestore: undefined
}

/**
 * Playwright fixture that provides automatic Firestore cleanup
 */
export const test = base.extend<FirebaseResetFixtures>({
	// Auto-fixture: { auto: true } means it runs automatically for every test
	autoCleanFirestore: [
		async (_deps, use) => {
			// Check if emulator is available before attempting cleanup
			const emulatorAvailable = await isFirestoreEmulatorAvailable()

			if (emulatorAvailable) {
				// Clear Firestore BEFORE the test runs
				await clearFirestoreEmulator()
			}

			// Run the test
			await use(undefined)

			// No cleanup after - next test will clean before it runs
			// This ensures clean state even if the test fails
		},
		{auto: true}
	]
})

export {expect} from '@playwright/test'

/**
 * Re-export Firestore helpers for direct use when needed
 */
export {
	clearFirestoreEmulator,
	createTestUser,
	createTestUserDocument,
	deleteTestUser,
	deleteTestUserDocument,
	isFirestoreEmulatorAvailable
} from './firestore.fixture'
