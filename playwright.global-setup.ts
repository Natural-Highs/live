/**
 * Playwright Global Setup
 *
 * Runs once before all tests to ensure required infrastructure is ready.
 * Primary responsibility: Verify Firebase emulators are available.
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 */

import {waitForEmulators} from './src/tests/fixtures/emulator-health.fixture'

/**
 * Global setup function called once before all tests.
 *
 * Responsibilities:
 * 1. Wait for Firebase emulators (Auth + Firestore) to be ready
 * 2. Fail fast with clear error if emulators unavailable
 *
 * Configuration:
 * - Timeout: 60s (default), or CI_EMULATOR_TIMEOUT env var
 * - Auth host: 127.0.0.1:9099
 * - Firestore host: FIRESTORE_EMULATOR_HOST env var or 127.0.0.1:8180
 */
async function globalSetup(): Promise<void> {
	// Skip health check if explicitly disabled (for non-emulator tests)
	if (process.env.SKIP_EMULATOR_HEALTH_CHECK === 'true') {
		console.log('[Global Setup] Skipping emulator health check (SKIP_EMULATOR_HEALTH_CHECK=true)')
		return
	}

	// Get timeout from environment or use default (60s)
	const timeout = process.env.CI_EMULATOR_TIMEOUT
		? Number.parseInt(process.env.CI_EMULATOR_TIMEOUT, 10)
		: 60000

	console.log('[Global Setup] Waiting for Firebase emulators...')
	console.log(`  Auth: 127.0.0.1:9099`)
	console.log(`  Firestore: ${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180'}`)
	console.log(`  Timeout: ${timeout}ms`)

	const start = Date.now()

	try {
		await waitForEmulators({timeout})
		const elapsed = Date.now() - start
		console.log(`[Global Setup] Emulators ready (${elapsed}ms)`)
	} catch (error) {
		// Re-throw with additional context for CI debugging
		const message = error instanceof Error ? error.message : String(error)
		console.error('[Global Setup] Emulator health check failed:')
		console.error(`  ${message}`)
		console.error('')
		console.error('Troubleshooting:')
		console.error('  1. Ensure emulators are running: bun run emulators')
		console.error('  2. Check FIRESTORE_EMULATOR_HOST environment variable')
		console.error('  3. Verify ports 9099 (Auth) and 8180 (Firestore) are not blocked')
		throw error
	}
}

export default globalSetup
