/**
 * Shared Test Utilities
 *
 * Common types and seed functions used by both E2E and integration test fixtures.
 * This layer eliminates cross-layer imports between E2E and integration.
 */

// Seed functions
export {
	cleanupTestApp,
	clearFirestoreEmulator,
	createTestEvent,
	createTestGuest,
	createTestResponse,
	createTestUser,
	createTestUserDocument,
	deleteAllTestEvents,
	deleteAllTestGuests,
	deleteAllTestResponses,
	deleteTestEvent,
	deleteTestGuest,
	deleteTestResponse,
	deleteTestUser,
	deleteTestUserDocument,
	ensureEmulatorEnvironment,
	getTestApp,
	getTestDb,
	isFirestoreEmulatorAvailable,
	waitForFirestoreEmulator
} from './seed-functions'
// Types
export type {
	MinorDemographicsData,
	TestEventDocument,
	TestGuestDocument,
	TestGuestEventDocument,
	TestResponseDocument,
	TestUserDocument
} from './types'
