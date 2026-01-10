/**
 * Shared Seed Functions
 *
 * Common seed functions used by both E2E and integration test fixtures.
 * Uses Firebase Admin SDK to create/delete test data in the Firestore emulator.
 *
 * PARALLEL EXECUTION SAFETY:
 * When using these functions in E2E tests with fullyParallel: true, ALWAYS
 * prefix document IDs with the worker prefix to prevent data collisions:
 *
 * @example
 * ```typescript
 * test('my test', async ({workerPrefix}) => {
 *   // GOOD - Worker-isolated
 *   await createTestUser(`${workerPrefix}__user-1`, {...})
 *
 *   // BAD - Will collide with other workers
 *   await createTestUser('user-1', {...})
 * })
 * ```
 *
 * Integration tests run sequentially (fullyParallel: false) so worker
 * prefixes are optional but recommended for consistency.
 *
 * Key patterns:
 * - User documents: users/{uid}
 * - Minor demographics: users/{uid}/private/demographics
 * - Events: events/{id}
 * - Guests: guests/{id}
 * - Guest events: guestEvents/{id}
 */

import {type App, deleteApp, getApps, initializeApp} from 'firebase-admin/app'
import {type Firestore, getFirestore} from 'firebase-admin/firestore'
import type {
	MinorDemographicsData,
	TestEventDocument,
	TestGuestDocument,
	TestResponseDocument,
	TestUserDocument
} from './types'

const EMULATOR_PROJECT_ID = 'naturalhighs'

/**
 * Default Firestore emulator host configuration.
 * Matches firebase.json emulators.firestore.port configuration.
 */
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180'

/**
 * Force emulator mode by preventing SDK from looking for production credentials.
 * This ensures parity between local development and CI environments.
 *
 * Exported for use by auth fixtures and other test infrastructure that needs
 * to ensure emulator environment before SDK initialization.
 */
export function ensureEmulatorEnvironment(): void {
	// Set emulator hosts
	process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST
	process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'

	// Prevent SDK from looking for production credentials
	// These must be set BEFORE initializing the Firebase app
	if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		process.env.GOOGLE_APPLICATION_CREDENTIALS = ''
	}
	if (!process.env.FIREBASE_CONFIG) {
		process.env.FIREBASE_CONFIG = '{}'
	}
}

/**
 * Lazy-initialized Firebase app for tests.
 * Single source of truth for all test fixtures.
 */
let testApp: App | null = null
let testDb: Firestore | null = null

export function getTestApp(): App {
	if (testApp) {
		return testApp
	}

	// Ensure emulator environment before initializing
	ensureEmulatorEnvironment()

	// Check if an app already exists to avoid duplicate initialization
	const existingApps = getApps()
	const existingTestApp = existingApps.find(app => app.name === 'test-app')

	if (existingTestApp) {
		testApp = existingTestApp
		return testApp
	}

	testApp = initializeApp(
		{
			projectId: EMULATOR_PROJECT_ID
		},
		'test-app'
	)

	return testApp
}

/**
 * Get Firestore instance for tests.
 * Uses getFirestore which auto-detects emulator via FIRESTORE_EMULATOR_HOST.
 * Single source of truth - all test fixtures should import this.
 */
export function getTestDb(): Firestore {
	if (testDb) {
		return testDb
	}

	const app = getTestApp()

	// Use getFirestore which automatically connects to emulator when
	// FIRESTORE_EMULATOR_HOST env var is set (via ensureEmulatorEnvironment)
	testDb = getFirestore(app)

	return testDb
}

/**
 * Create a user document in the Firestore emulator.
 *
 * Call BEFORE navigation in tests to seed required user data.
 * For minors, demographics are stored in the private subcollection.
 * Uses set without merge to ensure clean state for each test.
 *
 * @param user - User document data
 * @param minorDemographics - Demographics for minors (stored in private subcollection)
 *
 * @example
 * ```typescript
 * await createTestUserDocument({
 *   uid: 'test-user-123',
 *   email: 'test@example.com',
 *   displayName: 'Test User',
 *   dateOfBirth: '1995-06-15',
 *   isMinor: false,
 *   profileComplete: true
 * })
 * ```
 */
