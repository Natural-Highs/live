#!/usr/bin/env bun

/**
 * Seed Test Data Script
 *
 * Seeds reproducible test scenarios into the Firebase emulators.
 * Run with: bun run seed:test-data [scenario-name]
 *
 * Available scenarios:
 * - admin-with-guests: Admin event with multiple guest check-ins
 * - user-with-history: Registered user with event attendance history
 * - empty-event: Active event with no check-ins
 * - all: Seeds all scenarios (default)
 *
 * Prerequisites:
 * - Firebase emulators must be running: bun run emulators
 * - Environment: FIRESTORE_EMULATOR_HOST=127.0.0.1:8180
 *
 * @example
 * ```bash
 * # Seed all scenarios
 * bun run seed:test-data
 *
 * # Seed specific scenario
 * bun run seed:test-data admin-with-guests
 * ```
 */

import type {App as FirebaseApp} from 'firebase-admin/app'
import {deleteApp, getApps, initializeApp} from 'firebase-admin/app'
import {getAuth} from 'firebase-admin/auth'
import {getFirestore} from 'firebase-admin/firestore'

// =============================================================================
// Configuration
// =============================================================================

const EMULATOR_PROJECT_ID = 'naturalhighs'
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180'
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'

// =============================================================================
// Emulator Initialization
// =============================================================================

async function isEmulatorAvailable(): Promise<boolean> {
	try {
		const response = await fetch(`http://${FIRESTORE_HOST}/`, {
			method: 'GET',
			signal: AbortSignal.timeout(2000)
		})
		return response.ok || response.status === 404
	} catch {
		return false
	}
}

async function clearFirestoreEmulator(): Promise<void> {
	try {
		const response = await fetch(
			`http://${FIRESTORE_HOST}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents`,
			{method: 'DELETE'}
		)
		if (!response.ok && response.status !== 404) {
			console.warn(`Clear Firestore warning: ${response.status}`)
		}
	} catch (error) {
		console.warn('Could not clear Firestore:', error)
	}
}

async function clearAuthEmulator(): Promise<void> {
	try {
		const response = await fetch(
			`http://${AUTH_HOST}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/accounts`,
			{method: 'DELETE'}
		)
		if (!response.ok && response.status !== 404) {
			console.warn(`Clear Auth warning: ${response.status}`)
		}
	} catch (error) {
		console.warn('Could not clear Auth:', error)
	}
}

function getOrCreateApp() {
	const existingApps = getApps()
	const existing = existingApps.find(app => app.name === 'seed-script')
	if (existing) {
		return existing
	}

	return initializeApp({projectId: EMULATOR_PROJECT_ID}, 'seed-script')
}

// =============================================================================
// Scenario Definitions
// =============================================================================

interface ScenarioContext {
	db: FirebaseFirestore.Firestore
	auth: ReturnType<typeof getAuth>
}

/**
 * Admin with Guests Scenario
 *
 * Creates:
 * - 1 active event with event code
 * - 3 guest check-ins with varying data
 * - 1 admin user in Auth
 */
async function seedAdminWithGuests({db, auth}: ScenarioContext): Promise<void> {
	console.log('  Seeding admin-with-guests scenario...')
	const now = new Date()

	// Create admin user in Auth emulator
	try {
		await auth.createUser({
			uid: 'admin-user-1',
			email: 'admin@naturalhighs.org',
			displayName: 'Admin User'
		})
		await auth.setCustomUserClaims('admin-user-1', {admin: true})
	} catch (e) {
		// User may already exist
		if ((e as {code?: string}).code !== 'auth/uid-already-exists') {
			console.warn('  Could not create admin user:', e)
		}
	}

	// Create event
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

	// Create guests
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

	console.log('  ✓ Created: 1 admin user, 1 event, 3 guests')
}

/**
 * User with History Scenario
 *
 * Creates:
 * - 1 registered user with complete profile
 * - 2 past events the user attended
 * - User event records linking them
 */
