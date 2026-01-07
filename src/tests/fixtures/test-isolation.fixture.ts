/**
 * Test Isolation Fixture for Parallel Worker Support
 *
 * Provides worker-scoped data isolation to enable parallel test execution
 * without cross-worker data collisions. Each worker's data is prefixed with
 * a unique identifier derived from workerInfo.workerIndex.
 *
 * Key patterns:
 * - `workerPrefix` - Worker-scoped fixture providing unique prefix (e.g., "w0", "w1")
 * - `getWorkerPrefix(workerInfo)` - Generate prefix from worker index
 * - Cleanup only removes data with matching prefix (not global wipe)
 *
 * Why worker-scoped instead of per-test?
 * - Playwright guarantees tests within a worker run sequentially
 * - Worker-scoped cleanup runs once per worker (~2 cycles) vs per-test (~50 cycles)
 * - Reduces REST calls to emulator by 25x, eliminating ECONNRESET errors
 *
 * @see https://playwright.dev/docs/test-parallel#isolate-test-data-between-parallel-workers
 * @module tests/fixtures/test-isolation.fixture
 */

import {test as base, type WorkerInfo} from '@playwright/test'

/**
 * Generate a unique worker prefix from workerInfo.workerIndex.
 *
 * The prefix is derived from the workerIndex, providing isolation between
 * parallel workers. Format: "w0", "w1", "w2", etc.
 *
 * @param workerInfo - Playwright WorkerInfo object from worker context
 * @returns Unique prefix string for this worker (e.g., "w0", "w1")
 *
 * @example
 * ```typescript
 * test('creates user', async ({workerPrefix}) => {
 *   // workerPrefix: "w0" or "w1" depending on which worker runs this test
 * })
 * ```
 */
export function getWorkerPrefix(workerInfo: WorkerInfo): string {
	return `w${workerInfo.workerIndex}`
}

/**
 * Create an isolated document/collection path by prefixing with worker index.
 *
 * This enables multiple parallel workers to operate on "logically" the same
 * collection without collision. Each worker sees its own isolated namespace.
 *
 * @param prefix - Worker prefix (e.g., "w0", "w1")
 * @param basePath - Base collection/document path (e.g., "users", "events")
 * @returns Prefixed path (e.g., "w0__users")
 *
 * @example
 * ```typescript
 * test('my test', async ({workerPrefix}) => {
 *   const userPath = getIsolatedPath(workerPrefix, 'users')
 *   // userPath: "w0__users"
 *   await db.collection(userPath).doc('user1').set(data)
 * })
 * ```
 */
export function getIsolatedPath(prefix: string, basePath: string): string {
	return `${prefix}__${basePath}`
}

/**
 * Create an isolated document ID by prefixing with worker index.
 *
 * Unlike getIsolatedPath which prefixes collections, this prefixes document IDs
 * within a shared collection. Useful when you need documents in the canonical
 * collection location but isolated per worker.
 *
 * @param prefix - Worker prefix (e.g., "w0", "w1")
 * @param docId - Base document ID (e.g., "user-123", "event-1")
 * @returns Prefixed document ID (e.g., "w0__user-123")
 *
 * @example
 * ```typescript
 * test('my test', async ({workerPrefix}) => {
 *   const userId = getIsolatedDocId(workerPrefix, 'user-123')
 *   // userId: "w0__user-123"
 *   await db.collection('users').doc(userId).set(data)
 * })
 * ```
 */
export function getIsolatedDocId(prefix: string, docId: string): string {
	return `${prefix}__${docId}`
}

/**
 * Check if a path/ID belongs to a specific worker's isolated namespace.
 *
 * Used during cleanup to ensure we only delete data belonging to this worker,
 * not data from other parallel workers.
 *
 * @param path - Path or document ID to check
 * @param prefix - Worker prefix to match against
 * @returns true if path belongs to this worker's namespace
 *
 * @example
 * ```typescript
 * const belongs = belongsToWorker("w0__users", "w0")
 * // belongs: true
 * ```
 */
export function belongsToWorker(path: string, prefix: string): boolean {
	return path.startsWith(prefix)
}

/**
 * Extract the base path from an isolated path.
 *
 * Reverses getIsolatedPath to get the original collection/document name.
 *
 * @param isolatedPath - Prefixed path (e.g., "w0__users")
 * @returns Base path (e.g., "users") or original if not prefixed
 *
 * @example
 * ```typescript
 * const base = getBasePath("w0__users")
 * // base: "users"
 * ```
 */
export function getBasePath(isolatedPath: string): string {
	const separatorIndex = isolatedPath.indexOf('__')
	if (separatorIndex === -1 || !isolatedPath.startsWith('w')) {
		return isolatedPath // Not an isolated path
	}
	return isolatedPath.substring(separatorIndex + 2)
}

/**
 * Configuration for isolated cleanup operations.
 */
export interface IsolatedCleanupConfig {
	/** Collections to clean (base names, will be prefixed) */
	collections?: string[]
	/** Whether to clean prefixed collections (w0__users) in addition to docs */
	cleanIsolatedCollections?: boolean
	/** Whether to clean prefixed docs in canonical collections (users/w0__doc) */
	cleanIsolatedDocs?: boolean
}

/**
 * Default collections used in the Natural-Highs application.
 * These are the canonical Firestore collections that tests typically write to.
 */
export const DEFAULT_COLLECTIONS = [
	'users',
	'events',
	'guests',
	'guestEvents',
	'userEvents',
	'pendingConversions',
	'eventTypes',
	'formTemplates',
	'responses'
] as const

/**
 * Worker-scoped fixture interface
 */
interface WorkerFixtures {
	/** Worker prefix for data isolation (e.g., "w0", "w1") */
	workerPrefix: string
}

/**
 * Playwright test with worker-scoped isolation fixture.
 *
 * The workerPrefix fixture provides a unique prefix per worker, enabling
 * parallel test execution without data collisions. Tests within a worker
 * run sequentially (Playwright guarantee), so no intra-worker collision is possible.
 *
 * @example
 * ```typescript
 * import {test, expect} from '../fixtures'
 *
 * test('creates isolated data', async ({page, workerPrefix}) => {
 *   const userId = `${workerPrefix}__user-1`     // "w0__user-1" or "w1__user-1"
 *   const eventId = `${workerPrefix}__event-1`   // "w0__event-1"
 * })
 * ```
 */
// biome-ignore lint/complexity/noBannedTypes: Playwright extend() requires {} for test fixtures when only worker fixtures are defined
export const test = base.extend<{}, WorkerFixtures>({
	// Worker-scoped fixture - runs once per worker, not per test
	workerPrefix: [
		async ({}, use, workerInfo) => {
			const prefix = getWorkerPrefix(workerInfo)
			await use(prefix)
		},
		{scope: 'worker'}
	]
})

export {expect} from '@playwright/test'
