/**
 * Tests for session revocation server functions
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Mock @tanstack/react-start to capture handler functions
vi.mock('@tanstack/react-start', () => ({
	createServerFn: () => ({
		handler: (fn: (...args: unknown[]) => unknown) => fn
	})
}))

// Mock dependencies before imports
vi.mock('@/lib/firebase/firebase.admin', () => ({
	adminAuth: {
		revokeRefreshTokens: vi.fn(),
		getUser: vi.fn()
	},
	adminDb: {
		collection: vi.fn(() => ({
			add: vi.fn().mockResolvedValue({id: 'revocation-123'}),
			where: vi.fn(() => ({
				where: vi.fn(() => ({
					limit: vi.fn(() => ({
						get: vi.fn().mockResolvedValue({empty: true})
					}))
				}))
			}))
		}))
	}
}))

vi.mock('@/lib/session', () => ({
	clearSession: vi.fn(),
	getSessionData: vi.fn(),
	validateSessionEnvironment: vi.fn(() => true),
	updateSession: vi.fn()
}))

import type {Mock} from 'vitest'
import {adminAuth} from '@/lib/firebase/firebase.admin'
import {clearSession, getSessionData} from '@/lib/session'
import {
	adminRevokeSessionsFn,
	revokeMySessionsFn,
	revokeSessionsOnPasskeyRemoval
} from './revoke-sessions'

// Type helpers for server function calls (TanStack Start infers undefined without .validator())
type RevokeMySessionsInput = {data: {reason?: 'passkey_removed' | 'user_request'}}
type AdminRevokeSessionsInput = {
	data: {userId: string; reason?: 'admin_action' | 'credential_change'}
}

const invokeRevokeMySessionsFn = revokeMySessionsFn as unknown as (
	input: RevokeMySessionsInput
) => Promise<{success: boolean; message: string}>

const invokeAdminRevokeSessionsFn = adminRevokeSessionsFn as unknown as (
	input: AdminRevokeSessionsInput
) => Promise<{success: boolean; message: string; revokedBy: string}>

const mockRevokeRefreshTokens = adminAuth.revokeRefreshTokens as Mock
const mockGetUser = adminAuth.getUser as Mock
const mockClearSession = clearSession as Mock
const mockGetSessionData = getSessionData as Mock

describe('revoke-sessions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('revokeMySessionsFn', () => {
		it('should revoke sessions for authenticated user', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				claims: {}
			})
			mockRevokeRefreshTokens.mockResolvedValue(undefined)
			mockClearSession.mockResolvedValue(undefined)

			// Act
			const result = await invokeRevokeMySessionsFn({data: {}})

			// Assert
			expect(result.success).toBe(true)
			expect(result.message).toContain('All sessions have been revoked')
			expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('user-123')
			expect(mockClearSession).toHaveBeenCalled()
		})

		it('should accept user_request reason', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				claims: {}
			})
			mockRevokeRefreshTokens.mockResolvedValue(undefined)
			mockClearSession.mockResolvedValue(undefined)

			// Act
			const result = await invokeRevokeMySessionsFn({
				data: {reason: 'user_request'}
			})

			// Assert
			expect(result.success).toBe(true)
		})

		it('should accept passkey_removed reason', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				claims: {}
			})
			mockRevokeRefreshTokens.mockResolvedValue(undefined)
			mockClearSession.mockResolvedValue(undefined)

			// Act
			const result = await invokeRevokeMySessionsFn({
				data: {reason: 'passkey_removed'}
			})

			// Assert
			expect(result.success).toBe(true)
		})

		it('should reject unauthenticated requests', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({})

			// Act & Assert
			await expect(invokeRevokeMySessionsFn({data: {}})).rejects.toThrow('Authentication required')
		})

		it('should throw on Firebase error', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				claims: {}
			})
			mockRevokeRefreshTokens.mockRejectedValue(new Error('Firebase error'))

			// Act & Assert
			await expect(invokeRevokeMySessionsFn({data: {}})).rejects.toThrow(
				'Failed to revoke sessions'
			)
		})
	})

	describe('adminRevokeSessionsFn', () => {
		it('should revoke sessions for specified user when admin', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'admin-123',
				claims: {admin: true}
			})
			mockGetUser.mockResolvedValue({
				uid: 'admin-123',
				customClaims: {admin: true}
			})
			mockRevokeRefreshTokens.mockResolvedValue(undefined)

			// Act
			const result = await invokeAdminRevokeSessionsFn({
				data: {userId: 'target-user-456'}
			})

			// Assert
			expect(result.success).toBe(true)
			expect(result.message).toContain('target-user-456')
			expect(result.revokedBy).toBe('admin-123')
			expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('target-user-456')
		})

		it('should reject non-admin users', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				claims: {admin: false}
			})

			// Act & Assert
			await expect(
				invokeAdminRevokeSessionsFn({data: {userId: 'target-user-456'}})
			).rejects.toThrow('Admin privileges required')
		})

		it('should prevent admin from revoking their own sessions', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'admin-123',
				claims: {admin: true}
			})
			mockGetUser.mockResolvedValue({
				uid: 'admin-123',
				customClaims: {admin: true}
			})

			// Act & Assert
			await expect(invokeAdminRevokeSessionsFn({data: {userId: 'admin-123'}})).rejects.toThrow(
				'Cannot revoke your own sessions'
			)
		})

		it('should reject empty userId', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'admin-123',
				claims: {admin: true}
			})
			mockGetUser.mockResolvedValue({
				uid: 'admin-123',
				customClaims: {admin: true}
			})

			// Act & Assert
			await expect(invokeAdminRevokeSessionsFn({data: {userId: ''}})).rejects.toThrow()
		})

		it('should accept admin_action reason', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'admin-123',
				claims: {admin: true}
			})
			mockGetUser.mockResolvedValue({
				uid: 'admin-123',
				customClaims: {admin: true}
			})
			mockRevokeRefreshTokens.mockResolvedValue(undefined)

			// Act
			const result = await invokeAdminRevokeSessionsFn({
				data: {userId: 'target-user-456', reason: 'admin_action'}
			})

			// Assert
			expect(result.success).toBe(true)
		})

		it('should accept credential_change reason', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'admin-123',
				claims: {admin: true}
			})
			mockGetUser.mockResolvedValue({
				uid: 'admin-123',
				customClaims: {admin: true}
			})
			mockRevokeRefreshTokens.mockResolvedValue(undefined)

			// Act
			const result = await invokeAdminRevokeSessionsFn({
				data: {userId: 'target-user-456', reason: 'credential_change'}
			})

			// Assert
			expect(result.success).toBe(true)
		})
	})

	describe('revokeSessionsOnPasskeyRemoval', () => {
		it('should revoke sessions with passkey_removed reason', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				claims: {}
			})
			mockRevokeRefreshTokens.mockResolvedValue(undefined)
			mockClearSession.mockResolvedValue(undefined)

			// Act
			const result = await revokeSessionsOnPasskeyRemoval({data: undefined})

			// Assert
			expect(result.success).toBe(true)
			expect(result.message).toContain('passkey removal')
			expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('user-123')
			expect(mockClearSession).toHaveBeenCalled()
		})

		it('should reject unauthenticated requests', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({})

			// Act & Assert
			await expect(revokeSessionsOnPasskeyRemoval({data: undefined})).rejects.toThrow(
				'Authentication required'
			)
		})
	})
})
