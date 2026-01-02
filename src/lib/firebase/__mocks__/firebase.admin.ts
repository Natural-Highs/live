import {vi} from 'vitest'

// Default mock user record
const mockUserRecord = {
	uid: 'test-uid',
	email: 'test@example.com',
	displayName: 'Test User',
	customClaims: {},
	tokensValidAfterTime: new Date().toISOString()
}

// Default decoded token
const mockDecodedToken = {
	uid: 'test-uid',
	email: 'test@example.com',
	admin: false,
	signedConsentForm: false
}

// Default Firestore snapshot
const mockSnapshot = {
	docs: [],
	empty: true,
	size: 0
}

export const adminAuth = {
	getUserByEmail: vi.fn().mockResolvedValue(mockUserRecord),
	createUser: vi.fn().mockResolvedValue(mockUserRecord),
	getUser: vi.fn().mockResolvedValue(mockUserRecord),
	setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
	revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
	verifyIdToken: vi.fn().mockResolvedValue(mockDecodedToken)
}

export const adminDb = {
	collection: vi.fn(() => ({
		doc: vi.fn().mockReturnThis(),
		get: vi.fn().mockResolvedValue(mockSnapshot),
		add: vi.fn().mockResolvedValue({id: 'new-doc-id'}),
		orderBy: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis()
	}))
}

// Export defaults for test customization
export const mockDefaults = {mockUserRecord, mockDecodedToken, mockSnapshot}
