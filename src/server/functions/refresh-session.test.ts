/**
 * Tests for session refresh server function
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Mock @tanstack/react-start to capture handler functions
vi.mock('@tanstack/react-start', () => ({
	createServerFn: () => ({
		handler: (fn: (...args: unknown[]) => unknown) => fn
	})
}))

// Mock dependencies before imports
vi.mock('@/lib/session', () => ({
	getSessionData: vi.fn(),
	updateSession: vi.fn(),
	validateSessionEnvironment: vi.fn(() => true)
}))

import type {Mock} from 'vitest'
import {getSessionData, updateSession} from '@/lib/session'
import {refreshSessionFn} from './refresh-session'

const mockGetSessionData = getSessionData as Mock
const mockUpdateSession = updateSession as Mock

describe('refresh-session', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('refreshSessionFn', () => {
		it('should refresh session for authenticated user', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				claims: {}
			})
			mockUpdateSession.mockResolvedValue(undefined)

			// Act
			const result = await refreshSessionFn({data: undefined})

			// Assert
			expect(result.success).toBe(true)
			expect(result.message).toBe('Session refreshed successfully')
			expect(mockUpdateSession).toHaveBeenCalledWith({
				sessionCreatedAt: expect.any(String)
			})
		})

		it('should reject unauthenticated requests', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({})

			// Act & Assert
			await expect(refreshSessionFn({data: undefined})).rejects.toThrow('Authentication required')
		})
	})
})
