/**
 * User Factory for MSW Unit Tests
 *
 * Provides mock user and profile data for unit tests using MSW.
 *
 * @example
 * ```typescript
 * import {server} from '@/mocks/server'
 * import {http, HttpResponse} from 'msw'
 * import {createMockUser, createProfileResponse} from '@/mocks/factories'
 *
 * beforeEach(() => {
 *   server.use(
 *     http.get('/api/profile', () =>
 *       HttpResponse.json(createProfileResponse(createMockUser({
 *         displayName: 'Test User',
 *         email: 'test@example.com'
 *       })))
 *     )
 *   )
 * })
 * ```
 */

export interface MockUser {
	uid: string
	email: string
	displayName: string
	photoURL: string | null
	dateOfBirth: string | null
	pronouns: string | null
	profileComplete: boolean
	createdAt: string
	updatedAt: string
}

export interface MockUserClaims {
	admin: boolean
	signedConsentForm: boolean
	passkeyEnabled: boolean
	profileComplete: boolean
	isMinor: boolean
}

/**
 * Create a mock user with sensible defaults.
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
	const now = new Date().toISOString()

	return {
		uid: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		email: 'test@example.com',
		displayName: 'Test User',
		photoURL: null,
		dateOfBirth: '1990-01-15',
		pronouns: null,
		profileComplete: true,
		createdAt: now,
		updatedAt: now,
		...overrides
	}
}

/**
 * Create mock user claims.
 */
export function createMockUserClaims(overrides: Partial<MockUserClaims> = {}): MockUserClaims {
	return {
		admin: false,
		signedConsentForm: true,
		passkeyEnabled: false,
		profileComplete: true,
		isMinor: false,
		...overrides
	}
}

/**
 * Create an admin user.
 */
export function createMockAdminUser(overrides: Partial<MockUser> = {}): MockUser {
	return createMockUser({
		email: 'admin@naturalhighs.org',
		displayName: 'Admin User',
		...overrides
	})
}

/**
 * Create a profile API response.
 */
export function createProfileResponse(user: MockUser | null = null) {
	if (!user) {
		return {success: true, profile: null}
	}
	return {
		success: true,
		profile: user
	}
}

/**
 * Create a users list API response.
 */
export function createUsersListResponse(users: MockUser[] = []) {
	return {
		success: true,
		users
	}
}

/**
 * Create a user error response.
 */
export function createUserErrorResponse(error: string, code = 'USER_ERROR') {
	return {
		success: false,
		error,
		code
	}
}
