/**
 * Integration Test Fixtures Index
 *
 * Barrel export for integration test fixtures.
 * Provides typed fixtures for real emulator testing with CDP-based WebAuthn.
 *
 * Usage:
 * - Import specific fixture test objects for extend/merge patterns
 * - Import types for fixture composition
 * - Import common layer re-exports for seed functions
 */

// Re-export expect from Playwright
export {expect} from '@playwright/test'
// =============================================================================
// Re-exports from common layer (convenience)
// =============================================================================
export {
	EMULATOR_CONFIG,
	EMULATOR_PROJECT_ID,
	getAuthEmulatorUrl,
	getEmulatorEnvironment,
	getFirestoreEmulatorUrl
} from '../../common'
// =============================================================================
// Firebase/Emulator Fixture
// =============================================================================
export {
	type EmulatorHealthResult,
	type IntegrationFixtures,
	test as integrationTest
} from './firebase.fixture'

// =============================================================================
// Firestore Seed Fixture
// =============================================================================
export {
	createEventType,
	createFormTemplate,
	type FirestoreSeedFixtures,
	type TestEventType,
	type TestFormQuestion,
	type TestFormTemplate,
	test as firestoreSeedTest
} from './firestore-seed.fixture'
// =============================================================================
// OOB Codes Fixture (Email verification links)
// =============================================================================
export {
	type OobCode,
	type OobCodeFixtures,
	test as oobCodesTest
} from './oob-codes.fixture'
// =============================================================================
// WebAuthn Fixture (CDP Virtual Authenticator)
// =============================================================================
export {
	test as webauthnTest,
	type VirtualAuthenticatorOptions,
	type WebAuthnFixtureData,
	type WebAuthnFixtures
} from './webauthn.fixture'
