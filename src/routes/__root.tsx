/// <reference types="vite/client" />

import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	Scripts
} from '@tanstack/react-router'
import {TanStackRouterDevtools} from '@tanstack/react-router-devtools'
import type {ReactNode} from 'react'
import {useEffect} from 'react'
import {initSentry, SentryErrorBoundary, setSentryUser} from '@/lib/sentry'
import {getSessionForRoutesFn, type SessionUser} from '@/server/functions/auth'
import Layout from '../components/Layout'
import {AuthProvider} from '../context/AuthContext'
import appCss from '../global.css?url'

const queryClient = new QueryClient()

/**
 * Session auth context provided by beforeLoad.
 * Available to all routes via route context.
 */
export interface SessionAuthContext {
	user: SessionUser | null
	isAuthenticated: boolean
	hasConsent: boolean
	isAdmin: boolean
	/** Whether user has registered a passkey for authentication */
	hasPasskey: boolean
	/** Whether user has completed profile setup (display name + DOB) */
	hasProfile: boolean
	/** Whether session expires within 7 days */
	isSessionExpiring: boolean
	/** Session expiration date (ISO string) or null */
	sessionExpiresAt: string | null
}

export interface RouterContext {
	/**
	 * Server-side session auth context.
	 * Fetched in beforeLoad, available to all child routes.
	 */
	auth: SessionAuthContext
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
	/**
	 * Fetch session data on every navigation.
	 * This provides auth state to all routes via context.
	 */
	beforeLoad: async () => {
		const auth = await getSessionForRoutesFn()
		return {auth}
	},
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
			{rel: 'preconnect', href: 'https://fonts.googleapis.com'},
			{
				rel: 'preconnect',
				href: 'https://fonts.gstatic.com',
				crossOrigin: 'anonymous'
			},
			{rel: 'stylesheet', href: appCss},
			{rel: 'manifest', href: '/manifest.webmanifest'},
			{rel: 'icon', href: '/favicon.png'},
			{rel: 'apple-touch-icon', href: '/icon-192x192.png'}
		]
	}),
	component: RootComponent,
	notFoundComponent: NotFoundComponent
})

function NotFoundComponent() {
	return (
		<div className='flex min-h-screen flex-col items-center justify-center bg-bgGreen px-4'>
			<h1 className='mb-4 font-bold text-4xl text-gray-800'>Page Not Found</h1>
			<p className='mb-6 text-gray-600'>The page you are looking for does not exist.</p>
			<Link
				to='/'
				className='rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700'
			>
				Go Home
			</Link>
		</div>
	)
}

function RootDocument({children}: {children: ReactNode}) {
	return (
		<html lang='en'>
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	)
}

function ErrorFallback({error}: {error: unknown}) {
	const isDev = import.meta.env.DEV
	const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
	// In production, show a generic message to avoid exposing sensitive details
	const displayMessage = isDev
		? errorMessage
		: 'An unexpected error occurred. Please try again later.'

	return (
		<div className='flex min-h-screen flex-col items-center justify-center bg-bgGreen px-4'>
			<h1 className='mb-4 font-bold text-4xl text-gray-800'>Something went wrong</h1>
			<p className='mb-6 text-gray-600'>{displayMessage}</p>
			<button
				type='button'
				onClick={() => window.location.reload()}
				className='rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700'
			>
				Reload Page
			</button>
		</div>
	)
}

/**
 * Syncs the authenticated user to Sentry for error attribution.
 * Also handles client-side Sentry initialization to avoid SSR issues.
 * Must be rendered inside RouterContext to access auth state.
 */
function SentryUserSync() {
	const {auth} = Route.useRouteContext()

	// Initialize Sentry client-side only (avoid SSR execution)
	useEffect(() => {
		initSentry()
	}, [])

	// Update user context when auth state changes
	useEffect(() => {
		if (auth.user) {
			setSentryUser({id: auth.user.uid, email: auth.user.email ?? undefined})
		} else {
			setSentryUser(null)
		}
	}, [auth.user?.uid, auth.user?.email, auth.user])

	return null
}

function RootComponent() {
	return (
		<RootDocument>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<SentryUserSync />
					<Layout>
						<SentryErrorBoundary fallback={({error}) => <ErrorFallback error={error} />}>
							<Outlet />
						</SentryErrorBoundary>
					</Layout>
				</AuthProvider>
				<ReactQueryDevtools />
				<TanStackRouterDevtools position='bottom-right' />
			</QueryClientProvider>
		</RootDocument>
	)
}
