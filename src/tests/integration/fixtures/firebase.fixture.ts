/**
 * Firebase Emulator Fixture for Integration Testing
 *
 * Standalone fixture for integration tests - NO E2E fixture inheritance (per ADR-2).
 * Connects to Firebase Auth and Firestore emulators with health checks.
 *
 * Key patterns:
 * - Health check BOTH Auth (127.0.0.1:9099) AND Firestore (127.0.0.1:8180)
 * - Read connection from environment variables
 * - Cleanup in beforeEach (handles crashed previous run) AND afterEach
 * - Verify SESSION_SECRET is set
 *
 * @see Architecture.md - Integration Testing Strategy
 * @see ADR-2: Fixture Composition Strategy
 */

import {test as base, type Page} from '@playwright/test'
import {SESSION_SECRET_TEST} from '../../../../playwright.config'
import {EMULATOR_CONFIG} from '../../common/emulator-config'

// Set SESSION_SECRET in test process if not already set
// This is needed because playwright.config.ts only passes it to webServer.env
if (!process.env.SESSION_SECRET) {
	process.env.SESSION_SECRET = SESSION_SECRET_TEST
}

/**
 * Emulator configuration from centralized config.
 */
const AUTH_EMULATOR_HOST = EMULATOR_CONFIG.auth.host
const FIRESTORE_EMULATOR_HOST = EMULATOR_CONFIG.firestore.host
const PROJECT_ID = EMULATOR_CONFIG.projectId

/** Default timeout for emulator health checks (ms). */
const EMULATOR_HEALTH_TIMEOUT_MS = EMULATOR_CONFIG.defaultTimeoutMs

/**
 * Emulator health status result.
 */
export interface EmulatorHealthResult {
	auth: boolean
	firestore: boolean
	projectId: string
	authHost: string
	firestoreHost: string
}

/**
 * Integration test fixtures provided by this module.
 */
export interface IntegrationFixtures {
	/**
	 * Firebase project ID for API calls.
	 */
	projectId: string

	/**
	 * Auth emulator host (e.g., '127.0.0.1:9099').
	 */
	authEmulatorHost: string

	/**
	 * Firestore emulator host (e.g., '127.0.0.1:8180').
	 */
	firestoreEmulatorHost: string

	/**
	 * Verify emulators are running and accessible.
	 * Throws if either emulator is unavailable.
	 */
	verifyEmulators: () => Promise<EmulatorHealthResult>

	/**
	 * Clear all Firestore data via REST API.
	 * Safe to call multiple times.
	 */
	clearFirestoreData: () => Promise<void>

	/**
	 * Clear all Auth users via REST API.
	 * Safe to call multiple times.
	 */
	clearAuthUsers: () => Promise<void>

	/**
	 * Clear all test data (Firestore + Auth).
	 * Called automatically in beforeEach and afterEach.
	 */
	clearAllTestData: () => Promise<void>

	/**
	 * Get user from browser's Firebase auth state by email.
	 * Use after magic link auth to get the dynamically assigned UID.
	 *
	 * NOTE: Extracts UID from browser since emulator API has project-scoping issues.
	 */
	getAuthUser: (email: string) => Promise<{uid: string; email: string} | null>
}

/**
 * Check if Auth emulator is available.
 * @param timeoutMs - Timeout for the health check (default: EMULATOR_HEALTH_TIMEOUT_MS)
 */
async function isAuthEmulatorAvailable(timeoutMs = EMULATOR_HEALTH_TIMEOUT_MS): Promise<boolean> {
	try {
		const response = await fetch(`http://${AUTH_EMULATOR_HOST}/`, {
			method: 'GET',
			signal: AbortSignal.timeout(timeoutMs)
		})
		// Auth emulator returns 200 on root path
		return response.ok
	} catch {
		return false
	}
}

/**
 * Check if Firestore emulator is available.
 * @param timeoutMs - Timeout for the health check (default: EMULATOR_HEALTH_TIMEOUT_MS)
 */
