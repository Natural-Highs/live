import {createRouter} from '@tanstack/react-router'
import type {RouterContext} from './routes/__root'
import {routeTree} from './routeTree.gen'

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
			}
		} satisfies RouterContext
	})

	return router
}
