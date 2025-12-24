import {createFileRoute, ErrorComponent, Outlet, redirect} from '@tanstack/react-router'

/**
 * Authenticated layout route.
 *
 * All routes under `_authed/` require authentication.
 * This layout handles:
 * - Authentication check (redirect to /authentication if not logged in)
 * - Consent check (redirect to /consent if not signed, unless already on /consent)
 * - Error boundary via ErrorComponent (R-014)
 *
 * Child routes inherit the authenticated context and don't need individual guards.
 */
export const Route = createFileRoute('/_authed')({
	beforeLoad: async ({context, location}) => {
		const {isAuthenticated, hasConsent} = context.auth

		// Redirect unauthenticated users to login
		if (!isAuthenticated) {
			throw redirect({
				to: '/authentication',
				search: {redirectTo: location.pathname}
			})
		}

		// Redirect users without consent to consent page
		// Exception: allow access to /consent itself
		if (!hasConsent && location.pathname !== '/consent') {
			throw redirect({to: '/consent'})
		}
	},
	errorComponent: ErrorComponent,
	component: AuthedLayout
})

function AuthedLayout() {
	return <Outlet />
}
