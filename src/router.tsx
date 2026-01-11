import {QueryClient} from '@tanstack/react-query'
import {createRouter} from '@tanstack/react-router'
import type {RouterContext} from './routes/__root'
import {routeTree} from './routeTree.gen'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			gcTime: 1000 * 60 * 30, // 30 minutes
			refetchOnWindowFocus: false,
			retry: 1
		}
	}
})

export function getRouter() {
	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		context: {
			auth: {
				user: null,
				isAuthenticated: false,
				hasConsent: false,
				hasProfile: false,
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
