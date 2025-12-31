/**
 * Profile Settings Server Functions Tests
 *
 * Tests for:
 * - getFullProfileFn
 * - updateProfileWithHistoryFn
 * - updateDemographicsWithHistoryFn
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Mock @tanstack/react-start to capture handler functions and simulate inputValidator chain
// Note: profile-settings validators expect full wrapper {data: ..., expectedVersion: ...}
vi.mock('@tanstack/react-start', () => ({
	createServerFn: () => ({
		inputValidator: (validator: (d: unknown) => unknown) => ({
			handler: (fn: (args: {data: unknown}) => unknown) => {
				// Return a function that runs validator on full input (not unwrapped)
				return async (input: unknown) => {
					const validated = validator(input)
					return fn({data: validated})
				}
			}
		}),
		handler: (fn: (...args: unknown[]) => unknown) => fn
	})
}))

// Mock Firebase Admin
const mockHistoryDocRef = {
	id: 'history-doc-123',
	set: vi.fn()
}

const mockHistoryCollection = {
	doc: vi.fn(() => mockHistoryDocRef)
}

const mockPrivateDocRef = {
	get: vi.fn(),
	set: vi.fn()
}

const mockPrivateCollection = {
	doc: vi.fn(() => mockPrivateDocRef)
}

const mockFirestoreDoc = {
	get: vi.fn(),
	set: vi.fn(),
	update: vi.fn(),
	collection: vi.fn((name: string) => {
		if (name === 'demographicHistory') {
			return mockHistoryCollection
		}
		if (name === 'private') {
			return mockPrivateCollection
		}
		return mockHistoryCollection
	})
}

const mockFirestoreCollection = {
	doc: vi.fn(() => mockFirestoreDoc)
}

const mockTransactionGet = vi.fn()

const mockTransaction = {
	update: vi.fn(),
	set: vi.fn(),
	get: mockTransactionGet
}

vi.mock('@/lib/firebase/firebase.admin', () => ({
	adminDb: {
		collection: vi.fn(() => mockFirestoreCollection),
		runTransaction: vi.fn(async (callback: (t: typeof mockTransaction) => Promise<void>) => {
			await callback(mockTransaction)
		})
	},
	serverTimestamp: vi.fn(() => ({_serverTimestamp: true}))
}))

// Mock middleware module
vi.mock('@/server/middleware/auth', () => ({
	requireAuth: vi.fn()
}))

import type {Mock} from 'vitest'
import {adminDb} from '@/lib/firebase/firebase.admin'
import {requireAuth} from '@/server/middleware/auth'
import {NotFoundError, ValidationError} from './utils/errors'

// Cast mocks
const mockRequireAuth = requireAuth as Mock
const mockAdminDbCollection = (adminDb as unknown as {collection: Mock}).collection
const mockRunTransaction = (adminDb as unknown as {runTransaction: Mock}).runTransaction

// Import after mocking
import {
	getFullProfileFn,
	updateDemographicsWithHistoryFn,
	updateProfileWithHistoryFn
} from './profile-settings'

describe('profile-settings server functions', () => {
	const mockUser = {
		uid: 'user-123',
		email: 'test@example.com',
		displayName: 'Test User',
		photoURL: null,
		claims: {}
	}

	const mockUserData = {
		uid: 'user-123',
		email: 'test@example.com',
		displayName: 'Maya W.',
		dateOfBirth: '2005-03-15',
		isMinor: false,
		profileComplete: true,
		pronouns: 'she/her',
		gender: 'female',
		raceEthnicity: ['Asian'],
		emergencyContactName: 'Sarah Martinez',
		emergencyContactPhone: '555-123-4567',
		emergencyContactEmail: null,
		dietaryRestrictions: ['vegetarian'],
		medicalConditions: 'Asthma',
		profileVersion: 0
	}

	beforeEach(() => {
		vi.resetAllMocks()

		// Default mocks
		mockRequireAuth.mockResolvedValue(mockUser)
		mockAdminDbCollection.mockReturnValue(mockFirestoreCollection)
		mockFirestoreCollection.doc.mockReturnValue(mockFirestoreDoc)
		mockFirestoreDoc.get.mockResolvedValue({
			data: () => mockUserData
		})
		mockFirestoreDoc.update.mockResolvedValue(undefined)
		mockFirestoreDoc.set.mockResolvedValue(undefined)
		mockHistoryDocRef.set.mockResolvedValue(undefined)
		mockPrivateDocRef.get.mockResolvedValue({data: () => null})
		mockPrivateDocRef.set.mockResolvedValue(undefined)

		// Mock transaction.get to return same data as mockFirestoreDoc.get
		mockTransactionGet.mockResolvedValue({
			data: () => mockUserData
		})
	})

	describe('getFullProfileFn', () => {
		it('should return full profile with demographics for adults', async () => {
			// Act
			const result = await getFullProfileFn()

			// Assert
			expect(result.uid).toBe('user-123')
			expect(result.displayName).toBe('Maya W.')
			expect(result.dateOfBirth).toBe('2005-03-15')
			expect(result.isMinor).toBe(false)
			expect(result.demographics.pronouns).toBe('she/her')
			expect(result.demographics.emergencyContactName).toBe('Sarah Martinez')
		})

		it('should retrieve demographics from private subcollection for minors', async () => {
			// Arrange - user is a minor
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({
					...mockUserData,
					isMinor: true,
					pronouns: undefined // Not on main doc
				})
			})
			mockPrivateDocRef.get.mockResolvedValue({
				data: () => ({
					pronouns: 'they/them',
					gender: 'non-binary'
				})
			})

			// Act
			const result = await getFullProfileFn()

			// Assert
			expect(result.isMinor).toBe(true)
			expect(result.demographics.pronouns).toBe('they/them')
			expect(result.demographics.gender).toBe('non-binary')
		})

		it('should throw NotFoundError when user does not exist', async () => {
			// Arrange
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => null
			})

			// Act & Assert
			await expect(getFullProfileFn()).rejects.toThrow(NotFoundError)
		})

		it('should require authentication', async () => {
			// Act
			await getFullProfileFn()

			// Assert
			expect(mockRequireAuth).toHaveBeenCalled()
		})
	})

	describe('updateProfileWithHistoryFn', () => {
		it('should update displayName and create history record', async () => {
			// Arrange
			const newData = {displayName: 'Maya Updated'}

			// Act
			const result = await updateProfileWithHistoryFn({data: newData})

			// Assert
			expect(result.success).toBe(true)
			expect(result.updatedFields).toContain('displayName')
			expect(mockRunTransaction).toHaveBeenCalled()
		})

		it('should return empty updatedFields when no changes', async () => {
			// Arrange - same displayName
			const sameData = {displayName: 'Maya W.'}

			// Act
			const result = await updateProfileWithHistoryFn({data: sameData})

			// Assert
			expect(result.success).toBe(true)
			expect(result.updatedFields).toEqual([])
		})

		it('should throw ValidationError for invalid displayName', async () => {
			// Arrange
			const invalidData = {displayName: ''}

			// Act & Assert
			await expect(updateProfileWithHistoryFn({data: invalidData})).rejects.toThrow(ValidationError)
		})

		it('should throw NotFoundError when user does not exist', async () => {
			// Arrange
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => null
			})

			// Act & Assert
			await expect(updateProfileWithHistoryFn({data: {displayName: 'New Name'}})).rejects.toThrow(
				NotFoundError
			)
		})

		it('should require authentication', async () => {
			// Act
			await updateProfileWithHistoryFn({data: {displayName: 'Maya Updated'}})

			// Assert
			expect(mockRequireAuth).toHaveBeenCalled()
		})
	})

	describe('updateDemographicsWithHistoryFn', () => {
		it('should update demographics and create history record (NFR39)', async () => {
			// Arrange
			const newDemographics = {
				pronouns: 'they/them'
			}

			// Act
			const result = await updateDemographicsWithHistoryFn({data: newDemographics})

			// Assert
			expect(result.success).toBe(true)
			expect(result.updatedFields).toContain('pronouns')
			expect(result.historyId).toBeDefined()
			expect(mockRunTransaction).toHaveBeenCalled()
		})

		it('should create history record with correct structure (NFR39)', async () => {
			// Arrange
			const newDemographics = {
				pronouns: 'they/them',
				gender: 'non-binary'
			}

			// Act
			const result = await updateDemographicsWithHistoryFn({data: newDemographics})

			// Assert
			expect(result.success).toBe(true)
			expect(result.updatedFields).toEqual(expect.arrayContaining(['pronouns', 'gender']))

			// Verify transaction was called with history record
			expect(mockRunTransaction).toHaveBeenCalled()
			const transactionCallback = mockRunTransaction.mock.calls[0][0]
			expect(transactionCallback).toBeDefined()

			// The transaction callback should have set the history record
			expect(mockTransaction.set).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					versionId: 'history-doc-123',
					changedFields: expect.arrayContaining(['pronouns', 'gender']),
					previousValues: expect.objectContaining({
						pronouns: 'she/her',
						gender: 'female'
					}),
					newValues: expect.objectContaining({
						pronouns: 'they/them',
						gender: 'non-binary'
					}),
					source: 'profile-settings'
				})
			)
		})

		it('should return empty updatedFields when no changes', async () => {
			// Arrange - same pronouns
			const sameDemographics = {pronouns: 'she/her'}

			// Act
			const result = await updateDemographicsWithHistoryFn({data: sameDemographics})

			// Assert
			expect(result.success).toBe(true)
			expect(result.updatedFields).toEqual([])
		})

		it('should store demographics in private subcollection for minors', async () => {
			// Arrange - user is a minor
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({...mockUserData, isMinor: true})
			})
			mockTransactionGet.mockResolvedValue({
				data: () => ({...mockUserData, isMinor: true})
			})
			const newDemographics = {pronouns: 'they/them'}

			// Act
			const result = await updateDemographicsWithHistoryFn({data: newDemographics})

			// Assert
			expect(result.success).toBe(true)
			expect(mockRunTransaction).toHaveBeenCalled()

			// Verify private subcollection was accessed for minor
			expect(mockFirestoreDoc.collection).toHaveBeenCalledWith('private')
			// Verify demographics doc was accessed
			expect(mockPrivateCollection.doc).toHaveBeenCalledWith('demographics')
		})

		it('should store demographics on main document for adults', async () => {
			// Arrange - user is an adult (isMinor: false)
			const newDemographics = {pronouns: 'they/them'}

			// Act
			const result = await updateDemographicsWithHistoryFn({data: newDemographics})

			// Assert
			expect(result.success).toBe(true)
			expect(mockRunTransaction).toHaveBeenCalled()

			// Verify main document was updated (not private subcollection)
			// The transaction.update should be called for the main user doc
			expect(mockTransaction.update).toHaveBeenCalled()
		})

		it('should throw ValidationError for invalid phone format', async () => {
			// Arrange
			const invalidDemographics = {
				emergencyContactName: 'Jane Doe',
				emergencyContactPhone: 'invalid-phone'
			}

			// Act & Assert
			await expect(updateDemographicsWithHistoryFn({data: invalidDemographics})).rejects.toThrow(
				ValidationError
			)
		})

		it('should throw ValidationError when emergency contact name without phone or email', async () => {
			// Arrange
			const invalidDemographics = {
				emergencyContactName: 'Jane Doe'
				// Missing phone and email
			}

			// Act & Assert
			await expect(updateDemographicsWithHistoryFn({data: invalidDemographics})).rejects.toThrow(
				ValidationError
			)
		})

		it('should accept emergency contact with phone only', async () => {
			// Arrange
			const validDemographics = {
				emergencyContactName: 'Jane Doe',
				emergencyContactPhone: '555-123-4567'
			}

			// Act
			const result = await updateDemographicsWithHistoryFn({data: validDemographics})

			// Assert
			expect(result.success).toBe(true)
		})

		it('should accept emergency contact with email only', async () => {
			// Arrange
			const validDemographics = {
				emergencyContactName: 'Jane Doe',
				emergencyContactEmail: 'jane@example.com'
			}

			// Act
			const result = await updateDemographicsWithHistoryFn({data: validDemographics})

			// Assert
			expect(result.success).toBe(true)
		})

		it('should throw NotFoundError when user does not exist', async () => {
			// Arrange
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => null
			})

			// Act & Assert
			await expect(
				updateDemographicsWithHistoryFn({data: {pronouns: 'they/them'}})
			).rejects.toThrow(NotFoundError)
		})

		it('should require authentication', async () => {
			// Act
			await updateDemographicsWithHistoryFn({data: {pronouns: 'they/them'}})

			// Assert
			expect(mockRequireAuth).toHaveBeenCalled()
		})

		it('should handle multiple field updates', async () => {
			// Arrange
			const multipleDemographics = {
				pronouns: 'they/them',
				gender: 'non-binary',
				dietaryRestrictions: ['vegan', 'gluten-free']
			}

			// Act
			const result = await updateDemographicsWithHistoryFn({data: multipleDemographics})

			// Assert
			expect(result.success).toBe(true)
			expect(result.updatedFields).toContain('pronouns')
			expect(result.updatedFields).toContain('gender')
			expect(result.updatedFields).toContain('dietaryRestrictions')
		})
	})
})
