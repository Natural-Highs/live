/**
 * Sentry Server Tests
 *
 * Tests for src/server/functions/utils/sentry.server.ts covering:
 * - Initialization with DSN validation
 * - Graceful degradation when DSN missing
 * - withSentry HOF error capture and re-throw
 * - captureServerError with and without context
 * - flushSentry pending events
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Mock @sentry/node before importing the module under test
vi.mock('@sentry/node', () => ({
	init: vi.fn(),
	captureException: vi.fn(),
	withScope: vi.fn(callback => callback({setExtras: vi.fn()})),
	flush: vi.fn(() => Promise.resolve(true))
}))

// Import mocks for assertions
import * as Sentry from '@sentry/node'

// Helper to reset and reimport the module
async function resetModule() {
	vi.resetModules()
	return import('./sentry.server')
}

describe('sentry server', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.unstubAllEnvs()
	})

	describe('initSentryServer', () => {
		it('should return false when SENTRY_DSN is not set', async () => {
			// Don't set SENTRY_DSN
			const {initSentryServer} = await resetModule()
			const result = initSentryServer()

			expect(result).toBe(false)
			expect(Sentry.init).not.toHaveBeenCalled()
		})

		it('should return false when VITE_USE_EMULATORS is true', async () => {
			vi.stubEnv('VITE_USE_EMULATORS', 'true')
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentryServer} = await resetModule()
			const result = initSentryServer()

			expect(result).toBe(false)
			expect(Sentry.init).not.toHaveBeenCalled()
		})

		it('should return false when FIRESTORE_EMULATOR_HOST is set', async () => {
			vi.stubEnv('FIRESTORE_EMULATOR_HOST', 'localhost:8080')
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentryServer} = await resetModule()
			const result = initSentryServer()

			expect(result).toBe(false)
			expect(Sentry.init).not.toHaveBeenCalled()
		})

		it('should initialize Sentry when SENTRY_DSN is set', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')
			vi.stubEnv('NODE_ENV', 'production')

			const {initSentryServer} = await resetModule()
			const result = initSentryServer()

			expect(result).toBe(true)
			expect(Sentry.init).toHaveBeenCalledWith(
				expect.objectContaining({
					dsn: 'https://test@sentry.io/123',
					environment: 'production',
					tracesSampleRate: 0
				})
			)
		})

		it('should use NODE_ENV as environment', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')
			vi.stubEnv('NODE_ENV', 'staging')

			const {initSentryServer} = await resetModule()
			initSentryServer()

			expect(Sentry.init).toHaveBeenCalledWith(
				expect.objectContaining({
					environment: 'staging'
				})
			)
		})

		it('should default to development when NODE_ENV is not set', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')
			// Explicitly unset NODE_ENV to test fallback
			process.env.NODE_ENV = undefined

			const {initSentryServer} = await resetModule()
			initSentryServer()

			expect(Sentry.init).toHaveBeenCalledWith(
				expect.objectContaining({
					environment: 'development'
				})
			)
		})

		it('should only initialize once (subsequent calls return true)', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentryServer} = await resetModule()
			vi.mocked(Sentry.init).mockClear()

			const first = initSentryServer()
			const second = initSentryServer()

			expect(first).toBe(true)
			expect(second).toBe(true)
			expect(Sentry.init).toHaveBeenCalledTimes(1)
		})
	})

	describe('withSentry', () => {
		it('should catch and report exceptions then re-throw', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentryServer, withSentry} = await resetModule()
			initSentryServer()

			const testError = new Error('Test handler error')
			const handler = vi.fn().mockRejectedValue(testError)
			const wrappedHandler = withSentry(handler)

			await expect(wrappedHandler({})).rejects.toThrow('Test handler error')
			expect(Sentry.captureException).toHaveBeenCalledWith(testError)
		})

		it('should pass through successful results unchanged', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentryServer, withSentry} = await resetModule()
			initSentryServer()

			const handler = vi.fn().mockResolvedValue({success: true})
			const wrappedHandler = withSentry(handler)

			const result = await wrappedHandler({input: 'test'})

			expect(result).toEqual({success: true})
			expect(handler).toHaveBeenCalledWith({input: 'test'})
			expect(Sentry.captureException).not.toHaveBeenCalled()
		})

		it('should not capture exception when Sentry is not initialized', async () => {
			// Don't set SENTRY_DSN
			const {initSentryServer, withSentry} = await resetModule()
			initSentryServer() // Will return false

			const testError = new Error('Test error')
			const handler = vi.fn().mockRejectedValue(testError)
			const wrappedHandler = withSentry(handler)

			await expect(wrappedHandler({})).rejects.toThrow('Test error')
			expect(Sentry.captureException).not.toHaveBeenCalled()
		})

		it('should not capture non-Error exceptions', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentryServer, withSentry} = await resetModule()
			initSentryServer()

			const handler = vi.fn().mockRejectedValue('string error')
			const wrappedHandler = withSentry(handler)

			await expect(wrappedHandler({})).rejects.toBe('string error')
			expect(Sentry.captureException).not.toHaveBeenCalled()
		})
	})

	describe('captureServerError', () => {
		it('should not capture errors when Sentry is not initialized', async () => {
			// Don't set SENTRY_DSN
			const {initSentryServer, captureServerError} = await resetModule()
			initSentryServer() // Will return false

			captureServerError(new Error('Test error'))

			expect(Sentry.captureException).not.toHaveBeenCalled()
		})

		it('should capture errors when Sentry is initialized', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentryServer, captureServerError} = await resetModule()
			initSentryServer()

			const testError = new Error('Test error')
			captureServerError(testError)

			expect(Sentry.captureException).toHaveBeenCalledWith(testError)
		})

		it('should capture errors with context when provided', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentryServer, captureServerError} = await resetModule()
			initSentryServer()

			const testError = new Error('Test error')
			const context = {userId: '123', action: 'test'}
			captureServerError(testError, context)

			expect(Sentry.withScope).toHaveBeenCalled()
		})
	})

	describe('isSentryServerInitialized', () => {
		it('should return false before initialization', async () => {
			// Don't set SENTRY_DSN
			const {initSentryServer, isSentryServerInitialized} = await resetModule()
			initSentryServer() // Will fail due to missing DSN

			expect(isSentryServerInitialized()).toBe(false)
		})

		it('should return true after successful initialization', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentryServer, isSentryServerInitialized} = await resetModule()
			initSentryServer()

			expect(isSentryServerInitialized()).toBe(true)
		})
	})

	describe('flushSentry', () => {
		it('should return true immediately when Sentry is not initialized', async () => {
			// Don't set SENTRY_DSN
			const {initSentryServer, flushSentry} = await resetModule()
			initSentryServer() // Will return false

			const result = await flushSentry()

			expect(result).toBe(true)
			expect(Sentry.flush).not.toHaveBeenCalled()
		})

		it('should call Sentry.flush when initialized', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentryServer, flushSentry} = await resetModule()
			initSentryServer()

			const result = await flushSentry()

			expect(result).toBe(true)
			expect(Sentry.flush).toHaveBeenCalledWith(2000)
		})

		it('should accept custom timeout', async () => {
			vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123')

			const {initSentryServer, flushSentry} = await resetModule()
			initSentryServer()

			await flushSentry(5000)

			expect(Sentry.flush).toHaveBeenCalledWith(5000)
		})
	})
})
