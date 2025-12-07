/// <reference types="vite/client" />

import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {createRootRoute, Outlet} from '@tanstack/react-router'
import {TanStackRouterDevtools} from '@tanstack/router-devtools'
import {AuthProvider} from '../context/AuthContext'
import Layout from '../components/Layout'
import appCss from '../global.css?url'

const queryClient = new QueryClient()

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{charSet: 'utf-8'},
			{name: 'viewport', content: 'width=device-width, initial-scale=1'}
		],
		links: [{rel: 'stylesheet', href: appCss}]
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
