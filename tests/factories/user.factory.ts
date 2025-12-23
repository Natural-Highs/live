/**
 * User Data Factory
 *
 * Generates test user data for E2E and integration tests.
 * Uses faker for realistic random data with override support.
 *
 * Pattern: data-factories.md
 *
 * Usage:
 *   const user = createUser({ email: 'specific@example.com' })
 *   const users = createUsers(5)
 */

import {faker} from '@faker-js/faker'

/**
 * User entity matching Firebase Auth user structure
 */
export interface TestUser {
	uid: string
	email: string
	displayName: string
	photoURL: string | null
	emailVerified: boolean
	createdAt: string
}

/**
 * Firebase ID token claims
 */
export interface TokenClaims {
	admin: boolean
	signedConsentForm: boolean
}

/**
 * Full authenticated user with token
 */
export interface AuthenticatedTestUser extends TestUser {
	idToken: string
	refreshToken: string
	claims: TokenClaims
}

/**
 * Create a single test user with optional overrides
 *
 * @example
 * const user = createUser()
 * const specificUser = createUser({ email: 'maya@example.com', displayName: 'Maya' })
 */
export function createUser(overrides: Partial<TestUser> = {}): TestUser {
	return {
		uid: faker.string.uuid(),
		email: faker.internet.email(),
		displayName: faker.person.fullName(),
		photoURL: faker.image.avatar(),
		emailVerified: true,
		createdAt: faker.date.recent().toISOString(),
		...overrides
	}
}

/**
 * Create multiple test users
 *
 * @example
 * const users = createUsers(5)
 */
export function createUsers(count: number): TestUser[] {
	return Array.from({length: count}, () => createUser())
}

/**
 * Create an authenticated user with ID token
 *
 * @example
 * const authUser = createAuthenticatedUser({ claims: { admin: true } })
 */
export function createAuthenticatedUser(
	overrides: Partial<AuthenticatedTestUser> = {}
): AuthenticatedTestUser {
	const user = createUser(overrides)

	return {
		...user,
		idToken: `mock-id-token-${faker.string.alphanumeric(32)}`,
		refreshToken: `mock-refresh-token-${faker.string.alphanumeric(32)}`,
		claims: {
			admin: false,
			signedConsentForm: false,
			...overrides.claims
		},
		...overrides
	}
}

/**
 * Create a Maya persona user (returning user from story context)
 * Maya is a returning user who needs fast event check-in
 */
export function createMayaUser(overrides: Partial<TestUser> = {}): TestUser {
	return createUser({
		displayName: 'Maya',
		email: 'maya@example.com',
		emailVerified: true,
		...overrides
	})
}

/**
 * Create a guest user (not yet registered)
 */
export function createGuestUser(): Partial<TestUser> {
	return {
		email: faker.internet.email(),
		displayName: faker.person.fullName()
	}
}

/**
 * Create an admin user with admin claims
 */
export function createAdminUser(
	overrides: Partial<AuthenticatedTestUser> = {}
): AuthenticatedTestUser {
	return createAuthenticatedUser({
		displayName: 'Admin User',
		claims: {
			admin: true,
			signedConsentForm: true
		},
		...overrides
	})
}

/**
 * Magic link request data
 */
export interface MagicLinkRequest {
	email: string
	requestedAt: string
}

/**
 * Create magic link request data
 */
export function createMagicLinkRequest(
	overrides: Partial<MagicLinkRequest> = {}
): MagicLinkRequest {
	return {
		email: faker.internet.email(),
		requestedAt: new Date().toISOString(),
		...overrides
	}
}

/**
 * Firebase Auth error codes for testing error scenarios
 */
export const FIREBASE_AUTH_ERRORS = {
	EXPIRED_OOB_CODE: 'EXPIRED_OOB_CODE',
	INVALID_OOB_CODE: 'INVALID_OOB_CODE',
	INVALID_ACTION_CODE: 'INVALID_ACTION_CODE',
	EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',
	USER_DISABLED: 'USER_DISABLED',
	INVALID_EMAIL: 'INVALID_EMAIL'
} as const

export type FirebaseAuthError = (typeof FIREBASE_AUTH_ERRORS)[keyof typeof FIREBASE_AUTH_ERRORS]