async function isFirestoreEmulatorAvailable(
	timeoutMs = EMULATOR_HEALTH_TIMEOUT_MS
): Promise<boolean> {
	try {
		const response = await fetch(`http://${FIRESTORE_EMULATOR_HOST}/`, {
			method: 'GET',
			signal: AbortSignal.timeout(timeoutMs)
		})
		// Firestore emulator returns 200 or 404 on root path
		return response.ok || response.status === 404
	} catch {
		return false
	}
}

/**
 * Clear all Firestore data via emulator REST API.
 */
async function clearFirestoreEmulator(): Promise<void> {
	try {
		const response = await fetch(
			`http://${FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
			{
				method: 'DELETE'
			}
		)

		if (!response.ok && response.status !== 404) {
			console.warn(`[IntegrationFixture] clearFirestoreEmulator returned ${response.status}`)
		}
	} catch (error) {
		console.warn('[IntegrationFixture] Could not clear Firestore emulator:', error)
	}
}

/**
 * Clear all Auth users via emulator REST API.
 *
 * Uses the accounts:delete endpoint to remove all users.
 */
async function clearAuthEmulator(): Promise<void> {
	try {
		// The Auth emulator doesn't have a direct "delete all users" endpoint.
		// Instead, we list all users and delete them individually, or use the project-level cleanup.
		// Firebase Auth emulator v9+ supports DELETE on the project endpoint.
		const response = await fetch(
			`http://${AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`,
			{
				method: 'DELETE'
			}
		)

		if (!response.ok && response.status !== 404) {
			console.warn(`[IntegrationFixture] clearAuthEmulator returned ${response.status}`)
		}
	} catch (error) {
		console.warn('[IntegrationFixture] Could not clear Auth emulator:', error)
	}
}

/**
 * Verify SESSION_SECRET is set.
 */
function verifySessionSecret(): void {
	const sessionSecret = process.env.SESSION_SECRET
	if (!sessionSecret || sessionSecret.length < 32) {
		throw new Error(
			'SESSION_SECRET environment variable is required for integration tests.\n' +
				'It must be at least 32 characters long.\n' +
				'For local testing, ensure playwright.config.ts sets SESSION_SECRET in webServer.env.\n' +
				'For CI, ensure the workflow sets this environment variable.'
		)
	}
}

/**
 * Get user UID from Auth emulator by email.
 * Use after magic link auth to get the dynamically assigned UID.
 *
 * NOTE: Due to Firebase Auth emulator API limitations (project-scoped queries
 * don't return users created via client SDK), we extract the UID from the
 * browser's Firebase auth state in IndexedDB.
 *
 * @param email - Email address to look up (used for validation)
 * @param page - Playwright page to extract UID from
 * @returns User data or null if not found
 */
async function getUserFromBrowser(
	email: string,
	page: Page
): Promise<{uid: string; email: string} | null> {
	try {
		// Extract Firebase auth state from IndexedDB where Firebase SDK stores it
		const authState = await page.evaluate(async targetEmail => {
			// Firebase stores auth state in IndexedDB under 'firebaseLocalStorageDb'
			// with key pattern: firebase:authUser:{apiKey}:{appName}
			return new Promise<{uid: string; email: string} | null>(resolve => {
				const request = indexedDB.open('firebaseLocalStorageDb')

				request.onerror = () => resolve(null)

				request.onsuccess = event => {
					const db = (event.target as IDBOpenDBRequest).result

					try {
						const transaction = db.transaction(['firebaseLocalStorage'], 'readonly')
						const store = transaction.objectStore('firebaseLocalStorage')
						const getAllRequest = store.getAll()

						getAllRequest.onsuccess = () => {
							const results = getAllRequest.result

							// Find auth user entry
							for (const item of results) {
								if (item.value && typeof item.value === 'object') {
									const user = item.value
									// Check if this looks like a Firebase user object
									if (user.uid && user.email) {
										if (user.email.toLowerCase() === targetEmail.toLowerCase()) {
											resolve({uid: user.uid, email: user.email})
											return
										}
									}
								}
							}
							resolve(null)
						}

						getAllRequest.onerror = () => resolve(null)
					} catch {
						resolve(null)
					}
				}
			})
		}, email)

		if (authState) {
			return authState
		}

		// If IndexedDB extraction fails, fall back to emulator API (may return null)
		return await getUserByEmailFromEmulator(email)
	} catch (error) {
		console.warn(`[IntegrationFixture] getUserFromBrowser failed for ${email}:`, error)
		return await getUserByEmailFromEmulator(email)
	}
}

