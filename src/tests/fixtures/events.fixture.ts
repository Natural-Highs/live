/**
 * Events Fixtures for E2E Testing
 *
 * Provides Firestore emulator fixtures for testing event check-in flows.
 * Uses Firebase Admin SDK to seed data directly in the emulator.
 *
 * Key patterns:
 * - Firestore emulator fixtures for TanStack Start server functions
 * - Direct Admin SDK access bypasses security rules for test seeding
 * - Composable with auth fixtures via mergeTests
 *
 * Test Isolation:
 * - Use `workerPrefix` fixture for parallel worker isolation
 * - Example: `await createFirestoreEvent({id: \`${workerPrefix}__event-1\`, ...})`
 *
 * @module tests/fixtures/events.fixture
 */

import {test as base, expect} from '@playwright/test'
import {type App, deleteApp, getApps, initializeApp} from 'firebase-admin/app'
import {type Firestore, getFirestore} from 'firebase-admin/firestore'

export {expect}

// Re-export base test for mergeTests compatibility
export const test = base

// ============================================================================
// Firestore Emulator Fixtures for TanStack Start Server Functions
// ============================================================================

/**
 * Project ID for the Firebase emulator.
 * Must be demo-* format for emulator to work without credentials.
 */
const EMULATOR_PROJECT_ID = 'demo-natural-highs'

/**
 * Firestore emulator host.
 * Matches firebase.json emulators.firestore.port configuration.
 */
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180'

/**
 * Lazy-initialized Firebase app for events tests.
 */
let eventsTestApp: App | null = null
let eventsTestDb: Firestore | null = null

/**
 * Get or create the Firebase Admin app for E2E events tests.
 */
function getEventsTestApp(): App {
	if (eventsTestApp) {
		return eventsTestApp
	}

	process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST

	const existingApps = getApps()
	const existingTestApp = existingApps.find(app => app.name === 'e2e-events-test-app')

	if (existingTestApp) {
		eventsTestApp = existingTestApp
		return eventsTestApp
	}

	eventsTestApp = initializeApp(
		{
			projectId: EMULATOR_PROJECT_ID
		},
		'e2e-events-test-app'
	)

	return eventsTestApp
}

/**
 * Get Firestore instance for E2E events tests.
 */
function getEventsTestDb(): Firestore {
	if (eventsTestDb) {
		return eventsTestDb
	}

	const app = getEventsTestApp()
	eventsTestDb = getFirestore(app)

	return eventsTestDb
}

/**
 * Firestore event document structure.
 * Matches the fields expected by validateGuestCode and registerGuest.
 */
export interface FirestoreEventDocument {
	id?: string
	name: string
	eventCode: string
	description?: string
	isActive: boolean
	startDate?: Date
	endDate?: Date
	participants?: string[]
	currentParticipants?: number
	createdAt?: Date
	updatedAt?: Date
}

/**
 * Firestore guest document structure.
 * Created by registerGuest.
 */
export interface FirestoreGuestDocument {
	id?: string
	isGuest: boolean
	firstName: string
	lastName: string
	email?: string | null
	phone?: string | null
	eventId: string
	consentSignedAt?: Date
	consentSignature: string
	createdAt?: Date
	updatedAt?: Date
}

/**
 * Create an event document in the Firestore emulator.
 * Use this instead of API mocking for TanStack Start server function tests.
 *
 * @param event - Event document data
 * @returns The created event ID
 *
 * @example
 * ```typescript
 * const eventId = await createFirestoreEvent({
 *   name: 'Community Peer-mentor Session',
 *   eventCode: '1234',
 *   isActive: true,
 *   startDate: new Date('2025-01-15T10:00:00Z')
 * })
 * ```
 */
export async function createFirestoreEvent(event: FirestoreEventDocument): Promise<string> {
	const db = getEventsTestDb()
	const now = new Date()
	const eventId = event.id ?? `test-event-${Date.now()}`
	const eventRef = db.collection('events').doc(eventId)

	const eventDoc: Record<string, unknown> = {
		name: event.name,
		eventCode: event.eventCode,
		description: event.description ?? '',
		isActive: event.isActive,
		startDate: event.startDate ?? now,
		endDate: event.endDate ?? new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
		participants: event.participants ?? [],
		currentParticipants: event.currentParticipants ?? 0,
		createdAt: event.createdAt ?? now,
		updatedAt: event.updatedAt ?? now
	}

	await eventRef.set(eventDoc)
	return eventId
}

/**
 * Delete an event document from the Firestore emulator.
 *
 * @param eventId - Event ID to delete
 */
