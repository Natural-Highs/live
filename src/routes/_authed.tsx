import {createFileRoute, ErrorComponent, Outlet, redirect} from '@tanstack/react-router'

/**
 * Authenticated layout route.
 *
 * All routes under `_authed/` require authentication.
 * Flow order: auth → profile → consent → app
 */
export const Route = createFileRoute('/_authed')({
	beforeLoad: async ({context, location}) => {
		const {isAuthenticated, hasConsent, hasProfile} = context.auth

		if (!isAuthenticated) {
			throw redirect({
				to: '/authentication',
				search: {redirectTo: location.pathname}
			})
		}

		if (!hasProfile && location.pathname !== '/profile-setup') {
			throw redirect({to: '/profile-setup'})
		}

		if (!hasConsent && location.pathname !== '/consent' && location.pathname !== '/profile-setup') {
			throw redirect({to: '/consent'})
		}
	},
	errorComponent: ErrorComponent,
	component: AuthedLayout
})

function AuthedLayout() {
	return <Outlet />
}