export async function createTestUserDocument(
	user: TestUserDocument,
	minorDemographics?: MinorDemographicsData
): Promise<void> {
	const db = getTestDb()
	const userRef = db.collection('users').doc(user.uid)

	const now = new Date()
	const isMinor = user.isMinor ?? false

	// Base user document
	const userDoc: Record<string, unknown> = {
		email: user.email,
		displayName: user.displayName,
		dateOfBirth: user.dateOfBirth ?? '1990-01-15',
		isMinor,
		profileComplete: user.profileComplete ?? true,
		profileVersion: user.profileVersion ?? 1,
		signedConsentForm: user.signedConsentForm ?? true,
		createdAt: user.createdAt ?? now,
		updatedAt: user.updatedAt ?? now
	}

	// Add consentSignedAt if signedConsentForm is true
	if (user.signedConsentForm !== false) {
		userDoc.consentSignedAt = user.consentSignedAt ?? now
	}

	// For adults, demographics go on the main document
	if (!isMinor) {
		if (user.pronouns !== undefined) {
			userDoc.pronouns = user.pronouns
		}
		if (user.gender !== undefined) {
			userDoc.gender = user.gender
		}
		if (user.raceEthnicity !== undefined) {
			userDoc.raceEthnicity = user.raceEthnicity
		}
		if (user.emergencyContactName !== undefined) {
			userDoc.emergencyContactName = user.emergencyContactName
		}
		if (user.emergencyContactPhone !== undefined) {
			userDoc.emergencyContactPhone = user.emergencyContactPhone
		}
		if (user.emergencyContactEmail !== undefined) {
			userDoc.emergencyContactEmail = user.emergencyContactEmail
		}
		if (user.dietaryRestrictions !== undefined) {
			userDoc.dietaryRestrictions = user.dietaryRestrictions
		}
		if (user.medicalConditions !== undefined) {
			userDoc.medicalConditions = user.medicalConditions
		}
	}

	// Use set without merge to overwrite any existing document
	// This ensures clean state for each test
	await userRef.set(userDoc)

	// For minors, create private subcollection with demographics
	if (isMinor && minorDemographics) {
		await userRef
			.collection('private')
			.doc('demographics')
			.set({
				...minorDemographics,
				updatedAt: minorDemographics.updatedAt ?? now
			})
	}
}

/**
 * Delete a user document and all subcollections from the Firestore emulator.
 *
 * Call in test cleanup (afterEach) to ensure test isolation.
 *
 * @param uid - User ID to delete
 *
 * @example
 * ```typescript
 * await deleteTestUserDocument('test-user-123')
 * ```
 */
export async function deleteTestUserDocument(uid: string): Promise<void> {
	const db = getTestDb()
	const userRef = db.collection('users').doc(uid)

	// Delete known subcollections
	const subcollections = ['private', 'demographicHistory', 'passkeys']

	for (const subcol of subcollections) {
		const docs = await userRef.collection(subcol).listDocuments()
		for (const doc of docs) {
			await doc.delete()
		}
	}

	// Delete the user document itself
	await userRef.delete()
}

/**
 * Create a minimal user document for E2E testing.
 *
 * Simplified wrapper around createTestUserDocument for common use cases.
 * Used when E2E tests need to verify Firestore state with minimal setup.
 *
 * DEFAULT BEHAVIOR (differs from createTestUserDocument):
 * - profileComplete: false (user needs to complete profile)
 * - signedConsentForm: inherits from createTestUserDocument (true)
 *
 * Use createTestUserDocument directly if you need a fully complete user,
 * or pass { profileComplete: true } to override.
 *
 * @param uid - User ID (should match session fixture UID)
 * @param data - Optional partial user data to override defaults
 *
 * @example
 * ```typescript
 * // Create minimal user matching session (profileComplete: false)
 * await createTestUser('test-user-123')
 *
 * // Create user with complete profile
 * await createTestUser('test-user-123', { profileComplete: true })
 *
 * // Create user with custom display name
 * await createTestUser('test-user-123', { displayName: 'Custom Name' })
 * ```
 */
export async function createTestUser(
	uid: string,
	data: Partial<Omit<TestUserDocument, 'uid'>> = {}
): Promise<void> {
	await createTestUserDocument({
		uid,
		email: data.email ?? `test-${uid}@example.com`,
		displayName: data.displayName ?? 'Test User',
		profileComplete: data.profileComplete ?? false,
		profileVersion: data.profileVersion ?? 1,
		...data
	})
}

