/**
 * Sentry Client Tests
 *
 * Tests for src/lib/sentry.ts covering:
 * - Initialization with DSN validation
 * - Graceful degradation when DSN missing
 * - Emulator mode detection
 * - Error capture utilities
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Mock @sentry/react before importing the module under test
vi.mock('@sentry/react', () => ({
	init: vi.fn(),
	captureException: vi.fn(),
	withScope: vi.fn(callback => callback({setExtras: vi.fn()})),
	browserTracingIntegration: vi.fn(() => ({})),
	ErrorBoundary: vi.fn(),
	setUser: vi.fn()
}))

// Import mocks for assertions
import * as Sentry from '@sentry/react'

// Helper to reset and reimport the module
async function resetModule() {
	vi.resetModules()
	return import('./sentry')
}

describe('sentry client', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.unstubAllEnvs()
	})

	describe('initSentry', () => {
		it('should return false when VITE_USE_EMULATORS is true', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'true')
			vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentry} = await resetModule()
			const result = initSentry()

			expect(result).toBe(false)
			expect(Sentry.init).not.toHaveBeenCalled()
		})

		it('should return false when VITE_SENTRY_DSN is not set', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'false')
			// Don't set VITE_SENTRY_DSN

			const {initSentry} = await resetModule()
			const result = initSentry()

			expect(result).toBe(false)
			expect(Sentry.init).not.toHaveBeenCalled()
		})

		it('should initialize Sentry when DSN is set and not in emulator mode', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'false')
			vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123')
			vi.stubEnv('MODE', 'production')

			const {initSentry} = await resetModule()
			const result = initSentry()

			expect(result).toBe(true)
			expect(Sentry.init).toHaveBeenCalledWith(
				expect.objectContaining({
					dsn: 'https://test@sentry.io/123',
					environment: 'production',
					tracesSampleRate: 0
				})
			)
		})

		it('should only initialize once (subsequent calls return true)', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'false')
			vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentry} = await resetModule()
			vi.mocked(Sentry.init).mockClear() // Clear any calls from previous tests

			const first = initSentry()
			const second = initSentry()

			expect(first).toBe(true)
			expect(second).toBe(true)
			// init should only be called once
			expect(Sentry.init).toHaveBeenCalledTimes(1)
		})
	})

	describe('captureError', () => {
		it('should not capture errors when Sentry is not initialized', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'true') // Prevents initialization

			const {initSentry, captureError} = await resetModule()
			initSentry() // Will return false

			captureError(new Error('Test error'))

			expect(Sentry.captureException).not.toHaveBeenCalled()
		})

		it('should capture errors when Sentry is initialized', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'false')
			vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentry, captureError} = await resetModule()
			initSentry()

			const testError = new Error('Test error')
			captureError(testError)

			expect(Sentry.captureException).toHaveBeenCalledWith(testError)
		})

		it('should capture errors with context when provided', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'false')
			vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentry, captureError} = await resetModule()
			initSentry()

			const testError = new Error('Test error')
			const context = {userId: '123', page: '/dashboard'}
			captureError(testError, context)

			expect(Sentry.withScope).toHaveBeenCalled()
		})
	})

	describe('isSentryInitialized', () => {
		it('should return false before initialization', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'true')

			const {initSentry, isSentryInitialized} = await resetModule()
			initSentry() // Will fail due to emulator mode

			expect(isSentryInitialized()).toBe(false)
		})

		it('should return true after successful initialization', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'false')
			vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentry, isSentryInitialized} = await resetModule()
			initSentry()

			expect(isSentryInitialized()).toBe(true)
		})
	})

	describe('SentryErrorBoundary export', () => {
		it('should export ErrorBoundary from Sentry', async () => {
			const {SentryErrorBoundary} = await resetModule()

			expect(SentryErrorBoundary).toBeDefined()
			expect(SentryErrorBoundary).toBe(Sentry.ErrorBoundary)
		})
	})

	describe('setSentryUser', () => {
		it('should not set user when Sentry is not initialized', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'true') // Prevents initialization

			const {initSentry, setSentryUser} = await resetModule()
			initSentry() // Will return false

			setSentryUser({id: 'user123', email: 'test@example.com'})

			expect(Sentry.setUser).not.toHaveBeenCalled()
		})

		it('should set user with id and email when initialized', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'false')
			vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentry, setSentryUser} = await resetModule()
			initSentry()

			setSentryUser({id: 'user123', email: 'test@example.com'})

			expect(Sentry.setUser).toHaveBeenCalledWith({id: 'user123', email: 'test@example.com'})
		})

		it('should set user with only id when email not provided', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'false')
			vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentry, setSentryUser} = await resetModule()
			initSentry()

			setSentryUser({id: 'user123'})

			expect(Sentry.setUser).toHaveBeenCalledWith({id: 'user123', email: undefined})
		})

		it('should clear user when null is passed', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'false')
			vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentry, setSentryUser} = await resetModule()
			initSentry()

			setSentryUser(null)

			expect(Sentry.setUser).toHaveBeenCalledWith(null)
		})
	})
})
