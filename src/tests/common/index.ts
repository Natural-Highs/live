/**
 * Shared Test Utilities
 *
 * Common types and seed functions used by both E2E and integration test fixtures.
 * This layer eliminates cross-layer imports between E2E and integration.
 */

// Emulator configuration (single source of truth)
export {
	applyEmulatorEnvironment,
	EMULATOR_CONFIG,
	EMULATOR_PROJECT_ID,
	getAuthEmulatorUrl,
	getEmulatorEnvironment,
	getFirestoreEmulatorUrl
} from './emulator-config'

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
	ensureEmulatorConnected,
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
