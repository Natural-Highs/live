/**
 * Unit tests for Firebase utility functions
 * Following Test Pyramid Balance directive: Unit tests for utility functions
 * Following Incremental Verification directive: Verify this milestone before proceeding
 */
import {adminDb} from '$lib/firebase/firebase.admin'
import {fetchById, fetchByQuery} from './firebaseCalls'

// Mock Firestore
vi.mock('$lib/firebase/firebase.admin', () => ({
	adminDb: {
		collection: vi.fn()
	}
}))

describe('Firebase Utility Functions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('fetchByQuery', () => {
		it('should fetch documents by query field and value', async () => {
			const mockDocs = [
				{
					id: 'doc1',
					data: () => ({name: 'User 1', email: 'user1@example.com'})
				},
				{id: 'doc2', data: () => ({name: 'User 2', email: 'user2@example.com'})}
			]

			const mockCollection = {
				where: vi.fn().mockReturnThis(),
				get: vi.fn().mockResolvedValue({
					docs: mockDocs
				})
			}

			;(adminDb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
				mockCollection as never
			)

			const result = await fetchByQuery('users', 'email', 'user1@example.com')

			expect(adminDb.collection).toHaveBeenCalledWith('users')
			expect(mockCollection.where).toHaveBeenCalledWith(
				'email',
				'==',
				'user1@example.com'
			)
			expect(mockCollection.get).toHaveBeenCalled()
			expect(result).toEqual([
				{id: 'doc1', name: 'User 1', email: 'user1@example.com'},
				{id: 'doc2', name: 'User 2', email: 'user2@example.com'}
			])
		})

		it('should return empty array when no documents match', async () => {
			const mockCollection = {
				where: vi.fn().mockReturnThis(),
				get: vi.fn().mockResolvedValue({
					docs: []
				})
			}

			;(adminDb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
				mockCollection as never
			)

			const result = await fetchByQuery(
				'users',
				'email',
				'nonexistent@example.com'
			)

			expect(result).toEqual([])
			expect(mockCollection.where).toHaveBeenCalledWith(
				'email',
				'==',
				'nonexistent@example.com'
			)
		})

		it('should handle multiple documents with same field value', async () => {
			const mockDocs = [
				{id: 'doc1', data: () => ({name: 'User 1', role: 'admin'})},
				{id: 'doc2', data: () => ({name: 'User 2', role: 'admin'})},
				{id: 'doc3', data: () => ({name: 'User 3', role: 'admin'})}
			]

			const mockCollection = {
				where: vi.fn().mockReturnThis(),
				get: vi.fn().mockResolvedValue({
					docs: mockDocs
				})
			}

			;(adminDb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
				mockCollection as never
			)

			const result = await fetchByQuery('users', 'role', 'admin')

			expect(result).toHaveLength(3)
			expect(result[0].id).toBe('doc1')
			expect(result[1].id).toBe('doc2')
			expect(result[2].id).toBe('doc3')
		})
	})

	describe('fetchById', () => {
		it('should fetch a document by ID', async () => {
			const mockDoc = {
				id: 'user123',
				data: () => ({name: 'Test User', email: 'test@example.com'})
			}

			const mockCollection = {
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue(mockDoc)
				})
			}

			;(adminDb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
				mockCollection as never
			)

			const result = await fetchById('users', 'user123')

			expect(adminDb.collection).toHaveBeenCalledWith('users')
			expect(mockCollection.doc).toHaveBeenCalledWith('user123')
			expect(result).toEqual({
				id: 'user123',
				name: 'Test User',
				email: 'test@example.com'
			})
		})

		it('should return document with id even when data is empty', async () => {
			const mockDoc = {
				id: 'empty123',
				data: () => ({})
			}

			const mockCollection = {
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue(mockDoc)
				})
			}

			;(adminDb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
				mockCollection as never
			)

			const result = await fetchById('users', 'empty123')

			expect(result).toEqual({id: 'empty123'})
		})

		it('should handle different collection names', async () => {
			const mockDoc = {
				id: 'event456',
				data: () => ({name: 'Test Event', code: '1234'})
			}

			const mockCollection = {
				doc: vi.fn().mockReturnValue({
					get: vi.fn().mockResolvedValue(mockDoc)
				})
			}

			;(adminDb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
				mockCollection as never
			)

			const result = await fetchById('events', 'event456')

			expect(adminDb.collection).toHaveBeenCalledWith('events')
			expect(mockCollection.doc).toHaveBeenCalledWith('event456')
			expect(result).toEqual({
				id: 'event456',
				name: 'Test Event',
				code: '1234'
			})
		})
	})
})