export async function deleteFirestoreEvent(eventId: string): Promise<void> {
	const db = getEventsTestDb()
	await db.collection('events').doc(eventId).delete()
}

/**
 * Delete a guest document from the Firestore emulator.
 *
 * @param guestId - Guest ID to delete
 */
export async function deleteFirestoreGuest(guestId: string): Promise<void> {
	const db = getEventsTestDb()
	await db.collection('guests').doc(guestId).delete()
}

/**
 * Get all guests for an event.
 *
 * @param eventId - Event ID to search guests for
 * @returns Array of guest documents
 */
export async function getGuestsForEvent(eventId: string): Promise<FirestoreGuestDocument[]> {
	const db = getEventsTestDb()
	const snapshot = await db.collection('guests').where('eventId', '==', eventId).get()

	return snapshot.docs.map(doc => ({
		id: doc.id,
		...doc.data()
	})) as FirestoreGuestDocument[]
}

/**
 * Delete all guests for an event.
 *
 * @param eventId - Event ID to delete guests for
 */
export async function deleteGuestsForEvent(eventId: string): Promise<void> {
	const db = getEventsTestDb()
	const snapshot = await db.collection('guests').where('eventId', '==', eventId).get()

	const batch = db.batch()
	for (const doc of snapshot.docs) {
		batch.delete(doc.ref)
	}
	await batch.commit()
}

/**
 * Create a standard test event with a valid code (1234).
 * Convenience function for the most common test case.
 *
 * @param overrides - Optional overrides for the event
 * @returns The created event ID
 */
export async function createValidFirestoreEvent(
	overrides: Partial<FirestoreEventDocument> = {}
): Promise<string> {
	return createFirestoreEvent({
		name: 'Community Peer-mentor Session',
		eventCode: '1234',
		description: 'A relaxing Peer-mentor session for the community',
		isActive: true,
		startDate: new Date('2025-01-15T10:00:00Z'),
		endDate: new Date('2025-01-15T12:00:00Z'),
		...overrides
	})
}

/**
 * Cleanup function to delete the events test app.
 */
export async function cleanupEventsTestApp(): Promise<void> {
	if (eventsTestApp) {
		await deleteApp(eventsTestApp)
		eventsTestApp = null
		eventsTestDb = null
	}
}

/**
 * Check if the Firestore emulator is available.
 */
export async function isEventsEmulatorAvailable(): Promise<boolean> {
	const host = FIRESTORE_EMULATOR_HOST

	try {
		const response = await fetch(`http://${host}/`, {
			method: 'GET',
			signal: AbortSignal.timeout(2000)
		})
		return response.ok || response.status === 404
	} catch {
		return false
	}
}

/**
 * Create a guest document in the Firestore emulator.
 *
 * @param guest - Guest document data
 * @returns The created guest ID
 */
export async function createFirestoreGuest(guest: FirestoreGuestDocument): Promise<string> {
	const db = getEventsTestDb()
	const now = new Date()
	const guestId = guest.id ?? `test-guest-${Date.now()}`
	const guestRef = db.collection('guests').doc(guestId)

	await guestRef.set({
		isGuest: guest.isGuest,
		firstName: guest.firstName,
		lastName: guest.lastName,
		email: guest.email ?? null,
		phone: guest.phone ?? null,
		eventId: guest.eventId,
		consentSignature: guest.consentSignature,
		consentSignedAt: guest.consentSignedAt ?? now,
		createdAt: guest.createdAt ?? now,
		updatedAt: guest.updatedAt ?? now
	})

	return guestId
}

/**
 * Create a pending conversion record in the Firestore emulator.
 * Used for cross-device guest-to-user conversion testing.
 *
 * @param email - Email address (used as document ID)
 * @param guestId - Guest ID to convert
 * @returns The email (document ID)
 */
export async function createPendingConversion(email: string, guestId: string): Promise<string> {
	const db = getEventsTestDb()
	const normalizedEmail = email.toLowerCase().trim()
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

	await db.collection('pendingConversions').doc(normalizedEmail).set({
		guestId,
		createdAt: new Date(),
		expiresAt
	})

	return normalizedEmail
}

/**
 * Delete a pending conversion record from the Firestore emulator.
 *
 * @param email - Email address (document ID)
 */
export async function deletePendingConversion(email: string): Promise<void> {
	const db = getEventsTestDb()
	const normalizedEmail = email.toLowerCase().trim()
	await db.collection('pendingConversions').doc(normalizedEmail).delete()
}

// ============================================================================
// End Firestore Emulator Fixtures
// ============================================================================
