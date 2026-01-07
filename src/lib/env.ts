/**
 * Environment Variable Validation
 *
 * Provides validation utilities for required environment variables.
 * Validates at runtime with clear error messages.
 *
 * @module env
 */

/**
 * Check if Sentry should be enabled based on environment.
 *
 * Sentry is enabled when:
 * - Not running in emulator mode
 * - Appropriate SENTRY_DSN is set (client or server)
 *
 * @returns true if Sentry should be active
 */
export function isSentryEnabled(): boolean {
	if (typeof window !== 'undefined') {
		// Client-side
		return import.meta.env.VITE_USE_EMULATORS !== 'true' && !!import.meta.env.VITE_SENTRY_DSN
	}
	// Server-side: check emulator mode and DSN
	const isEmulator =
		process.env.VITE_USE_EMULATORS === 'true' || !!process.env.FIRESTORE_EMULATOR_HOST
	return !isEmulator && !!(process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN)
}

/**
 * Get the current environment name.
 *
 * @returns 'development' | 'staging' | 'production'
 */
export function getEnvironment(): 'development' | 'staging' | 'production' {
	if (typeof window !== 'undefined') {
		// Client-side: use Vite mode
		const mode = import.meta.env.MODE
		if (mode === 'production') {
			return 'production'
		}
		if (mode === 'staging') {
			return 'staging'
		}
		return 'development'
	}
	// Server-side
	const nodeEnv = process.env.NODE_ENV
	if (nodeEnv === 'production') {
		return 'production'
	}
	if (nodeEnv === 'staging') {
		return 'staging'
	}
	return 'development'
}

/**
 * Check if running in production environment.
 */
export function isProduction(): boolean {
	return getEnvironment() === 'production'
}

/**
 * Check if running with Firebase emulators.
 */
export function isEmulatorMode(): boolean {
	if (typeof window !== 'undefined') {
		return import.meta.env.VITE_USE_EMULATORS === 'true'
	}
	return process.env.VITE_USE_EMULATORS === 'true'
}

/**
 * Validate that a required environment variable is set.
 * Throws with a helpful error message if missing.
 *
 * @param name - Environment variable name
 * @param value - Environment variable value
 * @throws Error if value is not set
 */
export function requireEnv(name: string, value: string | undefined): string {
	if (!value) {
		throw new Error(
			`Required environment variable ${name} is not set. ` +
				'Check your Doppler configuration or .env file.'
		)
	}
	return value
}

/**
 * Get an optional environment variable with a default value.
 * Preserves the literal type of the default value when no env var is set.
 *
 * @param value - Environment variable value
 * @param defaultValue - Default if not set
 */
export function optionalEnv<T extends string>(
	value: string | undefined,
	defaultValue: T
): string | T {
	return value ?? defaultValue
}
