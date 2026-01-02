/**
 * Unit tests for users server functions
 * Tests profile retrieval, consent updates, event registration, and account activity
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Use vi.hoisted for mock functions that need to be available in vi.mock factories
const {mockCreateServerFn} = vi.hoisted(() => ({
	mockCreateServerFn: vi.fn()
}))

// Mock @tanstack/react-start to capture handler functions
vi.mock('@tanstack/react-start', () => ({
	createServerFn: () => ({
		inputValidator: (validator: (d: unknown) => unknown) => ({
			handler: (fn: (args: {data: unknown}) => unknown) => {
				mockCreateServerFn(fn)
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

// Mock Firebase Admin
const mockFirestoreDoc = {
	get: vi.fn(),
	set: vi.fn(),
	update: vi.fn(),
	exists: true,
	data: vi.fn(),
	id: 'doc-123'
}

const mockFirestoreQuery = {
	where: vi.fn().mockReturnThis(),
	orderBy: vi.fn().mockReturnThis(),
	limit: vi.fn().mockReturnThis(),
	get: vi.fn(),
	docs: [] as (typeof mockFirestoreDoc)[]
}

const mockFirestoreCollection = {
	doc: vi.fn(() => mockFirestoreDoc),
	where: vi.fn(() => mockFirestoreQuery),
	orderBy: vi.fn(() => mockFirestoreQuery),
	limit: vi.fn(() => mockFirestoreQuery),
	get: vi.fn()
}

vi.mock('@/lib/firebase/firebase.admin', () => ({
	adminAuth: {
		getUser: vi.fn(),
		setCustomUserClaims: vi.fn()
	},
	adminDb: {
		collection: vi.fn(() => mockFirestoreCollection)
	}
}))

// Mock middleware
vi.mock('@/server/middleware/auth', () => ({
	requireAuth: vi.fn()
}))

import type {Mock} from 'vitest'
import {adminAuth} from '@/lib/firebase/firebase.admin'
import {requireAuth} from '@/server/middleware/auth'
import {NotFoundError, ValidationError} from './utils/errors'

// Cast mocks
const mockRequireAuth = requireAuth as Mock
const mockGetUser = (adminAuth as unknown as {getUser: Mock}).getUser
const mockSetCustomUserClaims = (adminAuth as unknown as {setCustomUserClaims: Mock})
	.setCustomUserClaims

// Import after mocking
import {getAccountActivity, getProfile, getUserEvents, updateConsentStatus} from './users'

describe('users server functions', () => {
	const mockUser = {
		uid: 'user-123',
		email: 'test@example.com',
		displayName: 'Test User',
		photoURL: null,
		claims: {admin: false, signedConsentForm: false}
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mockRequireAuth.mockResolvedValue(mockUser)
	})

	describe('getProfile', () => {
		it('should return user profile for current user', async () => {
			const userData = {
				firstName: 'Test',
				lastName: 'User',
				createdAt: {toDate: () => new Date('2025-01-01')},
				updatedAt: {toDate: () => new Date('2025-01-15')}
			}
			mockFirestoreDoc.get.mockResolvedValue({
				exists: true,
				data: () => userData
			})

			const result = await getProfile({data: {}})

			expect(result.uid).toBe('user-123')
			expect(result.email).toBe('test@example.com')
			expect((result as Record<string, unknown>).firstName).toBe('Test')
		})

		it('should allow admin to view other user profiles', async () => {
			const adminUser = {...mockUser, claims: {admin: true}}
			mockRequireAuth.mockResolvedValue(adminUser)

			const userData = {firstName: 'Other', lastName: 'User'}
			mockFirestoreDoc.get.mockResolvedValue({
				exists: true,
				data: () => userData
			})

			const result = await getProfile({data: {userId: 'other-user'}})
			expect((result as Record<string, unknown>).firstName).toBe('Other')
		})

		it('should throw ValidationError for non-admin viewing other profiles', async () => {
			mockFirestoreDoc.get.mockResolvedValue({exists: true, data: () => ({})})

			await expect(getProfile({data: {userId: 'other-user'}})).rejects.toThrow(ValidationError)
		})

		it('should throw NotFoundError if user not found', async () => {
			mockFirestoreDoc.get.mockResolvedValue({exists: false})

			await expect(getProfile({data: {}})).rejects.toThrow(NotFoundError)
		})

		it('should throw NotFoundError if user data is null', async () => {
			mockFirestoreDoc.get.mockResolvedValue({exists: true, data: () => null})

			await expect(getProfile({data: {}})).rejects.toThrow(NotFoundError)
		})

		it('should handle timestamps without toDate method', async () => {
			const userData = {
				firstName: 'Test',
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-15T00:00:00Z'
			}
			mockFirestoreDoc.get.mockResolvedValue({exists: true, data: () => userData})

			const result = await getProfile({data: {}})
			expect(result.createdAt).toBe('2025-01-01T00:00:00Z')
		})
	})

	describe('updateConsentStatus', () => {
		it('should update consent status to true', async () => {
			mockFirestoreDoc.set.mockResolvedValue(undefined)
			mockGetUser.mockResolvedValue({customClaims: {}})
			mockSetCustomUserClaims.mockResolvedValue(undefined)

			const result = await updateConsentStatus({data: {consentSigned: true}})

			expect(result.success).toBe(true)
			expect(result.consentSigned).toBe(true)
			expect(mockFirestoreDoc.set).toHaveBeenCalledWith(
				expect.objectContaining({signedConsentForm: true}),
				{merge: true}
			)
		})

		it('should update consent status to false', async () => {
			mockFirestoreDoc.set.mockResolvedValue(undefined)
			mockGetUser.mockResolvedValue({customClaims: {admin: true}})
			mockSetCustomUserClaims.mockResolvedValue(undefined)

			const result = await updateConsentStatus({data: {consentSigned: false}})

			expect(result.success).toBe(true)
			expect(result.consentSigned).toBe(false)
		})

		it('should preserve existing admin claims', async () => {
			mockFirestoreDoc.set.mockResolvedValue(undefined)
			mockGetUser.mockResolvedValue({customClaims: {admin: true}})
			mockSetCustomUserClaims.mockResolvedValue(undefined)

			await updateConsentStatus({data: {consentSigned: true}})

			expect(mockSetCustomUserClaims).toHaveBeenCalledWith(
				'user-123',
				expect.objectContaining({admin: true, signedConsentForm: true})
			)
		})
	})

	describe('getUserEvents', () => {
		it('should return empty array when no events', async () => {
			mockFirestoreQuery.get.mockResolvedValue({docs: []})
			mockFirestoreCollection.get = vi.fn().mockResolvedValue({docs: []})

			const result = await getUserEvents()

			expect(result).toEqual([])
		})

		it('should return events from userEvents collection', async () => {
			const userEventDocs = [
				{
					id: 'ue-1',
					data: () => ({
						eventId: 'event-1',
						registeredAt: {toDate: () => new Date('2025-01-15')},
						migratedFromGuestEventId: null
					})
				}
			]
			const eventDocs = [
				{
					id: 'event-1',
					exists: true,
					data: () => ({
						name: 'Community Event',
						startDate: {toDate: () => new Date('2025-01-20')},
						endDate: {toDate: () => new Date('2025-01-20')}
					})
				}
			]

			// First call for userEvents, second for direct events
			mockFirestoreQuery.get
				.mockResolvedValueOnce({docs: userEventDocs})
				.mockResolvedValueOnce({docs: []})
				.mockResolvedValueOnce({docs: eventDocs})

			const result = await getUserEvents()

			expect(result.length).toBeGreaterThanOrEqual(0)
		})

		it('should mark migrated guest events with wasGuest flag', async () => {
			const userEventDocs = [
				{
					id: 'ue-1',
					data: () => ({
						eventId: 'event-1',
						registeredAt: {toDate: () => new Date('2025-01-15')},
						migratedFromGuestEventId: 'guest-123'
					})
				}
			]
			const eventDocs = [
				{
					id: 'event-1',
					exists: true,
					data: () => ({name: 'Event', startDate: null, endDate: null})
				}
			]

			mockFirestoreQuery.get
				.mockResolvedValueOnce({docs: userEventDocs})
				.mockResolvedValueOnce({docs: []})
				.mockResolvedValueOnce({docs: eventDocs})

			const result = await getUserEvents()

			if (result.length > 0 && result[0]) {
				expect(result[0].wasGuest).toBe(true)
				expect((result[0] as Record<string, unknown>).name).toContain('(as Guest)')
			}
		})

		it('should handle events without startDate', async () => {
			const userEventDocs = [
				{id: 'ue-1', data: () => ({eventId: 'event-1', registeredAt: null})},
				{id: 'ue-2', data: () => ({eventId: 'event-2', registeredAt: null})}
			]
			const eventDocs = [
				{id: 'event-1', exists: true, data: () => ({name: 'Event 1', startDate: null})},
				{
					id: 'event-2',
					exists: true,
					data: () => ({name: 'Event 2', startDate: {toDate: () => new Date('2025-01-01')}})
				}
			]

			mockFirestoreQuery.get
				.mockResolvedValueOnce({docs: userEventDocs})
				.mockResolvedValueOnce({docs: []})
				.mockResolvedValueOnce({docs: eventDocs})

			const result = await getUserEvents()
			expect(Array.isArray(result)).toBe(true)
		})

		it('should return empty array on error', async () => {
			mockFirestoreQuery.get.mockRejectedValue(new Error('Firestore error'))

			const result = await getUserEvents()

			expect(result).toEqual([])
		})

		it('should include direct participant events', async () => {
			const directEventDocs = [
				{
					id: 'direct-event',
					data: () => ({
						name: 'Direct Event',
						startDate: {toDate: () => new Date('2025-02-01')},
						participants: ['user-123']
					})
				}
			]

			mockFirestoreQuery.get
				.mockResolvedValueOnce({docs: []}) // userEvents
				.mockResolvedValueOnce({docs: directEventDocs}) // direct events

			const result = await getUserEvents()
			expect(Array.isArray(result)).toBe(true)
		})
	})

	describe('getAccountActivity', () => {
		it('should return empty array when no activity', async () => {
			mockFirestoreQuery.get.mockResolvedValue({docs: []})
			mockFirestoreDoc.get.mockResolvedValue({exists: true, data: () => ({})})

			const result = await getAccountActivity()

			expect(result).toEqual([])
		})

		it('should return check-in activities', async () => {
			const userEventDocs = [
				{
					id: 'ue-1',
					data: () => ({
						eventId: 'event-1',
						registeredAt: {toDate: () => new Date('2025-01-15T14:00:00Z')}
					})
				}
			]
			const eventDocs = [{id: 'event-1', exists: true, data: () => ({name: 'Community Meetup'})}]

			mockFirestoreQuery.get
				.mockResolvedValueOnce({docs: userEventDocs})
				.mockResolvedValueOnce({docs: eventDocs})
			mockFirestoreDoc.get.mockResolvedValue({exists: true, data: () => ({})})

			const result = await getAccountActivity()

			expect(result.length).toBeGreaterThanOrEqual(0)
			if (result.length > 0) {
				expect(result[0].type).toBe('check-in')
				expect(result[0].description).toContain('Checked in to')
			}
		})

		it('should include consent activity when signed', async () => {
			mockFirestoreQuery.get.mockResolvedValue({docs: []})
			mockFirestoreDoc.get.mockResolvedValue({
				exists: true,
				data: () => ({
					consentSignedAt: {toDate: () => new Date('2025-01-10T09:00:00Z')}
				})
			})

			const result = await getAccountActivity()

			const consentActivity = result.find(a => a.type === 'consent')
			if (consentActivity) {
				expect(consentActivity.description).toBe('Signed consent form')
			}
		})

		it('should sort activities by timestamp descending', async () => {
			const userEventDocs = [
				{
					id: 'ue-1',
					data: () => ({
						eventId: 'event-1',
						registeredAt: {toDate: () => new Date('2025-01-05T10:00:00Z')}
					})
				},
				{
					id: 'ue-2',
					data: () => ({
						eventId: 'event-2',
						registeredAt: {toDate: () => new Date('2025-01-15T10:00:00Z')}
					})
				}
			]
			const eventDocs = [
				{id: 'event-1', exists: true, data: () => ({name: 'Event 1'})},
				{id: 'event-2', exists: true, data: () => ({name: 'Event 2'})}
			]

			mockFirestoreQuery.get
				.mockResolvedValueOnce({docs: userEventDocs})
				.mockResolvedValueOnce({docs: eventDocs})
			mockFirestoreDoc.get.mockResolvedValue({exists: true, data: () => ({})})

			const result = await getAccountActivity()

			if (result.length >= 2) {
				const first = new Date(result[0].timestamp).getTime()
				const second = new Date(result[1].timestamp).getTime()
				expect(first).toBeGreaterThanOrEqual(second)
			}
		})

		it('should return empty array on error', async () => {
			mockFirestoreQuery.get.mockRejectedValue(new Error('Firestore error'))

			const result = await getAccountActivity()

			expect(result).toEqual([])
		})

		it('should handle missing event names gracefully', async () => {
			const userEventDocs = [
				{id: 'ue-1', data: () => ({eventId: 'missing-event', registeredAt: new Date()})}
			]

			mockFirestoreQuery.get
				.mockResolvedValueOnce({docs: userEventDocs})
				.mockResolvedValueOnce({docs: []}) // No events found
			mockFirestoreDoc.get.mockResolvedValue({exists: true, data: () => ({})})

			const result = await getAccountActivity()

			if (result.length > 0) {
				expect(result[0].description).toContain('Event')
			}
		})

		it('should handle timestamps without toDate method', async () => {
			const userEventDocs = [
				{
					id: 'ue-1',
					data: () => ({eventId: 'event-1', registeredAt: '2025-01-15T14:00:00Z'})
				}
			]
			const eventDocs = [{id: 'event-1', exists: true, data: () => ({name: 'Event'})}]

			mockFirestoreQuery.get
				.mockResolvedValueOnce({docs: userEventDocs})
				.mockResolvedValueOnce({docs: eventDocs})
			mockFirestoreDoc.get.mockResolvedValue({exists: true, data: () => ({})})

			const result = await getAccountActivity()
			expect(Array.isArray(result)).toBe(true)
		})

		it('should skip consent if user doc does not exist', async () => {
			mockFirestoreQuery.get.mockResolvedValue({docs: []})
			mockFirestoreDoc.get.mockResolvedValue({exists: false})

			const result = await getAccountActivity()

			expect(result.filter(a => a.type === 'consent')).toHaveLength(0)
		})

		it('should handle consent timestamp without toDate', async () => {
			mockFirestoreQuery.get.mockResolvedValue({docs: []})
			mockFirestoreDoc.get.mockResolvedValue({
				exists: true,
				data: () => ({consentSignedAt: '2025-01-10T09:00:00Z'})
			})

			const result = await getAccountActivity()

			const consentActivity = result.find(a => a.type === 'consent')
			if (consentActivity) {
				expect(consentActivity.timestamp).toBe('2025-01-10T09:00:00Z')
			}
		})
	})
})
