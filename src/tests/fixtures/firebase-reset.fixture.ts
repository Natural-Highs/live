/**
 * Firebase Auto-Reset Fixture for E2E Testing
 *
 * Provides automatic Firestore cleanup using worker-scoped fixtures to ensure
 * test isolation. Uses workerInfo.workerIndex prefix for data isolation.
 *
 * Key patterns:
 * - Worker-scoped cleanup: Runs once per worker (~2 cycles), not per test (~50 cycles)
 * - Uses workerPrefix for isolation between parallel workers
 * - Tests within a worker run sequentially (Playwright guarantee)
 *
 * Why worker-scoped instead of per-test?
 * - Per-test cleanup causes 25x more REST calls to the emulator
 * - Excessive REST calls result in ECONNRESET errors
 * - Worker-scoped follows Playwright's recommended pattern
 *
 * @see https://playwright.dev/docs/test-parallel#isolate-test-data-between-parallel-workers
 * @see https://firebase.google.com/docs/emulator-suite/connect_firestore#clear_your_database_between_tests
 *
 * @example
 * ```typescript
 * import {test, expect} from '../fixtures'
 *
 * // workerCleanup runs automatically at worker start - no explicit call needed
 * test('creates user document', async ({page, workerPrefix}) => {
 *   // Worker data is already clean at this point
 *   const userId = `${workerPrefix}__user-1`
 *   await page.goto('/profile')
 *   // ... test that creates data
 *   // Data persists within worker (tests run sequentially)
 * })
 * ```
 *
 */

import {test as base, type WorkerInfo} from '@playwright/test'
import {isFirestoreEmulatorAvailable} from './firestore.fixture'
import {DEFAULT_COLLECTIONS, getWorkerPrefix, getIsolatedPath} from './test-isolation.fixture'

/**
 * Firebase reset fixture types - test-scoped fixtures
 */
interface FirebaseResetTestFixtures {
	/**
	 * Get an isolated document ID for this worker.
	 * Convenience method for prefixing document IDs.
	 *
	 * @example
	 * ```typescript
	 * test('my test', async ({isolatedDocId}) => {
	 *   const userId = isolatedDocId('user-123')
	 *   // userId: "w0__user-123"
	 * })
	 * ```
	 */
	isolatedDocId: (baseId: string) => string

	/**
	 * Get an isolated collection path for this worker.
	 * Convenience method for prefixing collection paths.
	 *
	 * @example
	 * ```typescript
	 * test('my test', async ({isolatedPath}) => {
	 *   const usersCollection = isolatedPath('users')
	 *   // usersCollection: "w0__users"
	 * })
	 * ```
	 */
	isolatedPath: (basePath: string) => string
}

/**
 * Firebase reset fixture types - worker-scoped fixtures
 */
interface FirebaseResetWorkerFixtures {
	/**
	 * Worker prefix for data isolation.
	 * Format: "w0", "w1", etc. based on workerInfo.workerIndex.
	 *
	 * @example
	 * ```typescript
	 * test('my test', async ({workerPrefix}) => {
	 *   const userId = `${workerPrefix}__user-123`
	 *   await createTestUser(userId, {...})
	 * })
	 * ```
	 */
	workerPrefix: string

	/**
	 * Worker-scoped fixture that clears Firestore data for this worker.
	 * Runs automatically at worker start - no explicit call needed.
	 *
	 * Cleanup happens ONCE per worker (not per test), following Playwright's
	 * recommended pattern for test data isolation.
	 */
	workerCleanup: void
}

/**
 * Firestore emulator configuration
 */
const EMULATOR_PROJECT_ID = 'demo-natural-highs'
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180'

/**
 * Clean isolated data for a specific worker by deleting documents with matching prefix.
 *
 * This function deletes:
 * 1. Documents in canonical collections where doc ID starts with worker prefix
 * 2. Entire prefixed collections (e.g., w0__users)
 *
 * @param workerInfo - WorkerInfo to derive prefix from
 */
