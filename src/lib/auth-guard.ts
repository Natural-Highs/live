import {redirect} from '@tanstack/react-router'
import type {User} from 'firebase/auth'

interface AuthContext {
	auth: {
		user: User | null
		loading: boolean
		consentForm: boolean
		admin: boolean
	}
}

interface BeforeLoadContext {
	context: AuthContext
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
 * Replicates the logic from ProtectedRoute component
 *
 * Protection rules:
 * - If not authenticated and requireAuth=true → redirect to /authentication
 * - If authenticated but no consent form and requireConsent=true → redirect to /consent
 * - If authenticated with consent form and on /consent → redirect to /dashboard
 * - If authenticated and redirectIfAuthenticated=true → redirect to /dashboard
 * - If requireAdmin and not admin → redirect to /dashboard
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
	const {user, loading, consentForm, admin} = context.auth

	// Don't redirect while loading
	if (loading) {
		return
	}

	// Handle unauthenticated users
	if (!user) {
		if (requireAuth) {
			throw redirect({
				to: '/authentication',
				search: {redirect: location.pathname}
			})
		}
		return
	}

	// Handle authenticated users
	if (user) {
		// Redirect already authenticated users away from auth page
		if (redirectIfAuthenticated) {
			throw redirect({to: '/dashboard'})
		}

		// Users with consent form
		if (consentForm) {
			// Redirect away from consent page if already signed
			if (location.pathname === '/consent') {
				throw redirect({to: '/dashboard'})
			}

			// Check admin requirement
			if (requireAdmin && !admin) {
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
