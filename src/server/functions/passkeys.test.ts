/**
 * Tests for Passkey Server Functions
 *
 * Tests credential index pattern for O(1) lookup and transaction-based operations.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// Mock Firebase Admin
const mockRunTransaction = vi.fn()
const mockDocGet = vi.fn()
const mockDocSet = vi.fn()
const mockDocDelete = vi.fn()
const mockDocUpdate = vi.fn()
const mockCollectionGet = vi.fn()
const mockWhereChain = vi.fn()

// Create mock doc reference factory
const createMockDocRef = (path: string) => ({
	_path: path,
	get: mockDocGet,
	set: mockDocSet,
	delete: mockDocDelete,
	update: mockDocUpdate,
	collection: vi.fn((name: string) => createMockCollection(`${path}/${name}`))
})

// Create mock collection factory
const createMockCollection = (path: string) => ({
	_path: path,
	doc: (id: string) => createMockDocRef(`${path}/${id}`),
	get: mockCollectionGet,
	where: vi.fn(() => ({
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn(() => ({
			get: mockWhereChain
		}))
	})),
	orderBy: vi.fn(() => ({
		limit: vi.fn(() => ({
			get: mockWhereChain
		})),
		get: mockCollectionGet
	})),
	limit: vi.fn(() => ({
		get: mockWhereChain
	}))
})

vi.mock('@/lib/firebase/firebase.admin', () => ({
	adminDb: {
		collection: vi.fn((name: string) => createMockCollection(name)),
		runTransaction: mockRunTransaction
	}
}))

// Mock session module
vi.mock('@/lib/session', () => ({
	getSessionData: vi.fn().mockResolvedValue({userId: 'test-user'}),
	clearSession: vi.fn().mockResolvedValue(undefined),
	createPasskeySession: vi.fn().mockResolvedValue(undefined)
}))

// Mock auth middleware
vi.mock('@/server/middleware/auth', () => ({
	requireAuth: vi.fn().mockResolvedValue({uid: 'test-user-123', email: 'test@example.com'})
}))

// Mock session middleware
vi.mock('@/server/middleware/session', () => ({
	createSessionRevocation: vi.fn().mockResolvedValue(undefined)
}))

// Mock SimpleWebAuthn server
vi.mock('@simplewebauthn/server', () => ({
	generateRegistrationOptions: vi.fn().mockResolvedValue({
		challenge: 'test-challenge-base64',
		rp: {name: 'Test', id: 'localhost'},
		user: {id: new Uint8Array([1, 2, 3]), name: 'test', displayName: 'Test'}
	}),
	generateAuthenticationOptions: vi.fn().mockResolvedValue({
		challenge: 'test-auth-challenge'
	}),
	verifyRegistrationResponse: vi.fn().mockResolvedValue({
		verified: true,
		registrationInfo: {
			credential: {
				id: new Uint8Array([1, 2, 3, 4]),
				publicKey: new Uint8Array([5, 6, 7, 8]),
				counter: 0
			},
			aaguid: 'test-aaguid',
			credentialDeviceType: 'singleDevice',
			credentialBackedUp: false
		}
	}),
	verifyAuthenticationResponse: vi.fn().mockResolvedValue({
		verified: true,
		authenticationInfo: {newCounter: 1}
	})
}))

describe('passkey server functions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Set up environment
		vi.stubEnv('VITE_APP_URL', 'http://localhost:3000')
		vi.stubEnv('WEBAUTHN_RP_NAME', 'Natural Highs Test')
	})

	describe('credential index pattern - O(1) lookup', () => {
		it('should use passkeyCredentials collection for O(1) lookup during auth', async () => {
			const {adminDb} = await import('@/lib/firebase/firebase.admin')

			// Mock index document exists with userId
			mockDocGet.mockResolvedValueOnce({
				exists: true,
				data: () => ({userId: 'user-456', createdAt: '2025-01-01T00:00:00Z'})
			})

			// Mock credential document exists
			mockDocGet.mockResolvedValueOnce({
				exists: true,
				data: () => ({
					id: 'test-cred-id',
					publicKey: 'dGVzdC1wdWJsaWMta2V5',
					counter: 0,
					transports: ['internal']
				})
			})

			// Mock challenge query
			mockWhereChain.mockResolvedValueOnce({
				empty: false,
				docs: [
					{
						data: () => ({
							challenge: 'test-challenge',
							expiresAt: new Date(Date.now() + 300000).toISOString()
						}),
						ref: {delete: vi.fn()}
					}
				]
			})

			// Mock user document for session creation
			mockDocGet.mockResolvedValueOnce({
				exists: true,
				data: () => ({email: 'test@example.com', displayName: 'Test User'})
			})

			// Import and invoke the actual server function
			const {verifyPasskeyAuthenticationFn} = await import('./passkeys')

			// Create a mock auth response
			const authResponse = {
				id: 'test-cred-id',
				rawId: 'test-cred-id',
				type: 'public-key',
				response: {
					authenticatorData: 'YXV0aGVudGljYXRvckRhdGE',
					clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0',
					signature: 'c2lnbmF0dXJl'
				},
				authenticatorAttachment: 'platform',
				clientExtensionResults: {}
			}

			// Call the actual function - this verifies the O(1) pattern is used
			const _result = await verifyPasskeyAuthenticationFn({data: authResponse})

			// Verify passkeyCredentials was accessed (O(1) index lookup)
			expect(vi.mocked(adminDb.collection)).toHaveBeenCalledWith('passkeyCredentials')

			// Verify collectionGroup was NOT used (would be O(n))
			expect(vi.mocked(adminDb).collectionGroup).toBeUndefined()
		})

		it('should write credential and index atomically via transaction during registration', async () => {
			const {requireAuth} = await import('@/server/middleware/auth')
			vi.mocked(requireAuth).mockResolvedValue({uid: 'test-user-123', email: 'test@example.com'})

			// Mock existing credentials check (empty)
			mockCollectionGet.mockResolvedValueOnce({docs: []})

			// Mock challenge query
			mockWhereChain.mockResolvedValueOnce({
				empty: false,
				docs: [
					{
						data: () => ({
							challenge: 'test-challenge',
							expiresAt: new Date(Date.now() + 300000).toISOString()
						}),
						ref: {delete: vi.fn().mockResolvedValue(undefined)}
					}
				]
			})

			// Track transaction operations
			const transactionOps: Array<{op: string; path: string}> = []
			mockRunTransaction.mockImplementation(async (fn: (t: any) => Promise<void>) => {
				const mockTxn = {
					set: vi.fn((ref, _data) => {
						transactionOps.push({op: 'set', path: ref._path || 'unknown'})
					})
				}
				await fn(mockTxn)
			})

			// Import and invoke the actual server function
			const {verifyPasskeyRegistrationFn} = await import('./passkeys')

			const registrationResponse = {
				id: 'AQIDBA',
				rawId: 'AQIDBA',
				type: 'public-key',
				response: {
					clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0',
					attestationObject: 'o2NmbXRkbm9uZQ',
					transports: ['internal']
				},
				authenticatorAttachment: 'platform',
				clientExtensionResults: {}
			}

			await verifyPasskeyRegistrationFn({data: registrationResponse})

			// BEHAVIORAL ASSERTION: Transaction was called
			expect(mockRunTransaction).toHaveBeenCalledTimes(1)

			// BEHAVIORAL ASSERTION: Transaction wrote to both locations
			expect(transactionOps.length).toBeGreaterThanOrEqual(2)
			expect(transactionOps.some(op => op.path.includes('passkeys'))).toBe(true)
			expect(transactionOps.some(op => op.path.includes('passkeyCredentials'))).toBe(true)
		})

		it('should delete credential and index atomically via transaction during removal', async () => {
			const {requireAuth} = await import('@/server/middleware/auth')
			vi.mocked(requireAuth).mockResolvedValue({uid: 'test-user-123', email: 'test@example.com'})

			// Mock credential exists
			mockDocGet.mockResolvedValueOnce({
				exists: true,
				data: () => ({id: 'cred-to-remove'})
			})

			// Track transaction deletions
			const deleteOps: string[] = []
			mockRunTransaction.mockImplementation(async (fn: (t: any) => Promise<void>) => {
				const mockTxn = {
					delete: vi.fn(ref => {
						deleteOps.push(ref._path || 'unknown')
					}),
					set: vi.fn()
				}
				await fn(mockTxn)
			})

			// Mock remaining passkeys check
			mockWhereChain.mockResolvedValueOnce({empty: false})

			// Import and invoke the actual server function
			const {removePasskeyFn} = await import('./passkeys')

			await removePasskeyFn({data: {credentialId: 'cred-to-remove'}})

			// BEHAVIORAL ASSERTION: Transaction was called
			expect(mockRunTransaction).toHaveBeenCalledTimes(1)

			// BEHAVIORAL ASSERTION: Transaction deleted from both locations
			expect(deleteOps.length).toBeGreaterThanOrEqual(2)
		})

		it('should clean up orphaned index when credential is missing during auth', async () => {
			// Mock index exists
			const mockIndexDeleteFn = vi.fn()
			mockDocGet.mockResolvedValueOnce({
				exists: true,
				data: () => ({userId: 'user-789', createdAt: '2025-01-01T00:00:00Z'}),
				ref: {delete: mockIndexDeleteFn}
			})

			// Mock credential doesn't exist (orphaned state)
			mockDocGet.mockResolvedValueOnce({
				exists: false
			})

			const {verifyPasskeyAuthenticationFn} = await import('./passkeys')

			const authResponse = {
				id: 'orphaned-cred-id',
				rawId: 'orphaned-cred-id',
				type: 'public-key',
				response: {
					authenticatorData: 'YXV0aGVudGljYXRvckRhdGE',
					clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0In0',
					signature: 'c2lnbmF0dXJl'
				},
				authenticatorAttachment: 'platform',
				clientExtensionResults: {}
			}

			// Should throw error and clean up orphaned index
			await expect(verifyPasskeyAuthenticationFn({data: authResponse})).rejects.toThrow()

			// BEHAVIORAL ASSERTION: Orphaned index was deleted
			expect(mockIndexDeleteFn).toHaveBeenCalled()
		})
	})

	describe('PasskeyCredentialIndex type', () => {
		it('should have required userId and createdAt fields matching the interface', async () => {
			// Type-level test - if this compiles, the interface is correct
			const index: import('@/server/types/passkeys').PasskeyCredentialIndex = {
				userId: 'test-user',
				createdAt: new Date().toISOString()
			}

			// Verify required fields are present and have correct types
			expect(index.userId).toBe('test-user')
			expect(typeof index.userId).toBe('string')
			expect(index.createdAt).toBeDefined()
			expect(typeof index.createdAt).toBe('string')

			// Verify it's a valid ISO date string
			const parsedDate = new Date(index.createdAt)
			expect(parsedDate.toISOString()).toBe(index.createdAt)
		})
	})
})
