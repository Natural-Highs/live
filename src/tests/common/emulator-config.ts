/**
 * Centralized Emulator Configuration
 *
 * Single source of truth for Firebase emulator hosts, project IDs, and timeouts.
 * All test layers import from this module to prevent configuration drift.
 *
 * Usage:
 * - Import EMULATOR_CONFIG for constants
 * - Import getEmulatorEnvironment() for env var setup
 * - Import helper functions for URL construction
 */

/**
 * Emulator project ID.
 * Matches the real Firebase project for simplicity.
 * Emulator routing is controlled by FIRESTORE_EMULATOR_HOST env var.
 */
export const EMULATOR_PROJECT_ID = 'naturalhighs'

/**
 * Centralized emulator configuration constants.
 * Prefer environment variable overrides to allow CI/local flexibility.
 */
export const EMULATOR_CONFIG = {
	projectId: process.env.VITE_PROJECT_ID ?? EMULATOR_PROJECT_ID,
	auth: {
		host: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099',
		healthTimeoutMs: 5000
	},
	firestore: {
		host: process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180',
		healthTimeoutMs: 5000
	},
	/** Default timeout for emulator REST API calls */
	defaultTimeoutMs: 5000
} as const

/**
 * Get the Auth emulator base URL.
 */
export function getAuthEmulatorUrl(): string {
	return `http://${EMULATOR_CONFIG.auth.host}`
}

/**
 * Get the Firestore emulator base URL.
 */
export function getFirestoreEmulatorUrl(): string {
	return `http://${EMULATOR_CONFIG.firestore.host}`
}

/**
 * Get environment variables for emulator configuration.
 * Use this to set up process.env before Firebase SDK initialization.
 */
export function getEmulatorEnvironment(): Record<string, string> {
	return {
		FIRESTORE_EMULATOR_HOST: EMULATOR_CONFIG.firestore.host,
		FIREBASE_AUTH_EMULATOR_HOST: EMULATOR_CONFIG.auth.host,
		VITE_PROJECT_ID: EMULATOR_CONFIG.projectId,
		VITE_STORAGE_BUCKET: `${EMULATOR_CONFIG.projectId}.appspot.com`,
		GOOGLE_APPLICATION_CREDENTIALS: '',
		FIREBASE_CONFIG: '{}',
		VITE_USE_EMULATORS: 'true',
		USE_EMULATORS: 'true'
	}
}

/**
 * Apply emulator environment variables to process.env.
 * Call before Firebase SDK initialization in test setup.
 */
export function applyEmulatorEnvironment(): void {
	const env = getEmulatorEnvironment()
	for (const [key, value] of Object.entries(env)) {
		// Use ??= pattern to let external config (CI, scripts) take precedence
		process.env[key] ??= value
	}
}
