import {vi} from 'vitest'

export const adminDb = {
	collection: vi.fn()
}

export const adminAuth = {
	getUserByEmail: vi.fn(),
	createUser: vi.fn()
}
