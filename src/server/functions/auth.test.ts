/**
 * Unit tests for auth server functions
 *
 * Coverage:
 * - createSessionFn creates session with correct data
 * - createSessionFn rejects invalid Firebase ID token
 * - createSessionFn syncs Firebase claims to session
 * - createSessionFn rejects emulator mode in production (NODE_ENV guard)
 * - createSessionFn allows emulator mode in non-production environments
 * - Session userId matches Firebase UID exactly (R-012)
 * - Firebase auth failure returns appropriate error
 * - logoutFn clears session completely
 * - getCurrentUserFn returns user when session exists
 * - getCurrentUserFn returns null when no session
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Use vi.hoisted for mock functions that need to be available in vi.mock factories
const {mockCreateServerFn} = vi.hoisted(() => ({
	mockCreateServerFn: vi.fn()
}))

// Mock @tanstack/react-start to capture handler functions and simulate inputValidator chain
vi.mock('@tanstack/react-start', () => ({
	createServerFn: () => ({
		inputValidator: (validator: (d: unknown) => unknown) => ({
			handler: (fn: (args: {data: unknown}) => unknown) => {
				mockCreateServerFn(fn)
				// Return a function that runs validator first, then handler
				return async (input: {data: unknown}) => {
					const validated = validator(input.data)
					return fn({data: validated})
				}
			}
		}),
		handler: (fn: (...args: unknown[]) => unknown) => {
			mockCreateServerFn(fn)
			return fn
		}
	})
}))

// Mock Firebase Admin before imports
vi.mock('@/lib/firebase/firebase.admin', () => ({
	adminAuth: {
		verifyIdToken: vi.fn(),
		revokeRefreshTokens: vi.fn(),
		getUser: vi.fn()
	},
	// Always false in unit tests - token verification is mocked
	shouldUseEmulators: false
}))

// Mock session module before imports
vi.mock('@/lib/session', () => ({
	clearSession: vi.fn(),
	getSessionData: vi.fn(),
	updateSession: vi.fn(),
	validateSessionEnvironment: vi.fn(() => true) // Default to valid environment
}))

// Mock middleware module
vi.mock('@/server/middleware/auth', () => ({
	requireAdmin: vi.fn()
}))

// Mock @tanstack/react-router for redirect
vi.mock('@tanstack/react-router', () => ({
	redirect: vi.fn((opts: {to: string}) => {
		const error = new Error(`REDIRECT:${opts.to}`)
		error.name = 'RedirectError'
		return error
	})
}))

import {redirect} from '@tanstack/react-router'
import type {Mock} from 'vitest'
import {adminAuth} from '@/lib/firebase/firebase.admin'
import {clearSession, getSessionData, updateSession} from '@/lib/session'
import {requireAdmin} from '@/server/middleware/auth'
import {AuthenticationError, AuthorizationError, ValidationError} from './utils/errors'

// Cast mocks
const mockVerifyIdToken = adminAuth.verifyIdToken as Mock
const mockClearSession = clearSession as Mock
const mockGetSessionData = getSessionData as Mock
const mockUpdateSession = updateSession as Mock
const mockRequireAdmin = requireAdmin as Mock
const mockRedirect = redirect as Mock
const mockRevokeRefreshTokens = adminAuth.revokeRefreshTokens as Mock
const mockGetUser = adminAuth.getUser as Mock

// Import after mocking
import {createSessionFn, forceLogoutUserFn, getCurrentUserFn, logoutFn} from './auth'

describe('auth server functions (Task 2, 3, 4)', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockClearSession.mockResolvedValue(undefined)
		mockUpdateSession.mockResolvedValue(undefined)
	})

	describe('createSessionFn (Task 2)', () => {
		const validInput = {
			uid: 'user-123',
			email: 'test@example.com',
			displayName: 'Test User',
			idToken: 'valid-id-token'
		}

		const mockDecodedToken = {
			uid: 'user-123',
			email: 'test@example.com',
			admin: true,
			signedConsentForm: false
		}

		it('should create session with correct data when token is valid', async () => {
			// Arrange
			mockVerifyIdToken.mockResolvedValue(mockDecodedToken)

			// Act - call the handler function directly
			const result = await createSessionFn({data: validInput})

			// Assert
			expect(result.success).toBe(true)
			expect(result.user.uid).toBe('user-123')
			expect(result.user.email).toBe('test@example.com')
			expect(result.user.displayName).toBe('Test User')
			expect(result.user.claims.admin).toBe(true)
			expect(result.user.claims.signedConsentForm).toBe(false)
		})

		it('should verify ID token with Firebase Admin SDK with checkRevoked=true', async () => {
			// Arrange
			mockVerifyIdToken.mockResolvedValue(mockDecodedToken)

			// Act
			await createSessionFn({data: validInput})

			// Assert
			expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-id-token', true)
		})

		it('should call clearSession before updateSession for session fixation prevention (R-022)', async () => {
			// Arrange
			mockVerifyIdToken.mockResolvedValue(mockDecodedToken)
			const callOrder: string[] = []
			mockClearSession.mockImplementation(() => {
				callOrder.push('clear')
				return Promise.resolve()
			})
			mockUpdateSession.mockImplementation(() => {
				callOrder.push('update')
				return Promise.resolve()
			})

			// Act
			await createSessionFn({data: validInput})

			// Assert
			expect(callOrder).toEqual(['clear', 'update'])
		})

		it('should call updateSession with correct session data', async () => {
			// Arrange
			mockVerifyIdToken.mockResolvedValue(mockDecodedToken)
			const originalEnv = process.env.NODE_ENV
			process.env.NODE_ENV = 'test'

			// Act
			await createSessionFn({data: validInput})

			// Assert - use objectContaining to allow sessionCreatedAt timestamp
			expect(mockUpdateSession).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-123',
					email: 'test@example.com',
					displayName: 'Test User',
					claims: {
						admin: true,
						signedConsentForm: false
					},
					env: 'test'
				})
			)
			// Verify sessionCreatedAt is set (R-024)
			const callArg = mockUpdateSession.mock.calls[0][0]
			expect(callArg.sessionCreatedAt).toBeDefined()
			expect(typeof callArg.sessionCreatedAt).toBe('string')

			process.env.NODE_ENV = originalEnv
		})

		it('should reject invalid Firebase ID token with AuthenticationError', async () => {
			// Arrange
			mockVerifyIdToken.mockRejectedValue(new Error('auth/invalid-id-token'))

			// Act & Assert
			await expect(createSessionFn({data: validInput})).rejects.toThrow(AuthenticationError)
			await expect(createSessionFn({data: validInput})).rejects.toThrow(
				'Invalid or expired authentication token'
			)
		})

		it('should reject expired Firebase ID token', async () => {
			// Arrange
			mockVerifyIdToken.mockRejectedValue(new Error('auth/id-token-expired'))

			// Act & Assert
			await expect(createSessionFn({data: validInput})).rejects.toThrow(AuthenticationError)
		})

		it('should reject revoked Firebase ID token (R-024)', async () => {
			// Arrange
			mockVerifyIdToken.mockRejectedValue(new Error('auth/id-token-revoked'))

			// Act & Assert
			await expect(createSessionFn({data: validInput})).rejects.toThrow(AuthenticationError)
		})

		it('should reject when UID in token does not match input UID (R-012)', async () => {
			// Arrange
			const mismatchedToken = {...mockDecodedToken, uid: 'different-uid'}
			mockVerifyIdToken.mockResolvedValue(mismatchedToken)

			// Act & Assert
			await expect(createSessionFn({data: validInput})).rejects.toThrow(AuthenticationError)
			await expect(createSessionFn({data: validInput})).rejects.toThrow('Token UID mismatch')
		})

		it('should NOT create session when Firebase verification fails (R-010)', async () => {
			// Arrange
			mockVerifyIdToken.mockRejectedValue(new Error('auth/invalid-id-token'))

			// Act
			try {
				await createSessionFn({data: validInput})
			} catch {
				// Expected
			}

			// Assert - updateSession should NOT be called
			expect(mockUpdateSession).not.toHaveBeenCalled()
		})

		it('should sync Firebase custom claims to session', async () => {
			// Arrange
			const tokenWithClaims = {
				uid: 'user-123',
				admin: true,
				signedConsentForm: true
			}
			mockVerifyIdToken.mockResolvedValue(tokenWithClaims)

			// Act
			const result = await createSessionFn({data: validInput})

			// Assert
			expect(result.user.claims.admin).toBe(true)
			expect(result.user.claims.signedConsentForm).toBe(true)
		})

		it('should handle missing custom claims in token', async () => {
			// Arrange
			const tokenWithoutClaims = {
				uid: 'user-123'
				// No admin or signedConsentForm claims
			}
			mockVerifyIdToken.mockResolvedValue(tokenWithoutClaims)

			// Act
			const result = await createSessionFn({data: validInput})

			// Assert
			expect(result.user.claims.admin).toBe(false)
			expect(result.user.claims.signedConsentForm).toBe(false)
		})

		it('should handle null email in input', async () => {
			// Arrange
			const inputWithNullEmail = {
				...validInput,
				email: null
			}
			mockVerifyIdToken.mockResolvedValue(mockDecodedToken)

			// Act
			const result = await createSessionFn({data: inputWithNullEmail})

			// Assert
			expect(result.user.email).toBeNull()
		})

		it('should handle null displayName in input', async () => {
			// Arrange
			const inputWithNullDisplayName = {
				...validInput,
				displayName: null
			}
			mockVerifyIdToken.mockResolvedValue(mockDecodedToken)

			// Act
			const result = await createSessionFn({data: inputWithNullDisplayName})

			// Assert
			expect(result.user.displayName).toBeNull()
		})

		describe('input validation', () => {
			it('should reject when uid is missing', async () => {
				// Arrange
				const invalidInput = {...validInput, uid: ''}

				// Act & Assert
				await expect(createSessionFn({data: invalidInput})).rejects.toThrow(ValidationError)
			})

			it('should reject when idToken is missing', async () => {
				// Arrange
				const invalidInput = {...validInput, idToken: ''}

				// Act & Assert
				await expect(createSessionFn({data: invalidInput})).rejects.toThrow(ValidationError)
			})

			it('should reject when email format is invalid', async () => {
				// Arrange
				const invalidInput = {...validInput, email: 'not-an-email'}

				// Act & Assert
				await expect(createSessionFn({data: invalidInput})).rejects.toThrow(ValidationError)
			})

			it('should accept null email (nullable)', async () => {
				// Arrange
				const inputWithNullEmail = {...validInput, email: null}
				mockVerifyIdToken.mockResolvedValue(mockDecodedToken)

				// Act
				const result = await createSessionFn({data: inputWithNullEmail})

				// Assert
				expect(result.success).toBe(true)
			})
		})
	})

	describe('logoutFn (Task 3)', () => {
		it('should call clearSession to remove session cookie', async () => {
			// Act
			await logoutFn()

			// Assert
			expect(mockClearSession).toHaveBeenCalled()
		})

		it('should not throw redirect (client handles navigation)', async () => {
			// Act - should complete without throwing
			await expect(logoutFn()).resolves.toBeUndefined()

			// Assert - redirect should not be called (client navigates)
			expect(mockRedirect).not.toHaveBeenCalled()
		})

		it('should complete clearSession before returning', async () => {
			// Arrange
			let clearSessionCompleted = false
			mockClearSession.mockImplementation(async () => {
				clearSessionCompleted = true
			})

			// Act
			await logoutFn()

			// Assert
			expect(clearSessionCompleted).toBe(true)
			expect(mockClearSession).toHaveBeenCalledTimes(1)
		})
	})

	describe('getCurrentUserFn (Task 4)', () => {
		it('should return user when session exists', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				claims: {
					admin: false,
					signedConsentForm: true
				}
			})

			// Act
			const result = await getCurrentUserFn()

			// Assert
			expect(result).toEqual({
				uid: 'user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				photoURL: null,
				claims: {
					admin: false,
					signedConsentForm: true
				}
			})
		})

		it('should return null when no session exists', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({})

			// Act
			const result = await getCurrentUserFn()

			// Assert
			expect(result).toBeNull()
		})

		it('should return null when userId is missing from session', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				email: 'test@example.com',
				claims: {}
			})

			// Act
			const result = await getCurrentUserFn()

			// Assert
			expect(result).toBeNull()
		})

		it('should handle null email and displayName in session', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-456',
				email: undefined,
				displayName: undefined,
				claims: {}
			})

			// Act
			const result = await getCurrentUserFn()

			// Assert
			expect(result?.email).toBeNull()
			expect(result?.displayName).toBeNull()
		})

		it('should default claims to empty object when undefined', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-789'
				// No claims
			})

			// Act
			const result = await getCurrentUserFn()

			// Assert
			expect(result?.claims).toEqual({})
		})

		// R-027: Session with non-existent Firebase UID
		// Note: getCurrentUserFn returns session data without Firebase verification.
		// Firebase verification happens in middleware (requireAuthWithFirebaseCheck).
		// This test documents the expected behavior: session data is returned,
		// but middleware will clear session when Firebase user doesn't exist.
		it('should return session data even if Firebase user was later deleted (R-027)', async () => {
			// Arrange - session exists with a UID that no longer exists in Firebase
			mockGetSessionData.mockResolvedValue({
				userId: 'deleted-firebase-user-123',
				email: 'deleted@example.com',
				claims: {}
			})

			// Act - getCurrentUserFn only reads session, doesn't verify Firebase
			const result = await getCurrentUserFn()

			// Assert - session data is returned (Firebase check happens in middleware)
			expect(result).not.toBeNull()
			expect(result?.uid).toBe('deleted-firebase-user-123')
			// Note: Middleware requireAuthWithFirebaseCheck() will detect
			// the deleted user and clear the session (see middleware tests)
		})
	})

	describe('createSessionFn emulator mode security', () => {
		it('should throw AuthenticationError when emulator mode is enabled in production', async () => {
			// This test verifies the NODE_ENV guard added for defense in depth
			// The guard prevents USE_EMULATORS=true from accidentally bypassing auth in production

			// Reset modules to apply new mock
			vi.resetModules()

			// Re-mock dependencies with shouldUseEmulators = true
			vi.doMock('@/lib/firebase/firebase.admin', () => ({
				adminAuth: {
					verifyIdToken: vi.fn()
				},
				shouldUseEmulators: true
			}))

			vi.doMock('@/lib/session', () => ({
				clearSession: vi.fn().mockResolvedValue(undefined),
				getSessionData: vi.fn(),
				updateSession: vi.fn().mockResolvedValue(undefined)
			}))

			// Set NODE_ENV to production
			const originalEnv = process.env.NODE_ENV
			process.env.NODE_ENV = 'production'

			try {
				// Re-import with new mocks
				const {createSessionFn: createSessionFnEmulator} = await import('./auth')
				const {AuthenticationError: AuthError} = await import('./utils/errors')

				const validInput = {
					uid: 'user-123',
					email: 'test@example.com',
					displayName: 'Test User',
					idToken: 'valid-id-token'
				}

				// Act & Assert
				await expect(createSessionFnEmulator({data: validInput})).rejects.toThrow(AuthError)
				await expect(createSessionFnEmulator({data: validInput})).rejects.toThrow(
					'Emulator mode is not allowed in production environment'
				)
			} finally {
				process.env.NODE_ENV = originalEnv
				vi.resetModules()
				// Re-apply original mocks for subsequent tests
				vi.doMock('@/lib/firebase/firebase.admin', () => ({
					adminAuth: {
						verifyIdToken: vi.fn(),
						revokeRefreshTokens: vi.fn(),
						getUser: vi.fn()
					},
					shouldUseEmulators: false
				}))
			}
		})

		it('should allow emulator mode in non-production environments', async () => {
			// Reset modules to apply new mock
			vi.resetModules()

			// Re-mock dependencies with shouldUseEmulators = true
			vi.doMock('@/lib/firebase/firebase.admin', () => ({
				adminAuth: {
					verifyIdToken: vi.fn()
				},
				shouldUseEmulators: true
			}))

			const mockClear = vi.fn().mockResolvedValue(undefined)
			const mockUpdate = vi.fn().mockResolvedValue(undefined)
			vi.doMock('@/lib/session', () => ({
				clearSession: mockClear,
				getSessionData: vi.fn(),
				updateSession: mockUpdate
			}))

			// Ensure NODE_ENV is not production
			const originalEnv = process.env.NODE_ENV
			process.env.NODE_ENV = 'test'

			try {
				// Re-import with new mocks
				const {createSessionFn: createSessionFnEmulator} = await import('./auth')

				const validInput = {
					uid: 'user-123',
					email: 'test@example.com',
					displayName: 'Test User',
					idToken: 'valid-id-token'
				}

				// Act - should succeed in emulator mode with non-production env
				const result = await createSessionFnEmulator({data: validInput})

				// Assert - session created with default emulator claims
				expect(result.success).toBe(true)
				expect(result.user.claims.admin).toBe(false)
				expect(result.user.claims.signedConsentForm).toBe(false)
				expect(mockClear).toHaveBeenCalled()
				expect(mockUpdate).toHaveBeenCalled()
			} finally {
				process.env.NODE_ENV = originalEnv
				vi.resetModules()
				// Re-apply original mocks for subsequent tests
				vi.doMock('@/lib/firebase/firebase.admin', () => ({
					adminAuth: {
						verifyIdToken: vi.fn(),
						revokeRefreshTokens: vi.fn(),
						getUser: vi.fn()
					},
					shouldUseEmulators: false
				}))
			}
		})
	})

	describe('forceLogoutUserFn (Task 7)', () => {
		beforeEach(() => {
			vi.resetAllMocks()
			// Default: requireAdmin succeeds (caller is admin)
			mockRequireAdmin.mockResolvedValue({
				uid: 'admin-123',
				email: 'admin@example.com',
				displayName: null,
				photoURL: null,
				claims: {admin: true}
			})
		})

		it('should revoke refresh tokens for the target user when admin', async () => {
			// Arrange
			mockRevokeRefreshTokens.mockResolvedValue(undefined)
			mockGetUser.mockResolvedValue({
				uid: 'target-user-123',
				tokensValidAfterTime: '2024-01-15T10:00:00Z'
			})

			// Act
			const result = await forceLogoutUserFn({data: {uid: 'target-user-123'}})

			// Assert
			expect(result.success).toBe(true)
			expect(result.revokedAt).toBe('2024-01-15T10:00:00Z')
			expect(mockRequireAdmin).toHaveBeenCalled()
			expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('target-user-123')
		})

		it('should reject when caller is not authenticated', async () => {
			// Arrange - requireAdmin throws for unauthenticated
			mockRequireAdmin.mockRejectedValue(new AuthenticationError('Authentication required'))

			// Act & Assert
			await expect(forceLogoutUserFn({data: {uid: 'target-user-123'}})).rejects.toThrow(
				AuthenticationError
			)
			await expect(forceLogoutUserFn({data: {uid: 'target-user-123'}})).rejects.toThrow(
				'Authentication required'
			)
		})

		it('should reject when caller is not admin', async () => {
			// Arrange - requireAdmin throws for non-admin
			mockRequireAdmin.mockRejectedValue(new AuthorizationError('Admin privileges required'))

			// Act & Assert
			await expect(forceLogoutUserFn({data: {uid: 'target-user-123'}})).rejects.toThrow(
				AuthorizationError
			)
			await expect(forceLogoutUserFn({data: {uid: 'target-user-123'}})).rejects.toThrow(
				'Admin privileges required'
			)
		})

		it('should throw ValidationError when target user not found', async () => {
			// Arrange
			mockRevokeRefreshTokens.mockRejectedValue({code: 'auth/user-not-found'})

			// Act & Assert
			await expect(forceLogoutUserFn({data: {uid: 'nonexistent-user'}})).rejects.toThrow(
				ValidationError
			)
			await expect(forceLogoutUserFn({data: {uid: 'nonexistent-user'}})).rejects.toThrow(
				'User not found'
			)
		})

		it('should throw ValidationError for missing uid', async () => {
			// Act & Assert
			await expect(forceLogoutUserFn({data: {uid: ''}})).rejects.toThrow(ValidationError)
		})

		it('should handle Firebase errors gracefully', async () => {
			// Arrange
			mockRevokeRefreshTokens.mockRejectedValue(new Error('Firebase internal error'))

			// Act & Assert
			await expect(forceLogoutUserFn({data: {uid: 'target-user-123'}})).rejects.toThrow(
				AuthenticationError
			)
			await expect(forceLogoutUserFn({data: {uid: 'target-user-123'}})).rejects.toThrow(
				'Failed to revoke user tokens'
			)
		})

		it('should use current timestamp when tokensValidAfterTime is undefined', async () => {
			// Arrange
			mockRevokeRefreshTokens.mockResolvedValue(undefined)
			mockGetUser.mockResolvedValue({
				uid: 'target-user-123',
				tokensValidAfterTime: undefined
			})

			// Act
			const result = await forceLogoutUserFn({data: {uid: 'target-user-123'}})

			// Assert
			expect(result.success).toBe(true)
			expect(result.revokedAt).toBeDefined()
			// Should be a valid ISO date string
			expect(new Date(result.revokedAt).toISOString()).toBe(result.revokedAt)
		})
	})
})
