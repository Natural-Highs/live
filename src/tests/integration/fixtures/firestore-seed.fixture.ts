/**
 * Firestore Seeding Fixture for Integration and E2E Testing
 *
 * Provides Playwright fixtures for seeding test data in Firestore emulator.
 * This is a wrapper around existing fixtures in src/tests/fixtures/ that exposes
 * them as Playwright fixtures for use in integration tests.
 *
 * Key patterns:
 * - Use Admin SDK to seed data directly (bypasses security rules)
 * - Auto-cleanup in beforeEach and afterEach
 * - Consistent with firebase.fixture.ts emulator connection
 *
 * @see Story 0-7: E2E Test Mock Elimination
 * @see src/tests/fixtures/firestore.fixture.ts - Base implementation
 */

import {test as base} from '@playwright/test'

export {setUserClaims} from '../../fixtures/auth.fixture'

export {
	createFirestoreEvent,
	createFirestoreGuest,
	createPendingConversion,
	createValidFirestoreEvent,
	deleteFirestoreEvent,
	deleteFirestoreGuest,
	deletePendingConversion,
	type FirestoreEventDocument,
	type FirestoreGuestDocument
} from '../../fixtures/events.fixture'
// Re-export existing implementations for direct use
export {
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
	seedTestScenario,
	type TestEventDocument,
	type TestGuestDocument,
	type TestScenario,
	type TestUserDocument
} from '../../fixtures/firestore.fixture'

import {setUserClaims} from '../../fixtures/auth.fixture'
import {
	clearFirestoreEmulator,
	createTestEvent,
	createTestGuest,
	createTestUserDocument,
	deleteAllTestEvents,
	deleteAllTestGuests,
	deleteTestEvent,
	deleteTestGuest,
	deleteTestUserDocument,
	seedTestScenario,
	type TestEventDocument,
	type TestGuestDocument,
	type TestScenario,
	type TestUserDocument
} from '../../fixtures/firestore.fixture'

/**
 * Emulator configuration
 */
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const PROJECT_ID = process.env.VITE_PROJECT_ID ?? 'demo-natural-highs'

/**
 * Form template document structure.
 * Required for consent form tests.
 */
export interface TestFormTemplate {
	id: string
	name: string
	version: number
	content: string
	isActive?: boolean
	createdAt?: Date
	updatedAt?: Date
}

/**
 * Event type document structure.
 * Required for admin-events tests.
 */
export interface TestEventType {
	id: string
	name: string
	description?: string
	color?: string
	isActive?: boolean
	createdAt?: Date
	updatedAt?: Date
}

/**
 * Firestore seeding fixtures provided by this module.
 */
export interface FirestoreSeedFixtures {
	/**
	 * Seed a test user in Firestore.
	 */
	seedTestUser: (user: TestUserDocument) => Promise<void>

	/**
	 * Seed a test event in Firestore.
	 */
	seedTestEvent: (event: TestEventDocument) => Promise<void>

	/**
	 * Seed a test guest in Firestore.
	 */
	seedTestGuest: (guest: TestGuestDocument) => Promise<string>

	/**
	 * Seed a consent form template in Firestore.
	 */
	seedConsentTemplate: (template: TestFormTemplate) => Promise<void>

	/**
	 * Seed an event type in Firestore.
	 */
	seedEventType: (eventType: TestEventType) => Promise<void>

	/**
	 * Set admin claim for a user in Auth emulator.
	 * Requires the user to already exist in Auth emulator.
	 *
	 * @param uid - User ID to set admin claim for
	 */
	setAdminClaim: (uid: string) => Promise<void>

	/**
	 * Set consent signed claim for a user.
	 *
	 * @param uid - User ID to set claim for
	 */
	setConsentSignedClaim: (uid: string) => Promise<void>

	/**
	 * Clear all test data (Firestore only - use firebase.fixture for Auth).
	 */
	clearTestData: () => Promise<void>

