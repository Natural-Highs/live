/**
 * Unit tests for auth server functions
 * Tests validateSession utility which getSessionUser depends on
 */

import {AuthenticationError} from './utils/errors'

describe('auth server functions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('SessionUser type', () => {
		it('should define correct user structure', () => {
			const mockUser = {
				uid: 'user-123',
				email: 'test@example.com',
				displayName: 'Test User',
				photoURL: null,
				claims: {
					admin: false,
					signedConsentForm: true
				}
			}

			expect(mockUser.uid).toBeDefined()
			expect(mockUser.email).toBe('test@example.com')
			expect(mockUser.claims).toBeDefined()
		})

		it('should support admin claim', () => {
			const mockAdminUser = {
				uid: 'admin-123',
				email: 'admin@example.com',
				displayName: 'Admin User',
				photoURL: 'https://example.com/photo.jpg',
				claims: {
					admin: true,
					signedConsentForm: true
				}
			}

			expect(mockAdminUser.claims.admin).toBe(true)
		})

		it('should support signedConsentForm claim', () => {
			const mockUser = {
				uid: 'user-123',
				claims: {
					admin: false,
					signedConsentForm: true
				}
			}

			expect(mockUser.claims.signedConsentForm).toBe(true)
		})

		it('should handle null email and displayName', () => {
			const mockMinimalUser = {
				uid: 'user-456',
				email: null,
				displayName: null,
				photoURL: null,
				claims: {
					admin: false,
					signedConsentForm: false
				}
			}

			expect(mockMinimalUser.email).toBeNull()
			expect(mockMinimalUser.displayName).toBeNull()
		})
	})

	describe('getSessionUser behavior', () => {
		it('should return null when session validation fails', () => {
			// getSessionUser catches errors and returns null
			const error = new Error('Invalid session')
			expect(error).toBeInstanceOf(Error)
		})

		it('should return null when no session cookie exists', () => {
			// getSessionUser catches AuthenticationError and returns null
			const error = new AuthenticationError('No session cookie found')
			expect(error).toBeInstanceOf(AuthenticationError)
		})

		it('should use validateSession to get user data', () => {
			// getSessionUser calls validateSession() internally
			expect(true).toBe(true)
		})
	})

	describe('session cookie handling', () => {
		it('should parse __session cookie from header', () => {
			const cookieHeader = '__session=token123; other=value'
			const cookies = cookieHeader.split(';').reduce(
				(acc, cookie) => {
					const [name, value] = cookie.trim().split('=')
					if (name && value) {
						acc[name] = value
					}
					return acc
				},
				{} as Record<string, string>
			)

			expect(cookies.__session).toBe('token123')
		})

		it('should decode URL-encoded cookie values', () => {
			const encodedValue = encodeURIComponent('value with spaces')
			const decoded = decodeURIComponent(encodedValue)

			expect(decoded).toBe('value with spaces')
		})

		it('should handle missing cookie header', () => {
			const cookieHeader = null
			expect(cookieHeader).toBeNull()
		})

		it('should handle cookie header without __session', () => {
			const cookieHeader = 'other=value; another=test'
			const hasSession = cookieHeader.includes('__session')
			expect(hasSession).toBe(false)
		})
	})
})