/**
 * Delete test user document after E2E test.
 *
 * Simplified alias for deleteTestUserDocument.
 * Ensures test isolation by cleaning up user data.
 *
 * @param uid - User ID to delete
 *
 * @example
 * ```typescript
 * test.afterEach(async () => {
 *   await deleteTestUser('test-user-123')
 * })
 * ```
 */
export async function deleteTestUser(uid: string): Promise<void> {
	await deleteTestUserDocument(uid)
}

/**
 * Create an event document in the Firestore emulator.
 *
 * @param event - Event document data
 *
 * @example
 * ```typescript
 * await createTestEvent({
 *   id: 'event-1',
 *   name: 'Test Event',
 *   eventCode: TEST_CODES.VALID,
 *   isActive: true
 * })
 * ```
 */
export async function createTestEvent(event: TestEventDocument): Promise<void> {
	const db = getTestDb()
	const now = new Date()

	const eventDoc: Record<string, unknown> = {
		name: event.name,
		eventCode: event.eventCode,
		eventTypeId: event.eventTypeId ?? 'default-type',
		eventDate: event.eventDate ?? now,
		isActive: event.isActive ?? false,
		activatedAt: event.activatedAt ?? null,
		collectAdditionalDemographics: event.collectAdditionalDemographics ?? false,
		createdAt: event.createdAt ?? now,
		updatedAt: event.updatedAt ?? now
	}

	// Add optional time window fields only if provided
	if (event.startDate !== undefined) {
		eventDoc.startDate = event.startDate
	}
	if (event.endDate !== undefined) {
		eventDoc.endDate = event.endDate
	}
	if (event.location !== undefined) {
		eventDoc.location = event.location
	}

	await db.collection('events').doc(event.id).set(eventDoc)
}

/**
 * Create a guest document in the Firestore emulator.
 * Also creates a guestEvent record linking guest to their event.
 *
 * @param guest - Guest document data
 * @returns The guest ID (generated if not provided)
 *
 * @example
 * ```typescript
 * const guestId = await createTestGuest({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   eventId: 'event-1',
 *   email: null
 * })
 * ```
 */
export async function createTestGuest(guest: TestGuestDocument): Promise<string> {
	const db = getTestDb()
	const now = new Date()
	const guestId = guest.id ?? `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`

	const guestDoc = {
		isGuest: true,
		firstName: guest.firstName,
		lastName: guest.lastName,
		email: guest.email ?? null,
		phone: guest.phone ?? null,
		eventId: guest.eventId,
		consentSignedAt: guest.consentSignedAt ?? now,
		consentSignature: guest.consentSignature ?? 'Test Signature',
		createdAt: guest.createdAt ?? now,
		updatedAt: guest.updatedAt ?? now
	}

	await db.collection('guests').doc(guestId).set(guestDoc)

	// Also create guestEvent record for the check-in
	await db.collection('guestEvents').add({
		guestId,
		eventId: guest.eventId,
		registeredAt: now,
		createdAt: now
	})

	return guestId
}

/**
 * Delete an event document from the Firestore emulator.
 *
 * @param eventId - Event ID to delete
 */
export async function deleteTestEvent(eventId: string): Promise<void> {
	const db = getTestDb()
	await db.collection('events').doc(eventId).delete()
}

/**
 * Delete a guest document and associated guestEvents from the Firestore emulator.
 *
 * @param guestId - Guest ID to delete
 */
export async function deleteTestGuest(guestId: string): Promise<void> {
	const db = getTestDb()

	// Delete associated guestEvents
	const guestEventsSnapshot = await db
		.collection('guestEvents')
		.where('guestId', '==', guestId)
		.get()

	for (const doc of guestEventsSnapshot.docs) {
		await doc.ref.delete()
	}

	// Delete guest document
	await db.collection('guests').doc(guestId).delete()
}

/**
 * Delete all events from the Firestore emulator.
 * Useful for test cleanup.
 */
export async function deleteAllTestEvents(): Promise<void> {
	const db = getTestDb()
	const eventsSnapshot = await db.collection('events').listDocuments()

	for (const doc of eventsSnapshot) {
		await doc.delete()
	}
}

/**
 * Delete all guests and guestEvents from the Firestore emulator.
 * Useful for test cleanup.
 */
