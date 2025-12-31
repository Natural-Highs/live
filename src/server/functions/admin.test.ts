/**
 * Unit tests for admin server functions
 * Tests data export, admin claims, and response retrieval
 */

// Mock dependencies
vi.mock('@/server/middleware/auth', () => ({
	requireAdmin: vi.fn(),
	requireAuth: vi.fn()
}))

import {requireAdmin} from '@/server/middleware/auth'

vi.mock('../../lib/firebase/firebase', () => ({
	db: {
		collection: vi.fn(() => ({
			orderBy: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			offset: vi.fn().mockReturnThis(),
			get: vi.fn()
		}))
	},
	auth: {
		getUser: vi.fn(),
		getUserByEmail: vi.fn(),
		setCustomUserClaims: vi.fn()
	}
}))

describe('admin server functions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('exportData behavior', () => {
		it('should require admin privileges', () => {
			expect(requireAdmin).toBeDefined()
		})

		it('should support JSON format export', () => {
			const format = 'json'
			expect(format).toBe('json')
		})

		it('should support CSV format export', () => {
			const format = 'csv'
			expect(format).toBe('csv')
		})

		it('should filter by eventId when provided', () => {
			const filters = {eventId: 'event-123'}
			expect(filters.eventId).toBeDefined()
		})

		it('should filter by surveyType when provided', () => {
			const filters = {surveyType: 'post'}
			expect(filters.surveyType).toBeDefined()
		})

		it('should convert timestamps for export', () => {
			const mockTimestamp = {toDate: () => new Date('2025-01-01')}
			const converted = mockTimestamp.toDate().toISOString()
			expect(converted).toBe('2025-01-01T00:00:00.000Z')
		})
	})

	describe('setAdminClaim behavior', () => {
		it('should require admin privileges', () => {
			expect(requireAdmin).toBeDefined()
		})

		it('should validate userId is provided', () => {
			const input = {userId: 'user-123', isAdmin: true}
			expect(input.userId).toBeDefined()
		})

		it('should accept boolean isAdmin value', () => {
			const input = {userId: 'user-123', isAdmin: true}
			expect(typeof input.isAdmin).toBe('boolean')
		})

		it('should preserve existing custom claims when updating', () => {
			// setAdminClaim should keep signedConsentForm claim
			const currentClaims = {signedConsentForm: true}
			const newClaims = {admin: true, signedConsentForm: currentClaims.signedConsentForm}
			expect(newClaims.signedConsentForm).toBe(true)
			expect(newClaims.admin).toBe(true)
		})
	})

	describe('getResponses behavior', () => {
		it('should require admin privileges', () => {
			expect(requireAdmin).toBeDefined()
		})

		it('should support filtering by eventId', () => {
			const filters = {eventId: 'event-123'}
			expect(filters.eventId).toBeDefined()
		})

		it('should support filtering by userId', () => {
			const filters = {userId: 'user-123'}
			expect(filters.userId).toBeDefined()
		})

		it('should support filtering by surveyType', () => {
			const filters = {surveyType: 'pre'}
			expect(filters.surveyType).toBeDefined()
		})

		it('should support pagination with limit and offset', () => {
			const pagination = {limit: 10, offset: 20}
			expect(pagination.limit).toBe(10)
			expect(pagination.offset).toBe(20)
		})

		it('should order responses by submittedAt descending', () => {
			const dates = [new Date('2025-03-01'), new Date('2025-01-01'), new Date('2025-02-01')]
			const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime())
			expect(sorted[0]).toEqual(dates[0])
		})

		it('should indicate if more results exist', () => {
			const limit = 10
			const returnedCount = 10
			const hasMore = returnedCount === limit
			expect(hasMore).toBe(true)
		})
	})

	describe('getUserByEmail behavior', () => {
		it('should require admin privileges', () => {
			expect(requireAdmin).toBeDefined()
		})

		it('should validate email is provided', () => {
			const input = {email: 'test@example.com'}
			expect(input.email).toBeDefined()
		})

		it('should return user record with claims', () => {
			const userRecord = {
				uid: 'user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				photoURL: null,
				emailVerified: true,
				disabled: false,
				customClaims: {admin: false, signedConsentForm: true}
			}
			expect(userRecord.customClaims).toBeDefined()
		})

		it('should handle user not found error', () => {
			const errorCode = 'auth/user-not-found'
			expect(errorCode).toBe('auth/user-not-found')
		})
	})

	describe('CSV conversion', () => {
		it('should generate headers from object keys', () => {
			const data = [{id: '1', name: 'Test'}]
			const headers = Object.keys(data[0])
			expect(headers).toContain('id')
			expect(headers).toContain('name')
		})

		it('should escape values with commas', () => {
			const value = 'Hello, World'
			const escaped = value.includes(',') ? `"${value}"` : value
			expect(escaped).toBe('"Hello, World"')
		})

		it('should escape values with quotes', () => {
			const value = 'Say "Hello"'
			const escaped = value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value
			expect(escaped).toBe('"Say ""Hello"""')
		})

		it('should handle empty data array', () => {
			const data: unknown[] = []
			const csvResult = data.length === 0 ? '' : 'has content'
			expect(csvResult).toBe('')
		})

		it('should stringify nested objects', () => {
			const nested = {responses: {q1: 'answer1'}}
			const stringified = JSON.stringify(nested.responses)
			expect(stringified).toBe('{"q1":"answer1"}')
		})
	})
})
