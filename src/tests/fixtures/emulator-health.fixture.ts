/**
 * Emulator Health Check Fixture for E2E Testing
 *
 * Consolidates health check logic for Firebase emulators (Auth and Firestore).
 * Provides exponential backoff retry with configurable timeout.
 *
 * Key patterns:
 * - `waitForEmulators(options)` - Wait for all emulators with exponential backoff
 * - `waitForAuthEmulator(options)` - Wait for Auth emulator only
 * - `waitForFirestoreEmulator(options)` - Wait for Firestore emulator only
 *
 * @module tests/fixtures/emulator-health.fixture
 */

/**
 * Configuration for emulator health checks.
 */
export interface EmulatorHealthConfig {
	/** Auth emulator host (default: '127.0.0.1:9099') */
	authHost?: string
	/** Firestore emulator host (default from env or '127.0.0.1:8180') */
	firestoreHost?: string
	/** Maximum time to wait in milliseconds (default: 60000) */
	timeout?: number
	/** Initial retry delay in milliseconds (default: 100) */
	retryDelay?: number
	/** Maximum retry delay cap in milliseconds (default: 5000) */
	maxRetryDelay?: number
}

/**
 * Result of a health check attempt.
 */
export interface HealthCheckResult {
	/** Whether the emulator is healthy */
	healthy: boolean
	/** Emulator name for error messages */
	name: string
	/** Host that was checked */
	host: string
	/** Last error message if unhealthy */
	lastError?: string
}

/**
 * Default configuration values.
 */
const DEFAULTS = {
	authHost: '127.0.0.1:9099',
	firestoreHost: process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180',
	timeout: 60000,
	retryDelay: 100,
	maxRetryDelay: 5000
} as const

/**
 * Check if a single emulator endpoint is healthy.
 *
 * @param host - Host:port to check (e.g., '127.0.0.1:9099')
 * @param name - Emulator name for logging (e.g., 'Auth', 'Firestore')
 * @returns Health check result
 */
