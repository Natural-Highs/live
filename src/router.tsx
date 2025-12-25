import {QueryClient} from '@tanstack/react-query'
import {createRouter} from '@tanstack/react-router'
import type {RouterContext} from './routes/__root'
import {routeTree} from './routeTree.gen'

const queryClient = new QueryClient()

export function getRouter() {
	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		context: {
			auth: {
				user: null,
				isAuthenticated: false,
				hasConsent: false,
				isAdmin: false,
				hasPasskey: false,
				isSessionExpiring: false,
				sessionExpiresAt: null
			},
			queryClient
		} satisfies RouterContext
	})

	return router
}
