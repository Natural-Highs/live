/**
 * Events Fixtures for E2E Testing
 *
 * Provides event-related fixtures and helpers for testing event check-in flows.
 * Includes both mock data helpers and Firestore emulator fixtures.
 *
 * Key patterns:
 * - Pure functions for mock data creation
 * - Firestore emulator fixtures for TanStack Start server functions
 * - Composable with auth fixtures via mergeTests
 * - Mock API endpoints for event operations (legacy)
 *
 * IMPORTANT: For TanStack Start server functions (validateGuestCode, registerGuest),
 * use Firestore emulator fixtures instead of API mocking.
 */

import {test as base} from '@playwright/test'
import {type App, deleteApp, getApps, initializeApp} from 'firebase-admin/app'
import {type Firestore, getFirestore} from 'firebase-admin/firestore'

// Types for event fixtures
export interface MockEvent {
	id: string
	name: string
	code: string
	eventTypeId: string
	eventDate: string
	isActive: boolean
	activatedAt?: string
	surveyAccessibleAt?: string
	createdAt: string
}

export interface EventFixtures {
	/**
	 * Creates a mock active event with a valid 4-digit code
	 */
	mockActiveEvent: MockEvent

	/**
	 * Sets up API mocks for successful event code validation
	 */
	mockEventCodeValidation: (event: MockEvent) => Promise<void>

	/**
	 * Sets up API mocks for event check-in (user registration)
	 */
	mockEventCheckIn: (event: MockEvent, success?: boolean, userName?: string) => Promise<void>

	/**
	 * Sets up API mocks for event listing (admin)
	 */
	mockEventList: (events: MockEvent[]) => Promise<void>

	/**
	 * Sets up API mocks for event creation (admin)
	 */
	mockEventCreation: () => Promise<void>

	/**
	 * Sets up API mocks for event activation (admin)
	 */
	mockEventActivation: (code: string) => Promise<void>
}

/**
 * Pure function: Create mock event data
 */
export function createMockEvent(overrides: Partial<MockEvent> = {}): MockEvent {
	const now = new Date().toISOString()
	return {
		id: `event-${Date.now()}`,
		name: 'Test Event',
		code: '1234',
		eventTypeId: 'event-type-1',
		eventDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
		isActive: true,
		activatedAt: now,
		createdAt: now,
		...overrides
	}
}

/**
 * Pure function: Build successful event code validation response
 */
export function buildEventCodeValidationResponse(event: MockEvent): object {
	return {
		success: true,
		eventId: event.id,
		eventName: event.name
	}
}

/**
 * Pure function: Build successful check-in response
 */
export function buildCheckInSuccessResponse(userName: string): object {
	return {
		success: true,
		message: `Welcome back, ${userName}!`
	}
}

/**
 * Pure function: Build check-in error response
 */
export function buildCheckInErrorResponse(error: string): object {
	return {
		success: false,
		error
	}
}

/**
 * Pure function: Build events list response
 */
export function buildEventsListResponse(events: MockEvent[]): object {
	return {
		success: true,
		events
	}
}

/**
 * Pure function: Build event creation response
 */
export function buildEventCreationResponse(event: MockEvent): object {
	return {
		success: true,
		event
	}
}

/**
 * Pure function: Build event activation response
 */
export function buildEventActivationResponse(code: string): object {
	return {
		success: true,
		code,
		activatedAt: new Date().toISOString(),
		surveyAccessibleAt: new Date(Date.now() + 7200000).toISOString() // 2 hours from now
	}
}

/**
 * Playwright fixture for event-related test helpers
 */
export const test = base.extend<EventFixtures>({
	// biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures require empty destructuring for fixtures without dependencies
	mockActiveEvent: async ({}, use) => {
		const event = createMockEvent({
			code: '1234',
			isActive: true,
			name: 'Active Test Event'
		})
		await use(event)
	},

	mockEventCodeValidation: async ({page}, use) => {
		const setupMock = async (event: MockEvent) => {
			await page.route('**/api/guests/validateCode', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(buildEventCodeValidationResponse(event))
				})
			})
		}

		await use(setupMock)
		await page.unrouteAll()
	},

	mockEventCheckIn: async ({page}, use) => {
		const setupMock = async (_event: MockEvent, success = true, userName = 'Test User') => {
			await page.route('**/api/users/eventCode', route => {
				if (success) {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(buildCheckInSuccessResponse(userName))
					})
				} else {
					route.fulfill({
						status: 400,
						contentType: 'application/json',
						body: JSON.stringify(buildCheckInErrorResponse('Invalid event code'))
					})
				}
			})
		}

		await use(setupMock)
		await page.unrouteAll()
	},

	mockEventList: async ({page}, use) => {
		const setupMock = async (events: MockEvent[]) => {
			await page.route('**/api/events', route => {
				if (route.request().method() === 'GET') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(buildEventsListResponse(events))
					})
				} else {
					// Let POST requests pass through to creation handler
					route.continue()
				}
			})
		}

		await use(setupMock)
		await page.unrouteAll()
	},

	mockEventCreation: async ({page}, use) => {
		const setupMock = async () => {
			await page.route('**/api/events', route => {
				if (route.request().method() === 'POST') {
					const newEvent = createMockEvent({
						code: '', // No code until activated
						isActive: false
					})
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(buildEventCreationResponse(newEvent))
					})
				} else {
					route.continue()
				}
			})
		}

		await use(setupMock)
		await page.unrouteAll()
	},

	mockEventActivation: async ({page}, use) => {
		const setupMock = async (code: string) => {
			await page.route('**/api/events/*/activate', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(buildEventActivationResponse(code))
				})
			})
		}

		await use(setupMock)
		await page.unrouteAll()
	}
})

export {expect} from '@playwright/test'

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
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'

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

// ============================================================================
// End Firestore Emulator Fixtures
// ============================================================================
