import {getRequest} from '@tanstack/react-start/server'
import {auth} from '../../../lib/firebase/firebase'
import type {SessionUser} from '../auth'
import {AuthenticationError} from './errors'

/**
 * Validate session cookie and return authenticated user
 * Reads __session cookie from request and verifies with Firebase Admin SDK
 */
export async function validateSession(): Promise<SessionUser> {
	const request = getRequest()
	const cookieHeader = request.headers.get('cookie')

	if (!cookieHeader) {
		throw new AuthenticationError('No session cookie found')
	}

	// Parse __session cookie
	const cookies = parseCookies(cookieHeader)
	const sessionCookie = cookies.__session

	if (!sessionCookie) {
		throw new AuthenticationError('No session cookie found')
	}

	try {
		// Verify session cookie with Firebase Admin SDK
		const decodedToken = await auth.verifySessionCookie(sessionCookie, true)

		return {
			uid: decodedToken.uid,
			email: decodedToken.email ?? null,
			displayName: decodedToken.name ?? null,
			photoURL: decodedToken.picture ?? null,
			claims: {
				admin: decodedToken.admin === true,
				signedConsentForm: decodedToken.signedConsentForm === true
			}
		}
	} catch (_error) {
		throw new AuthenticationError('Invalid or expired session cookie')
	}
}

/**
 * Validate session and require admin privileges
 */
export async function requireAdmin(): Promise<SessionUser> {
	const user = await validateSession()

	if (!user.claims.admin) {
		throw new AuthenticationError('Admin privileges required')
	}

	return user
}

/**
 * Validate session and require consent form signed
 */
export async function requireConsent(): Promise<SessionUser> {
	const user = await validateSession()

	if (!user.claims.signedConsentForm) {
		throw new AuthenticationError('Consent form must be signed')
	}

	return user
}

/**
 * Parse cookie header into key-value pairs
 */
function parseCookies(cookieHeader: string): Record<string, string> {
	const cookies: Record<string, string> = {}

	cookieHeader.split(';').forEach(cookie => {
		const [name, value] = cookie.trim().split('=')
		if (name && value) {
			cookies[name] = decodeURIComponent(value)
		}
	})

	return cookies
}
