/**
 * Environment Variable Tests
 *
 * Tests for src/lib/env.ts covering:
 * - isSentryEnabled() in various environments
 * - getEnvironment() detection
 * - requireEnv() validation and error messages
 * - optionalEnv() default value handling
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Helper to reset and reimport the module
async function resetModule() {
	vi.resetModules()
	return import('./env')
}

describe('env utilities', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.unstubAllEnvs()
	})

	describe('isSentryEnabled', () => {
		describe('client-side (window defined)', () => {
			it('should return false when VITE_USE_EMULATORS=true', async () => {
				vi.stubEnv('VITE_USE_EMULATORS', 'true')
				vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123')

				const {isSentryEnabled} = await resetModule()
				expect(isSentryEnabled()).toBe(false)
			})

			it('should return false when VITE_SENTRY_DSN is not set', async () => {
				vi.stubEnv('VITE_USE_EMULATORS', 'false')
				// Don't set VITE_SENTRY_DSN

				const {isSentryEnabled} = await resetModule()
				expect(isSentryEnabled()).toBe(false)
			})

			it('should return true when DSN set and not in emulator mode', async () => {
				vi.stubEnv('VITE_USE_EMULATORS', 'false')
				vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123')

				const {isSentryEnabled} = await resetModule()
				expect(isSentryEnabled()).toBe(true)
			})
		})

		describe('server-side (window undefined)', () => {
			it('should return false when FIRESTORE_EMULATOR_HOST is set', async () => {
				// Simulate server-side by temporarily removing window
				const originalWindow = globalThis.window
				// biome-ignore lint/performance/noDelete: Test requires undefined window
				delete (globalThis as {window?: unknown}).window

				vi.stubEnv('FIRESTORE_EMULATOR_HOST', 'localhost:8180')
				vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

				const {isSentryEnabled} = await resetModule()
				const result = isSentryEnabled()

				// Restore window
				globalThis.window = originalWindow

				expect(result).toBe(false)
			})

			it('should return false when VITE_USE_EMULATORS=true on server', async () => {
				const originalWindow = globalThis.window
				// biome-ignore lint/performance/noDelete: Test requires undefined window
				delete (globalThis as {window?: unknown}).window

				vi.stubEnv('VITE_USE_EMULATORS', 'true')
				vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

				const {isSentryEnabled} = await resetModule()
				const result = isSentryEnabled()

				globalThis.window = originalWindow

				expect(result).toBe(false)
			})

			it('should return true when DSN set and not in emulator mode on server', async () => {
				const originalWindow = globalThis.window
				// biome-ignore lint/performance/noDelete: Test requires undefined window
				delete (globalThis as {window?: unknown}).window

				vi.stubEnv('VITE_USE_EMULATORS', 'false')
				vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')
				// Don't set FIRESTORE_EMULATOR_HOST

				const {isSentryEnabled} = await resetModule()
				const result = isSentryEnabled()

				globalThis.window = originalWindow

				expect(result).toBe(true)
			})
		})
	})

	describe('getEnvironment', () => {
		describe('client-side', () => {
			it('should return production when MODE is production', async () => {
				vi.stubEnv('MODE', 'production')

				const {getEnvironment} = await resetModule()
				expect(getEnvironment()).toBe('production')
			})

			it('should return staging when MODE is staging', async () => {
				vi.stubEnv('MODE', 'staging')

				const {getEnvironment} = await resetModule()
				expect(getEnvironment()).toBe('staging')
			})

			it('should return development for other modes', async () => {
				vi.stubEnv('MODE', 'development')

				const {getEnvironment} = await resetModule()
				expect(getEnvironment()).toBe('development')
			})
		})

		describe('server-side', () => {
			it('should return production when NODE_ENV is production', async () => {
				const originalWindow = globalThis.window
				// biome-ignore lint/performance/noDelete: Test requires undefined window
				delete (globalThis as {window?: unknown}).window

				vi.stubEnv('NODE_ENV', 'production')

				const {getEnvironment} = await resetModule()
				const result = getEnvironment()

				globalThis.window = originalWindow

				expect(result).toBe('production')
			})

			it('should return staging when NODE_ENV is staging', async () => {
				const originalWindow = globalThis.window
				// biome-ignore lint/performance/noDelete: Test requires undefined window
				delete (globalThis as {window?: unknown}).window

				vi.stubEnv('NODE_ENV', 'staging')

				const {getEnvironment} = await resetModule()
				const result = getEnvironment()

				globalThis.window = originalWindow

				expect(result).toBe('staging')
			})

			it('should return development for other NODE_ENV values', async () => {
				const originalWindow = globalThis.window
				// biome-ignore lint/performance/noDelete: Test requires undefined window
				delete (globalThis as {window?: unknown}).window

				vi.stubEnv('NODE_ENV', 'test')

				const {getEnvironment} = await resetModule()
				const result = getEnvironment()

				globalThis.window = originalWindow

				expect(result).toBe('development')
			})
		})
	})

	describe('isProduction', () => {
		it('should return true when environment is production', async () => {
			vi.stubEnv('MODE', 'production')

			const {isProduction} = await resetModule()
			expect(isProduction()).toBe(true)
		})

		it('should return false when environment is not production', async () => {
			vi.stubEnv('MODE', 'development')

			const {isProduction} = await resetModule()
			expect(isProduction()).toBe(false)
		})
	})

	describe('isEmulatorMode', () => {
		it('should return true when VITE_USE_EMULATORS is true', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'true')

			const {isEmulatorMode} = await resetModule()
			expect(isEmulatorMode()).toBe(true)
		})

		it('should return false when VITE_USE_EMULATORS is not true', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'false')

			const {isEmulatorMode} = await resetModule()
			expect(isEmulatorMode()).toBe(false)
		})

		describe('server-side (window undefined)', () => {
			it('should return true when VITE_USE_EMULATORS is true on server', async () => {
				const originalWindow = globalThis.window
				// biome-ignore lint/performance/noDelete: Test requires undefined window
				delete (globalThis as {window?: unknown}).window

				vi.stubEnv('VITE_USE_EMULATORS', 'true')

				const {isEmulatorMode} = await resetModule()
				const result = isEmulatorMode()

				globalThis.window = originalWindow

				expect(result).toBe(true)
			})

			it('should return false when VITE_USE_EMULATORS is not true on server', async () => {
				const originalWindow = globalThis.window
				// biome-ignore lint/performance/noDelete: Test requires undefined window
				delete (globalThis as {window?: unknown}).window

				vi.stubEnv('VITE_USE_EMULATORS', 'false')

				const {isEmulatorMode} = await resetModule()
				const result = isEmulatorMode()

				globalThis.window = originalWindow

				expect(result).toBe(false)
			})
		})
	})

	describe('requireEnv', () => {
		it('should throw with clear message when env var is missing', async () => {
			const {requireEnv} = await resetModule()

			expect(() => requireEnv('MY_VAR', undefined)).toThrow(
				'Required environment variable MY_VAR is not set'
			)
		})

		it('should throw with clear message when env var is empty string', async () => {
			const {requireEnv} = await resetModule()

			expect(() => requireEnv('MY_VAR', '')).toThrow(
				'Required environment variable MY_VAR is not set'
			)
		})

		it('should return value when env var is present', async () => {
			const {requireEnv} = await resetModule()

			const result = requireEnv('MY_VAR', 'my-value')
			expect(result).toBe('my-value')
		})

		it('should include Doppler mention in error message', async () => {
			const {requireEnv} = await resetModule()

			expect(() => requireEnv('API_KEY', undefined)).toThrow(/Doppler/)
		})
	})

	describe('optionalEnv', () => {
		it('should return default value when env var is undefined', async () => {
			const {optionalEnv} = await resetModule()

			const result = optionalEnv(undefined, 'default-value')
			expect(result).toBe('default-value')
		})

		it('should return env value when present', async () => {
			const {optionalEnv} = await resetModule()

			const result = optionalEnv('actual-value', 'default-value')
			expect(result).toBe('actual-value')
		})

		it('should preserve literal type of default value', async () => {
			const {optionalEnv} = await resetModule()

			// This tests the type signature - result should be string | 'literal'
			const result = optionalEnv(undefined, 'literal' as const)
			expect(result).toBe('literal')
		})

		it('should return empty string if explicitly set', async () => {
			const {optionalEnv} = await resetModule()

			// Empty string is a valid value (not undefined)
			const result = optionalEnv('', 'default')
			expect(result).toBe('')
		})
	})
})
