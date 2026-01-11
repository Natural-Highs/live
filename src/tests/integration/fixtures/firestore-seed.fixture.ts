/**
 * Firestore Seeding Fixture for Integration and E2E Testing
 *
 * Provides Playwright fixtures for seeding test data in Firestore emulator.
 * Uses the shared test SDK from src/tests/common/ - single source of truth.
 *
 * Key patterns:
 * - Use Admin SDK to seed data directly (bypasses security rules)
 * - Auto-cleanup in beforeEach and afterEach
 * - Consistent with firebase.fixture.ts emulator connection
 *
 * @see src/tests/common/ - Base implementation
 */

import {test as base} from '@playwright/test'

// Import shared test SDK and seed functions from common layer
import {
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
	getTestDb,
	type TestEventDocument,
	type TestGuestDocument,
	type TestUserDocument
} from '../../common'
import {setUserClaims} from '../../fixtures/auth.fixture'

// Re-export from common layer for convenience
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
	getTestDb,
	type TestEventDocument,
	type TestGuestDocument,
	type TestUserDocument
}
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

/**
 * Form template question structure.
 */
export interface TestFormQuestion {
	id: string
	text: string
	type: 'boolean' | 'text' | 'number' | 'select' | 'multiselect'
	required?: boolean
	options?: string[]
}

/**
 * Form template document structure.
 * Required for consent form tests.
 */
export interface TestFormTemplate {
	id: string
	name: string
	type?: 'consent' | 'demographics' | 'survey'
	version: number
	content: string
	isActive?: boolean
	questions?: TestFormQuestion[]
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
	defaultConsentFormTemplateId?: string
	defaultDemographicsFormTemplateId?: string
	defaultSurveyTemplateId?: string
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
 * Uses Firebase Admin SDK to bypass security rules.
 */
async function createFormTemplate(template: TestFormTemplate): Promise<void> {
	const db = getTestDb()
	const now = new Date()

	const templateDoc: Record<string, unknown> = {
		name: template.name,
		version: template.version,
		content: template.content,
		isActive: template.isActive ?? true,
		createdAt: template.createdAt ?? now,
		updatedAt: template.updatedAt ?? now
	}

	// Add type if provided
	if (template.type) {
		templateDoc.type = template.type
	}

	// Add questions if provided
	if (template.questions) {
		templateDoc.questions = template.questions
	}

	await db.collection('formTemplates').doc(template.id).set(templateDoc)
}

/**
 * Create an event type document in the Firestore emulator.
 * Uses Firebase Admin SDK to bypass security rules.
 */
async function createEventType(eventType: TestEventType): Promise<void> {
	const db = getTestDb()
	const now = new Date()

	const eventTypeDoc: Record<string, unknown> = {
		name: eventType.name,
		description: eventType.description ?? '',
		color: eventType.color ?? '#6366f1',
		isActive: eventType.isActive ?? true,
		createdAt: eventType.createdAt ?? now,
		updatedAt: eventType.updatedAt ?? now
	}

	// Add optional template IDs if provided
	if (eventType.defaultConsentFormTemplateId) {
		eventTypeDoc.defaultConsentFormTemplateId = eventType.defaultConsentFormTemplateId
	}
	if (eventType.defaultDemographicsFormTemplateId) {
		eventTypeDoc.defaultDemographicsFormTemplateId = eventType.defaultDemographicsFormTemplateId
	}
	if (eventType.defaultSurveyTemplateId) {
		eventTypeDoc.defaultSurveyTemplateId = eventType.defaultSurveyTemplateId
	}

	await db.collection('eventTypes').doc(eventType.id).set(eventTypeDoc)
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

// Direct exports for use in tests without fixtures
export {createFormTemplate, createEventType}
