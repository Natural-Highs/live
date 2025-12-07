// This file runs before any test files are loaded
import {vi} from 'vitest'

// Mock Firebase Admin module globally before any imports
vi.mock('$lib/firebase/firebase.admin', () => ({
	adminDb: {
		collection: vi.fn()
	},
	adminAuth: {
		getUserByEmail: vi.fn(),
		createUser: vi.fn()
	}
}))
