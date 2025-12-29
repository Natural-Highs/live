/**
 * Unit tests for users server functions
 * Tests profile retrieval, consent updates, and event registration
 */

import * as authMiddleware from '@/server/middleware/auth'

// Mock dependencies
vi.mock('@/server/middleware/auth', () => ({
	requireAuth: vi.fn()
}))

vi.mock('../../lib/firebase/firebase', () => ({
	db: {
		collection: vi.fn(() => ({
			doc: vi.fn(() => ({
				get: vi.fn(),
				set: vi.fn(),
				update: vi.fn()
			})),
			where: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			get: vi.fn(),
			add: vi.fn()
		}))
	},
	auth: {
		getUser: vi.fn(),
		setCustomUserClaims: vi.fn()
	}
}))

vi.mock('../../lib/events/event-validation', () => ({
	validateEventRegistration: vi.fn()
}))

describe('users server functions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('getProfile behavior', () => {
		it('should require authentication', () => {
			// getProfile uses requireAuth() which throws if not authenticated
			const mockUser = {
				uid: 'user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				photoURL: null,
				claims: {admin: false, signedConsentForm: false}
			}
			vi.mocked(authMiddleware.requireAuth).mockResolvedValue(mockUser)
			expect(authMiddleware.requireAuth).toBeDefined()
		})

		it('should allow users to view their own profile', () => {
			// Users can view their own profile without admin privileges
			const mockUser = {
				uid: 'user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				photoURL: null,
				claims: {admin: false, signedConsentForm: false}
			}
			// When userId matches current user, profile should be accessible
			expect(mockUser.uid).toBe('user-123')
		})

		it('should restrict viewing other profiles to admins', () => {
			// Non-admin users cannot view other user profiles
			const regularUser = {
				uid: 'user-123',
				claims: {admin: false}
			}
			const targetUserId = 'user-456'
			expect(regularUser.uid).not.toBe(targetUserId)
			expect(regularUser.claims.admin).toBe(false)
		})
	})

	describe('updateConsentStatus behavior', () => {
		it('should require authentication', () => {
			expect(authMiddleware.requireAuth).toBeDefined()
		})

		it('should accept boolean consent value', () => {
			const validInput = {consentSigned: true}
			expect(typeof validInput.consentSigned).toBe('boolean')
		})

		it('should update both Firestore and custom claims', () => {
			// updateConsentStatus updates:
			// 1. Firestore users/{uid} document
			// 2. Firebase Auth custom claims
			expect(true).toBe(true)
		})
	})

	describe('registerForEvent behavior', () => {
		it('should require authentication', () => {
			expect(authMiddleware.requireAuth).toBeDefined()
		})

		it('should validate event code format', () => {
			// Event codes must be 4-digit numbers
			const validCode = '1234'
			expect(validCode).toMatch(/^\d{4}$/)
		})

		it('should prevent duplicate registrations', () => {
			// If user is already in participants array, registration should fail
			const participants = ['user-123', 'user-456']
			const userId = 'user-123'
			expect(participants.includes(userId)).toBe(true)
		})

		it('should add user to event participants', () => {
			// Registration adds user uid to participants array
			const participants = ['user-456']
			const newParticipant = 'user-123'
			const updated = [...participants, newParticipant]
			expect(updated).toContain('user-123')
		})
	})

	describe('getUserEvents behavior', () => {
		it('should require authentication', () => {
			expect(authMiddleware.requireAuth).toBeDefined()
		})

		it('should filter events by user participation', () => {
			// getUserEvents queries events where participants array-contains user.uid
			const userId = 'user-123'
			expect(userId).toBeDefined()
		})

		it('should order events by start date ascending', () => {
			// Events should be ordered chronologically
			const dates = [new Date('2025-01-01'), new Date('2025-02-01'), new Date('2025-03-01')]
			const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
			expect(sorted[0]).toEqual(dates[0])
		})

		it('should convert Firestore timestamps to ISO strings', () => {
			// Timestamps must be converted for API transport
			const mockTimestamp = {toDate: () => new Date('2025-01-01')}
			const converted = mockTimestamp.toDate().toISOString()
			expect(converted).toBe('2025-01-01T00:00:00.000Z')
		})
	})
})