async function cleanWorkerData(workerInfo: WorkerInfo): Promise<void> {
	const prefix = getWorkerPrefix(workerInfo)
	const host = FIRESTORE_EMULATOR_HOST

	// Strategy: Query each collection for documents starting with prefix and delete them
	// Also check for isolated collections (w0__collection)
	for (const collection of DEFAULT_COLLECTIONS) {
		// 1. Clean prefixed documents in canonical collection (users/w0__doc)
		try {
			// Use REST API to query documents with prefix
			// This is more efficient than fetching all docs and filtering
			const queryUrl = `http://${host}/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents/${collection}`
			const response = await fetch(queryUrl, {
				method: 'GET',
				signal: AbortSignal.timeout(5000)
			})

			if (response.ok) {
				const data = await response.json()
				const documents = data.documents || []

				for (const doc of documents) {
					// Extract document ID from the full path
					const docPath = doc.name as string
					const docId = docPath.split('/').pop() || ''

					if (docId.startsWith(prefix)) {
						// Delete this isolated document
						await fetch(`http://${host}/v1/${docPath}`, {
							method: 'DELETE',
							signal: AbortSignal.timeout(2000)
						})
					}
				}
			}
		} catch {
			// Collection may not exist or other transient error - continue
		}

		// 2. Clean entire isolated collection (w0__users)
		const isolatedCollection = getIsolatedPath(prefix, collection)
		try {
			// Delete isolated collection by clearing all documents in it
			// The emulator API doesn't support deleting collections directly,
			// but we can query and delete all docs within
			const queryResponse = await fetch(
				`http://${host}/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents/${isolatedCollection}`,
				{
					method: 'GET',
					signal: AbortSignal.timeout(5000)
				}
			)

			if (queryResponse.ok) {
				const data = await queryResponse.json()
				const documents = data.documents || []

				for (const doc of documents) {
					const docPath = doc.name as string
					await fetch(`http://${host}/v1/${docPath}`, {
						method: 'DELETE',
						signal: AbortSignal.timeout(2000)
					})
				}
			}
		} catch {
			// Isolated collection may not exist - that's fine
		}
	}
}

/**
 * Playwright fixture that provides automatic worker-scoped Firestore cleanup
 */
export const test = base.extend<FirebaseResetTestFixtures, FirebaseResetWorkerFixtures>({
	// Worker-scoped: Provide worker prefix derived from workerInfo
	workerPrefix: [
		async ({}, use, workerInfo) => {
			const prefix = getWorkerPrefix(workerInfo)
			await use(prefix)
		},
		{scope: 'worker'}
	],

	// Worker-scoped: Auto-cleanup runs once per worker (not per test)
	workerCleanup: [
		async ({}, use, workerInfo) => {
			// Check if emulator is available before attempting cleanup
			const emulatorAvailable = await isFirestoreEmulatorAvailable()

			if (emulatorAvailable) {
				// Clean this worker's data at worker start
				await cleanWorkerData(workerInfo)
			}

			// Run all tests in this worker
			await use(undefined)

			// No cleanup after - next worker start will clean its own data
			// Emulator restarts between CI runs anyway
		},
		{scope: 'worker', auto: true}
	],

	// Test-scoped: Provide isolated document ID helper (uses worker prefix)
	isolatedDocId: async ({workerPrefix}, use) => {
		const helper = (baseId: string) => `${workerPrefix}__${baseId}`
		await use(helper)
	},

	// Test-scoped: Provide isolated path helper (uses worker prefix)
	isolatedPath: async ({workerPrefix}, use) => {
		const helper = (basePath: string) => `${workerPrefix}__${basePath}`
		await use(helper)
	}
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

/**
 * Re-export test isolation helpers
 */
export {
	belongsToWorker,
	DEFAULT_COLLECTIONS,
	getBasePath,
	getIsolatedDocId,
	getIsolatedPath,
	getWorkerPrefix
} from './test-isolation.fixture'
