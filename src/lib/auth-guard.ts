import {redirect} from '@tanstack/react-router'
import type {SessionAuthContext} from '@/routes/__root'

interface BeforeLoadContext {
	context: {
		auth: SessionAuthContext
	}
	location: {pathname: string}
}

export interface AuthGuardOptions {
	requireAuth?: boolean
	requireConsent?: boolean
	requireAdmin?: boolean
	redirectIfAuthenticated?: boolean
}

/**
 * Auth guard utility for TanStack Router beforeLoad
 * Uses server-side session data from route context.
 *
 * Protection rules:
 * - If not authenticated and requireAuth=true → redirect to /authentication
 * - If authenticated but no consent form and requireConsent=true → redirect to /consent
 * - If authenticated with consent form and on /consent → redirect to /dashboard
 * - If authenticated and redirectIfAuthenticated=true → redirect to /dashboard
 * - If requireAdmin and not admin → redirect to /dashboard
 *
 * @deprecated This function will be removed once all routes migrate to _authed/ layout.
 * Use the _authed.tsx layout route for auth protection instead.
 */
export async function authGuard(
	{context, location}: BeforeLoadContext,
	options: AuthGuardOptions = {}
) {
	const {
		requireAuth = true,
		requireConsent = true,
		requireAdmin = false,
		redirectIfAuthenticated = false
	} = options
	const {isAuthenticated, hasConsent, isAdmin} = context.auth

	// Handle unauthenticated users
	if (!isAuthenticated) {
		if (requireAuth) {
			throw redirect({
				to: '/authentication',
				search: {redirectTo: location.pathname}
			})
		}
		return
	}

	// Handle authenticated users
	if (isAuthenticated) {
		// Redirect already authenticated users away from auth page
		if (redirectIfAuthenticated) {
			throw redirect({to: '/dashboard'})
		}

		// Users with consent form
		if (hasConsent) {
			// Redirect away from consent page if already signed
			if (location.pathname === '/consent') {
				throw redirect({to: '/dashboard'})
			}

			// Check admin requirement
			if (requireAdmin && !isAdmin) {
				throw redirect({to: '/dashboard'})
			}

			return
		}

		// Users without consent form
		// Allow access to consent page itself
		if (location.pathname === '/consent') {
			return
		}

		// Redirect to consent if consent is required
		if (requireConsent) {
			throw redirect({to: '/consent'})
		}
	}
}
