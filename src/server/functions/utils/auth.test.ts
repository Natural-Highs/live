/**
 * Unit tests for auth utilities (validateSession, requireAdmin)
 *
 * Tests for Story -1.2 Task 1:
 * - validateSession() returns user from TanStack session
 * - validateSession() returns null when no session
 * - validateSession() rejects cross-environment session (R-023)
 * - requireAdmin() works with new session structure
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Mock Firebase before any imports that use it
vi.mock('$lib/firebase/firebase', () => ({
	auth: {
		verifySessionCookie: vi.fn()
	}
}))

// Mock session module before imports
vi.mock('@/lib/session', () => ({
	getSessionData: vi.fn(),
	validateSessionEnvironment: vi.fn()
}))

import type {Mock} from 'vitest'
import {getSessionData, validateSessionEnvironment} from '@/lib/session'
import {AuthenticationError} from './errors'

// Cast mocks
const mockGetSessionData = getSessionData as Mock
const mockValidateSessionEnvironment = validateSessionEnvironment as Mock

// Import after mocking
import {requireAdmin, requireConsent, validateSession} from './auth'

describe('auth utilities (Task 1)', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe('validateSession', () => {
		it('should return user from TanStack session when session exists', async () => {
			// Arrange
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
			const user = await validateSession()

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

		it('should throw AuthenticationError when no session exists', async () => {
			// Arrange - empty session data
			mockGetSessionData.mockResolvedValue({})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act & Assert
			await expect(validateSession()).rejects.toThrow(AuthenticationError)
			await expect(validateSession()).rejects.toThrow('No session found')
		})

		it('should throw AuthenticationError when userId is missing', async () => {
			// Arrange - session without userId
			mockGetSessionData.mockResolvedValue({
				email: 'test@example.com',
				claims: {}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act & Assert
			await expect(validateSession()).rejects.toThrow(AuthenticationError)
		})

		it('should reject cross-environment session (R-023)', async () => {
			// Arrange - valid session but wrong environment
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				email: 'test@example.com',
				claims: {},
				env: 'development'
			})
			mockValidateSessionEnvironment.mockReturnValue(false) // Cross-env detected

			// Act & Assert
			await expect(validateSession()).rejects.toThrow(AuthenticationError)
			await expect(validateSession()).rejects.toThrow('Session environment mismatch')
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
			const user = await validateSession()

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
			const user = await validateSession()

			// Assert
			expect(user.claims).toEqual({})
		})
	})

	describe('requireAdmin', () => {
		it('should return user when session has admin claim', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'admin-123',
				email: 'admin@example.com',
				displayName: 'Admin User',
				claims: {
					admin: true,
					signedConsentForm: true
				}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act
			const user = await requireAdmin()

			// Assert
			expect(user.uid).toBe('admin-123')
			expect(user.claims.admin).toBe(true)
		})

		it('should throw AuthenticationError when user is not admin', async () => {
			// Arrange
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

		it('should throw AuthenticationError when no session exists', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act & Assert
			await expect(requireAdmin()).rejects.toThrow(AuthenticationError)
		})

		it('should throw when admin claim is undefined', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				claims: {} // No admin key
			})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act & Assert
			await expect(requireAdmin()).rejects.toThrow(AuthenticationError)
		})
	})

	describe('requireConsent', () => {
		it('should return user when consent form is signed', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				claims: {
					signedConsentForm: true
				}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act
			const user = await requireConsent()

			// Assert
			expect(user.uid).toBe('user-123')
			expect(user.claims.signedConsentForm).toBe(true)
		})

		it('should throw when consent form is not signed', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				claims: {
					signedConsentForm: false
				}
			})
			mockValidateSessionEnvironment.mockReturnValue(true)

			// Act & Assert
			await expect(requireConsent()).rejects.toThrow(AuthenticationError)
			await expect(requireConsent()).rejects.toThrow('Consent form must be signed')
		})
	})
})