async function checkEmulatorHealth(host: string, name: string): Promise<HealthCheckResult> {
	try {
		const response = await fetch(`http://${host}/`, {
			method: 'GET',
			signal: AbortSignal.timeout(2000)
		})

		// 200 or 404 are acceptable - means emulator is responding
		const healthy = response.ok || response.status === 404
		return {
			healthy,
			name,
			host,
			lastError: healthy ? undefined : `Unexpected status: ${response.status}`
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		return {
			healthy: false,
			name,
			host,
			lastError: errorMessage
		}
	}
}

/**
 * Wait for Auth emulator to become available with exponential backoff.
 *
 * @param options - Health check configuration
 * @throws Error if emulator not available within timeout
 *
 * @example
 * ```typescript
 * await waitForAuthEmulator({timeout: 30000})
 * console.log('Auth emulator ready')
 * ```
 */
export async function waitForAuthEmulator(
	options: Pick<EmulatorHealthConfig, 'authHost' | 'timeout' | 'retryDelay' | 'maxRetryDelay'> = {}
): Promise<void> {
	const {
		authHost = DEFAULTS.authHost,
		timeout = DEFAULTS.timeout,
		retryDelay = DEFAULTS.retryDelay,
		maxRetryDelay = DEFAULTS.maxRetryDelay
	} = options

	const start = Date.now()
	let delay = retryDelay
	let lastResult: HealthCheckResult | undefined

	while (Date.now() - start < timeout) {
		lastResult = await checkEmulatorHealth(authHost, 'Auth')

		if (lastResult.healthy) {
			return // Auth emulator is ready
		}

		// Wait with exponential backoff before retrying
		await new Promise(resolve => setTimeout(resolve, delay))
		delay = Math.min(delay * 2, maxRetryDelay)
	}

	// Timeout reached - throw detailed error
	const elapsed = Date.now() - start
	throw new Error(
		`Auth emulator not ready after ${elapsed}ms. ` +
			`Host: ${authHost}, Last error: ${lastResult?.lastError ?? 'Unknown'}`
	)
}

/**
 * Wait for Firestore emulator to become available with exponential backoff.
 *
 * @param options - Health check configuration
 * @throws Error if emulator not available within timeout
 *
 * @example
 * ```typescript
 * await waitForFirestoreEmulator({timeout: 30000})
 * console.log('Firestore emulator ready')
 * ```
 */
export async function waitForFirestoreEmulator(
	options: Pick<
		EmulatorHealthConfig,
		'firestoreHost' | 'timeout' | 'retryDelay' | 'maxRetryDelay'
	> = {}
): Promise<void> {
	const {
		firestoreHost = DEFAULTS.firestoreHost,
		timeout = DEFAULTS.timeout,
		retryDelay = DEFAULTS.retryDelay,
		maxRetryDelay = DEFAULTS.maxRetryDelay
	} = options

	const start = Date.now()
	let delay = retryDelay
	let lastResult: HealthCheckResult | undefined

	while (Date.now() - start < timeout) {
		lastResult = await checkEmulatorHealth(firestoreHost, 'Firestore')

		if (lastResult.healthy) {
			return // Firestore emulator is ready
		}

		// Wait with exponential backoff before retrying
		await new Promise(resolve => setTimeout(resolve, delay))
		delay = Math.min(delay * 2, maxRetryDelay)
	}

	// Timeout reached - throw detailed error
	const elapsed = Date.now() - start
	throw new Error(
		`Firestore emulator not ready after ${elapsed}ms. ` +
			`Host: ${firestoreHost}, Last error: ${lastResult?.lastError ?? 'Unknown'}`
	)
}

/**
 * Wait for both Auth and Firestore emulators to become available.
 *
 * Checks both emulators in parallel and waits for both to be healthy.
 * Uses exponential backoff with configurable timeout (default 60s).
 *
 * @param options - Health check configuration
 * @throws Error if either emulator not available within timeout
 *
 * @example
 * ```typescript
 * // In playwright.global-setup.ts
 * await waitForEmulators()
 * console.log('All emulators ready')
 * ```
 *
 * @example
 * ```typescript
 * // With custom configuration
 * await waitForEmulators({
 *   timeout: 90000,
 *   authHost: 'localhost:9099',
 *   firestoreHost: 'localhost:8180'
 * })
 * ```
 */
export async function waitForEmulators(options: EmulatorHealthConfig = {}): Promise<void> {
	const {
		authHost = DEFAULTS.authHost,
		firestoreHost = DEFAULTS.firestoreHost,
		timeout = DEFAULTS.timeout,
		retryDelay = DEFAULTS.retryDelay,
		maxRetryDelay = DEFAULTS.maxRetryDelay
	} = options

	const start = Date.now()
	let delay = retryDelay
	let authResult: HealthCheckResult | undefined
	let firestoreResult: HealthCheckResult | undefined

	while (Date.now() - start < timeout) {
		// Check both emulators in parallel
		const [authCheck, firestoreCheck] = await Promise.all([
			checkEmulatorHealth(authHost, 'Auth'),
			checkEmulatorHealth(firestoreHost, 'Firestore')
		])

		authResult = authCheck
		firestoreResult = firestoreCheck

		// Both must be healthy
		if (authResult.healthy && firestoreResult.healthy) {
			return // All emulators ready
		}

		// Wait with exponential backoff before retrying
		await new Promise(resolve => setTimeout(resolve, delay))
		delay = Math.min(delay * 2, maxRetryDelay)
	}

	// Timeout reached - build detailed error message
	const elapsed = Date.now() - start
	const failures: string[] = []

	if (!authResult?.healthy) {
		failures.push(`Auth (${authHost}): ${authResult?.lastError ?? 'Unknown'}`)
	}
	if (!firestoreResult?.healthy) {
		failures.push(`Firestore (${firestoreHost}): ${firestoreResult?.lastError ?? 'Unknown'}`)
	}

	throw new Error(
		`Emulators not ready after ${elapsed}ms. Failed emulators:\n${failures.map(f => `  - ${f}`).join('\n')}`
	)
}

/**
 * Check if emulators are available without waiting.
 *
 * Useful for conditional test skipping or quick availability checks.
 *
 * @param options - Health check configuration
 * @returns Object with availability status for each emulator
 *
 * @example
 * ```typescript
 * const status = await checkEmulatorsAvailable()
 * if (!status.auth || !status.firestore) {
 *   console.log('Skipping emulator tests')
 * }
 * ```
 */
export async function checkEmulatorsAvailable(
	options: Pick<EmulatorHealthConfig, 'authHost' | 'firestoreHost'> = {}
): Promise<{auth: boolean; firestore: boolean; allAvailable: boolean}> {
	const {authHost = DEFAULTS.authHost, firestoreHost = DEFAULTS.firestoreHost} = options

	const [authResult, firestoreResult] = await Promise.all([
		checkEmulatorHealth(authHost, 'Auth'),
		checkEmulatorHealth(firestoreHost, 'Firestore')
	])

	return {
		auth: authResult.healthy,
		firestore: firestoreResult.healthy,
		allAvailable: authResult.healthy && firestoreResult.healthy
	}
}
