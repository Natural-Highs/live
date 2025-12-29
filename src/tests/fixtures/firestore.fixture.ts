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
<<<<<<< HEAD
		}
	} catch (_error) {}
=======
			console.warn(
				`[firestore.fixture] clearFirestoreEmulator unexpected status: ${response.status} ${response.statusText}`
			)
		}
	} catch (error) {
		// Log connection failures to help debug emulator issues
		console.warn(
			`[firestore.fixture] clearFirestoreEmulator failed to connect to emulator at ${host}:`,
			error instanceof Error ? error.message : error
		)
	}
>>>>>>> 032e02b6 (feat(settings): add profile settings page with history tracking)
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
<<<<<<< HEAD

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
=======
>>>>>>> 032e02b6 (feat(settings): add profile settings page with history tracking)
