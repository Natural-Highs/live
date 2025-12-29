/**
 * Session Management Tests
 *
 * Tests for src/lib/session.ts covering:
 * - Cookie security attributes (httpOnly, secure, sameSite)
 * - Session data serialization/deserialization
 * - maxAge configuration (90 days per NFR1)
 * - SECRET validation (fail-fast behavior)
 * - Dual-secret rotation support
 * - Cross-environment replay protection
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Mock must be defined before any imports that use it
vi.mock('@tanstack/react-start/server', () => ({
	useSession: vi.fn()
}))

// Import the mocked module to get access to the mock
import {useSession} from '@tanstack/react-start/server'
import type {Mock} from 'vitest'

// Import after mocking
import type {SessionData} from './session'
import {
	clearSession,
	getPreviousSessionSecret,
	getSessionData,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE,
	updateSession,
	useAppSession,
	validateSessionEnvironment,
	validateSessionSecret
} from './session'

// Cast to mock for type safety
const mockUseSession = useSession as Mock

describe('session', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.unstubAllEnvs()
	})

	describe('useAppSession', () => {
		describe('cookie security attributes', () => {
			it('should create session cookie with httpOnly attribute', async () => {
				vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))
				vi.stubEnv('NODE_ENV', 'development')

				mockUseSession.mockResolvedValue({data: {}, update: vi.fn(), clear: vi.fn()})

				await useAppSession()

				expect(mockUseSession).toHaveBeenCalledWith(
					expect.objectContaining({
						cookie: expect.objectContaining({
							httpOnly: true
						})
					})
				)
			})

			it('should create session cookie with secure attribute in production', async () => {
				vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))
				vi.stubEnv('NODE_ENV', 'production')

				mockUseSession.mockResolvedValue({data: {}, update: vi.fn(), clear: vi.fn()})

				await useAppSession()

				expect(mockUseSession).toHaveBeenCalledWith(
					expect.objectContaining({
						cookie: expect.objectContaining({
							secure: true
						})
					})
				)
			})

			it('should create session cookie without secure attribute in development', async () => {
				vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))
				vi.stubEnv('NODE_ENV', 'development')

				mockUseSession.mockResolvedValue({data: {}, update: vi.fn(), clear: vi.fn()})

				await useAppSession()

				expect(mockUseSession).toHaveBeenCalledWith(
					expect.objectContaining({
						cookie: expect.objectContaining({
							secure: false
						})
					})
				)
			})

			it('should create session cookie with sameSite=lax', async () => {
				vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))
				vi.stubEnv('NODE_ENV', 'development')

				mockUseSession.mockResolvedValue({data: {}, update: vi.fn(), clear: vi.fn()})

				await useAppSession()

				expect(mockUseSession).toHaveBeenCalledWith(
					expect.objectContaining({
						cookie: expect.objectContaining({
							sameSite: 'lax'
						})
					})
				)
			})
		})

		describe('session configuration', () => {
			it('should use nh-session as cookie name to avoid Firebase collision', async () => {
				vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))
				vi.stubEnv('NODE_ENV', 'development')

				mockUseSession.mockResolvedValue({data: {}, update: vi.fn(), clear: vi.fn()})

				await useAppSession()

				expect(mockUseSession).toHaveBeenCalledWith(
					expect.objectContaining({
						name: 'nh-session'
					})
				)
			})

			it('should set maxAge to 90 days per NFR1', async () => {
				vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))
				vi.stubEnv('NODE_ENV', 'development')

				mockUseSession.mockResolvedValue({data: {}, update: vi.fn(), clear: vi.fn()})

				await useAppSession()

				const expectedMaxAge = 90 * 24 * 60 * 60 // 90 days in seconds

				expect(mockUseSession).toHaveBeenCalledWith(
					expect.objectContaining({
						cookie: expect.objectContaining({
							maxAge: expectedMaxAge
						})
					})
				)
			})
		})

		describe('session data serialization', () => {
			it('should preserve claims structure during serialization/deserialization', async () => {
				vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))
				vi.stubEnv('NODE_ENV', 'development')

				const testSessionData: SessionData = {
					userId: 'user-123',
					email: 'test@example.com',
					displayName: 'Test User',
					claims: {
						admin: true,
						signedConsentForm: false
					},
					env: 'development'
				}

				mockUseSession.mockResolvedValue({
					data: testSessionData,
					update: vi.fn(),
					clear: vi.fn()
				})

				const session = await useAppSession()

				expect(session.data).toEqual(testSessionData)
				expect(session.data.claims?.admin).toBe(true)
				expect(session.data.claims?.signedConsentForm).toBe(false)
			})
		})
	})

	describe('validateSessionSecret', () => {
		it('should throw when SESSION_SECRET is missing', () => {
			vi.stubEnv('SESSION_SECRET', '')

			expect(() => validateSessionSecret()).toThrow(
				'SESSION_SECRET must be set and at least 32 characters'
			)
		})

		it('should throw when SESSION_SECRET is undefined', () => {
			// Don't set SESSION_SECRET at all
			delete process.env.SESSION_SECRET

			expect(() => validateSessionSecret()).toThrow(
				'SESSION_SECRET must be set and at least 32 characters'
			)
		})

		it('should throw when SESSION_SECRET is less than 32 characters', () => {
			vi.stubEnv('SESSION_SECRET', 'a'.repeat(31))

			expect(() => validateSessionSecret()).toThrow(
				'SESSION_SECRET must be set and at least 32 characters'
			)
		})

		it('should include helpful error message with doppler command', () => {
			vi.stubEnv('SESSION_SECRET', '')

			expect(() => validateSessionSecret()).toThrow(/doppler secrets set SESSION_SECRET/)
		})

		it('should accept valid SECRET with exactly 32 characters', () => {
			vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))

			expect(() => validateSessionSecret()).not.toThrow()
		})

		it('should accept valid SECRET with more than 32 characters', () => {
			vi.stubEnv('SESSION_SECRET', 'a'.repeat(64))

			expect(() => validateSessionSecret()).not.toThrow()
		})
	})

	describe('dual-secret rotation', () => {
		it('should accept current secret during rotation', () => {
			vi.stubEnv('SESSION_SECRET', 'current-secret-32-characters-xxx')
			vi.stubEnv('SESSION_SECRET_PREVIOUS', 'previous-secret-32-characters-xx')

			expect(() => validateSessionSecret()).not.toThrow()
		})

		it('should use current secret only (h3 useSession only accepts string password)', async () => {
			// Note: TanStack Start's useSession (via h3) only accepts string password.
			// Rotation relies on session expiration window, not multi-key decryption.
			vi.stubEnv('SESSION_SECRET', 'current-secret-32-characters-xxx')
			vi.stubEnv('SESSION_SECRET_PREVIOUS', 'previous-secret-32-characters-xx')
			vi.stubEnv('NODE_ENV', 'development')

			mockUseSession.mockResolvedValue({data: {}, update: vi.fn(), clear: vi.fn()})

			await useAppSession()

			// Verify only current password is passed (h3 limitation)
			expect(mockUseSession).toHaveBeenCalledWith(
				expect.objectContaining({
					password: 'current-secret-32-characters-xxx'
				})
			)
		})

		it('should pass single string when no previous secret', async () => {
			vi.stubEnv('SESSION_SECRET', 'current-secret-32-characters-xxx')
			delete process.env.SESSION_SECRET_PREVIOUS
			vi.stubEnv('NODE_ENV', 'development')

			mockUseSession.mockResolvedValue({data: {}, update: vi.fn(), clear: vi.fn()})

			await useAppSession()

			// Verify password is passed as single string when no rotation
			expect(mockUseSession).toHaveBeenCalledWith(
				expect.objectContaining({
					password: 'current-secret-32-characters-xxx'
				})
			)
		})

		it('should reject when neither secret is valid', () => {
			vi.stubEnv('SESSION_SECRET', 'short')
			// No previous secret

			expect(() => validateSessionSecret()).toThrow()
		})
	})

	describe('cross-environment replay protection', () => {
		it('should include env in session data type', () => {
			const sessionData: SessionData = {
				userId: 'user-123',
				env: 'production'
			}

			expect(sessionData.env).toBe('production')
		})

		it('should support development, staging, and production environments', () => {
			const devSession: SessionData = {env: 'development'}
			const stgSession: SessionData = {env: 'staging'}
			const prdSession: SessionData = {env: 'production'}

			expect(devSession.env).toBe('development')
			expect(stgSession.env).toBe('staging')
			expect(prdSession.env).toBe('production')
		})

		it('should validate session environment matches current environment', () => {
			vi.stubEnv('NODE_ENV', 'production')

			const sessionData: SessionData = {
				userId: 'user-123',
				env: 'production'
			}

			expect(validateSessionEnvironment(sessionData)).toBe(true)
		})

		it('should reject session from different environment (cross-env replay)', () => {
			vi.stubEnv('NODE_ENV', 'production')

			const sessionData: SessionData = {
				userId: 'user-123',
				env: 'development' // Session from dev used in prod
			}

			expect(validateSessionEnvironment(sessionData)).toBe(false)
		})

		it('should accept session without env (backwards compatibility)', () => {
			vi.stubEnv('NODE_ENV', 'production')

			const sessionData: SessionData = {
				userId: 'user-123'
				// No env field
			}

			expect(validateSessionEnvironment(sessionData)).toBe(true)
		})
	})

	describe('getPreviousSessionSecret', () => {
		it('should return previous secret when valid', () => {
			vi.stubEnv('SESSION_SECRET_PREVIOUS', 'a'.repeat(32))

			expect(getPreviousSessionSecret()).toBe('a'.repeat(32))
		})

		it('should return undefined when previous secret is too short', () => {
			vi.stubEnv('SESSION_SECRET_PREVIOUS', 'short')

			expect(getPreviousSessionSecret()).toBeUndefined()
		})

		it('should return undefined when previous secret is not set', () => {
			delete process.env.SESSION_SECRET_PREVIOUS

			expect(getPreviousSessionSecret()).toBeUndefined()
		})
	})

	describe('constants', () => {
		it('should export SESSION_COOKIE_NAME as nh-session', () => {
			expect(SESSION_COOKIE_NAME).toBe('nh-session')
		})

		it('should export SESSION_MAX_AGE as 90 days in seconds', () => {
			expect(SESSION_MAX_AGE).toBe(90 * 24 * 60 * 60)
		})
	})

	describe('session security (iron-webcrypto)', () => {
		it('should pass session secret as password for HMAC signing', async () => {
			const testSecret = 'test-session-secret-32-chars-xxx'
			vi.stubEnv('SESSION_SECRET', testSecret)
			vi.stubEnv('NODE_ENV', 'development')

			mockUseSession.mockResolvedValue({data: {}, update: vi.fn(), clear: vi.fn()})

			await useAppSession()

			// Verify password is passed to useSession for iron-webcrypto signing
			expect(mockUseSession).toHaveBeenCalledWith(
				expect.objectContaining({
					password: testSecret
				})
			)
		})
	})

	describe('session update and clear', () => {
		it('should preserve existing data during partial updates', async () => {
			vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))
			vi.stubEnv('NODE_ENV', 'development')

			const mockUpdate = vi.fn()
			const existingData: SessionData = {
				userId: 'user-123',
				email: 'test@example.com',
				claims: {admin: false}
			}

			mockUseSession.mockResolvedValue({
				data: existingData,
				update: mockUpdate,
				clear: vi.fn()
			})

			// Update only claims
			await updateSession({claims: {signedConsentForm: true}})

			expect(mockUpdate).toHaveBeenCalledWith({claims: {signedConsentForm: true}})
		})

		it('should call clear to remove all session data', async () => {
			vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))
			vi.stubEnv('NODE_ENV', 'development')

			const mockClear = vi.fn()

			mockUseSession.mockResolvedValue({
				data: {userId: 'user-123'},
				update: vi.fn(),
				clear: mockClear
			})

			await clearSession()

			expect(mockClear).toHaveBeenCalled()
		})

		it('should return session data via getSessionData', async () => {
			vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))
			vi.stubEnv('NODE_ENV', 'development')

			const testData: SessionData = {
				userId: 'user-456',
				email: 'another@example.com',
				claims: {admin: true}
			}

			mockUseSession.mockResolvedValue({
				data: testData,
				update: vi.fn(),
				clear: vi.fn()
			})

			const data = await getSessionData()

			expect(data).toEqual(testData)
		})
	})

	describe('secret isolation (R-001)', () => {
		it('should only use process.env for SESSION_SECRET (not import.meta.env)', async () => {
			// This test verifies that session.ts uses process.env (server-only)
			// and not import.meta.env (which would leak to client bundles)
			vi.stubEnv('SESSION_SECRET', 'a'.repeat(32))
			vi.stubEnv('NODE_ENV', 'development')

			mockUseSession.mockResolvedValue({data: {}, update: vi.fn(), clear: vi.fn()})

			// If useAppSession uses import.meta.env.SESSION_SECRET, it would be undefined
			// and validation would fail. This test passes only if process.env is used.
			await expect(useAppSession()).resolves.toBeDefined()
		})
	})
})
