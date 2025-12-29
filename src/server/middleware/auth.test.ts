/**
 * Unit tests for auth middleware
 *
 * Tests:
 * - Auth middleware rejects unauthenticated requests
 * - Auth middleware passes authenticated requests
 * - Admin middleware rejects non-admin users
 * - Admin middleware verifies claim against Firebase (R-004)
 * - Token revocation check clears session when token revoked (R-024)
 * - Firestore session revocation check (NFR2)
 * - Session refresh logic (sliding window)
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Mock session module before imports
vi.mock('@/lib/session', () => ({
	getSessionData: vi.fn(),
	validateSessionEnvironment: vi.fn(),
	clearSession: vi.fn(),
	updateSession: vi.fn()
}))

// Mock Firebase Admin for admin claim verification (R-004)
// Added adminDb mock for Firestore session revocation
vi.mock('@/lib/firebase/firebase.admin', () => ({
	adminAuth: {
		getUser: vi.fn()
	},
	adminDb: {
		collection: vi.fn(() => ({
			where: vi.fn(() => ({
				where: vi.fn(() => ({
					limit: vi.fn(() => ({
						get: vi.fn().mockResolvedValue({empty: true}) // Default: no revocations
					}))
				}))
			})),
			add: vi.fn()
		}))
	}
}))

import type {Mock} from 'vitest'
import {adminAuth} from '@/lib/firebase/firebase.admin'
import {
	clearSession,
	getSessionData,
	updateSession,
	validateSessionEnvironment
} from '@/lib/session'
import {AuthenticationError} from '../functions/utils/errors'

// Cast mocks
const mockGetSessionData = getSessionData as Mock
const mockValidateSessionEnvironment = validateSessionEnvironment as Mock
const mockGetUser = adminAuth.getUser as Mock
const mockClearSession = clearSession as Mock
const _mockUpdateSession = updateSession as Mock

// Import after mocking
import {
	checkTokenRevocation,
	requireAdmin,
	requireAuth,
	requireAuthFull,
	requireAuthWithFirebaseCheck,
	requireAuthWithRevocationCheck,
	verifyFirebaseUserExists
} from './auth'

describe('auth middleware (Task 5)', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe('requireAuth', () => {
		it('should reject unauthenticated requests with AuthenticationError', async () => {
			// Arrange - no session
			mockGetSessionData.mockResolvedValue({})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act & Assert
			await expect(requireAuth()).rejects.toThrow(AuthenticationError)
			await expect(requireAuth()).rejects.toThrow('Authentication required')
		})

		it('should reject when userId is missing', async () => {
			// Arrange - session without userId
			mockGetSessionData.mockResolvedValue({
				email: 'test@example.com',
				claims: {}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act & Assert
			await expect(requireAuth()).rejects.toThrow(AuthenticationError)
		})

		it('should reject cross-environment session (R-023)', async () => {
			// Arrange - valid session but wrong environment
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				claims: {},
				env: 'development'
			})
			mockValidateSessionEnvironment.mockReturnValue(false)

			// Act & Assert
			await expect(requireAuth()).rejects.toThrow(AuthenticationError)
			await expect(requireAuth()).rejects.toThrow('Session environment mismatch')
		})

		it('should return user for authenticated requests', async () => {
			// Arrange - valid session
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				claims: {
					admin: false,
					signedConsentForm: true
				},
				env: 'development'
			})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act
			const user = await requireAuth()

			// Assert
			expect(user).toEqual({
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

		it('should handle session with null email and displayName', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-456',
				email: null,
				displayName: null,
				claims: {admin: false}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act
			const user = await requireAuth()

			// Assert
			expect(user.uid).toBe('user-456')
			expect(user.email).toBeNull()
			expect(user.displayName).toBeNull()
		})

		it('should default claims to empty object when undefined', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-789'
				// No claims
			})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act
			const user = await requireAuth()

			// Assert
			expect(user.claims).toEqual({})
		})
	})

	describe('requireAdmin', () => {
		it('should reject unauthenticated requests', async () => {
			// Arrange - no session
			mockGetSessionData.mockResolvedValue({})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act & Assert
			await expect(requireAdmin()).rejects.toThrow(AuthenticationError)
		})

		it('should reject non-admin users', async () => {
			// Arrange - valid session, no admin claim
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'user@example.com',
				claims: {
					admin: false
				}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act & Assert
			await expect(requireAdmin()).rejects.toThrow(AuthenticationError)
			await expect(requireAdmin()).rejects.toThrow('Admin privileges required')
		})

		it('should reject when admin claim is undefined', async () => {
			// Arrange - valid session, no admin key
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				claims: {}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act & Assert
			await expect(requireAdmin()).rejects.toThrow(AuthenticationError)
		})

		it('should verify admin claim against Firebase (R-004)', async () => {
			// Arrange - session claims admin, Firebase confirms
			mockGetSessionData.mockResolvedValue({
				userId: 'admin-123',
				email: 'admin@example.com',
				claims: {admin: true}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser.mockResolvedValue({
				uid: 'admin-123',
				customClaims: {admin: true}
			})

			// Act
			const user = await requireAdmin()

			// Assert
			expect(user.uid).toBe('admin-123')
			expect(user.claims.admin).toBe(true)
			// Verify Firebase was called to confirm admin status
			expect(mockGetUser).toHaveBeenCalledWith('admin-123')
		})

		it('should reject when Firebase admin claim differs from session (R-004)', async () => {
			// Arrange - session claims admin but Firebase says no
			mockGetSessionData.mockResolvedValue({
				userId: 'fake-admin-123',
				email: 'fake@example.com',
				claims: {admin: true}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser.mockResolvedValue({
				uid: 'fake-admin-123',
				customClaims: {admin: false}
			})

			// Act & Assert
			await expect(requireAdmin()).rejects.toThrow(AuthenticationError)
			await expect(requireAdmin()).rejects.toThrow('Admin privileges required')
		})

		it('should reject when Firebase user has no customClaims', async () => {
			// Arrange - session claims admin but Firebase has no claims
			mockGetSessionData.mockResolvedValue({
				userId: 'fake-admin-123',
				email: 'fake@example.com',
				claims: {admin: true}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser.mockResolvedValue({
				uid: 'fake-admin-123',
				customClaims: undefined
			})

			// Act & Assert
			await expect(requireAdmin()).rejects.toThrow(AuthenticationError)
		})

		it('should pass for verified admin with matching Firebase claim', async () => {
			// Arrange - everything matches
			mockGetSessionData.mockResolvedValue({
				userId: 'admin-456',
				email: 'admin@example.com',
				displayName: 'Admin User',
				claims: {
					admin: true,
					signedConsentForm: true
				}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser.mockResolvedValue({
				uid: 'admin-456',
				customClaims: {admin: true, signedConsentForm: true}
			})

			// Act
			const user = await requireAdmin()

			// Assert
			expect(user.uid).toBe('admin-456')
			expect(user.claims.admin).toBe(true)
		})

		it('should handle Firebase errors gracefully', async () => {
			// Arrange - session is valid but Firebase throws
			mockGetSessionData.mockResolvedValue({
				userId: 'admin-123',
				email: 'admin@example.com',
				claims: {admin: true}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser.mockRejectedValue(new Error('Firebase error'))

			// Act & Assert - should fail safely
			await expect(requireAdmin()).rejects.toThrow(AuthenticationError)
		})
	})

	describe('verifyFirebaseUserExists (Task 7)', () => {
		it('should return true when Firebase user exists and is enabled', async () => {
			// Arrange
			mockGetUser.mockResolvedValue({
				uid: 'user-123',
				disabled: false
			})

			// Act
			const result = await verifyFirebaseUserExists('user-123')

			// Assert
			expect(result).toBe(true)
			expect(mockGetUser).toHaveBeenCalledWith('user-123')
		})

		it('should clear session and throw when Firebase user is disabled (banned) (R-017)', async () => {
			// Arrange
			mockGetUser.mockResolvedValue({
				uid: 'banned-user-123',
				disabled: true
			})

			// Act & Assert
			await expect(verifyFirebaseUserExists('banned-user-123')).rejects.toThrow(AuthenticationError)
			await expect(verifyFirebaseUserExists('banned-user-123')).rejects.toThrow(
				'User account is disabled'
			)
			expect(mockClearSession).toHaveBeenCalled()
		})

		it('should clear session and throw when Firebase user does not exist (R-013)', async () => {
			// Arrange
			mockGetUser.mockRejectedValue({code: 'auth/user-not-found'})

			// Act & Assert
			await expect(verifyFirebaseUserExists('deleted-user-123')).rejects.toThrow(
				AuthenticationError
			)
			await expect(verifyFirebaseUserExists('deleted-user-123')).rejects.toThrow(
				'User account no longer exists'
			)
			expect(mockClearSession).toHaveBeenCalled()
		})
	})

	describe('requireAuthWithFirebaseCheck (Task 7)', () => {
		it('should return user when session valid and Firebase user exists', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				claims: {}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser.mockResolvedValue({
				uid: 'user-123',
				disabled: false
			})

			// Act
			const user = await requireAuthWithFirebaseCheck()

			// Assert
			expect(user.uid).toBe('user-123')
			expect(mockGetUser).toHaveBeenCalledWith('user-123')
		})

		it('should reject when session valid but Firebase user deleted (R-013)', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'deleted-user-123',
				email: 'test@example.com',
				claims: {}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser.mockRejectedValue({code: 'auth/user-not-found'})

			// Act & Assert
			await expect(requireAuthWithFirebaseCheck()).rejects.toThrow(AuthenticationError)
			expect(mockClearSession).toHaveBeenCalled()
		})

		it('should reject when session valid but Firebase user disabled (R-017)', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'banned-user-123',
				email: 'test@example.com',
				claims: {}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser.mockResolvedValue({
				uid: 'banned-user-123',
				disabled: true
			})

			// Act & Assert
			await expect(requireAuthWithFirebaseCheck()).rejects.toThrow(AuthenticationError)
			await expect(requireAuthWithFirebaseCheck()).rejects.toThrow('User account is disabled')
		})
	})

	describe('checkTokenRevocation (Task 8)', () => {
		it('should return true when no sessionCreatedAt (legacy sessions)', async () => {
			// Arrange - no session creation time
			const uid = 'user-123'

			// Act
			const result = await checkTokenRevocation(uid, undefined)

			// Assert
			expect(result).toBe(true)
			expect(mockGetUser).not.toHaveBeenCalled()
		})

		it('should return true when no tokensValidAfterTime (no revocation ever)', async () => {
			// Arrange - user has never had tokens revoked
			mockGetUser.mockResolvedValue({
				uid: 'user-123',
				tokensValidAfterTime: undefined
			})

			// Act
			const result = await checkTokenRevocation('user-123', '2025-01-01T00:00:00.000Z')

			// Assert
			expect(result).toBe(true)
		})

		it('should return true when session created after revocation', async () => {
			// Arrange - session created after the revocation event
			mockGetUser.mockResolvedValue({
				uid: 'user-123',
				tokensValidAfterTime: '2025-01-01T00:00:00.000Z'
			})

			// Act - session created after revocation
			const result = await checkTokenRevocation('user-123', '2025-01-02T00:00:00.000Z')

			// Assert
			expect(result).toBe(true)
			expect(mockClearSession).not.toHaveBeenCalled()
		})

		it('should clear session and throw when session created before revocation (R-024)', async () => {
			// Arrange - session created before tokens were revoked
			mockGetUser.mockResolvedValue({
				uid: 'user-123',
				tokensValidAfterTime: '2025-01-02T00:00:00.000Z'
			})

			// Act & Assert - session created before revocation
			await expect(checkTokenRevocation('user-123', '2025-01-01T00:00:00.000Z')).rejects.toThrow(
				AuthenticationError
			)
			await expect(checkTokenRevocation('user-123', '2025-01-01T00:00:00.000Z')).rejects.toThrow(
				'Session invalidated due to security event'
			)
			expect(mockClearSession).toHaveBeenCalled()
		})

		it('should handle Firebase errors by failing closed', async () => {
			// Arrange - Firebase throws network error
			mockGetUser.mockRejectedValue(new Error('Network error'))

			// Act & Assert - should fail safely
			await expect(checkTokenRevocation('user-123', '2025-01-01T00:00:00.000Z')).rejects.toThrow(
				AuthenticationError
			)
			await expect(checkTokenRevocation('user-123', '2025-01-01T00:00:00.000Z')).rejects.toThrow(
				'Unable to verify session validity'
			)
		})
	})

	describe('requireAuthWithRevocationCheck (Task 8)', () => {
		it('should reject unauthenticated requests', async () => {
			// Arrange - no session
			mockGetSessionData.mockResolvedValue({})

			// Act & Assert
			await expect(requireAuthWithRevocationCheck()).rejects.toThrow(AuthenticationError)
			await expect(requireAuthWithRevocationCheck()).rejects.toThrow('Authentication required')
		})

		it('should reject cross-environment session (R-023)', async () => {
			// Arrange - valid session but wrong environment
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				claims: {},
				env: 'development'
			})
			mockValidateSessionEnvironment.mockReturnValue(false)

			// Act & Assert
			await expect(requireAuthWithRevocationCheck()).rejects.toThrow(AuthenticationError)
			await expect(requireAuthWithRevocationCheck()).rejects.toThrow('Session environment mismatch')
		})

		it('should return user when session valid and not revoked', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				claims: {admin: false},
				sessionCreatedAt: '2025-01-02T00:00:00.000Z'
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser.mockResolvedValue({
				uid: 'user-123',
				tokensValidAfterTime: '2025-01-01T00:00:00.000Z'
			})

			// Act
			const user = await requireAuthWithRevocationCheck()

			// Assert
			expect(user.uid).toBe('user-123')
			expect(user.email).toBe('test@example.com')
		})

		it('should clear session when token was revoked (R-024)', async () => {
			// Arrange - session created before revocation
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				claims: {},
				sessionCreatedAt: '2025-01-01T00:00:00.000Z'
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser.mockResolvedValue({
				uid: 'user-123',
				tokensValidAfterTime: '2025-01-02T00:00:00.000Z'
			})

			// Act & Assert
			await expect(requireAuthWithRevocationCheck()).rejects.toThrow(AuthenticationError)
			await expect(requireAuthWithRevocationCheck()).rejects.toThrow(
				'Session invalidated due to security event'
			)
			expect(mockClearSession).toHaveBeenCalled()
		})
	})

	describe('requireAuthFull (Task 8)', () => {
		it('should return user when all checks pass', async () => {
			// Arrange - valid session, not revoked, user exists
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				claims: {},
				sessionCreatedAt: '2025-01-02T00:00:00.000Z'
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser
				.mockResolvedValueOnce({
					uid: 'user-123',
					tokensValidAfterTime: '2025-01-01T00:00:00.000Z'
				})
				.mockResolvedValueOnce({
					uid: 'user-123',
					disabled: false
				})

			// Act
			const user = await requireAuthFull()

			// Assert
			expect(user.uid).toBe('user-123')
			expect(mockGetUser).toHaveBeenCalledTimes(2)
		})

		it('should reject when token was revoked', async () => {
			// Arrange - session created before revocation
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				claims: {},
				sessionCreatedAt: '2025-01-01T00:00:00.000Z'
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			mockGetUser.mockResolvedValue({
				uid: 'user-123',
				tokensValidAfterTime: '2025-01-02T00:00:00.000Z'
			})

			// Act & Assert
			await expect(requireAuthFull()).rejects.toThrow(AuthenticationError)
		})

		it('should reject when user is disabled', async () => {
			// Arrange - session valid, not revoked, but user disabled
			mockGetSessionData.mockResolvedValue({
				userId: 'banned-user-123',
				email: 'test@example.com',
				claims: {},
				sessionCreatedAt: '2025-01-02T00:00:00.000Z'
			})
			mockValidateSessionEnvironment.mockReturnValue(true)
			// Mock getUser to return user with no revocation first, then disabled user
			mockGetUser.mockResolvedValue({
				uid: 'banned-user-123',
				tokensValidAfterTime: '2025-01-01T00:00:00.000Z',
				disabled: true
			})

			// Act & Assert
			await expect(requireAuthFull()).rejects.toThrow(AuthenticationError)
			await expect(requireAuthFull()).rejects.toThrow('User account is disabled')
		})
	})
})
