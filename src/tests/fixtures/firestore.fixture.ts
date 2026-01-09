/**
 * Firestore Fixtures for E2E Testing
 *
 * Provides user document seeding helpers for Playwright tests.
 * Uses Firebase Admin SDK to create/delete test data in the Firestore emulator.
 *
 * Key patterns:
 * - User documents: users/{uid}
 * - Minor demographics: users/{uid}/private/demographics
 * - Demographic history: users/{uid}/demographicHistory/{id}
 * - Passkeys: users/{uid}/passkeys/{id}
 *
 * Usage:
 * - createTestUserDocument(user) - Create user in Firestore emulator
 * - deleteTestUserDocument(uid) - Remove user and subcollections
 * - clearFirestoreEmulator() - Clear all test data
 *
 * Test Isolation:
 * - Use `workerPrefix` fixture for parallel worker isolation
 * - Example: `await createTestUser(\`${workerPrefix}__user-123\`, {...})`
 *
 * IMPORTANT: This fixture requires the Firestore emulator to be running.
 * The emulator host is configured via FIRESTORE_EMULATOR_HOST environment variable.
 */

import {withRetryWrapper} from './retry-firestore.fixture'

// Re-export all types from common layer
export type {
	MinorDemographicsData,
	TestEventDocument,
	TestGuestDocument,
	TestGuestEventDocument,
	TestUserDocument
} from '../common'

// Re-export all seed functions from common layer
export {
	cleanupTestApp,
	clearFirestoreEmulator,
	createTestEvent,
	createTestGuest,
	createTestUser,
	createTestUserDocument,
	deleteAllTestEvents,
	deleteAllTestGuests,
	deleteTestEvent,
	deleteTestGuest,
	deleteTestUser,
	deleteTestUserDocument,
	isFirestoreEmulatorAvailable,
	waitForFirestoreEmulator
} from '../common'

// Import for creating retryable wrappers
import {
	createTestEvent,
	createTestGuest,
	createTestUser,
	createTestUserDocument,
	deleteTestEvent,
	deleteTestGuest,
	deleteTestUser,
	deleteTestUserDocument
} from '../common'

// =============================================================================
// Retryable Wrappers
// =============================================================================

// Retryable seed functions - optional utilities for edge cases
// Primary ECONNRESET defense is worker-scoped cleanup (firebase-reset.fixture.ts)
export const createTestUserWithRetry = withRetryWrapper(createTestUser)
export const createTestUserDocumentWithRetry = withRetryWrapper(createTestUserDocument)
export const createTestEventWithRetry = withRetryWrapper(createTestEvent)
export const createTestGuestWithRetry = withRetryWrapper(createTestGuest)
export const deleteTestUserWithRetry = withRetryWrapper(deleteTestUser)
export const deleteTestUserDocumentWithRetry = withRetryWrapper(deleteTestUserDocument)
export const deleteTestEventWithRetry = withRetryWrapper(deleteTestEvent)
export const deleteTestGuestWithRetry = withRetryWrapper(deleteTestGuest)
