/**
 * Tests for session middleware
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {PASSKEY_SESSION_MAX_AGE, SESSION_MAX_AGE, type SessionData} from '@/lib/session'
import {
	checkSessionRevoked,
	clearRevocationCache,
	createSessionRevocation,
	getSessionExpiration,
	isSessionExpiringSoon,
	SESSION_REFRESH_THRESHOLD_DAYS,
	shouldRefreshSession,
	validateSession
} from './session'

// Mock Firebase Admin
vi.mock('@/lib/firebase/firebase.admin', () => ({
	adminDb: {
		collection: vi.fn(() => ({
			where: vi.fn(() => ({
				where: vi.fn(() => ({
					limit: vi.fn(() => ({
						get: vi.fn()
					}))
				}))
			})),
			add: vi.fn()
		}))
	}
}))

// Mock session module
vi.mock('@/lib/session', async importOriginal => {
	const original = await importOriginal<typeof import('@/lib/session')>()
	return {
		...original,
		getSessionData: vi.fn(),
		updateSession: vi.fn(),
		validateSessionEnvironment: vi.fn(() => true)
	}
})

describe('session middleware', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		clearRevocationCache() // Clear cache between tests
	})

	describe('shouldRefreshSession', () => {
		it('should return false when sessionCreatedAt is undefined', () => {
			expect(shouldRefreshSession(undefined)).toBe(false)
		})

		it('should return false when session is less than 30 days old', () => {
			const recentDate = new Date()
			recentDate.setDate(recentDate.getDate() - 15) // 15 days ago
			expect(shouldRefreshSession(recentDate.toISOString())).toBe(false)
		})

		it('should return true when session is more than 30 days old', () => {
			const oldDate = new Date()
			oldDate.setDate(oldDate.getDate() - 35) // 35 days ago
			expect(shouldRefreshSession(oldDate.toISOString())).toBe(true)
		})

		it('should return true when session is exactly 31 days old', () => {
			const thresholdDate = new Date()
			thresholdDate.setDate(thresholdDate.getDate() - 31)
			expect(shouldRefreshSession(thresholdDate.toISOString())).toBe(true)
		})

		it('should return false when session is exactly 30 days old', () => {
			const exactDate = new Date()
			exactDate.setDate(exactDate.getDate() - 30)
			// At exactly 30 days, should not trigger refresh yet
			expect(shouldRefreshSession(exactDate.toISOString())).toBe(false)
		})
	})

	describe('getSessionExpiration', () => {
		it('should return null when sessionCreatedAt is undefined', () => {
			const sessionData: SessionData = {userId: 'test-user'}
			expect(getSessionExpiration(sessionData)).toBeNull()
		})

		it('should calculate 90-day expiration for standard session', () => {
			const createdAt = new Date('2024-01-01T00:00:00.000Z')
			const sessionData: SessionData = {
				userId: 'test-user',
				sessionCreatedAt: createdAt.toISOString()
			}

			const expiration = getSessionExpiration(sessionData)

			expect(expiration).not.toBeNull()
			const expectedMs = createdAt.getTime() + SESSION_MAX_AGE * 1000
			expect(expiration?.getTime()).toBe(expectedMs)
		})

		it('should calculate 180-day expiration for passkey session', () => {
			const createdAt = new Date('2024-01-01T00:00:00.000Z')
			const sessionData: SessionData = {
				userId: 'test-user',
				sessionCreatedAt: createdAt.toISOString(),
				claims: {passkeyEnabled: true}
			}

			const expiration = getSessionExpiration(sessionData)

			expect(expiration).not.toBeNull()
			const expectedMs = createdAt.getTime() + PASSKEY_SESSION_MAX_AGE * 1000
			expect(expiration?.getTime()).toBe(expectedMs)
		})
	})

	describe('isSessionExpiringSoon', () => {
		it('should return false when sessionCreatedAt is undefined', () => {
			const sessionData: SessionData = {userId: 'test-user'}
			expect(isSessionExpiringSoon(sessionData)).toBe(false)
		})

		it('should return false when session has more than 7 days remaining', () => {
			// Create session that expires in 30 days
			const createdAt = new Date()
			createdAt.setDate(createdAt.getDate() - 60) // 60 days old, 30 days remaining
			const sessionData: SessionData = {
				userId: 'test-user',
				sessionCreatedAt: createdAt.toISOString()
			}

			expect(isSessionExpiringSoon(sessionData)).toBe(false)
		})

		it('should return true when session has less than 7 days remaining', () => {
			// Create session that expires in 3 days
			const createdAt = new Date()
			createdAt.setDate(createdAt.getDate() - 87) // 87 days old, 3 days remaining
			const sessionData: SessionData = {
				userId: 'test-user',
				sessionCreatedAt: createdAt.toISOString()
			}

			expect(isSessionExpiringSoon(sessionData)).toBe(true)
		})

		it('should return false when session has already expired', () => {
			// Create session that expired yesterday
			const createdAt = new Date()
			createdAt.setDate(createdAt.getDate() - 91) // 91 days old, already expired
			const sessionData: SessionData = {
				userId: 'test-user',
				sessionCreatedAt: createdAt.toISOString()
			}

			expect(isSessionExpiringSoon(sessionData)).toBe(false)
		})
	})

	describe('checkSessionRevoked', () => {
		it('should return false when sessionCreatedAt is undefined', async () => {
			const result = await checkSessionRevoked('test-user', undefined)
			expect(result).toBe(false)
		})

		it('should return true when revocation exists after session creation', async () => {
			const {adminDb} = await import('@/lib/firebase/firebase.admin')
			const mockGet = vi.fn().mockResolvedValue({empty: false})

			vi.mocked(adminDb.collection).mockReturnValue({
				where: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							get: mockGet
						})
					})
				}),
				add: vi.fn()
			} as unknown as ReturnType<typeof adminDb.collection>)

			const sessionCreatedAt = new Date('2024-01-01').toISOString()
			const result = await checkSessionRevoked('test-user', sessionCreatedAt)

			expect(result).toBe(true)
		})

		it('should return false when no revocation exists', async () => {
			const {adminDb} = await import('@/lib/firebase/firebase.admin')
			const mockGet = vi.fn().mockResolvedValue({empty: true})

			vi.mocked(adminDb.collection).mockReturnValue({
				where: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							get: mockGet
						})
					})
				}),
				add: vi.fn()
			} as unknown as ReturnType<typeof adminDb.collection>)

			const sessionCreatedAt = new Date('2024-01-01').toISOString()
			const result = await checkSessionRevoked('test-user', sessionCreatedAt)

			expect(result).toBe(false)
		})

		it('should return false on Firestore error (fail open)', async () => {
			const {adminDb} = await import('@/lib/firebase/firebase.admin')
			const mockGet = vi.fn().mockRejectedValue(new Error('Firestore error'))

			vi.mocked(adminDb.collection).mockReturnValue({
				where: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							get: mockGet
						})
					})
				}),
				add: vi.fn()
			} as unknown as ReturnType<typeof adminDb.collection>)

			const sessionCreatedAt = new Date('2024-01-01').toISOString()
			const result = await checkSessionRevoked('test-user', sessionCreatedAt)

			expect(result).toBe(false) // Fail open
		})

		it('should cache revocation check results for 5 minutes', async () => {
			const {adminDb} = await import('@/lib/firebase/firebase.admin')
			const mockGet = vi.fn().mockResolvedValue({empty: false})

			vi.mocked(adminDb.collection).mockReturnValue({
				where: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							get: mockGet
						})
					})
				}),
				add: vi.fn()
			} as unknown as ReturnType<typeof adminDb.collection>)

			const sessionCreatedAt = new Date('2024-01-01').toISOString()

			// First call - should hit Firestore
			const result1 = await checkSessionRevoked('test-user', sessionCreatedAt)
			expect(result1).toBe(true)
			expect(mockGet).toHaveBeenCalledTimes(1)

			// Second call - should use cache
			const result2 = await checkSessionRevoked('test-user', sessionCreatedAt)
			expect(result2).toBe(true)
			expect(mockGet).toHaveBeenCalledTimes(1) // No additional call

			// Third call - should still use cache
			const result3 = await checkSessionRevoked('test-user', sessionCreatedAt)
			expect(result3).toBe(true)
			expect(mockGet).toHaveBeenCalledTimes(1) // No additional call
		})
	})

	describe('createSessionRevocation', () => {
		it('should create revocation event with required fields', async () => {
			const {adminDb} = await import('@/lib/firebase/firebase.admin')
			const mockAdd = vi.fn().mockResolvedValue({id: 'revocation-123'})

			vi.mocked(adminDb.collection).mockReturnValue({
				where: vi.fn(),
				add: mockAdd
			} as unknown as ReturnType<typeof adminDb.collection>)

			await createSessionRevocation('test-user', 'passkey_removed')

			expect(mockAdd).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'test-user',
					reason: 'passkey_removed',
					revokedAt: expect.any(Date)
				})
			)
		})

		it('should include metadata when provided', async () => {
			const {adminDb} = await import('@/lib/firebase/firebase.admin')
			const mockAdd = vi.fn().mockResolvedValue({id: 'revocation-123'})

			vi.mocked(adminDb.collection).mockReturnValue({
				where: vi.fn(),
				add: mockAdd
			} as unknown as ReturnType<typeof adminDb.collection>)

			await createSessionRevocation('test-user', 'admin_action', {
				adminId: 'admin-123'
			})

			expect(mockAdd).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'test-user',
					reason: 'admin_action',
					metadata: {adminId: 'admin-123'}
				})
			)
		})
	})

	describe('validateSession', () => {
		it('should throw AuthenticationError when no session exists', async () => {
			const {getSessionData} = await import('@/lib/session')
			vi.mocked(getSessionData).mockResolvedValue({})

			await expect(validateSession()).rejects.toThrow('Authentication required')
		})

		it('should throw AuthenticationError when environment mismatch', async () => {
			const {getSessionData, validateSessionEnvironment} = await import('@/lib/session')
			vi.mocked(getSessionData).mockResolvedValue({
				userId: 'test-user',
				sessionCreatedAt: new Date().toISOString()
			})
			vi.mocked(validateSessionEnvironment).mockReturnValue(false)

			await expect(validateSession()).rejects.toThrow('Session environment mismatch')
		})

		it('should throw AuthenticationError when session is revoked', async () => {
			const {getSessionData, validateSessionEnvironment} = await import('@/lib/session')
			const {adminDb} = await import('@/lib/firebase/firebase.admin')

			vi.mocked(getSessionData).mockResolvedValue({
				userId: 'test-user',
				sessionCreatedAt: new Date().toISOString()
			})
			vi.mocked(validateSessionEnvironment).mockReturnValue(true)

			// Mock revocation exists
			vi.mocked(adminDb.collection).mockReturnValue({
				where: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({empty: false})
						})
					})
				}),
				add: vi.fn()
			} as unknown as ReturnType<typeof adminDb.collection>)

			await expect(validateSession()).rejects.toThrow('Session has been revoked')
		})

		it('should return session data when valid', async () => {
			const {getSessionData, validateSessionEnvironment} = await import('@/lib/session')
			const {adminDb} = await import('@/lib/firebase/firebase.admin')

			const mockSessionData = {
				userId: 'test-user',
				email: 'test@example.com',
				sessionCreatedAt: new Date().toISOString()
			}

			vi.mocked(getSessionData).mockResolvedValue(mockSessionData)
			vi.mocked(validateSessionEnvironment).mockReturnValue(true)

			// Mock no revocation
			vi.mocked(adminDb.collection).mockReturnValue({
				where: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({empty: true})
						})
					})
				}),
				add: vi.fn()
			} as unknown as ReturnType<typeof adminDb.collection>)

			const result = await validateSession()
			expect(result).toEqual(mockSessionData)
		})

		it('should refresh session when older than threshold', async () => {
			const {getSessionData, validateSessionEnvironment, updateSession} = await import(
				'@/lib/session'
			)
			const {adminDb} = await import('@/lib/firebase/firebase.admin')

			const oldDate = new Date()
			oldDate.setDate(oldDate.getDate() - 35) // 35 days old

			vi.mocked(getSessionData).mockResolvedValue({
				userId: 'test-user',
				sessionCreatedAt: oldDate.toISOString()
			})
			vi.mocked(validateSessionEnvironment).mockReturnValue(true)
			vi.mocked(updateSession).mockResolvedValue(undefined)

			// Mock no revocation
			vi.mocked(adminDb.collection).mockReturnValue({
				where: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({empty: true})
						})
					})
				}),
				add: vi.fn()
			} as unknown as ReturnType<typeof adminDb.collection>)

			await validateSession()

			expect(updateSession).toHaveBeenCalledWith({
				sessionCreatedAt: expect.any(String)
			})
		})

		it('should skip refresh when skipRefresh option is true', async () => {
			const {getSessionData, validateSessionEnvironment, updateSession} = await import(
				'@/lib/session'
			)
			const {adminDb} = await import('@/lib/firebase/firebase.admin')

			const oldDate = new Date()
			oldDate.setDate(oldDate.getDate() - 35) // 35 days old

			vi.mocked(getSessionData).mockResolvedValue({
				userId: 'test-user',
				sessionCreatedAt: oldDate.toISOString()
			})
			vi.mocked(validateSessionEnvironment).mockReturnValue(true)

			// Mock no revocation
			vi.mocked(adminDb.collection).mockReturnValue({
				where: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({empty: true})
						})
					})
				}),
				add: vi.fn()
			} as unknown as ReturnType<typeof adminDb.collection>)

			await validateSession({skipRefresh: true})

			expect(updateSession).not.toHaveBeenCalled()
		})
	})

	describe('SESSION_REFRESH_THRESHOLD_DAYS constant', () => {
		it('should be 30 days', () => {
			expect(SESSION_REFRESH_THRESHOLD_DAYS).toBe(30)
		})
	})
})
