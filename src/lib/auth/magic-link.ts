/**
 * Magic link authentication utilities
 * Uses Firebase convention for localStorage key
 */

/** Firebase convention key for storing email during magic link flow */
export const MAGIC_LINK_EMAIL_KEY = 'emailForSignIn'

/**
 * Store email in localStorage for same-device magic link completion
 * @param email - The email address to store
 */
export function setEmailForSignIn(email: string): void {
	if (typeof window === 'undefined') {
		return
	}
	window.localStorage.setItem(MAGIC_LINK_EMAIL_KEY, email)
}

/**
 * Retrieve stored email from localStorage
 * @returns The stored email or null if not found
 */
export function getEmailForSignIn(): string | null {
	if (typeof window === 'undefined') {
		return null
	}
	return window.localStorage.getItem(MAGIC_LINK_EMAIL_KEY)
}

/**
 * Clear stored email from localStorage after successful sign-in
 */
export function clearEmailForSignIn(): void {
	if (typeof window === 'undefined') {
		return
	}
	window.localStorage.removeItem(MAGIC_LINK_EMAIL_KEY)
}
