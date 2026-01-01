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
 * IMPORTANT: This fixture requires the Firestore emulator to be running.
 * The emulator host is configured via FIRESTORE_EMULATOR_HOST environment variable.
 */

import {type App, deleteApp, getApps, initializeApp} from 'firebase-admin/app'
import {type Firestore, getFirestore} from 'firebase-admin/firestore'

/**
 * Project ID for the Firebase emulator.
 * Must be demo-* format for emulator to work without credentials.
 */
const EMULATOR_PROJECT_ID = 'demo-natural-highs'

/**
 * Firestore emulator host.
 * Matches firebase.json emulators.firestore.port configuration.
 */
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'

/**
 * Lazy-initialized Firebase app for tests.
 */
let testApp: App | null = null
let testDb: Firestore | null = null

/**
 * Get or create the Firebase Admin app for E2E tests.
 * Uses demo-* project ID pattern for emulator compatibility.
 */
function getTestApp(): App {
	if (testApp) {
		return testApp
	}

	// Set emulator environment before initializing
	process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST

	// Check if an app already exists to avoid duplicate initialization
	const existingApps = getApps()
	const existingTestApp = existingApps.find(app => app.name === 'e2e-test-app')

	if (existingTestApp) {
		testApp = existingTestApp
		return testApp
	}

	testApp = initializeApp(
		{
			projectId: EMULATOR_PROJECT_ID
		},
		'e2e-test-app'
	)

	return testApp
}

/**
 * Get Firestore instance for E2E tests.
 */
function getTestDb(): Firestore {
	if (testDb) {
		return testDb
	}

	const app = getTestApp()
	testDb = getFirestore(app)

	return testDb
}

/**
 * Test user document data structure.
 * Matches the fields expected by getFullProfileFn.
 */
export interface TestUserDocument {
	uid: string
	email: string
	displayName: string
	dateOfBirth?: string
	isMinor?: boolean
	profileComplete?: boolean
	profileVersion?: number
	createdAt?: Date
	updatedAt?: Date
	// Demographics for adults (stored on main doc)
	pronouns?: string | null
	gender?: string | null
	raceEthnicity?: string[] | null
	emergencyContactName?: string | null
	emergencyContactPhone?: string | null
	emergencyContactEmail?: string | null
	dietaryRestrictions?: string[] | null
	medicalConditions?: string | null
}

/**
 * Minor demographics data structure.
 * Stored in users/{uid}/private/demographics subcollection.
 */