async function seedUserWithHistory({db, auth}: ScenarioContext): Promise<void> {
	console.log('  Seeding user-with-history scenario...')
	const now = new Date()
	const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
	const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

	// Create regular user in Auth emulator
	try {
		await auth.createUser({
			uid: 'user-regular-1',
			email: 'user@example.com',
			displayName: 'Test User'
		})
	} catch (e) {
		if ((e as {code?: string}).code !== 'auth/uid-already-exists') {
			console.warn('  Could not create user:', e)
		}
	}

	// Create user document in Firestore
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

	// Create past events
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

	// Create user event records (attendance history)
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

	console.log('  ✓ Created: 1 user, 2 past events, 2 attendance records')
}

/**
 * Empty Event Scenario
 *
 * Creates:
 * - 1 active event with no check-ins
 * Useful for testing empty states and new event flows
 */
async function seedEmptyEvent({db}: ScenarioContext): Promise<void> {
	console.log('  Seeding empty-event scenario...')
	const now = new Date()

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

	console.log('  ✓ Created: 1 empty active event')
}

// =============================================================================
// Scenario Registry
// =============================================================================

const scenarios: Record<string, (ctx: ScenarioContext) => Promise<void>> = {
	'admin-with-guests': seedAdminWithGuests,
	'user-with-history': seedUserWithHistory,
	'empty-event': seedEmptyEvent
}

/**
 * Seed a specific scenario by name.
 * Exported for use in fixture files.
 */
export async function seedTestScenario(
	name: keyof typeof scenarios,
	providedApp?: FirebaseApp
): Promise<void> {
	if (!scenarios[name]) {
		throw new Error(`Unknown scenario: ${name}. Available: ${Object.keys(scenarios).join(', ')}`)
	}

	const app = providedApp ?? getOrCreateApp()
	const createdHere = !providedApp
	try {
		const ctx: ScenarioContext = {
			db: getFirestore(app),
			auth: getAuth(app)
		}

		await scenarios[name](ctx)
	} finally {
		// Only delete if we created the app in this function
		if (createdHere) {
			await app.delete()
		}
	}
}

/**
 * Seed all scenarios.
 * Clears existing data first for idempotency.
 */
export async function seedAllScenarios(providedApp?: FirebaseApp): Promise<void> {
	const app = providedApp ?? getOrCreateApp()
	const createdHere = !providedApp
	try {
		const ctx: ScenarioContext = {
			db: getFirestore(app),
			auth: getAuth(app)
		}

		for (const [_name, fn] of Object.entries(scenarios)) {
			await fn(ctx)
		}
	} finally {
		// Only delete if we created the app in this function
		if (createdHere) {
			await app.delete()
		}
	}
}

// =============================================================================
// CLI Entry Point
// =============================================================================

async function main() {
	const scenarioArg = process.argv[2] ?? 'all'

	console.log('='.repeat(60))
	console.log('Natural Highs - Test Data Seeder')
	console.log('='.repeat(60))
	console.log(`Firestore: ${FIRESTORE_HOST}`)
	console.log(`Auth: ${AUTH_HOST}`)
	console.log(`Scenario: ${scenarioArg}`)
	console.log('')

	// Check emulator availability
	const available = await isEmulatorAvailable()
	if (!available) {
		console.error('ERROR: Firestore emulator is not running!')
		console.error('Start emulators with: bun run emulators')
		process.exit(1)
	}

	try {
		// Clear existing data for idempotency
		console.log('Clearing existing data...')
		await clearFirestoreEmulator()
		await clearAuthEmulator()
		console.log('✓ Data cleared\n')

		// Seed scenarios
		console.log('Seeding scenarios...')
		if (scenarioArg === 'all') {
			await seedAllScenarios()
		} else if (scenarios[scenarioArg]) {
			await seedTestScenario(scenarioArg as keyof typeof scenarios)
		} else {
			console.error(`Unknown scenario: ${scenarioArg}`)
			console.error(`Available scenarios: ${Object.keys(scenarios).join(', ')}, all`)
			process.exit(1)
		}

		console.log('')
		console.log('='.repeat(60))
		console.log('✓ Seeding complete!')
		console.log('='.repeat(60))
	} finally {
		// Cleanup - ensure app is deleted even on error
		const app = getApps().find(a => a.name === 'seed-script')
		if (app) {
			await deleteApp(app)
		}
	}
}

// Run if called directly
main().catch(error => {
	console.error('Seed script failed:', error)
	process.exit(1)
})
