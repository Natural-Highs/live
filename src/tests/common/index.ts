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
	createTestUser,
	createTestUserDocument,
	deleteAllTestEvents,
	deleteAllTestGuests,
	deleteTestEvent,
	deleteTestGuest,
	deleteTestUser,
	deleteTestUserDocument,
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
	TestUserDocument
} from './types'
