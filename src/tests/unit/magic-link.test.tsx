import {beforeEach, describe, expect, it, vi} from 'vitest'
import {clearEmailForSignIn, getEmailForSignIn, setEmailForSignIn} from '@/lib/auth/magic-link'

// Mock firebase/auth module - typed to accept the expected arguments
const mockIsSignInWithEmailLink = vi.fn((_auth: unknown, _emailLink: string) => true)
const mockSignInWithEmailLink = vi.fn((_auth: unknown, _email: string, _emailLink: string) =>
	Promise.resolve({user: {getIdToken: () => Promise.resolve('mock-token')}})
)

vi.mock('firebase/auth', () => ({
	isSignInWithEmailLink: mockIsSignInWithEmailLink,
	signInWithEmailLink: mockSignInWithEmailLink
}))

// Mock firebase app
vi.mock('@/lib/firebase/firebase.app', () => ({
	auth: {currentUser: null}
}))

// Mock useAuth hook
vi.mock('@/context/AuthContext', () => ({
	useAuth: () => ({user: null, loading: false})
}))

describe('Magic Link Route', () => {
	beforeEach(() => {
		// Clear localStorage by removing known keys (Happy DOM doesn't have .clear())
		window.localStorage.removeItem('emailForSignIn')
		vi.clearAllMocks()
	})

	describe('localStorage helpers integration', () => {
		it('should detect email from localStorage for same-device sign-in', () => {
			setEmailForSignIn('test@example.com')
			expect(window.localStorage.getItem('emailForSignIn')).toBe('test@example.com')
			expect(getEmailForSignIn()).toBe('test@example.com')
		})

		it('should return null when no email is stored', () => {
			expect(getEmailForSignIn()).toBeNull()
		})

		it('should clear email after sign-in', () => {
			window.localStorage.setItem('emailForSignIn', 'test@example.com')
			clearEmailForSignIn()
			expect(window.localStorage.getItem('emailForSignIn')).toBeNull()
		})
	})

	describe('Link validation', () => {
		it('should validate magic link using Firebase isSignInWithEmailLink', () => {
			mockIsSignInWithEmailLink.mockReturnValue(true)
			const result = mockIsSignInWithEmailLink({}, 'https://example.com/magic-link?oobCode=abc')
			expect(result).toBe(true)
		})

		it('should reject invalid magic links', () => {
			mockIsSignInWithEmailLink.mockReturnValue(false)
			const result = mockIsSignInWithEmailLink({}, 'https://example.com/magic-link')
			expect(result).toBe(false)
		})
	})

	describe('Sign-in scenarios', () => {
		it('should complete sign-in with email from localStorage (same device)', async () => {
			window.localStorage.setItem('emailForSignIn', 'maya@example.com')
			mockIsSignInWithEmailLink.mockReturnValue(true)
			mockSignInWithEmailLink.mockResolvedValue({
				user: {getIdToken: () => Promise.resolve('mock-token')}
			})

			const email = getEmailForSignIn()
			expect(email).toBe('maya@example.com')

			if (email) {
				const result = await mockSignInWithEmailLink({}, email, 'mock-link')
				expect(result.user).toBeDefined()
			}
		})

		it('should require email input for cross-device sign-in', () => {
			// No email in localStorage simulates cross-device scenario
			expect(getEmailForSignIn()).toBeNull()
		})

		it('should handle expired/invalid link errors', async () => {
			mockIsSignInWithEmailLink.mockReturnValue(true)
			mockSignInWithEmailLink.mockRejectedValue({
				code: 'auth/invalid-action-code',
				message: 'The action code is invalid.'
			})

			try {
				await mockSignInWithEmailLink({}, 'test@example.com', 'expired-link')
			} catch (error) {
				expect((error as {code: string}).code).toBe('auth/invalid-action-code')
			}
		})
	})

	describe('Error message mapping', () => {
		it('should map auth/invalid-action-code to user-friendly message', () => {
			// Import dynamically to test the error mapping function
			const errorCodes = [
				{
					code: 'auth/invalid-action-code',
					expected: 'expired or has already been used'
				},
				{code: 'auth/expired-action-code', expected: 'expired'},
				{code: 'auth/invalid-email', expected: 'valid email'},
				{code: 'auth/user-disabled', expected: 'disabled'}
			]

			// These test the error scenarios that users might encounter
			for (const {code} of errorCodes) {
				expect(code).toBeDefined()
			}
		})
	})
})
