/**
 * Profile Server Functions Tests
 *
 * Tests for:
 * - createProfileFn (minimal profile creation)
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Use vi.hoisted for mock functions that need to be available in vi.mock factories
const {mockCreateServerFn} = vi.hoisted(() => ({
	mockCreateServerFn: vi.fn()
}))

// Mock @tanstack/react-start to capture handler functions and simulate inputValidator chain
vi.mock('@tanstack/react-start', () => ({
	createServerFn: () => ({
		inputValidator: (validator: (d: unknown) => unknown) => ({
			handler: (fn: (args: {data: unknown}) => unknown) => {
				mockCreateServerFn(fn)
				// Return a function that runs validator first, then handler
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
	collection: vi.fn()
}

const mockFirestoreCollection = {
	doc: vi.fn(() => mockFirestoreDoc)
}

vi.mock('@/lib/firebase/firebase.admin', () => ({
	adminAuth: {
		getUser: vi.fn(),
		setCustomUserClaims: vi.fn()
	},
	adminDb: {
		collection: vi.fn(() => mockFirestoreCollection)
	},
	serverTimestamp: vi.fn(() => ({_serverTimestamp: true}))
}))

// Mock session module
vi.mock('@/lib/session', () => ({
	getSessionData: vi.fn(),
	updateSession: vi.fn()
}))

// Mock middleware module
vi.mock('@/server/middleware/auth', () => ({
	requireAuth: vi.fn()
}))

import type {Mock} from 'vitest'
import {adminAuth, adminDb} from '@/lib/firebase/firebase.admin'
import {getSessionData, updateSession} from '@/lib/session'
import {requireAuth} from '@/server/middleware/auth'
import {NotFoundError, ValidationError} from './utils/errors'

// Cast mocks
const mockRequireAuth = requireAuth as Mock
const mockGetSessionData = getSessionData as Mock
const mockUpdateSession = updateSession as Mock
const mockGetUser = (adminAuth as {getUser: Mock}).getUser
const mockSetCustomUserClaims = (adminAuth as {setCustomUserClaims: Mock}).setCustomUserClaims
const mockAdminDbCollection = (adminDb as {collection: Mock}).collection

// Import after mocking
import {
	checkProfileCompleteFn,
	createProfileFn,
	getDemographicsFn,
	getProfileFn,
	updateDemographicsFn
} from './profile'

describe('profile server functions', () => {
	const mockUser = {
		uid: 'user-123',
		email: 'test@example.com',
		displayName: 'Test User',
		photoURL: null,
		claims: {}
	}

	beforeEach(() => {
		vi.resetAllMocks()

		// Default mocks
		mockRequireAuth.mockResolvedValue(mockUser)
		mockGetSessionData.mockResolvedValue({
			userId: 'user-123',
			email: 'test@example.com',
			claims: {}
		})
		mockUpdateSession.mockResolvedValue(undefined)
		mockGetUser.mockResolvedValue({customClaims: {}})
		mockSetCustomUserClaims.mockResolvedValue(undefined)

		// Firestore mocks
		mockAdminDbCollection.mockReturnValue(mockFirestoreCollection)
		mockFirestoreCollection.doc.mockReturnValue(mockFirestoreDoc)
		mockFirestoreDoc.set.mockResolvedValue(undefined)
		mockFirestoreDoc.update.mockResolvedValue(undefined)
		mockFirestoreDoc.get.mockResolvedValue({
			data: () => ({
				uid: 'user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				dateOfBirth: '1990-01-15',
				isMinor: false,
				profileComplete: true
			})
		})
	})

	describe('createProfileFn', () => {
		const validInput = {
			displayName: 'Maya',
			dateOfBirth: '1990-05-15'
		}

		it('should create profile with correct data', async () => {
			// Act
			const result = await createProfileFn({data: validInput})

			// Assert
			expect(result.success).toBe(true)
			expect(result.displayName).toBe('Maya')
			expect(result.isMinor).toBe(false)
		})

		it('should calculate isMinor as true for users under 18', async () => {
			// Arrange - create a date of birth that makes user a minor
			const today = new Date()
			const minorDob = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate())
			const minorInput = {
				displayName: 'Young User',
				dateOfBirth: minorDob.toISOString().split('T')[0]
			}

			// Act
			const result = await createProfileFn({data: minorInput})

			// Assert
			expect(result.isMinor).toBe(true)
		})

		it('should calculate isMinor as false for users 18 or older', async () => {
			// Arrange
			const today = new Date()
			const adultDob = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate())
			const adultInput = {
				displayName: 'Adult User',
				dateOfBirth: adultDob.toISOString().split('T')[0]
			}

			// Act
			const result = await createProfileFn({data: adultInput})

			// Assert
			expect(result.isMinor).toBe(false)
		})

		it('should save profile to Firestore', async () => {
			// Act
			await createProfileFn({data: validInput})

			// Assert
			expect(mockAdminDbCollection).toHaveBeenCalledWith('users')
			expect(mockFirestoreCollection.doc).toHaveBeenCalledWith('user-123')
			expect(mockFirestoreDoc.set).toHaveBeenCalledWith(
				expect.objectContaining({
					uid: 'user-123',
					displayName: 'Maya',
					dateOfBirth: '1990-05-15',
					profileComplete: true
				}),
				{merge: true}
			)
		})

		it('should update Firebase custom claims with profileComplete and isMinor', async () => {
			// Act
			await createProfileFn({data: validInput})

			// Assert
			expect(mockSetCustomUserClaims).toHaveBeenCalledWith(
				'user-123',
				expect.objectContaining({
					profileComplete: true,
					isMinor: false
				})
			)
		})

		it('should update session with new claims', async () => {
			// Act
			await createProfileFn({data: validInput})

			// Assert
			expect(mockUpdateSession).toHaveBeenCalledWith(
				expect.objectContaining({
					displayName: 'Maya',
					claims: expect.objectContaining({
						profileComplete: true,
						isMinor: false
					})
				})
			)
		})

		it('should reject when displayName is empty', async () => {
			// Arrange
			const invalidInput = {...validInput, displayName: ''}

			// Act & Assert
			await expect(createProfileFn({data: invalidInput})).rejects.toThrow(ValidationError)
		})

		it('should reject when dateOfBirth is missing', async () => {
			// Arrange
			const invalidInput = {...validInput, dateOfBirth: ''}

			// Act & Assert
			await expect(createProfileFn({data: invalidInput})).rejects.toThrow(ValidationError)
		})

		it('should reject when dateOfBirth is in the future', async () => {
			// Arrange
			const futureDate = new Date()
			futureDate.setFullYear(futureDate.getFullYear() + 1)
			const invalidInput = {
				...validInput,
				dateOfBirth: futureDate.toISOString().split('T')[0]
			}

			// Act & Assert
			await expect(createProfileFn({data: invalidInput})).rejects.toThrow(ValidationError)
		})

		it('should trim whitespace from displayName', async () => {
			// Arrange
			const inputWithWhitespace = {
				...validInput,
				displayName: '  Maya  '
			}

			// Act
			const result = await createProfileFn({data: inputWithWhitespace})

			// Assert
			expect(result.displayName).toBe('Maya')
		})

		it('should require authentication', async () => {
			// Act
			await createProfileFn({data: validInput})

			// Assert
			expect(mockRequireAuth).toHaveBeenCalled()
		})
	})

	describe('getProfileFn', () => {
		it('should return profile data when user exists', async () => {
			// Act
			const result = await getProfileFn()

			// Assert
			expect(result).toEqual({
				uid: 'user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				dateOfBirth: '1990-01-15',
				isMinor: false,
				profileComplete: true
			})
		})

		it('should return null when user document does not exist', async () => {
			// Arrange
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => null
			})

			// Act
			const result = await getProfileFn()

			// Assert
			expect(result).toBeNull()
		})

		it('should require authentication', async () => {
			// Act
			await getProfileFn()

			// Assert
			expect(mockRequireAuth).toHaveBeenCalled()
		})
	})

	describe('updateDemographicsFn', () => {
		const validDemographics = {
			pronouns: 'they/them',
			emergencyContactName: 'Jane Doe',
			emergencyContactPhone: '555-123-4567'
		}

		it('should store demographics in user document for adults', async () => {
			// Arrange - user is not a minor
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({isMinor: false})
			})

			// Act
			const result = await updateDemographicsFn({data: validDemographics})

			// Assert
			expect(result.success).toBe(true)
			expect(mockFirestoreDoc.update).toHaveBeenCalledWith(
				expect.objectContaining({
					pronouns: 'they/them',
					emergencyContactName: 'Jane Doe',
					emergencyContactPhone: '555-123-4567'
				})
			)
		})

		it('should store demographics in private subcollection for minors (NFR9)', async () => {
			// Arrange - user is a minor
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({isMinor: true})
			})

			const privateDocMock = {
				set: vi.fn().mockResolvedValue(undefined)
			}
			const privateCollectionMock = {
				doc: vi.fn(() => privateDocMock)
			}
			mockFirestoreDoc.collection.mockReturnValue(privateCollectionMock)

			// Act
			const result = await updateDemographicsFn({data: validDemographics})

			// Assert
			expect(result.success).toBe(true)
			expect(mockFirestoreDoc.collection).toHaveBeenCalledWith('private')
			expect(privateCollectionMock.doc).toHaveBeenCalledWith('demographics')
			expect(privateDocMock.set).toHaveBeenCalledWith(
				expect.objectContaining({
					pronouns: 'they/them',
					emergencyContactName: 'Jane Doe',
					emergencyContactPhone: '555-123-4567'
				}),
				{merge: true}
			)
		})

		it('should throw NotFoundError when user does not exist', async () => {
			// Arrange
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => null
			})

			// Act & Assert
			await expect(updateDemographicsFn({data: validDemographics})).rejects.toThrow(NotFoundError)
		})

		it('should validate emergency contact requires phone or email when name provided', async () => {
			// Arrange
			const invalidDemographics = {
				emergencyContactName: 'Jane Doe'
				// Missing both phone and email
			}
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({isMinor: false})
			})

			// Act & Assert
			await expect(updateDemographicsFn({data: invalidDemographics})).rejects.toThrow(
				ValidationError
			)
		})

		it('should accept emergency contact with phone only', async () => {
			// Arrange
			const demographicsWithPhone = {
				emergencyContactName: 'Jane Doe',
				emergencyContactPhone: '555-123-4567'
			}
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({isMinor: false})
			})

			// Act
			const result = await updateDemographicsFn({data: demographicsWithPhone})

			// Assert
			expect(result.success).toBe(true)
		})

		it('should accept emergency contact with email only', async () => {
			// Arrange
			const demographicsWithEmail = {
				emergencyContactName: 'Jane Doe',
				emergencyContactEmail: 'jane@example.com'
			}
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({isMinor: false})
			})

			// Act
			const result = await updateDemographicsFn({data: demographicsWithEmail})

			// Assert
			expect(result.success).toBe(true)
		})

		it('should require authentication', async () => {
			// Arrange
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({isMinor: false})
			})

			// Act
			await updateDemographicsFn({data: validDemographics})

			// Assert
			expect(mockRequireAuth).toHaveBeenCalled()
		})
	})

	describe('getDemographicsFn', () => {
		it('should retrieve demographics from user document for adults', async () => {
			// Arrange
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({
					isMinor: false,
					pronouns: 'she/her',
					emergencyContactName: 'John Doe'
				})
			})

			// Act
			const result = await getDemographicsFn()

			// Assert
			expect(result.isMinor).toBe(false)
			expect(result.demographics.pronouns).toBe('she/her')
			expect(result.demographics.emergencyContactName).toBe('John Doe')
		})

		it('should retrieve demographics from private subcollection for minors', async () => {
			// Arrange - user is a minor
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({isMinor: true})
			})

			const privateDocMock = {
				get: vi.fn().mockResolvedValue({
					data: () => ({
						pronouns: 'they/them',
						gender: 'non-binary'
					})
				})
			}
			const privateCollectionMock = {
				doc: vi.fn(() => privateDocMock)
			}
			mockFirestoreDoc.collection.mockReturnValue(privateCollectionMock)

			// Act
			const result = await getDemographicsFn()

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
			await expect(getDemographicsFn()).rejects.toThrow(NotFoundError)
		})

		it('should return empty demographics when none exist for minor', async () => {
			// Arrange
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({isMinor: true})
			})

			const privateDocMock = {
				get: vi.fn().mockResolvedValue({
					data: () => null
				})
			}
			const privateCollectionMock = {
				doc: vi.fn(() => privateDocMock)
			}
			mockFirestoreDoc.collection.mockReturnValue(privateCollectionMock)

			// Act
			const result = await getDemographicsFn()

			// Assert
			expect(result.isMinor).toBe(true)
			// When no demographics doc exists, all fields should be null or undefined
			expect(result.demographics.pronouns).toBeFalsy()
		})

		it('should require authentication', async () => {
			// Act
			await getDemographicsFn()

			// Assert
			expect(mockRequireAuth).toHaveBeenCalled()
		})
	})

	describe('checkProfileCompleteFn', () => {
		it('should return isComplete true when session has profileComplete claim', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				displayName: 'Maya',
				claims: {profileComplete: true}
			})

			// Act
			const result = await checkProfileCompleteFn()

			// Assert
			expect(result.isComplete).toBe(true)
			expect(result.displayName).toBe('Maya')
		})

		it('should return isComplete false when no userId in session', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({})

			// Act
			const result = await checkProfileCompleteFn()

			// Assert
			expect(result.isComplete).toBe(false)
			expect(result.displayName).toBeNull()
		})

		it('should check Firestore when session claim is not set', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				claims: {} // No profileComplete claim
			})
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => ({
					profileComplete: true,
					displayName: 'Maya from Firestore'
				})
			})

			// Act
			const result = await checkProfileCompleteFn()

			// Assert
			expect(result.isComplete).toBe(true)
			expect(result.displayName).toBe('Maya from Firestore')
		})

		it('should return isComplete false when Firestore has no profile', async () => {
			// Arrange
			mockGetSessionData.mockResolvedValue({
				userId: 'user-123',
				claims: {}
			})
			mockFirestoreDoc.get.mockResolvedValue({
				data: () => null
			})

			// Act
			const result = await checkProfileCompleteFn()

			// Assert
			expect(result.isComplete).toBe(false)
			expect(result.displayName).toBeNull()
		})
	})
})
