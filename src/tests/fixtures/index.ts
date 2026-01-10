/**
 * Fixture Index - Barrel exports with mergeTests composition
 *
 * This file provides the standard test fixture for E2E tests by
 * composing multiple specialized fixtures using Playwright's mergeTests().
 *
 * Usage Pattern:
 * - Import `test` and `expect` from this file for E2E tests
 * - All fixtures from auth, network, session are available
 * - For admin-specific tests, import from admin.fixture.ts instead
 *
 * Fixture Composition Architecture:
 * - base (Playwright) → auth → admin
 * - base (Playwright) → events (Firestore emulator helpers)
 * - Merged: auth + events + network + firebase-reset = test
 *
 * @example
 * ```typescript
 * import {test, expect} from '../fixtures'
 * import {createFirestoreEvent} from '../fixtures/events.fixture'
 *
 * test('user can check in to event', async ({page}) => {
 *   await createFirestoreEvent({name: 'Test Event', eventCode: '1234', isActive: true})
 *   await page.goto('/guest')
 *   // ... test implementation
 * })
 * ```
 */

import {mergeTests} from '@playwright/test'
import {test as authTest} from './auth.fixture'
import {test as eventsTest} from './events.fixture'
import {test as firebaseResetTest} from './firebase-reset.fixture'
import {test as networkTest} from './network.fixture'

/**
 * Merged test fixture combining auth, events, network, and firebase-reset fixtures.
 *
 * Provides:
 * - From auth.fixture: authenticatedUser, setMagicLinkEmail, clearMagicLinkEmail,
 *   mockSuccessfulMagicLinkSignIn, mockFailedMagicLinkSignIn
 * - From events.fixture: Firestore emulator helpers (createFirestoreEvent, etc.)
 * - From network.fixture: mockApi (MockApiHelper for typed, chainable API mocking)
 * - From firebase-reset.fixture: workerPrefix (worker-scoped isolation prefix),
 *   workerCleanup (auto-cleanup at worker start), isolatedDocId, isolatedPath
 */
export const test = mergeTests(authTest, eventsTest, networkTest, firebaseResetTest)

/**
 * Re-export expect from Playwright for convenience.
 */
export {expect} from '@playwright/test'
export {test as adminTest} from './admin.fixture'
/**
 * Re-export individual fixtures for selective composition.
 * Use these when you need specific fixtures without full merge.
 */
/**
 * Re-export pure functions from fixtures for unit test compatibility.
 */
export {
	buildFirebaseAuthResponse,
	buildFirebaseErrorResponse,
	createMockUser,
	test as authTest
} from './auth.fixture'
export type {EmulatorHealthConfig, HealthCheckResult} from './emulator-health.fixture'
/**
 * Re-export emulator health check helpers.
 */
export {
	checkEmulatorsAvailable,
	waitForAuthEmulator,
	waitForEmulators,
	waitForFirestoreEmulator
} from './emulator-health.fixture'
export {test as eventsTest} from './events.fixture'
export {test as firebaseResetTest} from './firebase-reset.fixture'
export type {MinorDemographicsData, TestUserDocument} from './firestore.fixture'
/**
 * Re-export Firestore helpers for data seeding.
 */
export {
	clearFirestoreEmulator,
	createTestEventWithRetry,
	createTestGuestWithRetry,
	createTestUser,
	createTestUserDocument,
	createTestUserDocumentWithRetry,
	// Retryable versions for CI resilience
	createTestUserWithRetry,
	deleteTestEventWithRetry,
	deleteTestGuestWithRetry,
	deleteTestUser,
	deleteTestUserDocument,
	deleteTestUserDocumentWithRetry,
	deleteTestUserWithRetry,
	isFirestoreEmulatorAvailable
} from './firestore.fixture'
export {MockApiHelper, test as networkTest} from './network.fixture'
export type {RetryConfig} from './retry-firestore.fixture'
/**
 * Re-export retry helpers for transient failure handling.
 */
export {isRetryableError, withRetry, withRetryWrapper} from './retry-firestore.fixture'
export type {SessionData, TestClaims, TestUser, TestUserDocData} from './session.fixture'
/**
 * Re-export session helpers for direct session manipulation.
 */
export {
	buildTestSessionCookie,
	clearAuthenticatedUser,
	clearSessionCookie,
	injectAdminSessionCookie,
	injectAuthenticatedUser,
	injectSessionCookie,
	unsealTestSessionCookie
} from './session.fixture'
export type {IsolatedCleanupConfig} from './test-isolation.fixture'
/**
 * Re-export test isolation helpers for parallel worker support.
 */
export {
	belongsToWorker,
	DEFAULT_COLLECTIONS,
	getBasePath,
	getIsolatedDocId,
	getIsolatedPath,
	getWorkerPrefix
} from './test-isolation.fixture'
