import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
	clearEmailForSignIn,
	getEmailForSignIn,
	MAGIC_LINK_EMAIL_KEY,
	setEmailForSignIn
} from './magic-link'

describe('magic-link localStorage helpers', () => {
	beforeEach(() => {
		// Clear localStorage by removing known keys (Happy DOM doesn't have .clear())
		window.localStorage.removeItem('emailForSignIn')
		vi.clearAllMocks()
	})

	describe('MAGIC_LINK_EMAIL_KEY', () => {
		it('should use Firebase convention key', () => {
			expect(MAGIC_LINK_EMAIL_KEY).toBe('emailForSignIn')
		})
	})

	describe('setEmailForSignIn', () => {
		it('should store email in localStorage', () => {
			setEmailForSignIn('test@example.com')
			expect(window.localStorage.getItem('emailForSignIn')).toBe('test@example.com')
		})

		it('should handle empty email', () => {
			setEmailForSignIn('')
			expect(window.localStorage.getItem('emailForSignIn')).toBe('')
		})
	})

	describe('getEmailForSignIn', () => {
		it('should retrieve email from localStorage', () => {
			window.localStorage.setItem('emailForSignIn', 'stored@example.com')
			const result = getEmailForSignIn()
			expect(result).toBe('stored@example.com')
		})

		it('should return null when no email stored', () => {
			const result = getEmailForSignIn()
			expect(result).toBeNull()
		})
	})

	describe('clearEmailForSignIn', () => {
		it('should remove email from localStorage', () => {
			window.localStorage.setItem('emailForSignIn', 'test@example.com')
			clearEmailForSignIn()
			expect(window.localStorage.getItem('emailForSignIn')).toBeNull()
		})
	})
})