	/**
	 * Seed a predefined test scenario.
	 */
	seedScenario: (scenario: TestScenario) => Promise<void>

	/**
	 * Delete a specific user.
	 */
	deleteUser: (uid: string) => Promise<void>

	/**
	 * Delete a specific event.
	 */
	deleteEvent: (eventId: string) => Promise<void>

	/**
	 * Delete a specific guest.
	 */
	deleteGuest: (guestId: string) => Promise<void>
}

/**
 * Create a form template document in the Firestore emulator.
 */
async function createFormTemplate(template: TestFormTemplate): Promise<void> {
	const now = new Date()
	const url = `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/formTemplates/${template.id}`

	const response = await fetch(url, {
		method: 'PATCH',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			fields: {
				name: {stringValue: template.name},
				version: {integerValue: String(template.version)},
				content: {stringValue: template.content},
				isActive: {booleanValue: template.isActive ?? true},
				createdAt: {timestampValue: (template.createdAt ?? now).toISOString()},
				updatedAt: {timestampValue: (template.updatedAt ?? now).toISOString()}
			}
		})
	})

	if (!response.ok) {
		const body = await response.text()
		throw new Error(`Failed to create form template ${template.id}: ${response.status} - ${body}`)
	}
}

/**
 * Create an event type document in the Firestore emulator.
 */
async function createEventType(eventType: TestEventType): Promise<void> {
	const now = new Date()
	const url = `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/eventTypes/${eventType.id}`

	const response = await fetch(url, {
		method: 'PATCH',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			fields: {
				name: {stringValue: eventType.name},
				description: {stringValue: eventType.description ?? ''},
				color: {stringValue: eventType.color ?? '#6366f1'},
				isActive: {booleanValue: eventType.isActive ?? true},
				createdAt: {timestampValue: (eventType.createdAt ?? now).toISOString()},
				updatedAt: {timestampValue: (eventType.updatedAt ?? now).toISOString()}
			}
		})
	})

	if (!response.ok) {
		const body = await response.text()
		throw new Error(`Failed to create event type ${eventType.id}: ${response.status} - ${body}`)
	}
}

/**
 * Playwright fixture that provides Firestore seeding helpers.
 *
 * Features:
 * - Auto-cleanup in beforeEach (handles crashed previous run)
 * - Convenience wrappers around existing fixtures
 * - Admin claim management
 */
export const test = base.extend<FirestoreSeedFixtures>({
	seedTestUser: async ({}, use) => {
		await use(createTestUserDocument)
	},

	seedTestEvent: async ({}, use) => {
		await use(createTestEvent)
	},

	seedTestGuest: async ({}, use) => {
		await use(createTestGuest)
	},

	seedConsentTemplate: async ({}, use) => {
		await use(createFormTemplate)
	},

	seedEventType: async ({}, use) => {
		await use(createEventType)
	},

	setAdminClaim: async ({}, use) => {
		const setAdmin = async (uid: string) => {
			await setUserClaims(uid, {admin: true, signedConsentForm: true})
		}
		await use(setAdmin)
	},

	setConsentSignedClaim: async ({}, use) => {
		const setConsent = async (uid: string) => {
			await setUserClaims(uid, {signedConsentForm: true})
		}
		await use(setConsent)
	},

	clearTestData: async ({}, use) => {
		const clear = async () => {
			await Promise.all([clearFirestoreEmulator(), deleteAllTestEvents(), deleteAllTestGuests()])
		}
		// Clean before test
		await clear()
		await use(clear)
		// Clean after test
		await clear()
	},

	seedScenario: async ({}, use) => {
		await use(seedTestScenario)
	},

	deleteUser: async ({}, use) => {
		await use(deleteTestUserDocument)
	},

	deleteEvent: async ({}, use) => {
		await use(deleteTestEvent)
	},

	deleteGuest: async ({}, use) => {
		await use(deleteTestGuest)
	}
})

export {expect} from '@playwright/test'