export async function deleteAllTestGuests(): Promise<void> {
	const db = getTestDb()

	// Delete all guestEvents
	const guestEventsSnapshot = await db.collection('guestEvents').listDocuments()
	for (const doc of guestEventsSnapshot) {
		await doc.delete()
	}

	// Delete all guests
	const guestsSnapshot = await db.collection('guests').listDocuments()
	for (const doc of guestsSnapshot) {
		await doc.delete()
	}
}

/**
 * Create a survey response document in the Firestore emulator.
 *
 * @param response - Response document data
 * @returns The response ID (generated if not provided)
 *
 * @example
 * ```typescript
 * const responseId = await createTestResponse({
 *   userId: 'user-1',
 *   eventId: 'event-1',
 *   surveyType: 'pre',
 *   responses: { q1: 'answer1', q2: 5 }
 * })
 * ```
 */
export async function createTestResponse(response: TestResponseDocument): Promise<string> {
	const db = getTestDb()
	const now = new Date()
	const responseId = response.id ?? `response-${Date.now()}-${Math.random().toString(36).slice(2)}`

	const responseDoc = {
		userId: response.userId,
		eventId: response.eventId,
		surveyType: response.surveyType,
		responses: response.responses,
		submittedAt: response.submittedAt ?? now,
		createdAt: response.createdAt ?? now
	}

	await db.collection('responses').doc(responseId).set(responseDoc)

	return responseId
}

/**
 * Delete a response document from the Firestore emulator.
 *
 * @param responseId - Response ID to delete
 */
export async function deleteTestResponse(responseId: string): Promise<void> {
	const db = getTestDb()
	await db.collection('responses').doc(responseId).delete()
}

/**
 * Delete all responses from the Firestore emulator.
 * Useful for test cleanup.
 */
export async function deleteAllTestResponses(): Promise<void> {
	const db = getTestDb()
	const responsesSnapshot = await db.collection('responses').listDocuments()

	for (const doc of responsesSnapshot) {
		await doc.delete()
	}
}

/**
 * Clear all test data from the Firestore emulator.
 *
 * Uses the emulator REST API for efficient bulk deletion.
 * Call in globalSetup or beforeAll when needed.
 *
 * @example
 * ```typescript
 * // In playwright.global-setup.ts
 * await clearFirestoreEmulator()
 * ```
 */
export async function clearFirestoreEmulator(): Promise<void> {
	const host = FIRESTORE_EMULATOR_HOST

	try {
		const response = await fetch(
			`http://${host}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents`,
			{
				method: 'DELETE'
			}
		)

		if (!response.ok && response.status !== 404) {
			console.warn(`[Fixture] clearFirestoreEmulator returned ${response.status}`)
		}
	} catch (error) {
		console.warn('[Fixture] Could not clear Firestore emulator:', error)
	}
}

/**
 * Check if the Firestore emulator is available.
 *
 * @returns true if emulator is reachable
 */
export async function isFirestoreEmulatorAvailable(): Promise<boolean> {
	const host = FIRESTORE_EMULATOR_HOST

	try {
		const response = await fetch(`http://${host}/`, {
			method: 'GET',
			signal: AbortSignal.timeout(2000)
		})
		return response.ok || response.status === 404 // 404 is expected for root path
	} catch {
		return false
	}
}

/**
 * Wait for Firestore emulator to become available with retry logic.
 *
 * @param options - Retry options
 * @param options.maxRetries - Maximum number of retry attempts (default: 10)
 * @param options.retryDelayMs - Delay between retries in milliseconds (default: 500)
 * @returns true if emulator is available, false if max retries exceeded
 *
 * @example
 * ```typescript
 * const available = await waitForFirestoreEmulator()
 * if (!available) {
 *   throw new Error('Firestore emulator not available')
 * }
 * ```
 */
export async function waitForFirestoreEmulator(
	options: {maxRetries?: number; retryDelayMs?: number} = {}
): Promise<boolean> {
	const maxRetries = options.maxRetries ?? 10
	const retryDelayMs = options.retryDelayMs ?? 500

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const available = await isFirestoreEmulatorAvailable()
		if (available) {
			return true
		}

		if (attempt < maxRetries) {
			await new Promise(resolve => setTimeout(resolve, retryDelayMs))
		}
	}

	return false
}

/**
 * Cleanup function to delete the test app.
 * Call at the end of test runs if needed.
 */
export async function cleanupTestApp(): Promise<void> {
	if (testApp) {
		await deleteApp(testApp)
		testApp = null
		testDb = null
	}
}