/**
 * Fallback: Get user from emulator API (may not work due to project scoping issues).
 */
async function getUserByEmailFromEmulator(
	email: string
): Promise<{uid: string; email: string} | null> {
	// Use Identity Toolkit query API
	const queryUrl = `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:query`

	try {
		const response = await fetch(queryUrl, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({returnUserInfo: true}),
			signal: AbortSignal.timeout(EMULATOR_HEALTH_TIMEOUT_MS)
		})

		if (!response.ok) {
			return null
		}

		const data = await response.json()
		if (!data.userInfo || data.userInfo.length === 0) {
			return null
		}

		// Find user by email (case-insensitive)
		const user = data.userInfo.find(
			(u: {email?: string}) => u.email?.toLowerCase() === email.toLowerCase()
		)

		if (!user) {
			return null
		}

		return {
			uid: user.localId,
			email: user.email
		}
	} catch (error) {
		console.warn(`[IntegrationFixture] getUserByEmailFromEmulator failed for ${email}:`, error)
		return null
	}
}

/**
 * Playwright fixture that provides Firebase emulator connection and cleanup.
 *
 * Features:
 * - Auto-cleanup in beforeEach AND afterEach (handles crashed previous run)
 * - Health check before tests
 * - SESSION_SECRET verification
 */
export const test = base.extend<IntegrationFixtures>({
	projectId: PROJECT_ID,

	authEmulatorHost: AUTH_EMULATOR_HOST,

	firestoreEmulatorHost: FIRESTORE_EMULATOR_HOST,

	verifyEmulators: async ({}, use) => {
		const verify = async (): Promise<EmulatorHealthResult> => {
			const [authAvailable, firestoreAvailable] = await Promise.all([
				isAuthEmulatorAvailable(),
				isFirestoreEmulatorAvailable()
			])

			if (!authAvailable) {
				throw new Error(
					`Firebase Auth emulator is not running at ${AUTH_EMULATOR_HOST}.\n` +
						'Start emulators with: bun run emulators\n' +
						'Or set FIREBASE_AUTH_EMULATOR_HOST to the correct host:port.'
				)
			}

			if (!firestoreAvailable) {
				throw new Error(
					`Firestore emulator is not running at ${FIRESTORE_EMULATOR_HOST}.\n` +
						'Start emulators with: bun run emulators\n' +
						'Or set FIRESTORE_EMULATOR_HOST to the correct host:port.'
				)
			}

			return {
				auth: authAvailable,
				firestore: firestoreAvailable,
				projectId: PROJECT_ID,
				authHost: AUTH_EMULATOR_HOST,
				firestoreHost: FIRESTORE_EMULATOR_HOST
			}
		}

		await use(verify)
	},

	clearFirestoreData: async ({}, use) => {
		await use(clearFirestoreEmulator)
	},

	clearAuthUsers: async ({}, use) => {
		await use(clearAuthEmulator)
	},

	clearAllTestData: async ({}, use) => {
		const clearAll = async (): Promise<void> => {
			await Promise.all([clearFirestoreEmulator(), clearAuthEmulator()])
		}

		// Verify environment before test
		verifySessionSecret()

		// Clean up any stale data from previous test/crash
		await clearAll()

		await use(clearAll)

		// Clean up after test
		await clearAll()
	},

	getAuthUser: async ({page}, use) => {
		const getUser = async (email: string) => getUserFromBrowser(email, page)
		await use(getUser)
	}
})

export {expect} from '@playwright/test'
