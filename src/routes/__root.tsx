/// <reference types="vite/client" />

import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {createRootRouteWithContext, Outlet} from '@tanstack/react-router'
import {TanStackRouterDevtools} from '@tanstack/router-devtools'
import type {User} from 'firebase/auth'
import Layout from '../components/Layout'
import {AuthProvider} from '../context/AuthContext'
import appCss from '../global.css?url'

const queryClient = new QueryClient()

export interface RouterContext {
	auth: {
		user: User | null
		loading: boolean
		consentForm: boolean
		admin: boolean
	}
}

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		meta: [
			{charSet: 'utf-8'},
			{name: 'viewport', content: 'width=device-width, initial-scale=1'},
			{name: 'theme-color', content: '#22c55e'},
			{name: 'apple-mobile-web-app-capable', content: 'yes'},
			{name: 'apple-mobile-web-app-status-bar-style', content: 'default'},
			{name: 'apple-mobile-web-app-title', content: 'Natural Highs'},
			{name: 'description', content: 'Track and celebrate your natural highs'}
		],
		links: [
			{rel: 'stylesheet', href: appCss},
			{rel: 'manifest', href: '/manifest.webmanifest'},
			{rel: 'icon', href: '/favicon.png'},
			{rel: 'apple-touch-icon', href: '/icon-192x192.png'}
		]
	}),
	component: RootComponent
})

// biome-ignore lint/style/useComponentExportOnlyModules: TanStack Router pattern - only Route is exported
function RootComponent() {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<Layout>
					<Outlet />
				</Layout>
			</AuthProvider>
			<ReactQueryDevtools />
			<TanStackRouterDevtools position='bottom-right' />
		</QueryClientProvider>
	)
}
