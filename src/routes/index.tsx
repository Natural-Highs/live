import {createFileRoute, redirect} from '@tanstack/react-router'

/**
 * Home route - redirects based on authentication state.
 *
 * - Authenticated users → /dashboard
 * - Unauthenticated users → /authentication
 *
 * This ensures users always land on an appropriate page.
 */
export const Route = createFileRoute('/')({
	beforeLoad: async ({context}) => {
		const {isAuthenticated, hasConsent} = context.auth

		if (isAuthenticated) {
			// Redirect to consent if needed, otherwise dashboard
			if (!hasConsent) {
				throw redirect({to: '/consent'})
			}
			throw redirect({to: '/dashboard'})
		}

		// Unauthenticated users go to authentication
		throw redirect({to: '/authentication'})
	}
})