export interface MinorDemographicsData {
	pronouns?: string | null
	gender?: string | null
	raceEthnicity?: string[] | null
	emergencyContactName?: string | null
	emergencyContactPhone?: string | null
	emergencyContactEmail?: string | null
	dietaryRestrictions?: string[] | null
	medicalConditions?: string | null
	updatedAt?: Date
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
		createdAt: user.createdAt ?? now,
		updatedAt: user.updatedAt ?? now
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

/**
 * Create a minimal user document for E2E testing.
 *
 * Simplified wrapper around createTestUserDocument for common use cases.
 * Used when E2E tests need to verify Firestore state with minimal setup.
 *
 * @param uid - User ID (should match session fixture UID)
 * @param data - Optional partial user data to override defaults
 *
 * @example
 * ```typescript
 * // Create minimal user matching session
 * await createTestUser('test-user-123')
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

// =============================================================================
// Event and Guest Fixtures
// =============================================================================

/**
 * Test event document data structure.
 * Matches the fields expected by event server functions.
 */
export interface TestEventDocument {
	id: string
	name: string
	eventCode: string
	eventTypeId?: string
	eventDate?: Date
	isActive?: boolean
	activatedAt?: Date
	collectAdditionalDemographics?: boolean
	createdAt?: Date
	updatedAt?: Date
}

/**
 * Test guest document data structure.
 * Matches the fields expected by guest server functions.
 */
export interface TestGuestDocument {
	id?: string
	firstName: string
	lastName: string
	email?: string | null
	phone?: string | null
	eventId: string
	consentSignedAt?: Date
	consentSignature?: string
	createdAt?: Date
	updatedAt?: Date
}

/**
 * Test guest event (check-in) document data structure.
 * Links guest to event with registration timestamp.
 */
export interface TestGuestEventDocument {
	id?: string
	guestId: string
	eventId: string
	registeredAt?: Date
	createdAt?: Date
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
 *   eventCode: '1234',
 *   isActive: true
 * })
 * ```
 */
export async function createTestEvent(event: TestEventDocument): Promise<void> {
	const db = getTestDb()
	const now = new Date()

	const eventDoc = {
		name: event.name,
		eventCode: event.eventCode,
		eventTypeId: event.eventTypeId ?? 'default-type',
		eventDate: event.eventDate ?? now,
		isActive: event.isActive ?? false,
		activatedAt: event.activatedAt,
		collectAdditionalDemographics: event.collectAdditionalDemographics ?? false,
		createdAt: event.createdAt ?? now,
		updatedAt: event.updatedAt ?? now
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

// =============================================================================
// Scenario Seeding
// =============================================================================

/**
 * Available test scenarios for declarative seeding.
 */
export type TestScenario = 'admin-with-guests' | 'user-with-history' | 'empty-event'

/**
 * Seed a declarative test scenario.
 *
 * Provides pre-configured data sets for common testing needs.
 * Clears existing data first to ensure idempotency.
 *
 * Available scenarios:
 * - `admin-with-guests`: 1 active event with 3 guest check-ins
 * - `user-with-history`: Regular user with past event attendance
 * - `empty-event`: Active event with no check-ins
 *
 * @param scenario - Name of the scenario to seed
 *
 * @example
 * ```typescript
 * test.beforeEach(async () => {
 *   await seedTestScenario('admin-with-guests')
 * })
 * ```
 */
export async function seedTestScenario(scenario: TestScenario): Promise<void> {
	await clearFirestoreEmulator()

	const db = getTestDb()
	const now = new Date()

	switch (scenario) {
		case 'admin-with-guests': {
			await db.collection('events').doc('event-morning-yoga').set({
				name: 'Morning Yoga Session',
				eventCode: '1234',
				eventTypeId: 'yoga',
				eventDate: now,
				isActive: true,
				activatedAt: now,
				collectAdditionalDemographics: false,
				createdAt: now,
				updatedAt: now
			})

			const guests = [
				{id: 'guest-derek', firstName: 'Derek', lastName: 'Chen', email: 'derek@example.com'},
				{id: 'guest-maya', firstName: 'Maya', lastName: 'Garcia', email: null},
				{id: 'guest-jordan', firstName: 'Jordan', lastName: 'Smith', email: 'jordan@example.com'}
			]

			for (const guest of guests) {
				await db
					.collection('guests')
					.doc(guest.id)
					.set({
						isGuest: true,
						firstName: guest.firstName,
						lastName: guest.lastName,
						email: guest.email,
						phone: null,
						eventId: 'event-morning-yoga',
						consentSignedAt: now,
						consentSignature: `${guest.firstName} ${guest.lastName}`,
						createdAt: now,
						updatedAt: now
					})

				await db.collection('guestEvents').add({
					guestId: guest.id,
					eventId: 'event-morning-yoga',
					registeredAt: now,
					createdAt: now
				})
			}
			break
		}

		case 'user-with-history': {
			const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
			const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

			await db.collection('users').doc('user-regular-1').set({
				email: 'user@example.com',
				displayName: 'Test User',
				dateOfBirth: '1995-06-15',
				isMinor: false,
				profileComplete: true,
				profileVersion: 1,
				pronouns: 'they/them',
				gender: 'non-binary',
				createdAt: lastMonth,
				updatedAt: now
			})

			await db.collection('events').doc('event-past-workshop').set({
				name: 'Mindfulness Workshop',
				eventCode: '5678',
				eventTypeId: 'workshop',
				eventDate: lastWeek,
				isActive: false,
				createdAt: lastMonth,
				updatedAt: lastWeek
			})

			await db.collection('events').doc('event-past-retreat').set({
				name: 'Weekend Retreat',
				eventCode: '9012',
				eventTypeId: 'retreat',
				eventDate: lastMonth,
				isActive: false,
				createdAt: lastMonth,
				updatedAt: lastMonth
			})

			await db.collection('userEvents').add({
				userId: 'user-regular-1',
				eventId: 'event-past-workshop',
				registeredAt: lastWeek,
				createdAt: lastWeek
			})

			await db.collection('userEvents').add({
				userId: 'user-regular-1',
				eventId: 'event-past-retreat',
				registeredAt: lastMonth,
				createdAt: lastMonth
			})
			break
		}

		case 'empty-event': {
			await db.collection('events').doc('event-empty').set({
				name: 'New Community Event',
				eventCode: '9999',
				eventTypeId: 'community',
				eventDate: now,
				isActive: true,
				activatedAt: now,
				collectAdditionalDemographics: true,
				createdAt: now,
				updatedAt: now
			})
			break
		}
	}
}
