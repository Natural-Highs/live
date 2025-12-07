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
				loading: true,
				consentForm: false,
				admin: false
			},
			queryClient
		} satisfies RouterContext
	})

	return router
}
