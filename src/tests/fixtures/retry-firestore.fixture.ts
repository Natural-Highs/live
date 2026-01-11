/**
 * Firestore Retry Fixture for E2E Testing
 *
 * Provides retry logic wrapper for Firestore operations that may fail due to
 * transient connection issues (ECONNRESET, ETIMEDOUT, ECONNREFUSED).
 *
 * Key patterns:
 * - `withRetry(operation, options)` - Wrap any async operation with retry logic
 * - Exponential backoff: 100ms, 200ms, 400ms (configurable)
 * - Only retries transient errors; permanent failures surface immediately
 *
 * @module tests/fixtures/retry-firestore.fixture
 */

/**
 * Error codes that indicate transient connection issues.
 * These errors are safe to retry as they typically resolve on subsequent attempts.
 */
const RETRYABLE_ERROR_CODES = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'] as const

/**
 * Error messages that indicate transient issues (fallback when no error code).
 */
const RETRYABLE_ERROR_MESSAGES = [
	'ECONNRESET',
	'ETIMEDOUT',
	'ECONNREFUSED',
	'socket hang up',
	'connection reset',
	'network error',
	'fetch failed'
] as const

/**
 * Configuration for retry behavior.
 */
export interface RetryConfig {
	/** Maximum number of retry attempts (default: 3) */
	maxRetries?: number
	/** Base delay in milliseconds before first retry (default: 100) */
	baseDelay?: number
	/** Whether to log retry attempts for debugging (default: true in CI) */
	logRetries?: boolean
	/** Custom function to determine if an error is retryable */
	isRetryable?: (error: unknown) => boolean
}

/**
 * Default configuration values.
 */
const DEFAULTS: Required<Omit<RetryConfig, 'isRetryable'>> = {
	maxRetries: 3,
	baseDelay: 100,
	logRetries: Boolean(process.env.CI)
}

/**
 * Check if an error is retryable based on error code or message.
 *
 * @param error - Error to check
 * @returns true if the error is transient and should be retried
 */
export function isRetryableError(error: unknown): boolean {
	if (!error) {
		return false
	}

	// Check error code (Node.js system errors)
	if (typeof error === 'object' && 'code' in error) {
		const code = (error as {code: string}).code
		if (RETRYABLE_ERROR_CODES.includes(code as (typeof RETRYABLE_ERROR_CODES)[number])) {
			return true
		}
	}

	// Check error message (fallback for errors without code)
	const message = error instanceof Error ? error.message : String(error)
	const lowerMessage = message.toLowerCase()

	return RETRYABLE_ERROR_MESSAGES.some(pattern => lowerMessage.includes(pattern.toLowerCase()))
}

/**
 * Extract a meaningful error description for logging.
 *
 * @param error - Error to describe
 * @returns Human-readable error description
 */
function getErrorDescription(error: unknown): string {
	if (error instanceof Error) {
		const code = 'code' in error ? (error as {code: string}).code : undefined
		return code ? `${code}: ${error.message}` : error.message
	}
	return String(error)
}

/**
 * Wrap an async operation with retry logic for transient failures.
 *
 * Use this to wrap Firestore seed operations (createTestEvent, createTestUser, etc.)
 * to handle transient ECONNRESET errors during E2E tests.
 *
 * @param operation - Async function to execute (will be retried on transient errors)
 * @param options - Retry configuration
 * @returns Result of the operation
 * @throws Original error if all retries exhausted or error is not retryable
 *
 * @example
 * ```typescript
 * // Wrap a single operation
 * await withRetry(() => createTestEvent({...}))
 *
 * // With custom configuration
 * await withRetry(
 *   () => createTestUser('user-1', {...}),
 *   {maxRetries: 5, baseDelay: 200}
 * )
 * ```
 *
 * @example
 * ```typescript
 * // In a test beforeEach hook
 * test.beforeEach(async () => {
 *   await withRetry(async () => {
 *     await createTestEvent({id: 'event-1', ...})
 *     await createTestUser('user-1', {...})
 *   })
 * })
 * ```
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	options: RetryConfig = {}
): Promise<T> {
	const {
		maxRetries = DEFAULTS.maxRetries,
		baseDelay = DEFAULTS.baseDelay,
		logRetries = DEFAULTS.logRetries,
		isRetryable = isRetryableError
	} = options

	let lastError: unknown

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation()
		} catch (error) {
			lastError = error

			// Check if this error should be retried
			if (!isRetryable(error)) {
				// Non-retryable error - surface immediately
				throw error
			}

			// Last attempt - don't retry, throw
			if (attempt === maxRetries) {
				throw error
			}

			// Calculate delay with exponential backoff
			const delay = baseDelay * 2 ** (attempt - 1)

			if (logRetries) {
				const errorDesc = getErrorDescription(error)
				console.log(
					`[Firestore Retry] Attempt ${attempt}/${maxRetries} failed: ${errorDesc}. ` +
						`Retrying in ${delay}ms...`
				)
			}

			// Wait before next attempt
			await new Promise(resolve => setTimeout(resolve, delay))
		}
	}

	// Should not reach here, but TypeScript needs this
	throw lastError
}

/**
 * Create a retryable version of an async function.
 *
 * Useful for wrapping fixture functions that should always retry.
 *
 * @param fn - Async function to wrap
 * @param options - Retry configuration
 * @returns Wrapped function with retry logic
 *
 * @example
 * ```typescript
 * // Create retryable versions of seed functions
 * const createEventWithRetry = withRetryWrapper(createTestEvent, {maxRetries: 3})
 * const createUserWithRetry = withRetryWrapper(createTestUser, {maxRetries: 3})
 *
 * // Use in tests
 * await createEventWithRetry({id: 'event-1', ...})
 * await createUserWithRetry('user-1', {...})
 * ```
 */
export function withRetryWrapper<TArgs extends unknown[], TResult>(
	fn: (...args: TArgs) => Promise<TResult>,
	options: RetryConfig = {}
): (...args: TArgs) => Promise<TResult> {
	return (...args: TArgs) => withRetry(() => fn(...args), options)
}
